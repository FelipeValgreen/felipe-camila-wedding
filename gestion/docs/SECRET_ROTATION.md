# SECRET_ROTATION.md

1. create new credential;
2. configure target environment;
3. verify target uses new credential;
4. revoke old credential;
5. verify old credential rejected;
6. remove legacy fallback when safe;
7. record date/status without secret value.

Never revoke the only working credential before proving replacement unless responding to an active compromise that requires immediate containment.
