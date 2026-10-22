import crypto from 'node:crypto';
import {supabaseRequest} from '../_lib/supabase-admin.js';
function auth(req){const a=process.env.PLOT_TWIST_OPERATOR_KEY||'';const b=String(req.headers['x-plot-twist-key']||'');return !!a&&Buffer.byteLength(a)===Buffer.byteLength(b)&&crypto.timingSafeEqual(Buffer.from(a),Buffer.from(b));}
export default async function handler(req,res){
 res.setHeader('Cache-Control','no-store');
 if(!auth(req))return res.status(401).json({error:'UNAUTHORIZED'});
 try{
 if(req.method==='GET'){
 const requests=await supabaseRequest('wedding_experience_requests?select=*&order=created_at.desc&limit=150');
 return res.status(200).json({requests:requests||[]});
 }
 if(req.method!=='POST')return res.status(405).json({error:'METHOD_NOT_ALLOWED'});
 const b=typeof req.body==='string'?JSON.parse(req.body):req.body||{};
 if(!/^[0-9a-f-]{36}$/i.test(String(b.id||''))||!['approved','rejected','fulfilled'].includes(b.status))return res.status(400).json({error:'INVALID_ACTION'});
 const found=(await supabaseRequest('wedding_experience_requests?id=eq.'+encodeURIComponent(b.id)+'&select=id,status'))?.[0];
 if(!found)return res.status(404).json({error:'NOT_FOUND'});
 if(found.status==='fulfilled'||b.status==='fulfilled'&&found.status!=='approved')return res.status(409).json({error:'INVALID_TRANSITION'});
 const updated=await supabaseRequest('wedding_experience_requests?id=eq.'+encodeURIComponent(b.id)+'&status=eq.'+found.status,{method:'PATCH',body:{status:b.status,reviewed_at:new Date().toISOString(),reviewer_note:String(b.note||'').slice(0,300)}});
 if(!updated?.length)return res.status(409).json({error:'CONCURRENT_CHANGE'});
 return res.status(200).json({ok:true,status:b.status});
 }catch(error){console.error('Wedding operator:',error.message);return res.status(503).json({error:'SERVICE_UNAVAILABLE'});}
}
