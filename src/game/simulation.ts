import {formations,type Formation} from "../content/formations";
import {gameplay} from "./gameplay.config";
import {passOptions,passDestination} from "./football/passing";
import {conditions,type Conditions} from "../content/conditions";
import {PITCH} from "./pitch";
import { makeRoster, type Athlete, type Tactic } from "../content/roster";
import {
  actionTiming,
  type ActionKind,
  type PlayerAction,
  type PendingKick,
} from "./animation/actions";
export type Input = {
  x: number;
  y: number;
  sprint: boolean;
  pass: boolean;
  shoot: boolean;
  through: boolean;
  tackle: boolean;
  switch: boolean;
  skill: boolean;
  contain?: boolean;
  secondPress?: boolean;
  keeperRush?: boolean;
  passAndMove?: boolean;
};
export const idle = (): Input => ({
  x: 0,
  y: 0,
  sprint: false,
  pass: false,
  shoot: false,
  through: false,
  tackle: false,
  switch: false,
  skill: false,
});
export type State = "KICKOFF" | "PLAYING" | "GOAL" | "PAUSED" | "FULL_TIME";
export type Player = {
  id: number;
  team: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  homeX: number;
  homeY: number;
  keeper: boolean;
  facingX: number;
  facingY: number;
  cooldown: number;
  recovery: number;
  stamina: number;
  pace: number;
  shooting: number;
  passing: number;
  action: PlayerAction | null;
  pendingKick: PendingKick | null;
  stride: number;
  touchTime: number;
  receiveTime: number;
  runUntil: number;
};
export class Match {
  players: Player[] = [];
  rosters: Athlete[][] = [makeRoster(0),makeRoster(1)];
  lineups = [[0,1,2,3,4],[0,1,2,3,4]];
  tactics: Tactic[] = ['balanced','balanced'];
  formations:Formation[]=['2-2','2-2'];
  setFormation(team:number,formation:Formation){
    if(!(formation in formations)||team<0||team>1)return;
    this.formations[team]=formation;
    for(const p of this.players.filter(p=>p.team===team)){const [x,y]=formations[formation].positions[p.id%5],sign=team===0?1:-1;p.homeX=x*sign;p.homeY=y*sign;}
  }
  substitutions = [0,0];
  configure(team:number,roster:Athlete[],lineup:number[],tactic:Tactic='balanced') {
    if(new Set(lineup).size!==5||lineup.length!==5||roster[lineup[0]]?.role!=='GK'||lineup.slice(1).some(i=>!roster[i]||roster[i].role==='GK'))throw new Error('Invalid starting five');
    this.rosters[team]=roster;this.lineups[team]=[...lineup];this.tactics[team]=tactic;
    for(const p of this.players.filter(p=>p.team===team))this.applyAttributes(p);
  }
  athlete(p:Player){return this.rosters[p.team][this.lineups[p.team][p.id%5]];}
  applyAttributes(p:Player){const a=this.athlete(p);p.pace=4.5+a.pace*.025;p.passing=a.passing/100;p.shooting=.65+a.shooting*.0045;}
  substitute(slot:number,reserve:number,team=0){
    if(this.state!=='PAUSED'&&this.state!=='KICKOFF')return false;
    const athlete=this.rosters[team][reserve];
    if(slot<0||slot>4||!athlete||this.lineups[team].includes(reserve)||(athlete.role==='GK')!==(slot===0))return false;
    this.lineups[team][slot]=reserve;const p=this.players[team*5+slot];p.stamina=1;p.action=null;p.pendingKick=null;p.cooldown=0;p.vx=p.vy=0;this.applyAttributes(p);this.substitutions[team]++;this.emit('substitution');return true;
  }
  ball = { x: 0, y: 0, vx: 0, vy: 0, z: 0, vz: 0 };
  owner: number | null = null;
  lastTouch = 0;
  active = 3;
  manualSelectionUntil = 0;
  selectPlayer(id:number){if(this.players[id]?.team!==0)return;this.active=id;this.manualSelectionUntil=this.elapsed+2;}
  selectDefenderAfterLoss(){const p=this.players[this.active];if(this.elapsed>=this.manualSelectionUntil && Math.hypot(p.x-this.ball.x,p.y-this.ball.y)>8)this.active=this.nearest(0).id;}
  score = [0, 0];
  elapsed = 0;
  state: State = "KICKOFF";
  previous: State = "PLAYING";
  stateTime = 1.5;
  lock = 0;
  aiTime = 0;
  presentationTime = 0;
  saves = [0, 0];
  possession = [0, 0];
  shots = [0, 0];
  passes = [0, 0];
  tackles = [0, 0];
  event = "kickoff";
  eventSerial = 0;
  scorer = 0;
  condition:Conditions='golden';
  kickoffTeam = 0;
  restartPending = false;
  restartTime = 0;
  passFlight: { receiver: number; age: number; through: boolean; speed: number; targetX: number; targetY: number } | null = null;
  bufferedPass: {player:number;expires:number;through:boolean;x:number;y:number} | null = null;
  completedPasses = [0,0];
  passCandidate: ReturnType<typeof passOptions>[number] | null = null;
  constructor(
    public duration = 180,
    public difficulty = 1,
  ) {
    this.resetPositions(0);
  }
  resetPositions(kickoffTeam?: number) {
    const stamina=this.players.map(p=>p.stamina);
    this.players = [];
    for (let t = 0; t < 2; t++) {
      const sign = t === 0 ? 1 : -1;
      formations[this.formations[t]].positions.forEach(([x, y], i) =>
        this.players.push({
          id: t * 5 + i,
          team: t,
          x: x * sign,
          y: y * sign,
          homeX: x * sign,
          homeY: y * sign,
          vx: 0,
          vy: 0,
          keeper: i === 0,
          facingX: sign,
          facingY: 0,
          cooldown: 0,
          recovery: 0,
          stamina: 1,
          pace: 6 + (i % 3) * 0.35,
          shooting: 0.8 + i * 0.03,
          passing: 0.85 + i * 0.02,
          action: null,
          pendingKick: null,
          stride: 0,
          touchTime: 0, receiveTime: 0, runUntil: 0,
        }),
      );
    }
    for(const p of this.players){this.applyAttributes(p);p.stamina=stamina[p.id]??1;}
    this.ball = { x: 0, y: 0, vx: 0, vy: 0, z: 0, vz: 0 };
    this.owner = null;
    this.lock = 0.2;
    this.active = 3;
    this.passFlight = null;
    this.bufferedPass=null;
    this.restartPending = kickoffTeam !== undefined;
    this.restartTime = 0;
    if (kickoffTeam !== undefined) {
      this.kickoffTeam = kickoffTeam;
      const taker = this.players[kickoffTeam * 5 + 3];
      taker.x = kickoffTeam === 0 ? -.64 : .64;
      taker.y = 0;
      const partner = this.players[kickoffTeam * 5 + 4];
      partner.x = kickoffTeam === 0 ? -2.5 : 2.5;
      partner.y = 3;
      for (const p of this.players) {
        if (p.team !== kickoffTeam && !p.keeper && Math.abs(p.x) < 7) p.x = (p.team === 0 ? -1 : 1) * 7;
      }
      this.owner = taker.id;
      this.lastTouch = taker.id;
      if (kickoffTeam === 0) this.active = taker.id;
    }
  }
  emit(event: string) {
    this.event = event;
    this.eventSerial++;
  }
  pause() {
    if (this.state === "PAUSED") this.state = this.previous;
    else if (this.state !== "FULL_TIME") {
      this.previous = this.state;
      this.state = "PAUSED";
    }
  }
  nearest(team: number, exclude = -1) {
    return this.players
      .filter((p) => p.team === team && !p.keeper && p.id !== exclude)
      .sort(
        (a, b) =>
          Math.hypot(a.x - this.ball.x, a.y - this.ball.y) -
          Math.hypot(b.x - this.ball.x, b.y - this.ball.y),
      )[0];
  }
  beginAction(p: Player, kind: ActionKind, side = 1) {
    p.action = {
      kind,
      elapsed: 0,
      duration: actionTiming[kind].duration,
      side,
      contacted: false,
    };
  }
  kick(
    p: Player,
    tx: number,
    ty: number,
    power: number,
    lob = false,
    kind: "pass" | "shot" = "shot",
    receiver: number | null = null,
  ) {
    if (this.owner !== p.id || p.pendingKick || p.action || p.cooldown > 0)
      return false;
    const d = Math.hypot(tx - p.x, ty - p.y) || 1;
    p.facingX = (tx - p.x) / d;
    p.facingY = (ty - p.y) / d;
    p.pendingKick = { tx, ty, power, lob, kind, receiver };
    this.beginAction(p, kind);
    p.cooldown = actionTiming[kind].duration;
    return true;
  }
  releaseKick(p: Player) {
    const kick = p.pendingKick;
    p.pendingKick = null;
    if (!kick || this.owner !== p.id) return;
    if (kick.kind === 'pass' && kick.receiver !== null) {
      const receiver = this.players[kick.receiver];
      const target=passDestination(p,receiver,kick.power,!!kick.through);
      kick.tx=target.x;kick.ty=target.y;
      const heading=Math.hypot(kick.tx-p.x,kick.ty-p.y)||1;
      p.facingX=(kick.tx-p.x)/heading;p.facingY=(kick.ty-p.y)/heading;
      this.passFlight={receiver:receiver.id,age:0,through:!!kick.through,speed:kick.power,targetX:target.x,targetY:target.y};
    } else this.passFlight=null;
    this.restartPending=false;
    const d = Math.hypot(kick.tx - p.x, kick.ty - p.y) || 1,
      dx = (kick.tx - p.x) / d,
      dy = (kick.ty - p.y) / d;
    this.ball.x = p.x + dx * 0.64 + dy * 0.1;
    this.ball.y = p.y + dy * 0.64 - dx * 0.1;
    this.ball.vx = dx * kick.power;
    this.ball.vy = dy * kick.power;
    this.ball.vz = kick.lob ? 6 : 0;
    this.ball.z = kick.lob ? 0.15 : 0;
    this.owner = null;
    this.lastTouch = p.id;
    this.lock = 0.23;
    this.emit(kick.kind);
    if (kick.kind === "shot") this.shots[p.team]++;
    else {
      this.passes[p.team]++;
      if (p.team === 0 && kick.receiver !== null) this.active = kick.receiver;
    }
  }
  advanceActions(dt: number) {
    for (const p of this.players) {
      const action = p.action;
      if (!action) continue;
      if (p.pendingKick && this.owner !== p.id) {
        p.pendingKick = null;
        p.action = null;
        continue;
      }
      action.elapsed = Math.min(action.duration, action.elapsed + dt);
      if (
        !action.contacted &&
        action.elapsed + 1e-9 >= actionTiming[action.kind].contact
      ) {
        action.contacted = true;
        if (p.pendingKick) this.releaseKick(p);
        if (action.kind === "tackle") {
          const carrier = this.owner === null ? null : this.players[this.owner];
          if (
            carrier &&
            carrier.team !== p.team &&
            this.lock === 0 && carrier.recovery === 0 &&
            ((carrier.x-p.x)*p.facingX+(carrier.y-p.y)*p.facingY)/(Math.hypot(carrier.x-p.x,carrier.y-p.y)||1)>gameplay.tackling.minAlignment &&
            Math.hypot(carrier.x - p.x, carrier.y - p.y) < 1.6+this.athlete(p).defending*.003
          ) {
            this.owner = p.id;
            const fromOpponent=this.players[this.lastTouch].team!==p.team;
          const completed=this.passFlight!==null&&this.players[this.lastTouch].team===p.team;
          this.lastTouch = p.id;
            // End the winning tackle at contact: control returns immediately.
            // The losing player must recover before attempting another challenge.
            this.lock = gameplay.tackling.protection;
            this.passFlight=null;
            p.action=null;p.cooldown=0;p.recovery=0;p.touchTime=0;p.receiveTime=.18;
            if(p.team===0)this.active=p.id;else this.selectDefenderAfterLoss();
            carrier.cooldown=Math.max(carrier.cooldown,gameplay.tackling.retry);
            carrier.recovery=gameplay.tackling.recovery;
            const dx=carrier.x-p.x,dy=carrier.y-p.y,d=Math.hypot(dx,dy)||1;
            carrier.vx=dx/d*2.4;carrier.vy=dy/d*2.4;
            this.tackles[p.team]++;
            carrier.pendingKick = null;
            carrier.action = null;
            this.emit("tackle");
          }
        }
      }
      if (action.elapsed >= action.duration) p.action = null;
    }
  }
  tackle(p: Player) {
    if (p.cooldown > 0 || p.action || p.recovery > 0 || this.lock > 0) return;
    p.cooldown = actionTiming.tackle.duration;
    this.beginAction(p, "tackle");
    const carrier = this.owner === null ? null : this.players[this.owner];
    if (carrier && carrier.team !== p.team) {
      const d = Math.hypot(carrier.x - p.x, carrier.y - p.y) || 1;
      p.facingX = (carrier.x - p.x) / d;
      p.facingY = (carrier.y - p.y) / d;
    }
  }
  pass(p: Player, through = false, lob = false) {
    const options=passOptions(p,this.players,through);
    const best=options[0];this.passCandidate=best??null;
    // A protected restart always has a legal short outlet, irrespective of facing.
    const target=best?this.players[best.receiver]:this.restartPending?this.players[p.team*5+4]:null;
    if(!target)return false;
    const distance=Math.hypot(target.x-p.x,target.y-p.y);
    const power=Math.min(gameplay.passing.maxSpeed,Math.max(gameplay.passing.minSpeed,10+distance*.72))*(through?1.12:1);
    const kicked=this.kick(p,target.x,target.y,power,lob,'pass',target.id);
    if(kicked&&p.pendingKick)p.pendingKick.through=through;
    return kicked;
  }
  shoot(p: Player, aimY=0) {
    const dir=p.team===0?1:-1,keeper=this.players[(1-p.team)*5];
    const pressure=this.players.filter(q=>q.team!==p.team).reduce((n,q)=>Math.max(n,Math.max(0,1-Math.hypot(q.x-p.x,q.y-p.y)/2.5)),0);
    const distance=Math.hypot(dir*30-p.x,p.y);
    const openSide=keeper.y>p.y*.2?-1:1;
    const intended=Math.abs(aimY)>.15?aimY*2.8:openSide*(1.3+p.shooting*.6);
    // Deterministic execution error: pressure and shooting across the body reduce accuracy.
    const balance=Math.abs(p.vy)*.04+Math.max(0,-p.facingX*dir)*.35;
    const error=(1-p.shooting+pressure*.3+balance)*Math.min(2,distance*.07);
    const targetY=Math.max(-3.7,Math.min(3.7,intended+Math.sign(intended||1)*error));
    this.kick(p,dir*31,targetY,(23+Math.min(5,distance*.15))*p.shooting*(1-pressure*.08));
  }
  step(dt: number, input: Input) {
    if (this.state === "PAUSED" || this.state === "FULL_TIME") return;
    this.presentationTime += dt;
    if (this.state !== "PLAYING") {
      if (this.state === "GOAL") this.advanceActions(dt);
      this.stateTime -= dt;
      if (this.stateTime <= 0) {
        if (this.state === "GOAL") {
          this.resetPositions(this.kickoffTeam);
          this.state = "KICKOFF";
          this.stateTime = 1.2;
          this.emit("kickoff");
        } else this.state = "PLAYING";
      }
      return;
    }
    // Opponents wait outside the centre circle until the restart pass is struck.
    if (this.restartPending && this.owner === this.kickoffTeam*5+3) {
      this.restartTime += dt;
      const taker=this.players[this.owner];
      if ((this.kickoffTeam===0 && (input.pass||input.through||input.tackle||input.shoot)) || (this.kickoffTeam===1 && this.restartTime>.65)) this.pass(taker);
      this.advanceActions(dt);
      for(const p of this.players)p.cooldown=Math.max(0,p.cooldown-dt);
      return;
    }
    this.restartPending=false;
    this.elapsed = Math.min(this.duration, this.elapsed + dt);
    if (this.elapsed >= this.duration) {
      this.state = "FULL_TIME";
      for (const p of this.players) {
        p.action = null;
        p.pendingKick = null;
        p.vx = p.vy = 0;
      }
      this.emit("fulltime");
      return;
    }
    this.lock = Math.max(0, this.lock - dt);
    this.aiTime += dt;
    this.advanceActions(dt);
    if(input.passAndMove && this.owner!==null && this.players[this.owner].team===0)this.active=this.owner;
    if (input.switch && !input.passAndMove) this.selectPlayer(this.nearest(0, this.active).id);
    if(this.bufferedPass && this.bufferedPass.expires<this.elapsed)this.bufferedPass=null;
    if(this.owner!==this.active && this.passFlight?.receiver===this.active && (input.pass||input.through))
      this.bufferedPass={player:this.active,expires:this.elapsed+gameplay.passing.bufferSeconds,through:input.through,x:input.x,y:input.y};
    const own = this.owner === null ? null : this.players[this.owner];
    if (own) this.possession[own.team] += dt;

    const chase = [this.nearest(0).id, this.nearest(1).id];
    for (const p of this.players) {
      p.cooldown = Math.max(0, p.cooldown - dt);
      p.recovery = Math.max(0,p.recovery-dt);
      p.receiveTime=Math.max(0,p.receiveTime-dt);p.touchTime=Math.max(0,p.touchTime-dt);
      let mx = 0,
        my = 0,
        sprint = false;
      const dir = p.team === 0 ? 1 : -1;
      if (p.id === this.active) {
        mx = input.x;
        my = input.y;
        sprint = input.sprint;
        if(this.passFlight?.receiver===p.id && Math.hypot(mx,my)<.1) {
          const dx=this.passFlight.targetX-p.x,dy=this.passFlight.targetY-p.y,d=Math.hypot(dx,dy);
          if(d>.25){mx=dx/d*Math.min(1,d/2);my=dy/d*Math.min(1,d/2);}
        }
        const aim = Math.hypot(mx, my);
        if (aim > 0.12 && !p.action) {
          p.facingX = mx / aim;
          p.facingY = my / aim;
        }
        if (this.owner === p.id) {
          if (input.shoot) this.shoot(p,input.y);
          else if (input.pass || input.through) {if(this.pass(p, input.through)&&input.passAndMove)p.runUntil=this.elapsed+gameplay.movement.runSeconds;}
          if (input.skill && p.cooldown === 0) {
            p.touchTime=0;
            p.cooldown = 0.8;
            this.beginAction(p, "skill");
            this.emit("skill");
          }
        }
        if(this.owner!==p.id && own?.team!==p.team && input.contain){
          const dx=this.ball.x-p.x,dy=this.ball.y-p.y,d=Math.hypot(dx,dy)||1;
          if(d>1.15){mx=dx/d*.85;my=dy/d*.85;}
          else {mx=0;my=0;}
        }
        if (input.tackle) {if(this.owner===p.id)this.pass(p,false,true);else this.tackle(p);}
      } else {
        let tx = p.homeX,
          ty = p.homeY;
        if (p.keeper) {
          tx =
            dir * -28 +
            Math.min(3, Math.max(0, dir * this.ball.x + 26) * 0.09) * dir;
          ty = Math.max(-3, Math.min(3, this.ball.y * 0.4));
          if ((p.team===0&&input.keeperRush) || Math.hypot(p.x - this.ball.x, p.y - this.ball.y) < 4) {
            tx = this.ball.x;
            ty = this.ball.y;
          }
        } else if (this.owner === p.id) {
          tx = dir * 28;
          ty = p.y * 0.6;
          if (p.cooldown === 0) {
            if (dir * p.x > 16 && Math.abs(p.y) < 9) this.shoot(p);
            else if (
              this.aiTime % gameplay.ai.decisionInterval[p.team===0?1:this.difficulty] < dt &&
              this.players.some(
                (q) =>
                  q.team !== p.team && Math.hypot(q.x - p.x, q.y - p.y) < 3,
              )
            )
              this.pass(p);
          }
        } else if(this.passFlight?.receiver===p.id) {
          tx=this.passFlight.targetX;ty=this.passFlight.targetY;
        } else if ((chase[p.team] === p.id || ((this.tactics[p.team]==='press'||(p.team===0&&input.secondPress))&&this.nearest(p.team,chase[p.team]).id===p.id)) && own?.team !== p.team) {
          tx = this.ball.x;
          ty = this.ball.y;
        } else {
          tx =
            p.homeX + this.ball.x * 0.42 + (own?.team === p.team ? dir * (this.tactics[p.team]==='counter'?9:5) : this.tactics[p.team]==='counter'?-dir*3:0);
          ty = p.homeY + this.ball.y * 0.22;
        }
        if(own?.team===p.team && !p.keeper && this.owner!==p.id && this.passFlight?.receiver!==p.id){
          const slot=p.id%5, carrier=own, counter=this.tactics[p.team]==='counter';
          if(p.runUntil>this.elapsed){tx=p.x+dir*8;ty=p.homeY; sprint=true;}
          else if(slot<=2){tx=carrier.x-dir*(slot===1?(counter?11:8):4);ty=slot===1?-10:10;}
          else {tx=carrier.x+dir*(slot===3?(counter?8:5):(counter?14:10));ty=slot===3?-7:7;}
          tx=Math.max(-26,Math.min(26,tx));
        }
        if(this.tactics[p.team]==='press'&&own?.team!==p.team&&!p.keeper)sprint=true;
        let dx = tx - p.x,
          dy = ty - p.y,
          d = Math.hypot(dx, dy);
        if (d > 0.3) {
          mx = dx / d;
          my = dy / d;
        }
        if (p.keeper && this.owner === p.id && p.cooldown === 0) this.pass(p);
        if (
          own &&
          own.team !== p.team &&
          !p.keeper &&
          Math.hypot(p.x - own.x, p.y - own.y) < gameplay.ai.pressureDistance[p.team===0?1:this.difficulty] &&
          this.lock === 0
        )
          this.tackle(p);
        if (
          p.keeper &&
          this.owner === null &&
          !p.action &&
          p.cooldown === 0 &&
          Math.abs(this.ball.vx) > 8
        ) {
          const travel = (p.x - this.ball.x) / this.ball.vx;
          const predictedY = this.ball.y + this.ball.vy * travel;
          if (
            travel > 0 &&
            travel < [0.2, 0.28, 0.36][this.difficulty] &&
            Math.abs(predictedY - p.y) < 2.2 &&
            this.ball.z < 1.6
          ) {
            p.facingX = dir;
            p.facingY = 0;
            this.beginAction(
              p,
              "dive",
              Math.sign(-(predictedY - p.y) * dir) || 1,
            );
            p.cooldown = 0.95;
          }
        }
      }
      const planted =
        p.action &&
        ["pass", "shot", "tackle", "catch", "dive"].includes(p.action.kind);
      if (planted || p.recovery>0) {
        mx = 0;
        my = 0;
        sprint = false;
      }
      const mag = Math.hypot(mx, my);
      if (mag > 1) {
        mx /= mag;
        my /= mag;
      }
      if (mag > 0.12 && !p.action) {
        p.facingX = mx / (mag > 1 ? 1 : mag);
        p.facingY = my / (mag > 1 ? 1 : mag);
      }
      p.stamina = Math.max(
        0,
        Math.min(1, p.stamina + (sprint && mag > 0.1 ? -0.12 : 0.08) * dt),
      );
      const speed =
        p.pace * (0.78 + .22*p.stamina) *
        (sprint && p.stamina > 0.05 ? gameplay.movement.sprintMultiplier : 1);
      const lerp = 1 - Math.exp(-(p.recovery>0?5:planted ? 35 : 14*conditions[this.condition].traction) * dt);
      p.vx += (mx * speed - p.vx) * lerp;
      p.vy += (my * speed - p.vy) * lerp;
      p.x = Math.max(-29.5, Math.min(29.5, p.x + p.vx * dt));
      p.y = Math.max(-17.5, Math.min(17.5, p.y + p.vy * dt));
      p.stride = (p.stride + (Math.hypot(p.vx, p.vy) * dt) / 2.4) % 1;
    }
    for (let i = 0; i < 10; i++)
      for (let j = i + 1; j < 10; j++) {
        const a = this.players[i],
          b = this.players[j],
          dx = b.x - a.x,
          dy = b.y - a.y,
          d = Math.hypot(dx, dy);
        if (d > 0.001 && d < 0.8) {
          const push = (0.8 - d) * 0.5;
          a.x -= (dx / d) * push;
          a.y -= (dy / d) * push;
          b.x += (dx / d) * push;
          b.y += (dy / d) * push;
        }
      }
    for(const p of this.players){p.x=Math.max(-29.5,Math.min(29.5,p.x));p.y=Math.max(-17.5,Math.min(17.5,p.y));}
    if (this.owner !== null) {
      this.passFlight=null;
      const p = this.players[this.owner];
      if(p.keeper || p.pendingKick){
        const distance=.64;
        this.ball.vx=(p.x+p.facingX*distance-this.ball.x)*18;
        this.ball.vy=(p.y+p.facingY*distance-this.ball.y)*18;
        this.ball.z=p.keeper&&!p.pendingKick ? .9 : 0;
      }else{
        const speed=Math.hypot(p.vx,p.vy),distance=Math.hypot(this.ball.x-p.x,this.ball.y-p.y);
        if(distance>gameplay.control.turnReleaseDistance && p.receiveTime===0){
          this.owner=null;this.lock=.08;
        }else if(p.touchTime===0 || distance<.3){
          const reach=gameplay.control.walkReach+Math.min(1,speed/10)*(gameplay.control.sprintReach-gameplay.control.walkReach);
          const side=Math.sin(p.stride*Math.PI*2)*.12;
          const tx=p.x+p.facingX*reach+p.facingY*side,ty=p.y+p.facingY*reach-p.facingX*side;
          const interval=gameplay.control.touchInterval;
          this.ball.vx=p.vx+(tx-this.ball.x)/interval;
          this.ball.vy=p.vy+(ty-this.ball.y)/interval;
          p.touchTime=interval;
        }
        this.ball.z=0;
      }
    } else {
      if(this.passFlight){this.passFlight.age+=dt;if(this.passFlight.age>4)this.passFlight=null;}
      const drag = Math.exp(-(this.passFlight ? gameplay.passing.drag : conditions[this.condition].drag) * dt);
      this.ball.vx *= drag;
      this.ball.vy *= drag;
      this.ball.vz -= 12 * dt;
      this.ball.z += this.ball.vz * dt;
      if (this.ball.z < 0) {
        this.ball.z = 0;
        this.ball.vz = Math.abs(this.ball.vz) * conditions[this.condition].bounce;
        if (this.ball.vz < 0.5) this.ball.vz = 0;
      }
    }
    const previousBall = { x: this.ball.x, y: this.ball.y };
    this.ball.x += this.ball.vx * dt;
    this.ball.y += this.ball.vy * dt;
    if (Math.abs(this.ball.x) > PITCH.halfLength) {
      if (Math.abs(this.ball.y) < PITCH.goalHalfWidth && this.ball.z < PITCH.goalHeight) {
        const team = this.ball.x > 0 ? 0 : 1;
        this.score[team]++;
        this.kickoffTeam=1-team;
        this.passFlight=null;
        this.scorer = this.lastTouch;
        if (this.owner !== null) this.scorer = this.owner;
        for (const player of this.players) {
          player.vx = player.vy = 0;
          player.pendingKick = null;
          if (player.team === team) this.beginAction(player, "celebrate");
          else player.action = null;
        }
        this.state = "GOAL";
        this.stateTime = 2.5;
        this.emit("goal");
        return;
      }
      this.ball.x = Math.sign(this.ball.x) * (PITCH.halfLength-.1);
      this.ball.vx *= -0.65;
      this.owner = null;
      this.passFlight=null;
    }
    if (Math.abs(this.ball.y) > PITCH.halfWidth) {
      this.ball.y = Math.sign(this.ball.y) * (PITCH.halfWidth-.1);
      this.ball.vy *= -0.7;
      this.owner = null;
      this.passFlight=null;
    }
    if (this.owner === null && (this.lock === 0 || this.passFlight !== null) && this.ball.z < 1.6) {
      for (const p of this.players) {
        if(p.id===this.lastTouch&&this.lock>0)continue;
        if (p.action && p.action.kind !== "dive") continue;
        const dx = this.ball.x - previousBall.x,
          dy = this.ball.y - previousBall.y,
          dd = dx * dx + dy * dy;
        const along = dd
          ? Math.max(
              0,
              Math.min(
                1,
                ((p.x - previousBall.x) * dx + (p.y - previousBall.y) * dy) /
                  dd,
              ),
            )
          : 0;
        const dist = Math.hypot(
          p.x - previousBall.x - dx * along,
          p.y - previousBall.y - dy * along,
        );
        const dive = p.action?.kind === "dive";
        const reach = p.keeper
          ? dive
            ? 1.0 +
              Math.sin((Math.min(1, p.action!.elapsed / 0.32) * Math.PI) / 2) *
                0.9
            : 1
          : this.passFlight?.receiver===p.id ? 1.1 : 0.75;
        if (dist < reach && (p.keeper || this.ball.z < 0.65)) {
          const speed = Math.hypot(this.ball.vx, this.ball.vy);
          const fromOpponent=this.players[this.lastTouch].team!==p.team;
          const completed=this.passFlight!==null&&this.players[this.lastTouch].team===p.team;
          this.lastTouch = p.id;
          if (p.keeper && fromOpponent && speed > 8) {
            this.saves[p.team]++;
            this.emit("save");
          }
          if (p.keeper && fromOpponent && speed > 21) {
            // A hard shot is parried back into play, never teleported into possession.
            this.ball.x = p.x + (p.team === 0 ? 1 : -1) * 1.1;
            this.ball.y = p.y;
            this.ball.vx = (p.team === 0 ? 1 : -1) * speed * 0.48;
            this.ball.vy = (this.ball.vy || 2) * 0.55;
            this.ball.z = 0.25;
            this.ball.vz = 2;
            this.lock = 0.3;
            if (!dive)
              this.beginAction(p, "dive", Math.sign(this.ball.vy) || 1);
            p.cooldown = 0.95;
          } else {
            if(completed)this.completedPasses[p.team]++;
            this.owner = p.id;
            if(Math.hypot(p.vx,p.vy)<1){const incoming=Math.hypot(this.ball.vx,this.ball.vy)||1;p.facingX=-this.ball.vx/incoming;p.facingY=-this.ball.vy/incoming;}
            p.receiveTime=gameplay.control.receptionSeconds;
            p.touchTime=p.receiveTime;
            if(p.team===0)this.active=p.id;else this.selectDefenderAfterLoss();
            this.passFlight=null;
            const retention=p.keeper?0:.12+(1-p.passing)*.18;
            this.ball.vx = this.ball.vx*retention+p.vx*.5;
            this.ball.vy = this.ball.vy*retention+p.vy*.5;
            this.ball.vz = 0;
            p.cooldown = p.keeper ? 0.68 : 0.06;
            if(this.bufferedPass?.player===p.id){
              const buffered=this.bufferedPass;this.bufferedPass=null;p.cooldown=0;
              const aim=Math.hypot(buffered.x,buffered.y);
              if(aim>.1){p.facingX=buffered.x/aim;p.facingY=buffered.y/aim;}
              this.pass(p,buffered.through);
            }
            if (p.keeper) {
              this.beginAction(p, "catch");
              this.ball.z = 0.9;
            }
          }
          break;
        }
      }
    }
  }
}
