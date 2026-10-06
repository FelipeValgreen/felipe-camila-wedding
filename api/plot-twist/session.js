import { join,claimRole,claimResponsible,setTeamName,setReady,submitAction,snapshot,uuid } from '../_lib/plot-twist-engine.js';
function send(res,status,body){res.statusCode=status;res.setHeader('Content-Type','application/json');res.setHeader('Cache-Control','no-store');res.end(JSON.stringify(body))}
export default async function handler(req,res){
 try{
  if(req.method==='GET'){const d=String(req.query?.device||'');return send(res,200,await snapshot(d))}
  if(req.method!=='POST')return send(res,405,{error:'METHOD_NOT_ALLOWED'});
  const b=typeof req.body==='string'?JSON.parse(req.body||'{}'):(req.body||{}); const op=b.op;
  if(op==='join')return send(res,200,await join(b));
  if(op==='claim_role')return send(res,200,await claimRole(b));
  if(op==='claim_responsible')return send(res,200,await claimResponsible(b));
  if(op==='team_name')return send(res,200,await setTeamName(b));
  if(op==='ready')return send(res,200,await setReady(b));
  if(op==='action')return send(res,200,await submitAction({...b,idempotencyKey:b.idempotencyKey||uuid()}));
  return send(res,400,{error:'UNKNOWN_OPERATION'});
 }catch(e){console.error('Plot Twist API:',e.message);return send(res,e.status||500,{error:e.message||'INTERNAL_ERROR'})}
}