const KEY='pt_device_v1', SNAP='pt_snapshot_v1', OUT='pt_outbox_v1';
export function deviceToken(){let v=localStorage.getItem(KEY);if(!v){v=crypto.randomUUID();localStorage.setItem(KEY,v)}return v}
export function cached(){try{return JSON.parse(localStorage.getItem(SNAP)||'null')}catch{return null}}
export function save(v){localStorage.setItem(SNAP,JSON.stringify(v));return v}
async function call(body){const r=await fetch('/api/plot-twist/session',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({...body,deviceToken:deviceToken()})});const j=await r.json();if(!r.ok)throw Object.assign(new Error(j.error||'REQUEST_FAILED'),{status:r.status});return j}
export async function restore(){try{const r=await fetch('/api/plot-twist/session?device='+encodeURIComponent(deviceToken()),{cache:'no-store'});const j=await r.json();if(r.ok)return save(j)}catch{}return cached()}
export const join=(x)=>call({op:'join',...x}).then(save);
export const recoveryCandidates=(tableCode)=>call({op:'recovery_candidates',tableCode});
export const recover=(tableCode,playerId)=>call({op:'recover',tableCode,playerId}).then(save);
export const claimRole=(role)=>call({op:'claim_role',role}).then(save);
export const claimResponsible=()=>call({op:'claim_responsible'}).then(save);
export const teamName=(name)=>call({op:'team_name',name}).then(save);
export const ready=(ready=true)=>call({op:'ready',ready}).then(save);
export const feed=()=>call({op:'feed'});
export const chronicle=()=>call({op:'chronicle'});
export const react=(eventId,emoji)=>call({op:'react',eventId,emoji});
export async function action(stageId,kind,payload){
 const item={op:'action',stageId,kind,payload,idempotencyKey:crypto.randomUUID(),clientCreatedAt:new Date().toISOString()};
 try{const r=await call(item);if(r.snapshot)save(r.snapshot);return r}catch(e){if((!navigator.onLine||!e.status) && !['spin','power','wager','table_decision'].includes(kind)){const q=JSON.parse(localStorage.getItem(OUT)||'[]');q.push(item);localStorage.setItem(OUT,JSON.stringify(q));return {accepted:false,queued:true}}throw e}
}
export async function flush(){if(!navigator.onLine)return;let q=JSON.parse(localStorage.getItem(OUT)||'[]'),left=[];for(const x of q){try{await call(x)}catch(e){if(!e.status||e.status>=500)left.push(x)}}localStorage.setItem(OUT,JSON.stringify(left))}
addEventListener('online',flush);