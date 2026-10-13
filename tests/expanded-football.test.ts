import {test} from 'node:test';
import assert from 'node:assert/strict';
import {existsSync} from 'node:fs';
import {teams} from '../src/content/teams';
import {makeRoster} from '../src/content/roster';
import {emptyCup,readCup,newSeason,cupOpponent} from '../src/game/cup';
import {Match,idle} from '../src/game/simulation';
import {portrait} from '../src/ui/portrait';
import {evaluateAnimation} from '../src/game/animation/AnimationGraph';
import {buildClips} from '../src/game/animation/clips';
import {supportTarget} from '../src/game/football/support';

test('eight complete clubs have balanced rosters and real portrait files',()=>{
 assert.equal(teams.length,8);assert.equal(new Set(teams.map(t=>t.id)).size,8);assert.equal(new Set(teams.map(t=>t.color)).size,8);
 const means=teams.map((t,i)=>{const roster=makeRoster(i);assert.equal(roster.length,9);assert.equal(new Set(roster.map(a=>a.number)).size,9);assert.equal(roster.filter(a=>a.role==='GK').length,2);for(let p=0;p<9;p++)assert.ok(existsSync('public'+portrait(i,p)));return roster.reduce((n,a)=>n+a.pace+a.passing+a.shooting+a.defending,0)/36;});assert.ok(Math.max(...means)-Math.min(...means)<2);
});
test('old cup migration preserves fixtures and earned records; new seasons reach all seven rivals',()=>{
 const old={team:2,results:[{goals:2,conceded:1}],titles:3,bestPoints:9};const migrated=readCup(JSON.stringify(old));assert.deepEqual(migrated.fixtures,[3,0,1]);assert.deepEqual(migrated.results,old.results);assert.equal(cupOpponent(migrated),0);assert.equal(migrated.titles,3);
 for(let team=0;team<8;team++){let cup=emptyCup(team);const opponents=new Set<number>();for(let season=0;season<3;season++){assert.equal(new Set(cup.fixtures).size,3);for(const rival of cup.fixtures){assert.notEqual(rival,team);opponents.add(rival);}cup=newSeason(cup,team);}assert.equal(opponents.size,7);}
});
test('football overlays remain normalised and each transition has an authored procedural clip',()=>{
 const clips=buildClips();for(const name of ['cutLeft','cutRight','stop','receive'])assert.ok(clips.some(c=>c.name===name));
 for(const speed of [0,.5,3,8])for(const turn of [-1,0,1])for(const reception of [0,.1,.18]){const g=evaluateAnimation(speed,null,turn,true,reception);assert.ok(Math.abs(Object.values(g.weights).reduce((a,b)=>a+b,0)-1)<1e-8);}
 assert.ok(evaluateAnimation(5,null,1).weights.cutRight>0);assert.ok(evaluateAnimation(5,null,0,true).weights.stop>0);
});
test('possession support is closer than counter support and creates a visible lane',()=>{
 const m=new Match(),p=m.players[4],carrier=m.players[3];Object.assign(carrier,{x:0,y:0});const short=supportTarget(p,carrier,'possession',[]),counter=supportTarget(p,carrier,'counter',[]);assert.ok(short.x<counter.x);assert.ok(Math.abs(short.y)<Math.abs(counter.y));const blocked=supportTarget(p,carrier,'possession',[{...m.players[6],x:short.x*.5,y:short.y*.5}]);assert.ok(Math.abs(blocked.y)>Math.abs(short.y));
});
test('post contact rebounds instead of awarding a goal and makes one impact event',()=>{
 const m=new Match();m.state='PLAYING';m.restartPending=false;m.owner=null;m.lock=1;for(const p of m.players){p.x=-20;p.y=12;p.cooldown=100;}Object.assign(m.ball,{x:29.9,y:3.2,z:.5,vx:18,vy:0,vz:0});m.step(1/60,idle());assert.equal(m.score[0],0);assert.ok(m.ball.vx<0);assert.equal(m.moments.filter(e=>e.kind==='post').length,1);
});
test('every expanded club and difficulty survives a representative match',()=>{
 for(let club=0;club<8;club++)for(let level=0;level<3;level++){const m=new Match(12,level);m.configure(0,makeRoster(club),[0,1,2,3,4],teams[club].style);m.configure(1,makeRoster((club+1)%8),[0,1,2,3,4],teams[(club+1)%8].style);m.state='PLAYING';m.restartPending=false;for(let tick=0;tick<1600;tick++)m.step(1/60,{...idle(),pass:tick%89===0,shoot:tick%127===0,x:tick%120<60?1:-1,y:.2});assert.equal(m.state,'FULL_TIME');for(const p of m.players)assert.ok(Number.isFinite(p.x)&&Number.isFinite(p.y));}
});
test('an immediate kickoff tap starts the pass rather than being discarded',()=>{
 const m=new Match();m.step(1/60,{...idle(),pass:true});assert.equal(m.state,'PLAYING');assert.equal(m.players[3].pendingKick?.kind,'pass');
});
test('static batching preserves world bounds and leaves animated groups alone',async()=>{
 const THREE=await import('three');const {batchStatic}=await import('../src/game/static-batch');const group=new THREE.Group();const before=[];
 for(const x of [-4,4]){const mesh=new THREE.Mesh(new THREE.BoxGeometry(2,2,2),new THREE.MeshStandardMaterial({color:'#888888'}));mesh.position.x=x;group.add(mesh);before.push(mesh);}
 const moving=new THREE.Group();moving.name='animated boat';group.add(moving);const bounds=new THREE.Box3().setFromObject(group);batchStatic(group);assert.equal(group.children.length,2);assert.ok(group.children.includes(moving));assert.deepEqual(new THREE.Box3().setFromObject(group).min,bounds.min);assert.deepEqual(new THREE.Box3().setFromObject(group).max,bounds.max);
});
test('physical kick sounds are never suppressed by the removed commentary cooldown',async()=>{
 const {ReactionDirector}=await import('../src/game/reactions');const director=new ReactionDirector();for(let i=0;i<5;i++)assert.ok(director.accept({id:i,kind:'pass',time:i*.3,team:0,intensity:1}));
});
