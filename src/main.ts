import {characterIdentity} from './ui/portrait';
import {grounds,DEFAULT_GROUND,type Ground} from './content/grounds';
import {emptyCup,readCup,recordCup,points,cupOpponent,newSeason} from './game/cup';
import {setupLagosLife} from './platform/lagos-life';
import {pauseMarkup} from './ui/pause';
import {setupInstall} from './ui/install';
import {resultsMarkup} from "./ui/results";
import {type Formation} from "./content/formations";
import {conditions,type Conditions} from "./content/conditions";
import "./style.css";
import "./ui/presentation.css";
import { renderShell } from "./ui/shell";
import {type Bus} from "./game/audio/catalogue";
import {AudioManager} from "./game/audio/manager";
import { Router } from "./ui/router";
import { squadMarkup } from "./ui/squad";
import { makeRoster, type Tactic } from "./content/roster";
import { GoalReplay } from "./game/replay";
import { teams } from "./content/teams";
import { Match, idle } from "./game/simulation";
import {difficultyTiers} from "./game/gameplay.config";
import { InputManager } from "./game/input";
import { PitchRenderer } from "./game/renderer";
import { SquadPreview, prepareCharacterAsset } from "./game/character";
const app = document.querySelector<HTMLDivElement>("#app")!;
app.innerHTML = renderShell();
setupInstall();
let chosen = 0,
  playingTeam = 0,
  playingOpponent = 1,
  mode = "match",
  running = false,
  lastEvent = -1;
