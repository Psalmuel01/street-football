export const KIT_PRODUCT = 'night_court_kits';
export class PurchaseError extends Error {
  constructor(code,status=400){super(code);this.code=code;this.status=status;}
}
/** All identity and payment facts come from Vatar's authenticated server API. */
export function createPurchaseService({api,store,gameId,mode}){
  const identity=async session=>{
    if(typeof session!=='string'||session.length<10||session.length>12000)throw new PurchaseError('invalid_session',401);
    const me=await api('/session/verify',{session});
    if(me.gameId!==gameId||me.mode!==mode||typeof me.playerId!=='string')throw new PurchaseError('wrong_game_or_mode',403);
    return me;
  };
  const receipt=async id=>{
    if(typeof id!=='string'||! /^[a-zA-Z0-9_-]{1,96}$/.test(id))throw new PurchaseError('invalid_purchase');
    const p=await api(`/purchases/${encodeURIComponent(id)}`);
    if(p.id!==id||p.mode!==mode||p.productId!==KIT_PRODUCT)throw new PurchaseError('invalid_receipt',403);
    return p;
  };
  return {
    async claim({session,purchaseId}){
      const me=await identity(session),p=await receipt(purchaseId);
      if(p.playerId!==me.playerId)throw new PurchaseError('wrong_player',403);
      if(!['paid','delivered'].includes(p.status)||p.currency!=='NGN'||!Number.isInteger(p.amount)||p.amount<=0)throw new PurchaseError('not_paid',409);
      // Commit ownership first. A delivery failure can retry safely without charging or granting twice.
      await store.grant({gameId,mode,playerId:me.playerId,purchaseId:p.id,productId:p.productId});
      if(p.status!=='delivered')await api(`/purchases/${encodeURIComponent(p.id)}/deliver`,{});
      return {products:[KIT_PRODUCT]};
    },
    async entitlements({session}){
      const me=await identity(session),records=await store.list({gameId,mode,playerId:me.playerId});
      const products=[];
      for(const record of records){
        const p=await receipt(record.purchaseId);
        if(p.playerId!==me.playerId)throw new PurchaseError('wrong_player',403);
        if(p.status==='refunded'){await store.revoke({gameId,mode,purchaseId:p.id});continue;}
        if(['paid','delivered'].includes(p.status)){
          if(p.status==='paid')await api(`/purchases/${encodeURIComponent(p.id)}/deliver`,{});
          products.push(record.productId);
        }
      }
      return {products:[...new Set(products)]};
    },
  };
}
