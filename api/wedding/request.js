import {supabaseRequest} from '../_lib/supabase-admin.js';
export default async function handler(req,res){
 res.setHeader('Cache-Control','no-store');
 if(req.method!=='POST')return res.status(405).json({error:'METHOD_NOT_ALLOWED'});
 try{
 const body=typeof req.body==='string'?JSON.parse(req.body):req.body||{};
 const kind=String(body.kind||'');
 const name=String(body.name||'').trim().slice(0,120);
 const category=String(body.category||'').trim().slice(0,90);
 const table=body.table?Number(body.table):null;
 if(!['raspe','complice','civil_prize'].includes(kind)||name.length<2||table!==null&&(!Number.isInteger(table)||table<1||table>23))return res.status(400).json({error:'INVALID_REQUEST'});
 const details={};
 if(kind==='raspe'){
 if(!['guest','groom','other'].includes(body.face))return res.status(400).json({error:'INVALID_FACE'});
 details.face=body.face;details.note=String(body.note||'').slice(0,400);
 }
 if(kind==='complice'){
 if(!table||!['yes','no'].includes(body.found))return res.status(400).json({error:'INVALID_RESULT'});
 details.found=body.found;
 }
 if(kind==='civil_prize'){
 if(category.length<2||!['waiter','home'].includes(body.delivery))return res.status(400).json({error:'INVALID_PRIZE'});
 details.delivery=body.delivery;
 }
 const rows=await supabaseRequest('wedding_experience_requests',{method:'POST',body:{kind,claimant_name:name,table_number:table,category:category||null,details,status:'pending'}});
 if(!rows?.[0]?.id)return res.status(503).json({error:'STORAGE_UNCONFIRMED'});
 return res.status(201).json({ok:true,id:rows[0].id,status:'pending'});
 }catch(error){console.error('Wedding intake:',error.message);return res.status(503).json({error:'SERVICE_UNAVAILABLE'});}
}
