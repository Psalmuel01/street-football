export type MomentKind = 'kickoff'|'pass'|'shot'|'goal'|'save'|'big-save'|'miss'|'near-goal'|'tackle'|'hard-tackle'|'foul'|'free-kick'|'penalty'|'skill'|'nutmeg'|'late-lead'|'late-winner'|'close-match'|'substitution'|'fulltime'|'atmosphere';
export type MatchMoment={id:number;kind:MomentKind;time:number;team:number;intensity:number};
/** Presentation randomness never changes the simulation. No immediate repeated line. */
export class ReactionDirector {
 private last=new Map<string,number>();
 private played=new Map<string,number>();
 constructor(private random= Math.random){}
 choose(kind:string,count:number){if(count<1)return -1;const prior=this.last.get(kind);let index=Math.floor(this.random()*(prior===undefined?count:Math.max(1,count-1)));if(prior!==undefined&&count>1&&index>=prior)index++;this.last.set(kind,index);return index;}
 accept(moment:MatchMoment){const gap=['goal','foul','penalty','late-winner','fulltime'].includes(moment.kind)?0:['close-match'].includes(moment.kind)?30:moment.kind==='shot'||moment.kind==='pass'?8:2.5;const before=this.played.get(moment.kind)??-100;if(moment.time-before<gap)return false;this.played.set(moment.kind,moment.time);return true;}
 reset(){this.last.clear();this.played.clear();}
}
