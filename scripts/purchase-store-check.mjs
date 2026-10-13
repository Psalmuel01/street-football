import assert from 'node:assert/strict';
import {createStore} from '../server/store.mjs';
const database=process.env.TEST_DATABASE_URL;
if(!database||!['localhost','127.0.0.1'].includes(new URL(database).hostname))throw new Error('Use an isolated localhost TEST_DATABASE_URL');
const gameId=`local_check_${Date.now()}`,purchase={gameId,mode:'test',playerId:'t_test',productId:'night_court_kits',purchaseId:'receipt'};
let store=await createStore(database);
try{
 await Promise.all(Array.from({length:20},()=>store.grant(purchase)));
 assert.equal((await store.list(purchase)).length,1);
 assert.deepEqual(await store.list({...purchase,mode:'live'}),[]);
 await assert.rejects(store.grant({...purchase,playerId:'t_other'}),/ownership conflict/);
 await store.close();store=await createStore(database);
 assert.equal((await store.list(purchase)).length,1,'ownership must survive a connection restart');
 await store.revoke(purchase);assert.deepEqual(await store.list(purchase),[]);
 console.log('PostgreSQL verified: concurrent idempotency, ownership binding, mode isolation, persistence, and refund revoke.');
}finally{await store.revoke(purchase);await store.close();}
