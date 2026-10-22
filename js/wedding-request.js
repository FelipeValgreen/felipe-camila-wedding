document.querySelectorAll('form[data-wedding-request]').forEach(form=>{
 form.addEventListener('submit',async event=>{
  event.preventDefault();
  const button=form.querySelector('button[type=submit]');const result=form.querySelector('[data-result]');
  const data=Object.fromEntries(new FormData(form).entries());data.kind=form.dataset.weddingRequest;
  button.disabled=true;result.textContent='Enviando solicitud…';
  try{
   const response=await fetch('/api/wedding/request',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(data)});
   const body=await response.json();if(!response.ok||!body.ok)throw new Error('No pudimos registrar tu solicitud. Inténtalo más tarde.');
   result.textContent='Solicitud recibida para revisión. Código: '+body.id+'. Esto no significa que esté aprobada.';
   form.reset();
  }catch(error){result.textContent=error.message||'No se pudo enviar la solicitud.';}
  finally{button.disabled=false;}
 });
});
