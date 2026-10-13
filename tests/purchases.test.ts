import test from 'node:test';
import assert from 'node:assert/strict';
import {createPurchaseService,KIT_PRODUCT} from '../server/purchases.mjs';
function fixture(){
 const records=new Map<string,any>();let grants=0,deliveries=0,failDelivery=false;
 const receipt={id:'receipt_1',mode:'test',playerId:'t_owner',productId:KIT_PRODUCT,status:'paid',currency:'NGN',amount:500};
 const me={gameId:'game',mode:'test',playerId:'t_owner'};
 const api=async(path:string)=>{if(path==='/session/verify')return {...me};if(path.endsWith('/deliver')){deliveries++;if(failDelivery)throw new Error('network');receipt.status='delivered';return {};}return {...receipt};};
 const store={grant:async(p:any)=>{if(!records.has(p.purchaseId)){grants++;records.set(p.purchaseId,p);}},list:async()=>[...records.values()],revoke:async(p:any)=>{records.delete(p.purchaseId);}};
 const service=createPurchaseService({api,store,gameId:'game',mode:'test'});
 return {service,receipt,me,records,fail:()=>failDelivery=true,recover:()=>failDelivery=false,grants:()=>grants,deliveries:()=>deliveries};
}
const input={session:'signed_token_example',purchaseId:'receipt_1'};
test('paid one-off is idempotent and restores ownership',async()=>{const f=fixture();await f.service.claim(input);await f.service.claim(input);assert.equal(f.grants(),1);assert.equal(f.deliveries(),1);assert.deepEqual(await f.service.entitlements(input),{products:[KIT_PRODUCT]});});
test('delivery failure preserves the committed grant for a safe retry',async()=>{const f=fixture();f.fail();await assert.rejects(f.service.claim(input),/network/);assert.equal(f.records.size,1);f.recover();await f.service.claim(input);assert.equal(f.grants(),1);assert.equal(f.receipt.status,'delivered');});
test('another player cannot claim a verified purchase',async()=>{const f=fixture();f.me.playerId='t_other';await assert.rejects(f.service.claim(input),/wrong_player/);assert.equal(f.grants(),0);});
test('forged product, receipt, game and mode cannot unlock kits',async()=>{for(const mutate of [(f:any)=>f.receipt.productId='other',(f:any)=>f.receipt.id='other',(f:any)=>f.me.gameId='other',(f:any)=>f.me.mode='live',(f:any)=>f.receipt.mode='live']){const f=fixture();mutate(f);await assert.rejects(f.service.claim(input));assert.equal(f.grants(),0);}});
test('unpaid, refunded and invalid amounts are rejected before granting',async()=>{for(const mutate of [(f:any)=>f.receipt.status='pending',(f:any)=>f.receipt.status='refunded',(f:any)=>f.receipt.amount=0,(f:any)=>f.receipt.currency='USD']){const f=fixture();mutate(f);await assert.rejects(f.service.claim(input));assert.equal(f.grants(),0);}});
test('confirmed refund revokes the cosmetic on restore',async()=>{const f=fixture();await f.service.claim(input);f.receipt.status='refunded';assert.deepEqual(await f.service.entitlements(input),{products:[]});assert.equal(f.records.size,0);});
