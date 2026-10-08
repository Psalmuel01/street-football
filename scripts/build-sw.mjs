import {readdir,readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
async function walk(dir){const entries=await readdir(dir,{withFileTypes:true});return (await Promise.all(entries.map(e=>e.isDirectory()?walk(`${dir}/${e.name}`):`${dir}/${e.name}`))).flat();}
const files=(await walk('dist')).filter(p=>!p.includes('/artifacts/')&&!p.includes('/audio/')&&!p.endsWith('/sw.js'));
const hash=createHash('sha256');for(const f of files)hash.update(await readFile(f));
const cache=`lagos-app-${hash.digest('hex').slice(0,12)}`;
await writeFile('dist/sw.js',`const CACHE=${JSON.stringify(cache)},CORE=${JSON.stringify(files.map(f=>f.slice(4)))};
self.addEventListener('message',event=>{if(event.data?.type==='ACTIVATE_UPDATE')self.skipWaiting();});
self.addEventListener('install',event=>event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(CORE))));
self.addEventListener('activate',event=>event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k.startsWith('lagos-app-')&&k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',event=>{const req=event.request,url=new URL(req.url);if(req.method!=='GET'||url.origin!==self.location.origin)return;
if(req.mode==='navigate'){event.respondWith(fetch(req).catch(()=>caches.open(CACHE).then(c=>c.match('/index.html'))));return;}
if(CORE.includes(url.pathname))event.respondWith(caches.open(CACHE).then(async c=>(await c.match(req,{ignoreSearch:true,ignoreVary:true}))||fetch(req)));});`);
console.log(`Offline shell: ${files.length} assets (${cache}); audio streams online.`);
