import pg from 'pg';
export async function createStore(connectionString){
 const pool=new pg.Pool({connectionString,max:5,connectionTimeoutMillis:10000,statement_timeout:10000});
 // Namespaced by game AND mode: sandbox ownership can never grant live cosmetics.
 await pool.query(`CREATE TABLE IF NOT EXISTS lsf_kit_purchases (
   game_id TEXT NOT NULL, mode TEXT NOT NULL CHECK(mode IN ('test','live')),
   purchase_id TEXT NOT NULL, player_id TEXT NOT NULL, product_id TEXT NOT NULL,
   created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), PRIMARY KEY(game_id,mode,purchase_id)
 )`);
 await pool.query('CREATE INDEX IF NOT EXISTS lsf_kit_owner ON lsf_kit_purchases(game_id,mode,player_id)');
 return {
  async grant(p){
   const result=await pool.query(`INSERT INTO lsf_kit_purchases(game_id,mode,purchase_id,player_id,product_id)
    VALUES($1,$2,$3,$4,$5) ON CONFLICT(game_id,mode,purchase_id) DO UPDATE
    SET purchase_id=EXCLUDED.purchase_id WHERE lsf_kit_purchases.player_id=EXCLUDED.player_id
    AND lsf_kit_purchases.product_id=EXCLUDED.product_id RETURNING purchase_id`,[p.gameId,p.mode,p.purchaseId,p.playerId,p.productId]);
   if(result.rowCount!==1)throw new Error('Receipt ownership conflict');
  },
  async list(p){const result=await pool.query('SELECT purchase_id AS "purchaseId",product_id AS "productId" FROM lsf_kit_purchases WHERE game_id=$1 AND mode=$2 AND player_id=$3',[p.gameId,p.mode,p.playerId]);return result.rows;},
  async revoke(p){await pool.query('DELETE FROM lsf_kit_purchases WHERE game_id=$1 AND mode=$2 AND purchase_id=$3',[p.gameId,p.mode,p.purchaseId]);},
  close:()=>pool.end(),
 };
}
