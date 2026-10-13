import {teams,type TeamStyle} from './teams';
export type Athlete={name:string;number:number;role:'GK'|'DEF'|'MID'|'FWD';pace:number;passing:number;shooting:number;defending:number};
export function makeRoster(team:number):Athlete[]{
 const roles:Athlete['role'][]=['GK','DEF','DEF','MID','FWD','MID','FWD','DEF','GK'];
 return [...teams[team].names,...teams[team].bench].map((name,i)=>({name,number:i===0?1:i===8?20:i+6,role:roles[i],pace:65+(i*7)%28+(teams[team].style==='counter'?3:teams[team].style==='possession'?-3:0),passing:68+(i*5)%25+(teams[team].style==='possession'?3:teams[team].style==='counter'?-3:0),shooting:roles[i]==='FWD'?90:61+(i*9+team)%25,defending:roles[i]==='DEF'?88:60+(i*3)%24}));
}
export type Tactic=TeamStyle;
export const tactics:Record<Tactic,{name:string;description:string}>={
 possession:{name:'Possession',description:'Short passing triangles. Offer a nearby outlet and keep the ball moving.'},
 compact:{name:'Compact block',description:'Stay narrow without the ball. Protect the centre before stepping out.'},
 balanced:{name:'Balanced',description:'Keep passing options nearby. Recover your shape when possession changes.'},
 press:{name:'High press',description:'Two players close down the ball. Faster pressure uses more stamina.'},
 counter:{name:'Counter attack',description:'Defend deeper. Send runners forward as soon as your team wins the ball.'},
};
