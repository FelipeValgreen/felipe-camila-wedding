# Definition of Done

A task is not complete because it renders locally or because an agent reports success.

## Required completion evidence

- acceptance criteria are explicitly met;
- implementation matches the approved visual specification;
- no unapproved content or assets were introduced;
- real data and failure states were tested;
- iPhone Safari, Android Chrome and desktop were tested;
- slow-network and reduced-motion behavior were tested;
- accessibility and console checks were completed;
- preview or staging evidence exists;
- rollback instructions are documented;
- production remains unchanged until approval.

## Gallery and photo-upload requirement

The home experience must contain an integrated gallery section using the same authoritative Supabase photo source as `/galeria`.

The home gallery must:

- display approved historical civil-wedding photos and future event photos according to album and moderation rules;
- provide a clear `Subir fotos` action inside the section;
- allow mobile users to choose camera or photo library where supported;
- validate file type and size before upload;
- upload the original safely and create its metadata record;
- show a truthful success or failure state;
- refresh the gallery after a successful upload without requiring a redeploy;
- preserve `/galeria` as the complete archive and dedicated browsing route;
- never delete, overwrite or hide historical originals accidentally.

This feature is not complete until upload, gallery refresh, moderation behavior, mobile interaction and error handling have been tested with real or production-like data.
