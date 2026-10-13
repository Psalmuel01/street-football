import {setupKitShop,type KitSDK} from './kit-shop';
/** The hosted SDK owns parent-origin validation; never implement a wildcard message bridge. */
export interface VatarSDK {
  init(): Promise<{ player: { id: string; name: string; avatar: string | null }; mode: 'test' | 'live' }>;
  onPause(callback: () => void): () => void;
  onResume(callback: () => void): () => void;
}
export async function connectVatar(sdk: VatarSDK, pause: (paused: boolean) => void) {
  const stopPause = sdk.onPause(() => pause(true));
  const stopResume = sdk.onResume(() => pause(false));
  try {
    const identity = await sdk.init();
    return { identity, disconnect: () => { stopPause(); stopResume(); pause(false); } };
  } catch (error) {
    stopPause(); stopResume(); pause(false);
    throw error;
  }
}
export async function setupLagosLife(pause: (paused: boolean) => void,onColour:(colour:string|null)=>void=()=>{}) {
  if (window.parent === window) return;
  try {
    const sdk = await new Promise<VatarSDK>((resolve, reject) => {
      const script = document.createElement('script');
      script.src = 'https://lagoslife.app/sdk/vatar-games-v1.js';
      script.async = true;
      const timeout = window.setTimeout(() => { script.remove(); reject(new Error('SDK load timed out')); }, 10000);
      script.onload = () => {
        clearTimeout(timeout);
        const sdk = (window as Window & { Vatar?: VatarSDK }).Vatar;
        sdk ? resolve(sdk) : reject(new Error('SDK unavailable'));
      };
      script.onerror = () => { clearTimeout(timeout); reject(new Error('SDK load failed')); };
      document.head.append(script);
    });
    const connection = await connectVatar(sdk, pause);
    document.documentElement.dataset.vatarMode = connection.identity.mode;
    const commerce=sdk as VatarSDK & Partial<KitSDK>;
    const shop=typeof commerce.session==='function'&&typeof commerce.purchase==='function'&&typeof commerce.purchases==='function'&&typeof commerce.onPurchase==='function'?setupKitShop(commerce as KitSDK,onColour):null;
    const stopRestore=sdk.onResume(()=>{void shop?.refresh();});
    window.addEventListener('pagehide',()=>{stopRestore();shop?.disconnect();connection.disconnect();},{once:true});
  } catch {
    // Standalone and unrelated frames remain playable; no identity/session is persisted.
    document.documentElement.dataset.vatarMode = 'unavailable';
  }
}
