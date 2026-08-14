# CLOSEOUT_RISKS.md

- documentation drift;
- missing tests despite broad implementation;
- Preview guards mistaken for full staging;
- historical credential status assumed current;
- hidden API/RLS mismatch;
- operational decisions incomplete close to event.

Mitigation: code/schema audit, CI, staging, security verification, freeze/runbook.
