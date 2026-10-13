import {test} from 'node:test';
import assert from 'node:assert/strict';
import {emptyCup,recordCup,points,readCup,cupOpponent,newSeason} from '../src/game/cup';
import {dribbleTouch,receptionVelocity} from '../src/game/football/touch';
test('cup visits each rival, persists results, awards a title once and retains records on a new season',()=>{
 let c=emptyCup(2);const rivals=[];
 for(const score of [[2,0],[1,1],[3,0]]){rivals.push(cupOpponent(c));c=recordCup(c,score[0],score[1]);c=readCup(JSON.stringify(c));}
 assert.deepEqual(rivals,[3,4,5]);assert.equal(points(c),7);assert.equal(c.titles,1);assert.equal(c.bestPoints,7);
 assert.deepEqual(recordCup(c,5,0),c);const next=newSeason(c,1);assert.equal(next.results.length,0);assert.equal(next.titles,1);assert.equal(next.team,1);
});
test('corrupt or incompatible cup saves recover to an empty season',()=>{
 for(const raw of ['oops','null','{"team":99,"results":[],"titles":0,"bestPoints":0}',JSON.stringify({...emptyCup(),results:[{goals:-1,conceded:0}]}),JSON.stringify({...emptyCup(),bestPoints:10})])assert.deepEqual(readCup(raw),emptyCup());
});
test('sprint contacts lead farther while first touches remain bounded and follow the receiving runner',()=>{
 assert.ok(dribbleTouch(9,.2).reach>dribbleTouch(1,.2).reach);assert.ok(dribbleTouch(9,.2).interval>dribbleTouch(1,.2).interval);
 const still=receptionVelocity(30,0,0,0,.9),run=receptionVelocity(30,0,0,5,.9);assert.ok(still.vx<5);assert.ok(run.vy>3);assert.ok(run.vy<6);
});

test('crowd recordings cannot start after a host pause and spoken commentary is unavailable',async()=>{
 const priorDocument=Object.getOwnPropertyDescriptor(globalThis,'document');
 const priorStorage=Object.getOwnPropertyDescriptor(globalThis,'localStorage');
 const priorFetch=globalThis.fetch;
 Object.defineProperty(globalThis,'document',{configurable:true,value:{hidden:false,addEventListener(){}}});
 Object.defineProperty(globalThis,'localStorage',{configurable:true,value:{getItem(){return null;},setItem(){}}});
 let decode:((v:{duration:number})=>void)|undefined,started=0;
 globalThis.fetch=async()=>({ok:true,arrayBuffer:async()=>new ArrayBuffer(2)}) as Response;
 const {AudioManager}=await import('../src/game/audio/manager');
 const audio=new AudioManager();assert.equal(audio.voices,false);audio.setVoices(true);assert.equal(audio.voices,false);
 const node=()=>({connect(){return this;},disconnect(){},gain:{setValueAtTime(){},linearRampToValueAtTime(){}},pan:{value:0},start(){started++;},stop(){}});
 audio.context={currentTime:0,state:'running',suspend:async()=>{},decodeAudioData:()=>new Promise(resolve=>{decode=resolve;}),createBufferSource:node,createGain:node,createStereoPanner:node} as unknown as AudioContext;
 try{
  audio.setMatchActive(true);audio.cue('near-goal');
  await new Promise(resolve=>setTimeout(resolve,0));assert.ok(decode);
  audio.setHostPaused(true);decode!({duration:1.6});await new Promise(resolve=>setTimeout(resolve,0));assert.equal(started,0);
 }finally{globalThis.fetch=priorFetch;if(priorDocument)Object.defineProperty(globalThis,'document',priorDocument);else Reflect.deleteProperty(globalThis,'document');if(priorStorage)Object.defineProperty(globalThis,'localStorage',priorStorage);else Reflect.deleteProperty(globalThis,'localStorage');}
});

test('each venue owns a different environment and switching displays exactly one',async()=>{
 const prior=Object.getOwnPropertyDescriptor(globalThis,'document');
 const context={fillRect(){},fillText(){},fillStyle:'',textAlign:'',font:''};
 Object.defineProperty(globalThis,'document',{configurable:true,value:{createElement(){return {width:0,height:0,getContext(){return context;}};}}});
 try{
  const {Scene,InstancedMesh,Box3}=await import('three');const {Venues}=await import('../src/game/venues');const venues=new Venues(new Scene());
  assert.equal(venues.root.children.length,5);const waterfront=venues.root.getObjectByName('marina')!,arena=venues.root.getObjectByName('arena')!;
  assert.ok(new Box3().setFromObject(waterfront).min.z < -90);assert.ok(new Box3().setFromObject(arena).min.z > -50);assert.ok(arena.children.some(child=>child instanceof InstancedMesh));
  venues.set('marina');assert.deepEqual(venues.root.children.filter(g=>g.visible).map(g=>g.name),['marina']);
  venues.set('arena');assert.deepEqual(venues.root.children.filter(g=>g.visible).map(g=>g.name),['arena']);
 }finally{if(prior)Object.defineProperty(globalThis,'document',prior);else Reflect.deleteProperty(globalThis,'document');}
});
