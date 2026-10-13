import {test} from 'node:test';
import assert from 'node:assert/strict';
import {InputManager} from '../src/game/input';
import {grounds,DEFAULT_GROUND} from '../src/content/grounds';

test('Shift modifier sprints even when the browser omits its separate keydown, and releases cleanly',()=>{
 const previous=new Map<string,PropertyDescriptor|undefined>();
 const events=new Map<string,(event:any)=>void>();
 const globals={window:{addEventListener:(name:string,handler:any)=>events.set(name,handler)},navigator:{getGamepads:()=>[]},HTMLElement:class {},document:{querySelectorAll:()=>[],querySelector:()=>null}};
 for(const [key,value] of Object.entries(globals)){previous.set(key,Object.getOwnPropertyDescriptor(globalThis,key));Object.defineProperty(globalThis,key,{value,configurable:true});}
 try{
  const input=new InputManager(()=>{});
  const key=(code:string,shiftKey:boolean,key=code)=>({code,shiftKey,key,target:null,preventDefault(){}});
  events.get('keydown')!(key('KeyD',true));assert.equal(input.read().sprint,true);assert.equal(input.read().x,1);
  events.get('keyup')!(key('KeyD',true));assert.equal(input.read().sprint,true);assert.equal(input.read().x,0);
  events.get('keyup')!(key('',false,'Shift'));assert.equal(input.read().sprint,false);
  events.get('keydown')!(key('ShiftRight',true,'Shift'));assert.equal(input.read().sprint,true);
  events.get('blur')!({});assert.equal(input.read().sprint,false);
  events.get('keydown')!(key('KeyW',true));input.reset();assert.equal(input.read().sprint,false);assert.equal(input.read().y,0);
 }finally{for(const [key,descriptor] of previous){if(descriptor)Object.defineProperty(globalThis,key,descriptor);else Reflect.deleteProperty(globalThis,key);}}
});
test('Matchday Arena is the first and default ground',()=>{
 assert.equal(DEFAULT_GROUND,'arena');assert.equal(Object.keys(grounds)[0],DEFAULT_GROUND);
});
