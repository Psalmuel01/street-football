import {test} from 'node:test';
import assert from 'node:assert/strict';
import {Match} from '../src/game/simulation';
import {formations} from '../src/content/formations';
test('changing shape updates tactical anchors without teleporting live players',()=>{
 const m=new Match();const before=m.players.map(p=>[p.x,p.y]);
 m.setFormation(0,'1-2-1');
 assert.deepEqual(m.players.map(p=>[p.x,p.y]),before);
 assert.deepEqual(m.players.slice(0,5).map(p=>[p.homeX,p.homeY]),formations['1-2-1'].positions);
});
test('selected shape survives kick-off resets and mirrors for the opponent',()=>{
 const m=new Match();m.setFormation(0,'1-3');m.setFormation(1,'1-3');m.resetPositions(1);
 assert.deepEqual(m.players.slice(0,5).map(p=>[p.homeX,p.homeY]),formations['1-3'].positions);
 assert.deepEqual(m.players.slice(5).map(p=>[p.homeX,p.homeY]),formations['1-3'].positions.map(([x,y])=>[-x,-y]));
});
