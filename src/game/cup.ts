export type Cup = {team:number;results:{goals:number;conceded:number}[];titles:number;bestPoints:number};
export const emptyCup=(team=0):Cup=>({team,results:[],titles:0,bestPoints:0});
export const points=(cup:Cup)=>cup.results.reduce((n,r)=>n+(r.goals>r.conceded?3:r.goals===r.conceded?1:0),0);
export function readCup(raw:string|null):Cup{
 try{const c=JSON.parse(raw||'null');if(!c||!Number.isInteger(c.team)||c.team<0||c.team>3||!Array.isArray(c.results)||c.results.length>3||!c.results.every((r:{goals:number;conceded:number})=>Number.isInteger(r.goals)&&r.goals>=0&&r.goals<=100&&Number.isInteger(r.conceded)&&r.conceded>=0&&r.conceded<=100)||![c.titles,c.bestPoints].every(n=>Number.isInteger(n)&&n>=0)||c.bestPoints>9)return emptyCup();return c;}catch{return emptyCup();}
}
export function recordCup(cup:Cup,goals:number,conceded:number):Cup{
 if(cup.results.length>=3)return cup;
 const next={...cup,results:[...cup.results,{goals,conceded}]};
 if(next.results.length===3){next.bestPoints=Math.max(cup.bestPoints,points(next));if(points(next)>=7)next.titles++;}return next;
}
export const cupOpponent=(cup:Cup)=>(cup.team+cup.results.length+1)%4;
export const newSeason=(cup:Cup,team:number):Cup=>({...cup,team,results:[]});
