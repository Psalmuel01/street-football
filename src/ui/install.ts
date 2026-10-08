interface InstallEvent extends Event {prompt():Promise<void>;userChoice:Promise<{outcome:string}>}
export function setupInstall(){
 let deferred:InstallEvent|null=null;
 const installed=()=>window.matchMedia('(display-mode: standalone)').matches||(navigator as Navigator & {standalone?:boolean}).standalone;
 const button=document.createElement('button');button.id='install-app';button.textContent='↗ TAKE THE STREET WITH YOU · INSTALL APP';button.hidden=!!installed();
 document.querySelector('footer')?.append(button);
 const dialog=document.createElement('dialog');dialog.className='install-dialog';dialog.innerHTML='<button class="install-close" aria-label="Close installation guide">✕</button><p class="eyebrow">YOUR POCKET. YOUR PLAYGROUND.</p><h2>Lagos, on tap.</h2><p id="install-help"></p><button class="primary install-done">GOT IT</button>';document.body.append(dialog);
 const close=()=>{dialog.close();button.focus();};dialog.querySelector('button')!.onclick=close;(dialog.querySelector('.install-done') as HTMLButtonElement).onclick=close;
 button.onclick=async()=>{if(deferred){await deferred.prompt();const choice=await deferred.userChoice;deferred=null;if(choice.outcome==='accepted')button.hidden=true;return;}
 const ios=/iPad|iPhone|iPod/.test(navigator.userAgent)||(navigator.platform==='MacIntel'&&navigator.maxTouchPoints>1);
 dialog.querySelector('#install-help')!.textContent=ios?'In Safari, tap Share, then Add to Home Screen and Open as Web App. Launch from that icon for the full app experience.':!window.isSecureContext?'Home-screen installation needs an HTTPS address on your phone. This local HTTP preview can still be played in your browser. Once hosted securely, use your browser’s Install app menu.':'Open your browser menu and choose Install app or Add to Home Screen. If it is unavailable, try Chrome on Android or Safari on iPhone.';dialog.showModal();};
 window.addEventListener('beforeinstallprompt',e=>{e.preventDefault();deferred=e as InstallEvent;button.hidden=false;button.textContent='＋ INSTALL LAGOS STREET FOOTBALL';});
 window.addEventListener('appinstalled',()=>{button.hidden=true;deferred=null;});
 if(import.meta.env.PROD&&'serviceWorker' in navigator)window.addEventListener('load',()=>{void navigator.serviceWorker.register('/sw.js').catch(()=>{/* Installation remains available without offline support. */});});
}
