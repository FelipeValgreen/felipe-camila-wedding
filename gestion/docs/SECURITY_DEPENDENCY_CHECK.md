# SECURITY_DEPENDENCY_CHECK.md

Before final freeze:

- inspect package lock for high severity advisories;
- patch vulnerabilities that affect deployed attack surface;
- avoid major upgrades without need during freeze;
- document accepted residual risks;
- verify deprecated SDK/key patterns are not used client-side.
