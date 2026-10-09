'use strict';
// MLP Battle Cards: server-side, account-scoped, durable cosmetics inventory.
// The database is the source of truth. The browser token is a private bearer recovery key.
const crypto = require('crypto');

const STARTER_ITEMS = ['changeling', 'balloon', 'candy'];
const STARTER_FRAMES = ['sakura', 'candy'];
const ITEMS = [
  'changeling','balloon','candy','crystalhorn','crown','halo','angelwings',
  'batwings','magicflames','orbitcrystals','bow','scarf','goggles','gears',
  'flowercrown','butterflies','bandages','potions','collar','bell','cape','cards',
  'techwings','moon',
  'item_apple','item_hourglass','item_rainbow_potion','item_speed_potion',
  'item_moon_potion','item_sun_potion','item_mirror','item_storm',
  'item_grimoire','item_friendship_crown'
];
const FRAMES = [
  'crystal_heart','night_star','candy','butterfly','steampunk','royal_crown',
  'changeling','rainbow_cloud','star_book','rose_gold','iridescent','honey',
  'pearl_sea','sakura','alchemy','ice','forest','neon','velvet','moon'
];
const itemSet = new Set(ITEMS), frameSet = new Set(FRAMES);
const uniqueKnown = (value, set, starters) => [
  ...new Set([...starters,...(Array.isArray(value) ? value : []).filter(k => typeof k==='string' && set.has(k))])
];
const digest = token => crypto.createHash('sha256').update(token).digest('hex');
const validToken = token => typeof token==='string' && /^[a-f0-9]{64}$/i.test(token);
function asProfile(row) {
  const items = uniqueKnown(row.item_unlocks, itemSet, STARTER_ITEMS);
  const frames = uniqueKnown(row.frame_unlocks, frameSet, STARTER_FRAMES);
  return {
    id:row.id,
    items, frames,
    accessory:items.includes(row.selected_item)?row.selected_item:'changeling',
    frame:row.selected_frame==='' || frames.includes(row.selected_frame)?row.selected_frame:'sakura'
  };
}
function createProfileStore(databaseUrl) {
  if(!databaseUrl) return null;
  const {Pool} = require('pg');
  const pool = new Pool({connectionString:databaseUrl, max:5, connectionTimeoutMillis:8000, idleTimeoutMillis:30000});
  let initialization;
  async function init() {
    if(!initialization) initialization=(async()=>{
      await pool.query(`CREATE TABLE IF NOT EXISTS mlp_player_profiles (
        id TEXT PRIMARY KEY,
        item_unlocks JSONB NOT NULL,
        frame_unlocks JSONB NOT NULL,
        selected_item TEXT NOT NULL DEFAULT 'changeling',
        selected_frame TEXT NOT NULL DEFAULT 'sakura',
        created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
      )`);
      await pool.query(`CREATE TABLE IF NOT EXISTS mlp_cosmetic_wins (
        profile_id TEXT NOT NULL REFERENCES mlp_player_profiles(id) ON DELETE CASCADE,
        match_id TEXT NOT NULL,
        reward JSONB NOT NULL,
        awarded_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        PRIMARY KEY(profile_id,match_id)
      )`);
    })().catch(error=>{initialization=null;throw error});
    return initialization;
  }
  async function login({token, legacy}={}) {
    await init();
    if(token !== undefined && token !== null && token !== '' && !validToken(token))
      throw new Error('Ungültiger Profil-Schlüssel. Bitte prüfe die 64 Zeichen.');
    if(token){
      const existing = await pool.query('SELECT * FROM mlp_player_profiles WHERE id=$1',[digest(token.toLowerCase())]);
      if(!existing.rowCount)throw new Error('Profil nicht gefunden. Prüfe deinen Profil-Schlüssel. Es wurde kein neues Profil erstellt.');
      return {token:token.toLowerCase(),profile:asProfile(existing.rows[0]),created:false};
    }
    const newToken = crypto.randomBytes(32).toString('hex');
    const items = uniqueKnown(legacy?.items,itemSet,STARTER_ITEMS);
    const frames = uniqueKnown(legacy?.frames,frameSet,STARTER_FRAMES);
    const accessory = items.includes(legacy?.accessory)?legacy.accessory:'changeling';
    const frame = legacy?.frame==='' || frames.includes(legacy?.frame)?legacy.frame:'sakura';
    const res = await pool.query(`INSERT INTO mlp_player_profiles
      (id,item_unlocks,frame_unlocks,selected_item,selected_frame)
      VALUES ($1,$2::jsonb,$3::jsonb,$4,$5) RETURNING *`,
      [digest(newToken),JSON.stringify(items),JSON.stringify(frames),accessory,frame]);
    return {token:newToken,profile:asProfile(res.rows[0]),created:true};
  }
  async function choose(profileId, accessory, frame){
    await init();
    const client=await pool.connect();
    try{
      await client.query('BEGIN');
      const res=await client.query('SELECT * FROM mlp_player_profiles WHERE id=$1 FOR UPDATE',[profileId]);
      if(!res.rowCount)throw new Error('Das Spielerprofil ist nicht mehr verfügbar.');
      const current=asProfile(res.rows[0]);
      // Never accept a locked item/frame from the browser.
      if(!current.items.includes(accessory) || !(frame==='' || current.frames.includes(frame)))
        throw new Error('Item oder Rahmen ist noch nicht freigeschaltet.');
      await client.query('UPDATE mlp_player_profiles SET selected_item=$2,selected_frame=$3,updated_at=now() WHERE id=$1',[profileId,accessory,frame]);
      await client.query('COMMIT');
      return {...current,accessory,frame};
    }catch(e){await client.query('ROLLBACK');throw e}finally{client.release()}
  }
  async function awardWin(profileId,matchId){
    await init();
    if(!/^[a-zA-Z0-9_-]{8,100}$/.test(matchId))throw new Error('Ungültige Spiel-ID');
    const client=await pool.connect();
    try{
      await client.query('BEGIN');
      const res=await client.query('SELECT * FROM mlp_player_profiles WHERE id=$1 FOR UPDATE',[profileId]);
      if(!res.rowCount)throw new Error('Spielerprofil nicht gefunden.');
      const previous=await client.query('SELECT reward FROM mlp_cosmetic_wins WHERE profile_id=$1 AND match_id=$2',[profileId,matchId]);
      if(previous.rowCount){await client.query('COMMIT');return {profile:asProfile(res.rows[0]),reward:previous.rows[0].reward,alreadyAwarded:true}}
      const profile=asProfile(res.rows[0]);
      const newItems=ITEMS.filter(x=>!profile.items.includes(x));
      const newFrames=FRAMES.filter(x=>!profile.frames.includes(x));
      const kinds=[...(newItems.length?['item']:[]),...(newFrames.length?['frame']:[])];
      const kind=kinds.length?kinds[crypto.randomInt(kinds.length)]:'complete';
      let reward={kind,key:null};
      if(kind==='item'){
        reward={kind,key:newItems[crypto.randomInt(newItems.length)]};
        profile.items.push(reward.key);
      }else if(kind==='frame'){
        reward={kind,key:newFrames[crypto.randomInt(newFrames.length)]};
        profile.frames.push(reward.key);
      }
      await client.query(`UPDATE mlp_player_profiles SET item_unlocks=$2::jsonb,
          frame_unlocks=$3::jsonb,updated_at=now() WHERE id=$1`,
        [profileId,JSON.stringify(profile.items),JSON.stringify(profile.frames)]);
      await client.query('INSERT INTO mlp_cosmetic_wins(profile_id,match_id,reward) VALUES($1,$2,$3::jsonb)',
        [profileId,matchId,JSON.stringify(reward)]);
      await client.query('COMMIT');
      return {profile,reward,alreadyAwarded:false};
    }catch(e){await client.query('ROLLBACK');throw e}finally{client.release()}
  }
  return {init,login,choose,awardWin,close:()=>pool.end()};
}
module.exports={createProfileStore,ITEMS,FRAMES,STARTER_ITEMS,STARTER_FRAMES,asProfile};
