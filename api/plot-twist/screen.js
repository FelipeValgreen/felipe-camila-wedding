import { supabaseRequest } from '../_lib/supabase-admin.js';
import { getGame, reveal } from '../_lib/plot-twist-engine.js';
export default async function handler(req,res){
 try{
  if(req.method!=='GET')return res.status(405).json({error:'METHOD_NOT_ALLOWED'});
  const g=await getGame();
  if(!g)return res.status(404).json({error:'GAME_NOT_FOUND'});
  const events=await supabaseRequest('plot_twist_events?game_id=eq.'+g.id+'&visibility=eq.public&order=created_at.desc&limit=20&select=id,event_type,payload,created_at');
  const finale=['reveal','ended'].includes(g.status)?await reveal():null;
  res.setHeader('Cache-Control','no-store');
  return res.status(200).json({status:g.status,stage:g.current_stage_key,events:events||[],finale});
 }catch(e){console.error('Plot Twist screen:',e.message);return res.status(500).json({error:'INTERNAL_ERROR'})}
}
