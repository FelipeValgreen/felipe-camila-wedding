import { chromium } from 'playwright';
const B='http://127.0.0.1:8098'; const b=await chromium.launch();
const text=p=>p.locator('#card').innerText();
async function guest(name,table,picks){ const ctx=await b.newContext({viewport:{width:375,height:812},isMobile:true,hasTouch:true}); const p=await ctx.newPage(); const errs=[]; p.on('pageerror',e=>errs.push(e.message));
  await p.goto(B+'/plot-twist/'); await p.waitForTimeout(300); await p.fill('#name',name); await p.fill('#table',table); await p.click('#go');
  for(let i=0;i<8;i++){ for(let k=0;k<50;k++){ const t=await text(p); if(/Ronda \d completada/.test(t)){await p.click('#continue-round');await p.waitForTimeout(80);} if(await p.$('.ans:not([disabled])'))break; await p.waitForTimeout(100);} await p.locator('.ans').nth(picks[i]).click(); await p.waitForTimeout(600); }
  await p.waitForFunction(()=>/Terminaste/.test(document.querySelector('#card').innerText),null,{timeout:8000});
  await p.waitForSelector('#fun-spin',{timeout:8000}).catch(()=>{});
  return {ctx,p,errs}; }
const key=[1,0,2,1,0,2,0,1];
// 3 guests mesa 11 (eligible), 1 Novios perfect, 1 Novios partial wrong
const m11=[]; for (const n of ['Ana','Luis','Pía']) m11.push(await guest(n,'11',key.map((v,i)=>i<6?v:(v+1)%3))); // 600 pts each
const nov=await guest('Felipe','Novios',key); // 800
const novB=await guest('Cami','novios',key.map(v=>(v+1)%3)); // 0
const st=await nov.p.locator('#status').innerText(); const fin=await text(nov.p);
console.log('Novios status:', st);
console.log('Novios ranking block:\n'+fin.split('Ranking por mesa')[1]?.slice(0,400));
await nov.p.reload(); await nov.p.waitForTimeout(700); const after=await nov.p.locator('#status').innerText(); console.log('Novios tras recarga:', after, '| final persiste:', /Terminaste/.test(await text(nov.p)));
const st11=await m11[0].p.locator('#status').innerText(); console.log('Mesa 11 Ana status:', st11);
const r=await (await fetch(B+'/api/plot-twist/express?device='+await nov.p.evaluate(()=>localStorage.getItem('pt_device_v1')))).json();
console.log('API Novios: personalPoints=',r.personalPoints,'answers=',r.answers.length,'ranking Novios=',JSON.stringify(r.ranking.find(x=>x.isNovios)),'mesa11=',JSON.stringify(r.ranking.find(x=>x.name==='Mesa 11')));
console.log('JS errors:', [...nov.errs,...novB.errs,...m11.flatMap(g=>g.errs)].length);
await b.close();