const bootScreen = document.querySelector<HTMLElement>("#boot-screen");
// Lift the loading screen out of #app: that container is made inert while the game boots,
// which would hide the status from assistive technology and block the retry button.
if (bootScreen) document.body.append(bootScreen);
const bootDetail = (text: string) => {
  const detail = document.querySelector("#boot-detail");
  if (detail) detail.textContent = text;
};
try{const savedClub=localStorage.getItem('lagos-selected-club');const index=teams.findIndex(t=>t.id===savedClub);if(index>=0)chosen=index;}catch{}
const bootStarted=performance.now();
async function boot() {
  app.inert = true;
  app.setAttribute("aria-busy", "true");
  bootDetail("Building the neighbourhood five…");
  await prepareCharacterAsset();
  bootDetail("Rolling out the concrete pitch…");
  let match = new Match();
  let cup=emptyCup(),cupPersistence=true;try{cup=readCup(localStorage.getItem('lagos-area-cup'));}catch{cupPersistence=false;}
  let cupRecorded=false;
  const saveCup=()=>{try{localStorage.setItem('lagos-area-cup',JSON.stringify(cup));cupPersistence=true;}catch{cupPersistence=false;}};
  const cupPanel=document.createElement('section');cupPanel.className='cup-panel';document.querySelector('.mode-tabs')!.after(cupPanel);
  const renderCup=()=>{cupPanel.hidden=mode!=='cup';cupPanel.innerHTML=`<span class="eyebrow">AREA CUP · ${cupPersistence?'SAVED ON THIS DEVICE':'THIS VISIT ONLY'}</span>${cupPersistence?'':'<p class="cup-storage-warning" role="status">Saving is unavailable. Cup progress will be lost if you reload or close this tab.</p>'}<h3>${cup.results.length===3?(points(cup)>=7?'Champions of the area':'Season complete'):`Match ${cup.results.length+1} of 3`}</h3><p class="cup-summary">${teams[cup.team].name} · <b>${points(cup)}</b> points · ${cup.titles} title${cup.titles===1?'':'s'}</p><p class="cup-guidance">${cup.results.length===3?(points(cup)>=7?'Seven points or more lifts the cup, and you made it.':'Seven points lifts the cup. You finished on '+points(cup)+'.'):'Seven points from three matches lifts the cup. Win two, draw one.'} Best season: ${cup.bestPoints}/9.</p><ol class="cup-fixtures">${[0,1,2].map((n)=>{const result=cup.results[n],outcome=result?(result.goals>result.conceded?'W':result.goals<result.conceded?'L':'D'):null,next=!result&&n===cup.results.length;return `<li class="cup-fixture ${outcome?`played ${outcome.toLowerCase()}`:next?'next':'upcoming'}"${next?' aria-current="step"':''}><span class="fixture-team"><i aria-hidden="true" style="--kit:${teams[cup.fixtures[n]].color}"></i>${teams[cup.fixtures[n]].name}</span><b>${result?`${result.goals}–${result.conceded}`:'–'}</b><em>${outcome?{W:'WON',D:'DRAWN',L:'LOST'}[outcome]:next?'NEXT':'TO PLAY'}</em></li>`;}).join('')}</ol><button id="new-season" class="secondary">${cup.results.length?'Start a new season':'Use selected team'}</button>`;cupPanel.querySelector<HTMLButtonElement>('#new-season')!.onclick=()=>{cup=newSeason(cup,chosen);saveCup();renderCup();};};
  renderCup();
  const replay=new GoalReplay();
  const debug=import.meta.env.DEV?(await import("./game/debug")).installFootballDebug(()=>match,()=>({calls:renderer.renderer.info.render.calls,triangles:renderer.renderer.info.render.triangles,geometries:renderer.renderer.info.memory.geometries,textures:renderer.renderer.info.memory.textures})):null;
  const startingFives=teams.map(()=>[0,1,2,3,4]);
  const gamePlans:Tactic[]=teams.map(t=>t.style);
  const shapes:Formation[]=teams.map(t=>t.shape);
  let selectedSlot=3,managingLive=false;
  let kitColour:string|null=null;
  const homeKit=(team:number)=>kitColour??teams[team].color;
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
    // Announce the new screen to assistive technology and move focus to its landmark.
    const pageNames:Record<string,string>={home:'Playground',clubs:'Communities',squad:'Your starting five',setup:'Match setup',match:'Live match',results:'Full-time results'};
    const routeStatus=document.querySelector('#route-status');
    if(routeStatus)routeStatus.textContent=`${pageNames[page]??page} page`;
    if(page!==previousPage){
      const landmarks:Record<string,string>={clubs:'#communities',squad:'#squad-page',setup:'#match-setup',results:'#results-page'};
      const landmark=landmarks[page]?document.querySelector<HTMLElement>(landmarks[page]):null;
      if(landmark){landmark.tabIndex=-1;landmark.focus({preventScroll:true});}
    }
    if(page!=='match'&&document.fullscreenElement)void document.exitFullscreen().catch(()=>{});
    renderer.matchView=page==='match';
    $('#home-nav').classList.toggle('active',page==='home');$('#area-nav').classList.toggle('active',['clubs','squad','setup'].includes(page));
    document.querySelectorAll('[data-step]').forEach(el=>el.setAttribute('aria-current',el.getAttribute('data-step')===page?'step':'false'));
    document.body.classList.toggle('in-match',page==='match');
    document.body.classList.remove('route-transition');requestAnimationFrame(()=>document.body.classList.add('route-transition'));
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
    $('#squad-page').style.setProperty('--squad-kit',homeKit(team));
    $('#squad-content').innerHTML=squadMarkup(roster,lineup,selectedSlot,stamina,managingLive?match.tactics[0]:gamePlans[team],managingLive,team,managingLive?match.formations[0]:shapes[team]);
    $('#squad-continue').textContent=managingLive?'RETURN TO MATCH ↗':'MATCH SETUP ↗';
    document.querySelectorAll<HTMLElement>('[data-slot]').forEach(el=>el.onclick=()=>{selectedSlot=Number(el.dataset.slot);renderSquad();});
    document.querySelectorAll<HTMLElement>('[data-reserve]').forEach(el=>el.onclick=()=>{
      const reserve=Number(el.dataset.reserve),out=roster[lineup[selectedSlot]].name;
      if(managingLive){if(!match.substitute(selectedSlot,reserve))return;renderer.setPlayerAppearance(selectedSlot,selectedSlot===0?'#d66b49':homeKit(playingTeam),characterIdentity(playingTeam,reserve),roster[reserve].number);}
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
  $('#graphics-quality').insertAdjacentHTML('afterend','<div class="control-customisation"><label for="touch-size">Touch button size <input id="touch-size" type="range" min="85" max="120" value="100"></label><p>Adjust the controls to your hands. Completed cup matches save on this device.</p></div>');
  const touchSize=$<HTMLInputElement>('#touch-size');
  try{const size=Number(localStorage.getItem('lagos-touch-size'));if(size>=85&&size<=120)touchSize.value=String(size);}catch{}
  const applyTouchSize=()=>document.documentElement.style.setProperty('--control-scale',String(Number(touchSize.value)/100));applyTouchSize();
  touchSize.oninput=()=>{applyTouchSize();try{localStorage.setItem('lagos-touch-size',touchSize.value);}catch{}};

  const startAudio=(event:PointerEvent)=>{if((event.target as HTMLElement).closest('#sound,#music-toggle,input,select'))return;document.removeEventListener('pointerdown',startAudio);void audio.firstInteraction();};
  document.addEventListener('pointerdown',startAudio);
  const busNames:Record<Bus,string>={master:'Master',music:'Music',commentary:'Commentary',players:'Player voices',crowd:'Crowd',environment:'Environment',sfx:'Sound effects',ui:'Menu sounds'};
  $('#mixer-controls').innerHTML=Object.entries(busNames).filter(([key])=>!['commentary','players'].includes(key)).map(([key,label])=>`<label>${label}<input type="range" min="0" max="100" data-audio-bus="${key}" value="${Math.round(audio.levels[key as Bus]*100)}" aria-label="${label} volume"></label>`).join('');
  document.querySelectorAll<HTMLInputElement>('[data-audio-bus]').forEach(slider=>slider.oninput=()=>audio.setBus(slider.dataset.audioBus as Bus,Number(slider.value)/100));
  let lastMoment=0;
  $('#effects-volume').oninput=e=>{audio.effectsVolume=Number((e.target as HTMLInputElement).value)/100;audio.setEffects(audio.effects);};
  $('#test-callout').onclick=()=>{void audio.previewCallout();};
  $('label[for="conditions"]').insertAdjacentHTML('beforebegin',`<label for="ground">YOUR GROUND</label><select id="ground">${Object.entries(grounds).map(([id,g])=>`<option value="${id}">${g.name}</option>`).join('')}</select><p id="ground-description">${grounds[DEFAULT_GROUND].description}</p>`);
  $<HTMLSelectElement>('#ground').onchange=e=>{const id=(e.target as HTMLSelectElement).value as Ground;renderer.setGround(id);audio.setGround(id);renderer.setConditions($<HTMLSelectElement>('#conditions').value as Conditions);$('#ground-description').textContent=grounds[id].description;};
  $<HTMLSelectElement>('#conditions').onchange=e=>{const value=(e.target as HTMLSelectElement).value as Conditions;renderer.setConditions(value);$('#conditions-description').textContent=conditions[value].description;};
  const venueCards=document.createElement('div');venueCards.className='venue-cards';venueCards.setAttribute('aria-label','Choose a ground');
  const illustrations:Record<Ground,string>={surulere:'<path d="M5 33V12h15v21m6 0V5h19v28m5 0V17h13v16"/>',marina:'<path d="M3 25q8-8 16 0t16 0t16 0t16 0M16 17h34l-5 7H22zm16-2V3"/>',arena:'<path d="M4 32V8l15 5h30l15-5v24M4 8h60M12 20h44m-44 6h44"/>',cage:'<path d="M3 33V4h16v29m4 0V4h20v29m4 0V4h17v29M3 22h61M8 16h51"/>',sand:'<path d="M3 30q15-9 30 0t30 0M12 27V9m-8 4 8-7 8 7m25 13V12h13v14"/>'};
  venueCards.innerHTML=Object.entries(grounds).map(([id,g])=>`<button type="button" class="venue-card" data-ground="${id}" aria-pressed="false"><svg viewBox="0 0 68 38" fill="none" stroke="${g.accent}" stroke-width="2" aria-hidden="true">${illustrations[id as Ground]}</svg><b>${g.name}</b><span>${g.tag}</span></button>`).join('');
  $('#ground-description').after(venueCards);
  const syncGroundCards=()=>venueCards.querySelectorAll<HTMLElement>('[data-ground]').forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.ground===$<HTMLSelectElement>('#ground').value)));
  venueCards.querySelectorAll<HTMLElement>('[data-ground]').forEach(button=>button.onclick=()=>{const select=$<HTMLSelectElement>('#ground');select.value=button.dataset.ground!;select.dispatchEvent(new Event('change'));});
  $('#ground').addEventListener('change',syncGroundCards);
  const setupStrip=document.createElement('div');setupStrip.className='setup-action-strip';setupStrip.innerHTML='<div><small>READY TO PLAY</small><strong id="setup-summary"></strong></div><button id="mobile-play" class="primary">START MATCH ↗</button>';app.append(setupStrip);
  $('#mobile-play').onclick=start;
  const updateSetupSummary=()=>{$('#setup-summary').textContent=`${teams[chosen].name} · ${difficultyTiers[Number($<HTMLSelectElement>('#difficulty').value)]?.label??'Competitive'}`;$('#mobile-play').textContent=mode==='training'?'START PRACTICE ↗':mode==='cup'?'PLAY CUP MATCH ↗':'START MATCH ↗';};
  document.querySelector('.match-card')!.addEventListener('change',updateSetupSummary);
  const setupSelectors=['ground','conditions','duration','difficulty'];
  try{const saved=JSON.parse(localStorage.getItem('lagos-match-setup')||'{}');for(const id of setupSelectors){const element=$<HTMLSelectElement>(`#${id}`);if(id==='difficulty'&&Number.isFinite(Number(saved[id])))element.value=String(Math.max(0,Math.min(difficultyTiers.length-1,Math.round(Number(saved[id])))));else if(Array.from(element.options).some(option=>option.value===saved[id]))element.value=saved[id];}}catch{}
  renderer.setGround($<HTMLSelectElement>('#ground').value as Ground);audio.setGround($<HTMLSelectElement>('#ground').value as Ground);renderer.setConditions($<HTMLSelectElement>('#conditions').value as Conditions);
  $('#ground-description').textContent=grounds[$<HTMLSelectElement>('#ground').value as Ground].description;
  $('#conditions-description').textContent=conditions[$<HTMLSelectElement>('#conditions').value as Conditions].description;
  syncGroundCards();
  const difficultySelect=$<HTMLSelectElement>('#difficulty');
  const difficultyDescription=$('#difficulty-description');
  const describeDifficulty=()=>{
    const index=Math.max(0,Math.min(difficultyTiers.length-1,Number(difficultySelect.value)||0));
    difficultyDescription.textContent=`Level ${index+1} of ${difficultyTiers.length} · ${difficultyTiers[index].label} — ${difficultyTiers[index].summary}`;
  };
  difficultySelect.addEventListener('change',describeDifficulty);
  describeDifficulty();
  for(const id of setupSelectors)$(`#${id}`).addEventListener('change',()=>{try{localStorage.setItem('lagos-match-setup',JSON.stringify(Object.fromEntries(setupSelectors.map(key=>[key,$<HTMLSelectElement>(`#${key}`).value]))));}catch{}});
  audio.onChange=()=>{

    $('#sound').textContent=audio.playing?'♫ MUSIC ON':'♫ MUSIC OFF';
    $('#sound').setAttribute('aria-pressed',String(audio.playing));
    $('#sound').setAttribute('aria-label',audio.playing?'Pause music':'Play Afrobeats music');
    $('#music-toggle').textContent=audio.playing?'Ⅱ':'▶';
    $('#music-toggle').setAttribute('aria-pressed',String(audio.playing));
    $('#music-toggle').setAttribute('aria-label',audio.playing?'Pause music':'Play music');
    $('.music-dock').classList.toggle('playing',audio.playing);

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
    squadPreview.setColor(homeKit(chosen));
    document.documentElement.style.setProperty("--selected-kit",teams[chosen].color);
    $("#squad-name").textContent = teams[chosen].name.toUpperCase();updateSetupSummary();
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
        chosen = Number(el.dataset.team);try{localStorage.setItem('lagos-selected-club',teams[chosen].id);}catch{}
        audio.setCommunity(chosen);
        refreshTeams();
      }),
  );
  document.querySelectorAll<HTMLElement>("[data-mode]").forEach(
    (el) =>
      (el.onclick = () => {
        mode = el.dataset.mode!;renderCup();updateSetupSummary();$<HTMLSelectElement>('#opponent').disabled=mode==='cup';
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
    input.reset();queued=idle();accumulator=0;
    if(mode==="cup"){if(cup.results.length===3)cup=newSeason(cup,cup.team);chosen=cup.team;refreshTeams();saveCup();renderCup();}
    cupRecorded=false;
    playingTeam = chosen;
    void audio.unlock();audio.setMatchActive(true);
    const opponent = mode==="cup"?cupOpponent(cup):Number($<HTMLSelectElement>("#opponent").value);
    playingOpponent=opponent;
    replay.clear();replayGoalSerial='';lastMoment=0;
    match = new Match(
      mode === "training"
        ? 3600
        : Number($<HTMLSelectElement>("#duration").value),
      Number($<HTMLSelectElement>("#difficulty").value),
    );
    match.condition=$<HTMLSelectElement>('#conditions').value as Conditions;
    renderer.setGround($<HTMLSelectElement>('#ground').value as Ground);audio.setGround($<HTMLSelectElement>('#ground').value as Ground);
    renderer.setConditions(match.condition);
    match.configure(0,makeRoster(chosen),startingFives[chosen],gamePlans[chosen]);
    match.configure(1,makeRoster(opponent),[0,1,2,3,4],teams[opponent].style);
    match.setFormation(1,teams[opponent].shape);
    match.setFormation(0,shapes[chosen]);match.resetPositions(0);
    match.training=mode==='training';if(match.training)match.resetDrill();
    $('#training-panel').hidden=!match.training;
    renderer.lastScore=0;
    match.players.forEach(p=>renderer.setPlayerAppearance(p.id,p.keeper?'#d66b49':p.team===0?homeKit(chosen):teams[opponent].color,characterIdentity(p.team===0?chosen:opponent,match.lineups[p.team][p.id%5]),match.athlete(p).number));
    $("#home-score-name").textContent = teams[chosen].short;
    $("#away-score-name").textContent = teams[opponent].short;
    $("#scoreboard").style.setProperty("--home-kit",homeKit(chosen));
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
    $("#court").tabIndex=-1;$("#court").focus({preventScroll:true});
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
  $('#court').insertAdjacentHTML('beforeend','<details id="training-panel" hidden><summary>TRAINING GROUND <span>＋</span></summary><select id="training-drill" aria-label="Training drill"><option value="free">Free practice</option><option value="through">Through-ball runs</option><option value="finishing">Finishing</option></select><p id="training-tip">No clock. No opponent press. Full energy.</p><span id="training-progress"></span><button id="reset-drill">RESET BALL ↺</button></details>');
  const resetPractice=()=>{replay.clear();match.resetDrill($<HTMLSelectElement>('#training-drill').value as typeof match.drill);};
  $('#reset-drill').onclick=resetPractice;$('#training-drill').onchange=()=>{resetPractice();$<HTMLSelectElement>('#training-drill').blur();};
  $('#player-tag').insertAdjacentHTML('beforeend','<small class="sprint-hint">SHIFT / R1 · SPRINT</small>');
  $("#camera-view").onclick = () => {
    renderer.cameraMode = renderer.cameraMode==='follow'?'broadcast':renderer.cameraMode==='broadcast'?'street':'follow';
    $("#camera-view").textContent = renderer.cameraMode==='broadcast'?'WIDE':renderer.cameraMode.toUpperCase();
    $("#camera-view").setAttribute('aria-pressed',String(renderer.cameraMode!=='broadcast'));
    $("#camera-view").setAttribute('aria-label',`Camera: ${renderer.cameraMode}. Switch camera`);
  };
  const court=$('#court');
  const fitViewport=()=>{document.documentElement.style.setProperty('--game-height',`${window.visualViewport?.height??window.innerHeight}px`);};
  fitViewport();window.addEventListener('resize',fitViewport);window.visualViewport?.addEventListener('resize',fitViewport);
  court.addEventListener('contextmenu',e=>e.preventDefault());

  $('.camera-tools').insertAdjacentHTML('afterbegin','<button id="zoom-out" aria-label="Zoom camera out">−</button><button id="zoom-in" aria-label="Zoom camera in">+</button>');
  const zoom=(delta:number)=>{renderer.cameraZoom=Math.max(.65,Math.min(1.6,renderer.cameraZoom+delta));};
  $('#zoom-in').onclick=()=>zoom(-.12);$('#zoom-out').onclick=()=>zoom(.12);
  const touches=new Map<number,{x:number,y:number}>();let pinch=0;
  court.addEventListener('pointerdown',e=>{if(e.pointerType==='touch'&&(e.target as HTMLElement).tagName==='CANVAS'){touches.set(e.pointerId,{x:e.clientX,y:e.clientY});pinch=0;}});
  court.addEventListener('pointermove',e=>{if(!touches.has(e.pointerId))return;touches.set(e.pointerId,{x:e.clientX,y:e.clientY});if(touches.size===2){const [a,b]=[...touches.values()],distance=Math.hypot(a.x-b.x,a.y-b.y);if(pinch)zoom((pinch-distance)/250);pinch=distance;}});
  for(const event of ['pointerup','pointercancel','pointerleave'])court.addEventListener(event,e=>{touches.delete((e as PointerEvent).pointerId);pinch=0;});
  court.insertAdjacentHTML('beforeend','<div id="view-status" role="status" hidden></div>');
  let statusTimer=0;
  $('#fullscreen').onclick=async()=>{
    try{if(document.fullscreenElement)await document.exitFullscreen();else if(window.matchMedia('(display-mode: standalone)').matches||(navigator as Navigator & {standalone?:boolean}).standalone){const status=$('#view-status');status.hidden=false;status.textContent='Already in app view. Rotate your phone for a wider pitch.';clearTimeout(statusTimer);statusTimer=window.setTimeout(()=>status.hidden=true,3500);}else if(court.requestFullscreen)await court.requestFullscreen();else throw new Error('Unavailable');}
    catch{const status=$('#view-status');status.hidden=false;status.textContent='This browser cannot hide its bars. Add to Home Screen for an app-sized view.';clearTimeout(statusTimer);statusTimer=window.setTimeout(()=>status.hidden=true,6500);}
  };
  document.addEventListener('fullscreenchange',()=>{$('#fullscreen').setAttribute('aria-label',document.fullscreenElement?'Exit fullscreen':'Fullscreen court');$('#fullscreen').setAttribute('aria-pressed',String(!!document.fullscreenElement));});
  $('#match-overlay').addEventListener('keydown',event=>{
    if(event.key!=='Tab')return;
    const buttons=Array.from($('#match-overlay').querySelectorAll<HTMLButtonElement>('button'));
    const first=buttons[0],last=buttons[buttons.length-1];
    if(event.shiftKey&&document.activeElement===first){event.preventDefault();last?.focus();}
    else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first?.focus();}
  });
  function updateOverlay() {
    const overlay = $("#match-overlay");
    if(match.state==='PAUSED')input.reset();
    overlay.hidden = !(match.state === "PAUSED" || match.state === "FULL_TIME");
    if (match.state === "PAUSED") {
      overlay.setAttribute("role","dialog");overlay.setAttribute("aria-modal","true");overlay.setAttribute("aria-labelledby","pause-title");
      overlay.innerHTML = pauseMarkup(match,playingTeam,playingOpponent);
      $('#resume').focus();
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
      if(mode==='cup'&&!cupRecorded){cup=recordCup(cup,match.score[0],match.score[1]);cupRecorded=true;saveCup();renderCup();}
      $('#results-page').innerHTML=resultsMarkup(match,playingTeam,playingOpponent,renderer.ground);
      if(mode==='cup'){$('#result-rematch').textContent=cup.results.length===3?'START NEXT SEASON':'NEXT CUP MATCH';$('#result-rematch').insertAdjacentHTML('beforebegin',`<p class="cup-result">AREA CUP · ${points(cup)} POINTS · ${cup.results.length}/3 MATCHES${cup.results.length===3?(points(cup)>=7?' · CHAMPIONS':' · SEASON COMPLETE'):''}</p>`);}
      $('#result-rematch').onclick=start;
      $("#rematch").onclick = start;
      router.go('results');
    }
  }
  let replayGoalSerial='';
  let previous = performance.now(),
    accumulator = 0;
  let queued = idle();
  let hostPaused = false;
  void setupLagosLife(paused => {
    hostPaused = paused;
    input.reset(); queued = idle(); accumulator = 0; previous = performance.now();
    audio.setHostPaused(paused);
  },colour=>{
    kitColour=colour;
    refreshTeams();
    if(running){
      for(const p of match.players.filter(p=>p.team===0&&!p.keeper))renderer.setPlayerAppearance(p.id,homeKit(playingTeam),characterIdentity(playingTeam,match.lineups[0][p.id]),match.athlete(p).number);
      $('#scoreboard').style.setProperty('--home-kit',homeKit(playingTeam));
    }
    if(router.page==='squad')renderSquad();
  });
  if(window.parent !== window)$('#fullscreen').hidden = true;
  function frame(now: number) {
    const dt = Math.min(0.06, (now - previous) / 1000);
    debug?.((now-previous)/1000);
    previous = now;
    if(hostPaused){
      accumulator = 0; queued = idle(); input.reset();
      requestAnimationFrame(frame); return;
    }
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
    audio.setMatchPaused(match.state==='PAUSED');
    audio.update(dt,running&&match.state==='PLAYING'&&!replay.active,Math.hypot(match.players[match.active].vx,match.players[match.active].vy),match.condition==='rain',renderer.cameraTarget.x,renderer.cameraTarget.z,match.players[match.active].stride);
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
      if(match.training){$('#training-progress').textContent=`${match.completedPasses[0]} passes · ${match.shots[0]} shots · ${match.score[0]} goals`;$('#training-tip').textContent=match.drill==='through'?`PASSING TARGET: 5 completed passes · ${Math.min(5,match.completedPasses[0])}/5. K / △ leads the runner.`:match.drill==='finishing'?`FINISHING TARGET: 3 goals · ${Math.min(3,match.score[0])}/3. Aim, finish, reset.`:'No clock. No opponent press. Full energy.';}
      const t = Math.ceil(match.duration - match.elapsed);
      $("#timer").textContent =
        mode === "training"
          ? "PRACTICE"
          : `${String(Math.floor(t / 60)).padStart(2, "0")}:${String(t % 60).padStart(2, "0")}`;
      const announcement = $("#announcement");
      announcement.hidden = !(
        !replay.showing && (match.state === "KICKOFF" || match.state === "GOAL" || match.state === "FOUL" || match.state === "FREE_KICK" || match.restartPending)
      );
      const announcementText =
        match.state === "FOUL" ? `FOUL · ${match.referee?.team===0?'YOUR BALL':'OPPOSITION BALL'}` : match.state==='FREE_KICK' ? `${match.setPiece?.penalty?'PENALTY':'FREE KICK'} · ${match.setPiece?.team===0?'✕ PASS / □ SHOOT':'OPPOSITION'}` : match.state === "GOAL" ? "GOAL!" : match.kickoffTeam===0?"YOUR KICK-OFF · PRESS ✕":"OPPOSITION KICK-OFF";
      // Only touch the live region when the message actually changes, so screen readers
      // announce each goal once instead of re-reading it on every frame.
      if (announcement.textContent !== announcementText) announcement.textContent = announcementText;
      const moments=match.moments.filter(moment=>moment.id>lastMoment);
      if(moments.length){
        lastMoment=moments.at(-1)!.id;
        // Deliver all visual reactions and one crowd response for this moment.
        const priority=(kind:string)=>['late-winner','late-lead','penalty','foul','big-save','nutmeg'].includes(kind)?4:['goal','fulltime','near-goal','miss'].includes(kind)?3:2;
        moments.forEach(moment=>renderer.react(moment.kind,moment.intensity));
        const physical=['pass','shot','tackle','post','goal','kickoff','fulltime','foul','penalty'];
        moments.filter(m=>physical.includes(m.kind)).forEach(m=>audio.react(m));
        const reaction=moments.reduce((best,m)=>priority(m.kind)>priority(best.kind)?m:best);if(!physical.includes(reaction.kind))audio.react(reaction);
      }
      if (lastEvent !== match.eventSerial) {
        lastEvent = match.eventSerial;

        if (match.state === "FULL_TIME") updateOverlay();
        $("#court").setAttribute(
          "aria-label",
          `Football pitch · ${match.state==="FULL_TIME"?"Full time":"Match in progress"}`,
        );
      }
    }
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
  document.addEventListener("visibilitychange", () => {
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

  refreshTeams();
  router.sync();
  app.inert = false;
  app.removeAttribute("aria-busy");
  if (bootScreen) {
    document.documentElement.dataset.bootMs=String(Math.round(performance.now()-bootStarted));
    bootScreen.classList.add("ready");
    window.setTimeout(() => bootScreen.remove(), 600);
  }
}
void boot().catch((error) => {
  app.inert = false;
  app.removeAttribute("aria-busy");
  console.error(error);
  const screen = document.querySelector<HTMLElement>("#boot-screen");
  const title = document.querySelector<HTMLElement>("#boot-title");
  const detail = document.querySelector<HTMLElement>("#boot-detail");
  const retry = document.querySelector<HTMLButtonElement>("#boot-retry");
  if (title) title.textContent = "THE COURT DID NOT LOAD";
  if (detail)
    detail.textContent =
      "Your browser could not prepare the 3D pitch. Check that hardware acceleration is on, then try again.";
  if (screen) {
    screen.classList.add("failed");
    screen.setAttribute("role", "alert");
  }
  if (retry) {
    retry.hidden = false;
    retry.onclick = () => location.reload();
  } else {
    document.querySelector("#court")!.textContent =
      "The pitch could not load. Please refresh to try again.";
  }
});
