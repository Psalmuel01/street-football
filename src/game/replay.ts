import type { Match } from './simulation';
export type MatchFrame = Pick<Match,'players'|'ball'|'active'|'state'|'presentationTime'|'score'|'passFlight'>;
export const snapshot = (match: MatchFrame): MatchFrame => ({
  players:match.players.map(p=>({...p,action:p.action?{...p.action}:null,pendingKick:p.pendingKick?{...p.pendingKick}:null})),
  ball:{...match.ball},active:match.active,state:match.state,presentationTime:match.presentationTime,score:[...match.score],passFlight:match.passFlight?{...match.passFlight}:null,
});
/** Bounded simulation snapshots: replay never rewinds or mutates the live match. */
export class GoalReplay {
  history: MatchFrame[]=[];
  frames: MatchFrame[]=[];
  active=false;
  time=0;
  get showing(){return this.active&&this.time>=.85;}
  get progress(){return Math.min(1,Math.max(0,(this.time-.85)*.7/Math.max(1/60,(this.frames.length-1)/60)));}
  record(match:MatchFrame){if(this.active)return;this.history.push(snapshot(match));if(this.history.length>300)this.history.shift();}
  start(){this.frames=this.history.map(snapshot);this.active=this.frames.length>1;this.time=0;}
  clear(){this.history=[];this.frames=[];this.active=false;this.time=0;}
  skip(){this.active=false;this.history=[];}
  advance(dt:number,paused:boolean){if(!this.active||paused)return;this.time+=dt;if(this.progress>=1&&this.time>.85)this.skip();}
  sample():MatchFrame|null{
    if(!this.showing)return null;
    const index=Math.min(this.frames.length-1,(this.time-.85)*.7*60),a=this.frames[Math.floor(index)],b=this.frames[Math.min(this.frames.length-1,Math.ceil(index))],f=index%1;
    const frame=snapshot(a);frame.state='PLAYING';frame.presentationTime=a.presentationTime+(b.presentationTime-a.presentationTime)*f;
    for(let i=0;i<frame.players.length;i++){
      const p=frame.players[i],q=b.players[i];p.x+=(q.x-p.x)*f;p.y+=(q.y-p.y)*f;
      if(p.action&&q.action&&p.action.kind===q.action.kind)p.action.elapsed+=(q.action.elapsed-p.action.elapsed)*f;
    }
    for(const key of ['x','y','z'] as const)frame.ball[key]+=(b.ball[key]-frame.ball[key])*f;
    return frame;
  }
}
