import crypto from 'node:crypto';
import { supabaseRequest } from './supabase-admin.js';

const GAME_SLUG='matri-2026';
export const hash=v=>crypto.createHash('sha256').update(String(v)).digest('hex');
export const cleanName=v=>String(v||'').trim().replace(/\s+/g,' ').slice(0,32);
export const uuid=()=>crypto.randomUUID();

export async function getGame(){
 const r=await supabaseRequest('plot_twist_games?slug=eq.'+GAME_SLUG+'&select=*'); return r?.[0]||null;
}
export async function getTableByToken(token){
 const g=await getGame(); if(!g||!token)return null;
 const r=await supabaseRequest('plot_twist_tables?game_id=eq.'+g.id+'&join_token_hash=eq.'+hash(token)+'&select=*');
 return r?.[0]||null;
}
export async function getTableByCode(code){
 const g=await getGame(); if(!g||!code)return null;
 const r=await supabaseRequest('plot_twist_tables?game_id=eq.'+g.id+'&join_code_hash=eq.'+hash(code)+'&select=*');
 return r?.[0]||null;
}
export async function findPlayer(deviceToken){
 const g=await getGame(); if(!g||!deviceToken)return null;
 const r=await supabaseRequest('plot_twist_players?game_id=eq.'+g.id+'&device_token_hash=eq.'+hash(deviceToken)+'&active=eq.true&select=*');
 return r?.[0]||null;
}
export async function currentStage(game){
 if(!game?.current_stage_key)return null;
 const r=await supabaseRequest('plot_twist_stages?game_id=eq.'+game.id+'&stage_key=eq.'+encodeURIComponent(game.current_stage_key)+'&select=*');
 return r?.[0]||null;
}
export async function snapshot(deviceToken){
 const game=await getGame(); if(!game)return {game:null};
 const player=await findPlayer(deviceToken);
 if(!player)return {game:{status:game.status},player:null};
 const tr=await supabaseRequest('plot_twist_tables?id=eq.'+player.table_id+'&select=*');
 const table=tr?.[0]||null; const stage=await currentStage(game);
 const peers=await supabaseRequest('plot_twist_players?table_id=eq.'+player.table_id+'&active=eq.true&select=id,nickname,role');
 return {game:{status:game.status},player:{id:player.id,nickname:player.nickname,role:player.role},table:table&&{id:table.id,team_name:table.team_name,score:table.score_cache,ready:table.ready},stage:stage&&{id:stage.id,key:stage.stage_key,type:stage.type,status:stage.status,payload:stage.payload,closes_at:stage.closes_at},players:peers||[]};
}
export async function join({tableToken,tableCode,deviceToken,nickname}){
 const name=cleanName(nickname); if(name.length<1)throw Object.assign(new Error('NICKNAME_REQUIRED'),{status:400});
 let table=tableToken?await getTableByToken(tableToken):await getTableByCode(tableCode);
 if(!table)throw Object.assign(new Error('TABLE_NOT_FOUND'),{status:404});
 const game=await getGame(); let player=await findPlayer(deviceToken);
 if(player && player.table_id!==table.id)throw Object.assign(new Error('DEVICE_ALREADY_JOINED'),{status:409});
 if(!player){
   const same=await supabaseRequest('plot_twist_players?table_id=eq.'+table.id+'&nickname=ilike.'+encodeURIComponent(name)+'&active=eq.true&select=id');
   if(same?.length)throw Object.assign(new Error('NICKNAME_TAKEN'),{status:409});
   const rows=await supabaseRequest('plot_twist_players',{method:'POST',body:{game_id:game.id,table_id:table.id,nickname:name,device_token_hash:hash(deviceToken),role:'spectator'}});
   player=rows?.[0];
 } else await supabaseRequest('plot_twist_players?id=eq.'+player.id,{method:'PATCH',body:{last_seen_at:new Date().toISOString()}});
 return snapshot(deviceToken);
}
export async function claimRole({deviceToken,role}){
 if(!['complice','dupla'].includes(role))throw Object.assign(new Error('BAD_ROLE'),{status:400});
 const p=await findPlayer(deviceToken); if(!p)throw Object.assign(new Error('SESSION_NOT_FOUND'),{status:401});
 try{await supabaseRequest('plot_twist_players?id=eq.'+p.id,{method:'PATCH',body:{role}});}
 catch(e){if(e.status===409)throw Object.assign(new Error('ROLE_TAKEN'),{status:409});throw e}
 return snapshot(deviceToken);
}
export async function setTeamName({deviceToken,name}){
 const p=await findPlayer(deviceToken); if(!p)throw Object.assign(new Error('SESSION_NOT_FOUND'),{status:401});
 if(!['complice','dupla'].includes(p.role))throw Object.assign(new Error('ROLE_REQUIRED'),{status:403});
 const n=cleanName(name); if(n.length<2)throw Object.assign(new Error('TEAM_NAME_REQUIRED'),{status:400});
 await supabaseRequest('plot_twist_tables?id=eq.'+p.table_id,{method:'PATCH',body:{team_name:n}});
 return snapshot(deviceToken);
}
export async function submitAction({deviceToken,stageId,kind,payload,idempotencyKey,clientCreatedAt}){
 const p=await findPlayer(deviceToken); if(!p)throw Object.assign(new Error('SESSION_NOT_FOUND'),{status:401});
 if(kind==='table_decision'&&!['complice','dupla'].includes(p.role))throw Object.assign(new Error('ROLE_REQUIRED'),{status:403});
 const sr=await supabaseRequest('plot_twist_stages?id=eq.'+stageId+'&game_id=eq.'+p.game_id+'&select=*'); const s=sr?.[0];
 if(!s||s.status!=='open')throw Object.assign(new Error('STAGE_CLOSED'),{status:409});
 try{
  const r=await supabaseRequest('plot_twist_actions',{method:'POST',body:{game_id:p.game_id,stage_id:s.id,table_id:p.table_id,player_id:p.id,kind,payload:payload||{},idempotency_key:idempotencyKey,client_created_at:clientCreatedAt||null}});
  return {accepted:true,action:r?.[0]||null};
 }catch(e){
  if(e.status===409){
   const old=await supabaseRequest('plot_twist_actions?game_id=eq.'+p.game_id+'&idempotency_key=eq.'+idempotencyKey+'&select=*');
   if(old?.[0])return {accepted:true,replayed:true,action:old[0]};
   throw Object.assign(new Error('DECISION_ALREADY_LOCKED'),{status:409});
  } throw e;
 }
}