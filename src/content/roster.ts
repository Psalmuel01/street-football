import {teams} from './teams';
export type Athlete={name:string;number:number;role:'GK'|'DEF'|'MID'|'FWD';pace:number;passing:number;shooting:number;defending:number};
const benchNames=[['Chuka','Lanre','Dayo','Uche'],['Seun','Ibrahim','Jide','Chima'],['Sola','David','Faruq','Chinedu'],['Dapo','Timi','Yusuf','Kelechi']];
export function makeRoster(team:number):Athlete[]{
 const roles:Athlete['role'][]=['GK','DEF','DEF','MID','FWD','MID','FWD','DEF','GK'];
 return [...teams[team].names,...benchNames[team]].map((name,i)=>({name,number:i===0?1:i===8?20:i+6,role:roles[i],pace:65+(i*7+team*3)%28,passing:68+(i*5+team*2)%25,shooting:roles[i]==='FWD'?90:61+(i*9+team)%25,defending:roles[i]==='DEF'?88:60+(i*3)%24}));
}
export type Tactic='balanced'|'press'|'counter';
export const tactics:Record<Tactic,{name:string;description:string}>={
 balanced:{name:'Balanced',description:'Keep passing options nearby. Recover your shape when possession changes.'},
 press:{name:'High press',description:'Two players close down the ball. Faster pressure uses more stamina.'},
 counter:{name:'Counter attack',description:'Defend deeper. Send runners forward as soon as your team wins the ball.'},
};
