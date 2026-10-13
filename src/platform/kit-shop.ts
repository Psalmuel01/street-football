export const KIT_PRODUCT='night_court_kits';
export interface KitSDK {
 session():Promise<{session:string}>;
 purchase(productId:string):Promise<{purchaseId:string;productId:string}>;
 purchases():Promise<Array<{purchaseId:string;productId:string}>>;
 onPurchase(callback:(purchase:{purchaseId:string;productId:string})=>void):()=>void;
}
const colours=[{name:'Court Gold',value:'#e7b44b'},{name:'Night Violet',value:'#8967cc'},{name:'Ocean Teal',value:'#45bfae'}];
export function setupKitShop(sdk:KitSDK,onColour:(colour:string|null)=>void){
 const panel=document.createElement('section');panel.id='kit-shop';panel.className='kit-shop';
 panel.innerHTML='<p class="eyebrow">YOUR COLOURS</p><h2>Night Court Kit Pack</h2><p>Three optional jersey colours for your team. Matches and all existing teams stay free.</p><div class="kit-swatches" aria-label="Kit pack colours"></div><p id="kit-shop-status" role="status">Checking your kits…</p><button id="buy-kits" class="secondary" disabled>Get kit pack</button><button id="restore-kits" class="secondary">Restore purchases</button><label id="kit-selector-label" hidden>Your kit<select id="kit-selector"><option value="">Community kit · free</option></select></label><p class="kit-price-note">Price and payment are shown by Lagos Life before you confirm. Cosmetic only.</p>';
 document.querySelector('.game-home')?.after(panel);
 const swatches=panel.querySelector('.kit-swatches')!;
 for(const colour of colours){const swatch=document.createElement('span');swatch.style.backgroundColor=colour.value;swatch.textContent=colour.name;swatches.append(swatch);}
 const status=panel.querySelector<HTMLElement>('#kit-shop-status')!,buy=panel.querySelector<HTMLButtonElement>('#buy-kits')!,restore=panel.querySelector<HTMLButtonElement>('#restore-kits')!,select=panel.querySelector<HTMLSelectElement>('#kit-selector')!,label=panel.querySelector<HTMLElement>('#kit-selector-label')!;
 for(const colour of colours){const option=document.createElement('option');option.value=colour.value;option.textContent=colour.name;select.append(option);}
 let owned=false,busy=false,available=false;
 const render=()=>{buy.disabled=busy||owned||!available;buy.textContent=owned?'Kit pack owned':'Get kit pack';restore.disabled=busy;label.hidden=!owned;select.disabled=busy||!owned;};
 const ownership=(products:string[])=>{owned=products.includes(KIT_PRODUCT);if(!owned){select.value='';onColour(null);}render();};
 select.onchange=()=>onColour(owned&&colours.some(c=>c.value===select.value)?select.value:null);
 const request=async(route:string,purchaseId?:string)=>{
  const {session}=await sdk.session();
  const response=await fetch(`/api/${route}`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({session,...(purchaseId?{purchaseId}:{})})});
  if(!response.ok)throw new Error('Verification unavailable');
  const data=await response.json();
  if(!Array.isArray(data.products)||data.products.some((p:unknown)=>typeof p!=='string'))throw new Error('Invalid ownership response');
  ownership(data.products);
 };
 const recover=async()=>{
  if(busy)return;busy=true;render();
  try{
   await request('entitlements');available=true;
   for(const purchase of await sdk.purchases())if(purchase.productId===KIT_PRODUCT)await request('claim',purchase.purchaseId);
   status.textContent=owned?'Owned. Choose a kit colour below.':'Optional kit pack. All matches stay free.';
  }catch{available=false;status.textContent='Kit shop unavailable right now. Your matches are still free.';}
  finally{busy=false;render();}
 };
 const claim=async(purchase:{purchaseId:string;productId:string})=>{
  if(purchase.productId!==KIT_PRODUCT)return;
  try{await request('claim',purchase.purchaseId);available=true;status.textContent='Kit pack unlocked. Choose your colour below.';}
  catch{status.textContent='Your kit is waiting for verification. Tap Restore purchases to retry.';}
  render();
 };
 buy.onclick=async()=>{
  if(busy||owned||!available)return;busy=true;render();
  try{await claim(await sdk.purchase(KIT_PRODUCT));}
  catch(error){if((error as {code?:string}).code==='owned'){status.textContent='Already purchased. Tap Restore purchases to unlock.';}else status.textContent='Purchase not completed. Your matches are still free.';}
  finally{busy=false;render();}
 };
 restore.onclick=()=>void recover();
 const unsubscribe=sdk.onPurchase(purchase=>void claim(purchase));
 void recover();
 return {refresh:recover,disconnect:()=>{unsubscribe();panel.remove();onColour(null);}};
}
