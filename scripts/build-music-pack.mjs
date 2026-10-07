import {chromium} from 'playwright';
import {mkdir,writeFile,unlink} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
const b=await chromium.launch({headless:true,executablePath:process.env.CHROME_PATH});
try{const page=await b.newPage();await page.route('**/__audio-build',route=>route.fulfill({contentType:'text/html',body:'<!doctype html><title>Audio render</title>'}));await page.goto('http://localhost:5173/__audio-build');const pack=await page.evaluate(async()=>{const {musicPack}=await import('/src/game/audio/catalogue.ts');return musicPack;});
const manifest=[];
for(const [group,tracks] of Object.entries(pack))for(const track of tracks){
 const result=await page.evaluate(async track=>{const {renderSoundtrack,encodeWave}=await import('/src/game/audio/composition.ts');const audio=await renderSoundtrack(track),bytes=encodeWave(audio.channels,audio.sampleRate);let binary='';for(let i=0;i<bytes.length;i+=32768)binary+=String.fromCharCode(...bytes.subarray(i,i+32768));return {base64:btoa(binary),duration:audio.duration,peak:audio.peak};},track);
 const dir=`public/assets/audio/music/${group}`;await mkdir(dir,{recursive:true});const wave=`${dir}/${track.id}.wav`,target=`${dir}/${track.id}.m4a`;await writeFile(wave,Buffer.from(result.base64,'base64'));await unlink(target).catch(()=>{});execFileSync('/usr/bin/afconvert',[wave,target,'-f','m4af','-d','aac','-b','160000']);await unlink(wave);manifest.push({...track,group,duration:result.duration,peak:result.peak});console.log(group,track.id,result.duration);
}await writeFile('public/assets/audio/music/manifest.json',JSON.stringify(manifest,null,2));}finally{await b.close();}
