import assert from 'node:assert/strict';
import {chromium} from 'playwright';
const b=await chromium.launch({headless:true,executablePath:process.env.CHROME_PATH});
try{const p=await b.newPage();const errors=[];p.on('pageerror',e=>errors.push(e.message));await p.goto('http://localhost:5173');await p.waitForFunction(()=>!document.querySelector('#app').inert);await p.locator('#music-toggle').click();await p.waitForFunction(()=>document.querySelector('#music-toggle').getAttribute('aria-pressed')==='true');await p.locator('#sound').click();assert.equal(await p.locator('#music-toggle').getAttribute('aria-pressed'),'false');
 const result=await p.evaluate(async()=>{const {AudioManager}=await import('/src/game/audio/manager.ts');const a=new AudioManager();window.auditAudio=a;await a.play();const wait=ms=>new Promise(r=>setTimeout(r,ms));await wait(300);const before=a.music.currentTime,src=a.music.src;a.setScene('selection');await wait(300);const continuous=a.music.src===src&&a.music.currentTime>before;
 a.setMatchActive(true);a.setScene('gameplay');await wait(700);a.update(1,true,5,false,-12,-19);await wait(1000);const near=a.decks[a.current].gain.gain.value;a.update(1,true,5,false,29,17);await wait(1000);const far=a.decks[a.current].gain.gain.value;
 a.setBus('crowd',0);a.setBus('players',.25);a.setBus('master',.6);await wait(300);const independent=a.buses.crowd.gain.value<.001&&Math.abs(a.buses.players.gain.value-.25)<.01&&Math.abs(a.buses.master.gain.value-.6)<.01;
 a.cue('goal');await wait(500);const priority=a.lastVoiceEvent==='goal';a.cue('pass');await wait(100);const protectedGoal=a.lastVoiceEvent==='goal';
 a.setMatchActive(false);a.setScene('win');await wait(500);const win=a.music.src.endsWith('/results/win.m4a');await a.toggle();await wait(800);const muted=a.buses.music.gain.value<.001;return {continuous,near,far,independent,priority,protectedGoal,win,muted};});
 assert.ok(result.continuous&&result.independent&&result.priority&&result.protectedGoal&&result.win&&result.muted,JSON.stringify(result));assert.ok(result.near>result.far*1.3);assert.deepEqual(errors,[]);console.log(result);
 await p.locator('#how-nav').click();assert.equal(await p.locator('[data-audio-bus]').count(),8);
}finally{await b.close();}
