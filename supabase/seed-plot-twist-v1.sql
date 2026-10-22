-- Development seed for Plot Twist. Run only after the V1 schema migration.
insert into public.plot_twist_games(slug,title,status,current_stage_key,readiness_threshold,config)
values('matri-2026','Plot Twist','lobby','lobby',.75,'{"event":"Felipe & Cami · 23.10.26"}')
on conflict(slug) do update set title=excluded.title,readiness_threshold=excluded.readiness_threshold;

with g as(select id from public.plot_twist_games where slug='matri-2026')
insert into public.plot_twist_stages(game_id,stage_key,position,type,status,payload)
select g.id,v.k,v.p,v.t,case when v.k='lobby' then 'open' else 'queued' end,v.j::jsonb from g cross join(values
('lobby',0,'lobby','{"title":"Bienvenidos a Plot Twist","prompt":"Pónganle nombre a su mesa y elijan dos responsables."}'),
('icebreaker',10,'conversation','{"title":"Algo en común","prompt":"Descubran algo que TODOS tengan en común. No vale conocer a los novios."}'),
('couple-1',20,'table_decision','{"title":"¿Quién es más probable que…?","prompt":"Si llegan tarde a algo importante, ¿quién tuvo más probabilidades de causar el atraso?","options":[{"value":"felipe","label":"Felipe"},{"value":"cami","label":"Cami"}]}'),
('social-1',30,'individual_callback','{"title":"El último en pie","prompt":"¿Quién de esta mesa tiene más probabilidades de seguir bailando cuando prendan las luces?","callbackKey":"last_dancer"}'),
('tombola-1',40,'live_tombola','{"title":"Primer giro"}'),
('couple-2',50,'table_decision','{"title":"Lean la pista","prompt":"¿Quién es más probable que diga ya vámonos y termine quedándose una hora más?","options":[{"value":"felipe","label":"Felipe"},{"value":"cami","label":"Cami"}]}'),
('moment-couple-photo',60,'optional_media','{"title":"Momento con los novios","prompt":"Si Felipe y Cami están en su mesa, una foto puede sumar un bonus. Es opcional."}'),
('social-2',70,'individual_callback','{"title":"El más competitivo","prompt":"Esta vez no conversen: cada uno elige en privado a la persona más competitiva de su mesa.","callbackKey":"final_wagerer"}'),
('power-window',80,'powers','{"title":"Algo cambió"}'),
('tombola-2',90,'live_tombola','{"title":"Plot Twist"}'),
('final-wager',100,'wager','{"title":"Todo o Nada","prompt":"La persona que ustedes marcaron como la más competitiva decide cuánto arriesgan.","wagers":[0.25,0.5,1]}'),
('final-question',110,'table_decision','{"title":"La última pregunta","prompt":"Si Felipe y Cami pudieran guardar una sola cosa de esta noche, ¿qué creen que elegirían?","options":[{"value":"perfecta","label":"Que todo saliera perfecto"},{"value":"gente","label":"Ver a su gente junta"},{"value":"fiesta","label":"La fiesta hasta el final"},{"value":"fotos","label":"Las fotos"}]}'),
('locked',120,'locked','{"title":"Juego cerrado"}'),
('reveal',130,'reveal','{"title":"El verdadero Plot Twist","prompt":"Creyeron que había 20 equipos. Siempre hubo uno solo: nuestra gente."}')
) as v(k,p,t,j)
on conflict(game_id,stage_key) do update set position=excluded.position,type=excluded.type,payload=excluded.payload;

-- Tables are intentionally NOT seeded with guessed wedding-table mappings or public join tokens.
-- Generate random physical QR tokens/codes only when the final seating plan is confirmed.
