const steps=[
{tag:'BIENVENIDOS',title:'Plot Twist',body:'El juego de las mesas. No necesitan quedarse mirando el teléfono: aparece, provoca algo y los devuelve a la noche.',cta:'ENTRAR A LA DEMO'},
{tag:'MESA 08',title:'Los Inubicables',body:'Todos juegan. Dos Responsables de Mesa confirman las decisiones oficiales.',meta:'8 jugadores · 0 pts',cta:'EMPEZAR'},
{tag:'RONDA 1',title:'Algo en común',body:'Tienen 3 minutos. Encuentren algo que todos en esta mesa tengan en común y que no sea “conocemos a los novios”.',meta:'Hablen entre ustedes',cta:'ESTAMOS LISTOS'},
{tag:'FELIPE O CAMI',title:'¿Quién es más probable que…?',body:'…proponga un viaje improvisado un jueves y el viernes ya tenga las maletas listas?',choices:['Felipe','Cami'],meta:'+300 pts'},
{tag:'RESPUESTA GUARDADA',title:'Cami',body:'La decisión quedó registrada para Los Inubicables. Pueden cerrar el teléfono.',meta:'La respuesta real se revela después',cta:'CONTINUAR'},
{tag:'ESTA VEZ NO CONVERSEN',title:'El último en pie',body:'¿Quién de esta mesa creen que seguirá bailando cuando todos los demás ya se hayan rendido?',choices:['Anto','Pipe','Javi','Nico'],meta:'Tu voto es privado'},
{tag:'MOMENTO EN VIVO',title:'Tómbola',body:'Algo está a punto de pasar. El resultado queda fijado antes de la animación.',cta:'GIRAR TÓMBOLA'},
{tag:'PLOT TWIST',title:'Robo limitado',body:'Pueden robar el 10% de los puntos de otra mesa. Nunca más de 500 puntos.',choices:['Mesa 04 · Los Primos','Mesa 12 · Sin Señal','Mesa 17 · Los Tíos'],meta:'Un Responsable de Mesa decide'},
{tag:'LA NOCHE',title:'Momento',body:'La Mesa 12 acaba de sobrevivir a un Plot Twist 😂',choices:['😂','❤️','🔥'],meta:'Las reacciones son parte de la noche'},
{tag:'TODO O NADA',title:'¿Cuánto arriesgan?',body:'La última respuesta puede cambiarlo todo. La apuesta queda congelada antes de conocer la pregunta.',choices:['25%','50%','100%'],meta:'Los Inubicables · 1.850 pts'},
{tag:'PREGUNTA FINAL',title:'Una sola cosa',body:'Si Felipe y Cami pudieran guardar una sola cosa de esta noche, ¿cuál elegirían?',choices:['Que todo saliera perfecto','Ver a su gente junta','La fiesta','Las fotos'],meta:'Hablen. Después no hay vuelta atrás.'},
{tag:'LA NOCHE SE CIERRA',title:'Creyeron que había 20 equipos.',body:'Hubo puntos, ataques, apuestas y una mesa campeona. Pero Plot Twist estaba mirando otra cosa.',cta:'VER EL PLOT TWIST'},
{tag:'CAMPEONES',title:'Los Inubicables',body:'2.775 puntos',meta:'Ganaron el juego visible',cta:'¿Y LA MESA DE LA NOCHE?'},
{tag:'MESA DE LA NOCHE',title:'Los Sin Señal',body:'No fue la que más puntos consiguió. Fue la que más colaboró, participó y ayudó a que la noche ocurriera.',cta:'FINAL'},
{tag:'FELIPE & CAMI · 23.10.26',title:'Siempre hubo un solo equipo.',body:'Nuestra gente.',meta:'Gracias por ser parte de esta noche.'}
];let i=0;
const card=document.querySelector('#demo-card'),prog=document.querySelector('#demo-progress'),back=document.querySelector('#demo-back');
function esc(x){return String(x).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]))}
function draw(){const s=steps[i];prog.textContent=(i+1)+' / '+steps.length;back.hidden=i===0;card.innerHTML='<span class="demo-tag">'+esc(s.tag)+'</span><h2>'+esc(s.title)+'</h2><p>'+esc(s.body)+'</p>'+(s.meta?'<small>'+esc(s.meta)+'</small>':'')+(s.choices?'<div class="demo-choices">'+s.choices.map(x=>'<button>'+esc(x)+'</button>').join('')+'</div>':'')+(s.cta?'<button class="demo-next">'+esc(s.cta)+'</button>':'<button class="demo-next">VOLVER AL INICIO</button>');card.querySelectorAll('button').forEach(b=>b.onclick=()=>{if(i===steps.length-1)i=0;else i++;draw()})}
back.onclick=()=>{i=Math.max(0,i-1);draw()};draw();