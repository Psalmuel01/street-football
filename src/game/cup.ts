import {teams} from '../content/teams';
export type Cup={team:number;results:{goals:number;conceded:number}[];titles:number;bestPoints:number;fixtures:number[];season:number;version:2};
function schedule(team:number,season:number){const rivals=teams.map((_,i)=>(team+i+1)%teams.length).filter(i=>i!==team);const offset=season*3%rivals.length;return Array.from({length:3},(_,i)=>rivals[(offset+i)%rivals.length]);}
export const emptyCup=(team=0):Cup=>({team,results:[],titles:0,bestPoints:0,fixtures:schedule(team,0),season:0,version:2});
export const points=(cup:Cup)=>cup.results.reduce((n,r)=>n+(r.goals>r.conceded?3:r.goals===r.conceded?1:0),0);
export function readCup(raw:string|null):Cup{
 try{const c=JSON.parse(raw||'null');if(!c||!Number.isInteger(c.team)||c.team<0||c.team>=teams.length||!Array.isArray(c.results)||c.results.length>3||!c.results.every((r:{goals:number;conceded:number})=>r&&Number.isInteger(r.goals)&&r.goals>=0&&r.goals<=100&&Number.isInteger(r.conceded)&&r.conceded>=0&&r.conceded<=100)||![c.titles,c.bestPoints].every(n=>Number.isInteger(n)&&n>=0)||c.bestPoints>9)return emptyCup();
  if(c.version!==undefined&&c.version!==2)return emptyCup();
  // Legacy four-club seasons retain their original opponents and all records.
  const fixtures=c.fixtures??(c.team<4?[1,2,3].map(n=>(c.team+n)%4):schedule(c.team,0));
  if(!Array.isArray(fixtures)||fixtures.length!==3||new Set(fixtures).size!==3||fixtures.some(i=>!Number.isInteger(i)||i<0||i>=teams.length||i===c.team))return emptyCup();
  const season=c.season??0;if(!Number.isSafeInteger(season)||season<0)return emptyCup();
  return {team:c.team,results:c.results,titles:c.titles,bestPoints:c.bestPoints,fixtures,season,version:2};
 }catch{return emptyCup();}
}
export function recordCup(cup:Cup,goals:number,conceded:number):Cup{
 if(cup.results.length>=3)return cup;
 const next={...cup,results:[...cup.results,{goals,conceded}]};
 if(next.results.length===3){next.bestPoints=Math.max(cup.bestPoints,points(next));if(points(next)>=7)next.titles++;}return next;
}
export const cupOpponent=(cup:Cup)=>cup.fixtures[Math.min(2,cup.results.length)];
export const newSeason=(cup:Cup,team:number):Cup=>({...cup,team,results:[],fixtures:schedule(team,cup.season+1),season:cup.season+1});
