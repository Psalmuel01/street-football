import {resultsMarkup} from "./ui/results";
import {type Formation} from "./content/formations";
import {conditions,type Conditions} from "./content/conditions";
import "./style.css";
import { renderShell } from "./ui/shell";
import {type Bus} from "./game/audio/catalogue";
import {AudioManager} from "./game/audio/manager";
import { Router } from "./ui/router";
import { squadMarkup } from "./ui/squad";
import { makeRoster, type Tactic } from "./content/roster";
import { GoalReplay } from "./game/replay";
import { teams, lines } from "./content/teams";
import { Match, idle } from "./game/simulation";
import { InputManager } from "./game/input";
import { PitchRenderer } from "./game/renderer";
import { SquadPreview, prepareCharacterAsset } from "./game/character";
const app = document.querySelector<HTMLDivElement>("#app")!;
app.innerHTML = renderShell();
let chosen = 0,
  playingTeam = 0,
  playingOpponent = 1,
  mode = "match",
  running = false,
  lastEvent = -1;
async function boot() {
  app.inert = true;
  app.setAttribute("aria-busy", "true");
  await prepareCharacterAsset();
  let match = new Match();
  const replay=new GoalReplay();
  const debug=import.meta.env.DEV?(await import("./game/debug")).installFootballDebug(()=>match):null;
  const startingFives=teams.map(()=>[0,1,2,3,4]);
  const gamePlans:Tactic[]=teams.map(()=>'balanced');
  const shapes:Formation[]=teams.map(()=>'2-2');
  let selectedSlot=3,managingLive=false;
  let renderer = new PitchRenderer(document.querySelector("#court")!, [
    teams[0].color,
    teams[1].color,
  ]);
  const $ = <T extends HTMLElement = HTMLElement>(s: string) =>
    document.querySelector<T>(s)!;
  const router=new Router((page,previousPage)=>{
    if(previousPage==='match'&&page!=='match'&&running&&match.state!=='PAUSED'&&match.state!=='FULL_TIME'){match.pause();updateOverlay();}
    if(page==='match'&&!running){router.go('setup');return;}
    if(page==='results'&&match.state!=='FULL_TIME'){router.go('home');return;}
    renderer.matchView=page==='match';
    $('#home-nav').classList.toggle('active',page==='home');$('#area-nav').classList.toggle('active',['clubs','squad','setup'].includes(page));
    document.querySelectorAll('[data-step]').forEach(el=>el.setAttribute('aria-current',el.getAttribute('data-step')===page?'step':'false'));
    document.body.classList.toggle('in-match',page==='match');
    audio.setMatchActive(page==='match');
    audio.setScene(page==='results'?(match.score[0]>match.score[1]?'win':match.score[0]<match.score[1]?'loss':'draw'):page==='match'?'intro':page==='home'?'menu':'selection');
    if(page==='squad')renderSquad();
    document.querySelectorAll('[data-route]').forEach(el=>el.setAttribute('aria-current',el.getAttribute('data-route')===page?'page':'false'));
  });
  renderer.onSelect=id=>{if(running&&!replay.active&&match.state==='PLAYING')match.selectPlayer(id);};
  document.addEventListener('click',event=>{const target=(event.target as HTMLElement).closest<HTMLElement>('[data-route]');if(target){if(target.dataset.route==='squad')managingLive=false;router.go(target.dataset.route as Parameters<typeof router.go>[0]);}});
  function renderSquad(){
    const team=managingLive?playingTeam:chosen,roster=managingLive?match.rosters[0]:makeRoster(team),lineup=managingLive?match.lineups[0]:startingFives[team];
    const stamina=managingLive?match.players.slice(0,5).map(p=>p.stamina):[1,1,1,1,1];
    $('#squad-page').style.setProperty('--squad-kit',teams[team].color);
    $('#squad-content').innerHTML=squadMarkup(roster,lineup,selectedSlot,stamina,managingLive?match.tactics[0]:gamePlans[team],managingLive,team,managingLive?match.formations[0]:shapes[team]);
    $('#squad-continue').textContent=managingLive?'RETURN TO MATCH ↗':'MATCH SETUP ↗';
    document.querySelectorAll<HTMLElement>('[data-slot]').forEach(el=>el.onclick=()=>{selectedSlot=Number(el.dataset.slot);renderSquad();});
    document.querySelectorAll<HTMLElement>('[data-reserve]').forEach(el=>el.onclick=()=>{
      const reserve=Number(el.dataset.reserve),out=roster[lineup[selectedSlot]].name;
      if(managingLive){if(!match.substitute(selectedSlot,reserve))return;renderer.setPlayerAppearance(selectedSlot,selectedSlot===0?'#d66b49':teams[playingTeam].color,reserve,roster[reserve].number);}
      else lineup[selectedSlot]=reserve;
      renderSquad();$('#squad-feedback').textContent=`${roster[reserve].name} replaces ${out}.`;
    });
    document.querySelectorAll<HTMLElement>('[data-formation]').forEach(el=>el.onclick=()=>{const formation=el.dataset.formation as Formation;if(managingLive)match.setFormation(0,formation);else shapes[team]=formation;renderSquad();});
    $<HTMLSelectElement>('#tactic-select').onchange=e=>{const tactic=(e.target as HTMLSelectElement).value as Tactic;if(managingLive)match.tactics[0]=tactic;else gamePlans[team]=tactic;renderSquad();};
    if(managingLive)$('#control-player').onclick=()=>{match.selectPlayer(selectedSlot);$('#squad-feedback').textContent=`You will control ${roster[lineup[selectedSlot]].name}.`;};
  }
  $('#squad-continue').onclick=()=>{if(managingLive){router.go('match');if(match.state==='PAUSED')match.pause();updateOverlay();}else router.go('setup');};
  const openLiveSquad=()=>{if(!running)return;if(match.state!=='PAUSED'&&match.state!=='FULL_TIME')match.pause();managingLive=true;router.go('squad');updateOverlay();};
  $('#match-squad').onclick=openLiveSquad;
  $('#skip-replay').onclick=()=>{replay.skip();match.stateTime=.1;};
  const input = new InputManager(() => {
    if (running) {
      match.pause();
      updateOverlay();
    }
  });
  input.bindTouch();
  let courtVisible=false,squadVisible=false;
  const visibility=new IntersectionObserver(entries=>{for(const entry of entries){if(entry.target.id==='court')courtVisible=entry.isIntersecting;else squadVisible=entry.isIntersecting;}},{rootMargin:'100px'});
  visibility.observe($('#court'));visibility.observe($('#squad-model'));

  const dialog = $<HTMLDialogElement>("#controls-dialog");
  let resumeAfterControls=false;
  const showControls = () => {
    resumeAfterControls=running&&match.state!=='PAUSED'&&match.state!=='FULL_TIME';
    if(resumeAfterControls){match.pause();updateOverlay();}
    dialog.showModal();
  };
  dialog.addEventListener('close',()=>{if(resumeAfterControls&&match.state==='PAUSED'){match.pause();updateOverlay();}resumeAfterControls=false;});
  $("#how-nav").onclick = $("#controls-button").onclick = showControls;
  $(".close").onclick = $(".close-button").onclick = () => dialog.close();
  const graphics=$<HTMLSelectElement>('#graphics-quality');
  try{graphics.value=localStorage.getItem('lagos-quality')||'auto';}catch{}
  renderer.setQuality(graphics.value||'auto');
  graphics.onchange=()=>{renderer.setQuality(graphics.value);try{localStorage.setItem('lagos-quality',graphics.value);}catch{}};
  const audio=new AudioManager();
  const startAudio=(event:PointerEvent)=>{if((event.target as HTMLElement).closest('#sound,#music-toggle,input,select'))return;document.removeEventListener('pointerdown',startAudio);void audio.firstInteraction();};
  document.addEventListener('pointerdown',startAudio);
  const busNames:Record<Bus,string>={master:'Master',music:'Music',commentary:'Commentary',players:'Player voices',crowd:'Crowd',environment:'Environment',sfx:'Sound effects',ui:'Menu sounds'};
  $('#mixer-controls').innerHTML=Object.entries(busNames).map(([key,label])=>`<label>${label}<input type="range" min="0" max="100" data-audio-bus="${key}" value="${Math.round(audio.levels[key as Bus]*100)}" aria-label="${label} volume"></label>`).join('');
  document.querySelectorAll<HTMLInputElement>('[data-audio-bus]').forEach(slider=>slider.oninput=()=>audio.setBus(slider.dataset.audioBus as Bus,Number(slider.value)/100));
  let lastMoment=0;
  $('#test-callout').insertAdjacentHTML('afterend','<p id="native-voice-status" role="status"></p>');
  let captionUntil=0;
  audio.onCaption=text=>{$('#commentary-caption').textContent=text;captionUntil=performance.now()+3500;};
  $('#voices-toggle').onchange=e=>audio.setVoices((e.target as HTMLInputElement).checked);
  $('#voice-volume').oninput=e=>audio.voiceVolume=Number((e.target as HTMLInputElement).value)/100;
  $('#effects-volume').oninput=e=>{audio.effectsVolume=Number((e.target as HTMLInputElement).value)/100;audio.setEffects(audio.effects);};
  $('#test-callout').onclick=()=>{void audio.previewCallout();};
  $<HTMLSelectElement>('#conditions').onchange=e=>{const value=(e.target as HTMLSelectElement).value as Conditions;renderer.setConditions(value);$('#conditions-description').textContent=conditions[value].description;};
  audio.onChange=()=>{
    $('#native-voice-status').textContent=audio.voiceStatus;
    $('#sound').textContent=audio.playing?'♫ MUSIC ON':'♫ MUSIC OFF';
    $('#sound').setAttribute('aria-pressed',String(audio.playing));
    $('#sound').setAttribute('aria-label',audio.playing?'Pause music':'Play Afrobeats music');
    $('#music-toggle').textContent=audio.playing?'Ⅱ':'▶';
    $('#music-toggle').setAttribute('aria-pressed',String(audio.playing));
    $('#music-toggle').setAttribute('aria-label',audio.playing?'Pause music':'Play music');
    $('.music-dock').classList.toggle('playing',audio.playing);
    $<HTMLInputElement>('#voices-toggle').checked=audio.voices;
    $('.music-copy strong').textContent=audio.title;
    $('.music-settings>span').textContent='STREET RADIO';
    $('#music-status').textContent=audio.error||(audio.playing?`Playing · ${audio.title}`:'Afrobeats · FASSounds');
    for(const selector of ['#music-volume','#dialog-music-volume'])$<HTMLInputElement>(selector).value=String(Math.round(audio.volume*100));
    $<HTMLInputElement>('#effects-toggle').checked=audio.effects;
    document.querySelectorAll<HTMLInputElement>('[data-audio-bus]').forEach(slider=>slider.value=String(Math.round(audio.levels[slider.dataset.audioBus as Bus]*100)));
  };
  $('#sound').onclick=$('#music-toggle').onclick=()=>{void audio.toggle();};
  for(const selector of ['#music-volume','#dialog-music-volume'])$<HTMLInputElement>(selector).oninput=e=>audio.setVolume(Number((e.target as HTMLInputElement).value)/100);
  $<HTMLInputElement>('#effects-toggle').onchange=e=>audio.setEffects((e.target as HTMLInputElement).checked);
  audio.onChange();
  const homePreview=new SquadPreview($("#home-players"),teams[0].color,true);
  const squadPreview = new SquadPreview($("#squad-model"), teams[chosen].color);
  document
    .querySelectorAll<HTMLButtonElement>("[data-motion]")
    .forEach((button) => {
      button.onclick = () => {
        squadPreview.setMotion(
          button.dataset.motion as typeof squadPreview.motion,
          performance.now() / 1000,
        );
        document
          .querySelectorAll("[data-motion]")
          .forEach((el) =>
            el.setAttribute("aria-pressed", String(el === button)),
          );
      };
    });
  function refreshTeams() {
    squadPreview.setColor(teams[chosen].color);
    document.documentElement.style.setProperty("--selected-kit",teams[chosen].color);
    $("#squad-name").textContent = teams[chosen].name.toUpperCase();
    document.querySelectorAll<HTMLElement>("[data-team]").forEach((el, i) => {
      el.classList.toggle("selected", i === chosen);
      el.setAttribute("aria-pressed", String(i===chosen));
      el.querySelector(".team-state")!.textContent=i===chosen?"YOUR COMMUNITY":"REP THIS AREA";
      el.querySelector("i")!.textContent = i === chosen ? "✓" : "↗";
    });
    const opponent = $<HTMLSelectElement>("#opponent");
    const old = opponent.value;
    opponent.innerHTML = teams
      .map((t, i) =>
        i !== chosen ? `<option value="${i}">${t.name}</option>` : "",
      )
      .join("");
    if (Number(old) !== chosen) opponent.value = old;
  }
  document.querySelectorAll<HTMLElement>("[data-team]").forEach(
    (el) =>
      (el.onclick = () => {
        chosen = Number(el.dataset.team);
        audio.setCommunity(chosen);
        refreshTeams();
      }),
  );
  document.querySelectorAll<HTMLElement>("[data-mode]").forEach(
    (el) =>
      (el.onclick = () => {
        mode = el.dataset.mode!;
        document
          .querySelectorAll("[data-mode]")
          .forEach((e) => {e.classList.toggle("selected", e === el);e.setAttribute("aria-pressed",String(e===el));});
        $("#play").innerHTML =
          mode === "training"
            ? "ENTER PRACTICE <span>↗</span>"
            : "PLAY BALL <span>↗</span>";
      }),
  );
  function start() {
    playingTeam = chosen;
    void audio.unlock();audio.setMatchActive(true);
    const opponent = Number($<HTMLSelectElement>("#opponent").value);
    playingOpponent=opponent;
    replay.clear();replayGoalSerial='';lastMoment=0;
    match = new Match(
      mode === "training"
        ? 3600
        : Number($<HTMLSelectElement>("#duration").value),
      Number($<HTMLSelectElement>("#difficulty").value),
    );
    match.condition=$<HTMLSelectElement>('#conditions').value as Conditions;
    renderer.setConditions(match.condition);
    match.configure(0,makeRoster(chosen),startingFives[chosen],gamePlans[chosen]);
    match.configure(1,makeRoster(opponent),[0,1,2,3,4]);
    match.setFormation(0,shapes[chosen]);match.resetPositions(0);
    match.training=mode==='training';if(match.training)match.resetDrill();
    $('#training-panel').hidden=!match.training;
    renderer.lastScore=0;
    match.players.forEach(p=>renderer.setPlayerAppearance(p.id,p.keeper?'#d66b49':teams[p.team===0?chosen:opponent].color,match.lineups[p.team][p.id%5],match.athlete(p).number));
    $("#home-score-name").textContent = teams[chosen].short;
    $("#away-score-name").textContent = teams[opponent].short;
    $("#scoreboard").style.setProperty("--home-kit",teams[chosen].color);
    $("#scoreboard").style.setProperty("--away-kit",teams[opponent].color);
    squadPreview.setMotion("idle", performance.now() / 1000);
    squadPreview.draw(performance.now() / 1000);
    document
      .querySelectorAll<HTMLElement>("[data-motion]")
      .forEach((el) =>
        el.setAttribute("aria-pressed", String(el.dataset.motion === "idle")),
      );
    queued=idle();input.keys.clear();input.pressed.clear();
    running = true;
    lastEvent = -1;
    $("#scoreboard").hidden = false;
    $(".scene-label").hidden = true;
    $("#touch").hidden = false;
    $("#player-tag").hidden = false;
    router.go("match");
    $("#play").innerHTML = "RESTART MATCH <span>↻</span>";
    $("#court").scrollIntoView({ behavior: "smooth", block: "center" });
    updateOverlay();
  }
  $("#play").onclick = () => {
    if (running && match.state !== "FULL_TIME") {
      if (match.state !== "PAUSED") match.pause();
      $("#match-overlay").hidden = false;
      $("#match-overlay").innerHTML =
        '<h2>Start a fresh match?</h2><p>Your current match will end.</p><button class="primary" id="restart-confirm">START NEW MATCH ↗</button><button id="cancel-restart">Keep playing</button>';
      $("#restart-confirm").onclick = start;
      $("#cancel-restart").onclick = () => {
        if (match.state === "PAUSED") match.pause();
        updateOverlay();
      };
    } else start();
  };
  $("#hero-play").onclick=()=>{mode='match';router.go("clubs");};
  $('#quick-play').onclick=()=>{mode='match';start();};
  $('#home-training').onclick=()=>{mode='training';start();};
  $("#pause").onclick = () => input.pause();
  $('#home-nav').onclick=()=>router.go('home');
  $('#area-nav').onclick=(event)=>{event.preventDefault();router.go('clubs');};
  $('#court').insertAdjacentHTML('beforeend','<div id="training-panel" hidden><strong>TRAINING GROUND</strong><select id="training-drill" aria-label="Training drill"><option value="free">Free practice</option><option value="through">Through-ball runs</option><option value="finishing">Finishing</option></select><p id="training-tip">No clock. No opponent press. Full energy.</p><span id="training-progress"></span><button id="reset-drill">RESET BALL ↺</button></div>');
  const resetPractice=()=>{replay.clear();match.resetDrill($<HTMLSelectElement>('#training-drill').value as typeof match.drill);};
  $('#reset-drill').onclick=resetPractice;$('#training-drill').onchange=()=>{resetPractice();$<HTMLSelectElement>('#training-drill').blur();};
  $('#player-tag').insertAdjacentHTML('beforeend','<small class="sprint-hint">SHIFT / R1 · SPRINT</small>');
  $("#camera-view").onclick = () => {
    renderer.cameraMode = renderer.cameraMode==='follow'?'broadcast':renderer.cameraMode==='broadcast'?'street':'follow';
    $("#camera-view").textContent = renderer.cameraMode==='broadcast'?'WIDE':renderer.cameraMode.toUpperCase();
    $("#camera-view").setAttribute('aria-pressed',String(renderer.cameraMode!=='broadcast'));
    $("#camera-view").setAttribute('aria-label',`Camera: ${renderer.cameraMode}. Switch camera`);
  };
  $("#fullscreen").onclick = () => {
    if (document.fullscreenElement) void document.exitFullscreen();
    else void $("#court").requestFullscreen?.();
  };
  function updateOverlay() {
    const overlay = $("#match-overlay");
    overlay.hidden = !(match.state === "PAUSED" || match.state === "FULL_TIME");
    if (match.state === "PAUSED") {
      overlay.innerHTML =
        '<p class="eyebrow">TAKE A BREATHER</p><h2>The ground can wait.</h2><button class="primary" id="resume">BACK TO THE GAME ↗</button><button id="manage-paused">SQUAD & SUBSTITUTIONS</button><button id="setup">MATCH SETUP</button>';
      $("#manage-paused").onclick=openLiveSquad;
      $("#setup").onclick = () => {
        router.go("setup");
        document.body.classList.remove("in-match");
    audio.setMatchActive(false);
        $("#match-overlay").hidden = true;
        window.scrollTo({ top: 0, behavior: "smooth" });
      };
      $("#resume").onclick = () => {
        router.go("match");
        match.pause();
        updateOverlay();
      };
    }
    if (match.state === "FULL_TIME") {
      const total = match.possession[0] + match.possession[1];
      overlay.innerHTML = `<p class="eyebrow">FULL TIME · RESPECT THE GAME</p><h2>${match.score[0]} — ${match.score[1]}</h2><p>${match.score[0] === match.score[1] ? "Honours shared. Run it back?" : match.score[0] > match.score[1] ? "Your area takes the bragging rights." : "Another game. Another chance."}</p><div class="result-stats">${match.shots[0]}–${match.shots[1]} shots · ${match.passes[0]}–${match.passes[1]} passes · ${match.saves[0]}–${match.saves[1]} saves<br>${total ? Math.round((match.possession[0] / total) * 100) : 50}% possession</div><button class="primary" id="rematch">RUN IT BACK ↗</button>`;
      $('#results-page').innerHTML=resultsMarkup(match,playingTeam,playingOpponent);
      $('#result-rematch').onclick=start;
      $("#rematch").onclick = start;
      router.go('results');
    }
  }
  let replayGoalSerial='';
  let previous = performance.now(),
    accumulator = 0;
  let queued = idle();
  function frame(now: number) {
    const dt = Math.min(0.06, (now - previous) / 1000);
    debug?.((now-previous)/1000);
    previous = now;
    accumulator += dt;
    const fresh = running ? input.read() : idle();
    queued = {
      ...fresh,
      pass: fresh.pass || queued.pass,
      shoot: fresh.shoot || queued.shoot,
      through: fresh.through || queued.through,
      tackle: fresh.tackle || queued.tackle,
      switch: fresh.switch || queued.switch,
      skill: fresh.skill || queued.skill,
      passAndMove: fresh.passAndMove || queued.passAndMove,
    };
    let command = queued;
    while (accumulator >= 1 / 60) {
      if(running&&!replay.active){
        match.step(1/60,command);
        if(match.state==='PLAYING')replay.record(match);
        if(match.state==='GOAL'&&replayGoalSerial!==match.score.join(':')){replayGoalSerial=match.score.join(':');replay.record(match);replay.start();if(replay.active)match.stateTime=.1;}
      }
      command = {
        ...command,
        pass: false,
        shoot: false,
        tackle: false,
        through: false,
        switch: false,
        skill: false,
        passAndMove:false,
      };
      queued = command;
      accumulator -= 1 / 60;
    }
    if(running&&router.page==='match'&&match.state!=='PAUSED')audio.setScene(replay.showing?'replay':match.state==='PLAYING'&&!match.restartPending?'gameplay':match.state==='GOAL'?'replay':'intro');
    audio.update(dt,running&&match.state==='PLAYING'&&!replay.active,Math.hypot(match.players[match.active].vx,match.players[match.active].vy),match.condition==='rain',renderer.cameraTarget.x,renderer.cameraTarget.z);
    $('#commentary-caption').hidden=now>captionUntil||router.page!=='match';
    replay.advance(dt,match.state==='PAUSED'||document.hidden);
    renderer.showDecision(replay.showing?null:match.referee,match.state==='PAUSED');
    const replayFrame=replay.sample();
    if(replayFrame&&match.state==='PAUSED')replayFrame.state='PAUSED';
    $('#replay-banner').hidden=!replay.showing;
    if(replay.showing)$('#replay-banner small').textContent=`${match.athlete(match.players[match.scorer]).name.toUpperCase()} · ${match.score.join(' : ')}`;
    $<HTMLProgressElement>('#replay-progress').value=replay.progress;
    $('#touch').hidden=replay.showing||!running||router.page!=='match';
    if(replay.showing&&fresh.pass&&match.state!=='PAUSED'){replay.skip();queued=idle();}
    if(courtVisible&&!document.hidden)renderer.draw(replayFrame??match,dt,replay.showing);
    $('#court').classList.toggle('replaying',replay.showing);
    if(router.page==='home'&&!document.hidden)homePreview.draw(now/1000);
    if (squadVisible&&!document.hidden&&(!running || match.state === "PAUSED" || squadPreview.motion !== "idle"))
      squadPreview.draw(now / 1000);
    if (running) {
      const selected = match.players[match.active];
      const defending=match.owner!==null&&match.players[match.owner].team===1;
      for(const [action,label] of Object.entries(defending?{pass:'CONTAIN',shoot:'PRESS',through:'RUSH',tackle:'SLIDE'}:{pass:'PASS',shoot:'SHOOT',through:'THROUGH',tackle:'LOFT'})){
        const button=$(`[data-action="${action}"]`);button.querySelector('small')!.textContent=label;button.setAttribute('aria-label',label);
      }
      $("#player-tag strong").textContent =
        match.athlete(selected).name;
      $("#player-tag span").textContent =
        `${selected.keeper ? "KEEPER" : "NO. " + match.athlete(selected).number} · ${teams[playingTeam].short}`;
      $<HTMLMeterElement>("#player-tag meter").value = selected.stamina;
      $('#player-tag').classList.toggle('sprinting',fresh.sprint&&Math.hypot(selected.vx,selected.vy)>4);
      $('.sprint-hint').textContent=fresh.sprint&&Math.hypot(selected.vx,selected.vy)>4?(match.training?'SPRINTING · FULL ENERGY':'SPRINTING · ENERGY ↓'):'SHIFT / R1 · SPRINT';
      $("#score").textContent = match.training?'DRILLS':`${match.score[0]} : ${match.score[1]}`;
      if(match.training){$('#training-progress').textContent=`${match.completedPasses[0]} passes · ${match.shots[0]} shots · ${match.score[0]} goals`;$('#training-tip').textContent=match.drill==='through'?'Aim toward your runner + K / △. Lead into space.':match.drill==='finishing'?'J / □ to finish. Aim with movement. Reset and repeat.':'No clock. No opponent press. Full energy.';}
      const t = Math.ceil(match.duration - match.elapsed);
      $("#timer").textContent =
        mode === "training"
          ? "PRACTICE"
          : `${String(Math.floor(t / 60)).padStart(2, "0")}:${String(t % 60).padStart(2, "0")}`;
      const announcement = $("#announcement");
      announcement.hidden = !(
        !replay.showing && (match.state === "KICKOFF" || match.state === "GOAL" || match.state === "FOUL" || match.state === "FREE_KICK" || match.restartPending)
      );
      announcement.textContent =
        match.state === "FOUL" ? `FOUL · ${match.referee?.team===0?'YOUR BALL':'OPPOSITION BALL'}` : match.state==='FREE_KICK' ? `${match.setPiece?.penalty?'PENALTY':'FREE KICK'} · ${match.setPiece?.team===0?'✕ PASS / □ SHOOT':'OPPOSITION'}` : match.state === "GOAL" ? "NA GOAL!" : match.kickoffTeam===0?"YOUR KICK-OFF · PRESS ✕":"OPPOSITION KICK-OFF";
      const moments=match.moments.filter(moment=>moment.id>lastMoment);
      if(moments.length){
        lastMoment=moments.at(-1)!.id;
        // Deliver all visual reactions; prefer the more specific spoken call within a frame.
        const priority=(kind:string)=>['late-winner','late-lead','penalty','foul','big-save','nutmeg'].includes(kind)?4:['goal','fulltime','near-goal','miss'].includes(kind)?3:2;
        moments.forEach(moment=>renderer.react(moment.kind,moment.intensity));
        const spoken=moments.reduce((best,m)=>priority(m.kind)>priority(best.kind)?m:best);audio.react(spoken);
      }
      if (lastEvent !== match.eventSerial) {
        lastEvent = match.eventSerial;

        if (match.state === "FULL_TIME") updateOverlay();
        $("#court").setAttribute(
          "aria-label",
          lines[match.event as keyof typeof lines] ?? "Match playing",
        );
      }
    }
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
  window.addEventListener("visibilitychange", () => {
    if (
      document.hidden &&
      running &&
      match.state !== "PAUSED" &&
      match.state !== "FULL_TIME"
    ) {
      match.pause();
      updateOverlay();
    }
  });

  router.sync();
  app.inert = false;
  app.removeAttribute("aria-busy");
}
void boot().catch((error) => {
  app.inert = false;
  app.removeAttribute("aria-busy");
  console.error(error);
  document.querySelector("#court")!.textContent =
    "The pitch could not load. Please refresh to try again.";
});
