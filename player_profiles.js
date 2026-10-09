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
      await pool.query(`CREATE TABLE IF NOT EXISTS mlp_player_accounts (
        id TEXT PRIMARY KEY,
        username_norm TEXT UNIQUE NOT NULL,
        username_display TEXT NOT NULL,
        password_salt TEXT NOT NULL,
        password_hash TEXT NOT NULL,
        profile_id TEXT UNIQUE NOT NULL REFERENCES mlp_player_profiles(id) ON DELETE RESTRICT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now()
      )`);
      await pool.query(`CREATE TABLE IF NOT EXISTS mlp_player_sessions (
        session_hash TEXT PRIMARY KEY,
        account_id TEXT NOT NULL REFERENCES mlp_player_accounts(id) ON DELETE CASCADE,
        expires_at TIMESTAMPTZ NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now()
      )`);
      await pool.query('CREATE INDEX IF NOT EXISTS mlp_player_sessions_expiry ON mlp_player_sessions (expires_at)');
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

  // Login credentials, password hashes, sessions and unlocks are stored in PostgreSQL.
  // Session secrets are NEVER written to the database in clear text.
  const scryptAsync = require('util').promisify(crypto.scrypt);
  const SCRYPT_OPTIONS = {N:16384,r:8,p:1,maxmem:64*1024*1024};
  const SESSION_DAYS = 180;
  function normalizeUsername(value){
    const name=String(value??'').trim().normalize('NFKC');
    if(name.length<3 || name.length>24 || !/^[\p{L}\p{N}_.-]+$/u.test(name))
      throw new Error('Benutzername: 3–24 Zeichen, nur Buchstaben, Zahlen, Punkt, _ oder -.');
    return {name,norm:name.toLowerCase()};
  }
  function validatePassword(value){
    if(typeof value!=='string' || value.length<10 || value.length>128)
      throw new Error('Passwort muss zwischen 10 und 128 Zeichen lang sein.');
    return value;
  }
  async function hashPassword(password,salt){
    const key=await scryptAsync(password,Buffer.from(salt,'hex'),64,SCRYPT_OPTIONS);
    return key.toString('hex');
  }
  async function issueSession(client,accountId){
    const sessionToken=crypto.randomBytes(32).toString('hex');
    const sessionHash=digest(sessionToken);
    await client.query(`INSERT INTO mlp_player_sessions (session_hash,account_id,expires_at)
      VALUES ($1,$2,now()+interval '180 days')`,[sessionHash,accountId]);
    return sessionToken;
  }
  async function accountRegister({username,password,oldProfileToken,legacy}={}){
    await init();
    const {name,norm}=normalizeUsername(username);
    validatePassword(password);
    if(oldProfileToken && !validToken(oldProfileToken))throw new Error('Dein alter Profil-Schlüssel ist ungültig.');
    const salt=crypto.randomBytes(16).toString('hex');
    const passwordHash=await hashPassword(password,salt);
    const client=await pool.connect();
    let sessionToken;
    try{
      await client.query('BEGIN');
      const exists=await client.query('SELECT id FROM mlp_player_accounts WHERE username_norm=$1',[norm]);
      if(exists.rowCount)throw new Error('Dieser Benutzername ist schon vergeben.');
      let profileRow;
      if(oldProfileToken){
        const profileId=digest(oldProfileToken.toLowerCase());
        const prev=await client.query('SELECT * FROM mlp_player_profiles WHERE id=$1 FOR UPDATE',[profileId]);
        if(!prev.rowCount)throw new Error('Altes Profil nicht gefunden. Bitte Profil-Schlüssel prüfen.');
        const linked=await client.query('SELECT id FROM mlp_player_accounts WHERE profile_id=$1',[profileId]);
        if(linked.rowCount)throw new Error('Dieses Profil gehört bereits zu einem Account. Bitte dort anmelden.');
        profileRow=prev.rows[0];
      }else{
        const newProfileId=digest(crypto.randomBytes(32).toString('hex'));
        // Legacy browser unlocks are imported only once, at initial account creation.
        const allowLegacy=process.env.MLP_ALLOW_LEGACY_IMPORT!=='false';
        const items=uniqueKnown(allowLegacy?legacy?.items:null,itemSet,STARTER_ITEMS);
        const frames=uniqueKnown(allowLegacy?legacy?.frames:null,frameSet,STARTER_FRAMES);
        const accessory=items.includes(legacy?.accessory)?legacy.accessory:'changeling';
        const frame=legacy?.frame===''||frames.includes(legacy?.frame)?legacy.frame:'sakura';
        const inserted=await client.query(`INSERT INTO mlp_player_profiles
          (id,item_unlocks,frame_unlocks,selected_item,selected_frame)
          VALUES($1,$2::jsonb,$3::jsonb,$4,$5) RETURNING *`,
          [newProfileId,JSON.stringify(items),JSON.stringify(frames),accessory,frame]);
        profileRow=inserted.rows[0];
      }
      const accountId=crypto.randomUUID();
      await client.query(`INSERT INTO mlp_player_accounts
        (id,username_norm,username_display,password_salt,password_hash,profile_id)
        VALUES ($1,$2,$3,$4,$5,$6)`,
        [accountId,norm,name,salt,passwordHash,profileRow.id]);
      sessionToken=await issueSession(client,accountId);
      await client.query('COMMIT');
      return {sessionToken,username:name,profile:asProfile(profileRow)};
    }catch(err){
      await client.query('ROLLBACK');
      if(err.code==='23505')throw new Error('Dieser Benutzername oder dieses Profil wird bereits benutzt.');
      throw err;
    }finally{client.release()}
  }
  async function accountLogin({username,password}={}){
    await init();
    const {norm}=normalizeUsername(username);
    validatePassword(password);
    const result=await pool.query(`SELECT a.*,p.item_unlocks,p.frame_unlocks,p.selected_item,p.selected_frame
      FROM mlp_player_accounts a JOIN mlp_player_profiles p ON p.id=a.profile_id
      WHERE a.username_norm=$1`,[norm]);
    if(!result.rowCount){
      // Perform a hash even for nonexistent accounts to reduce user enumeration.
      await hashPassword(password,'00'.repeat(16));
      throw new Error('Benutzername oder Passwort ist falsch.');
    }
    const account=result.rows[0];
    const calculated=Buffer.from(await hashPassword(password,account.password_salt),'hex');
    const expected=Buffer.from(account.password_hash,'hex');
    if(expected.length!==calculated.length||!crypto.timingSafeEqual(expected,calculated))
      throw new Error('Benutzername oder Passwort ist falsch.');
    const sessionToken=crypto.randomBytes(32).toString('hex');
    await pool.query(`INSERT INTO mlp_player_sessions(session_hash,account_id,expires_at)
      VALUES($1,$2,now()+interval '180 days')`,[digest(sessionToken),account.id]);
    return {sessionToken,username:account.username_display,profile:asProfile({...account,id:account.profile_id})};
  }
  async function accountResume({sessionToken}={}){
    await init();
    if(!validToken(sessionToken))throw new Error('Deine Anmeldung ist abgelaufen. Bitte erneut anmelden.');
    const result=await pool.query(`SELECT a.username_display,a.profile_id,p.item_unlocks,p.frame_unlocks,p.selected_item,p.selected_frame
      FROM mlp_player_sessions s JOIN mlp_player_accounts a ON a.id=s.account_id
      JOIN mlp_player_profiles p ON p.id=a.profile_id
      WHERE s.session_hash=$1 AND s.expires_at>now()`,[digest(sessionToken.toLowerCase())]);
    if(!result.rowCount)throw new Error('Deine Anmeldung ist abgelaufen. Bitte erneut anmelden.');
    await pool.query(`UPDATE mlp_player_sessions
      SET expires_at=now()+interval '180 days' WHERE session_hash=$1`,[digest(sessionToken.toLowerCase())]);
    const account=result.rows[0];
    return {sessionToken:sessionToken.toLowerCase(),username:account.username_display,profile:asProfile({...account,id:account.profile_id})};
  }
  async function accountLogout({sessionToken}={}){
    if(validToken(sessionToken))await pool.query('DELETE FROM mlp_player_sessions WHERE session_hash=$1',[digest(sessionToken.toLowerCase())]);
  }
  return {init,login,choose,awardWin,accountRegister,accountLogin,accountResume,accountLogout,close:()=>pool.end()};
}
module.exports={createProfileStore,ITEMS,FRAMES,STARTER_ITEMS,STARTER_FRAMES,asProfile};
