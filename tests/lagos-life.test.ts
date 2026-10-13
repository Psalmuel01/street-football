import test from 'node:test';
import assert from 'node:assert/strict';
import {connectVatar, type VatarSDK} from '../src/platform/lagos-life';

function fake(fail=false){
 let pause=()=>{},resume=()=>{},removed=0;
 const sdk:VatarSDK={
  init:async()=>{if(fail)throw new Error('not_framed');return {player:{id:'t_test',name:'Test',avatar:null},mode:'test'};},
  onPause:fn=>{pause=fn;return ()=>{removed++;};},
  onResume:fn=>{resume=fn;return ()=>{removed++;};},
 };
 return {sdk,pause:()=>pause(),resume:()=>resume(),removed:()=>removed};
}
test('host pause/resume is delivered and subscriptions are released',async()=>{
 const host=fake(),states:boolean[]=[];
 const connection=await connectVatar(host.sdk,p=>states.push(p));
 assert.equal(connection.identity.mode,'test');
 host.pause();host.resume();host.pause();connection.disconnect();
 assert.deepEqual(states,[true,false,true,false]);assert.equal(host.removed(),2);
});
test('failed initialization cleans listeners and releases the game',async()=>{
 const host=fake(true),states:boolean[]=[];
 await assert.rejects(connectVatar(host.sdk,p=>states.push(p)),/not_framed/);
 assert.equal(host.removed(),2);assert.deepEqual(states,[false]);
});
