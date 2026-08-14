# QUERY_POLICY.md

- select only fields needed;
- filters server-side for large/sensitive sets;
- stable ordering;
- pagination when scale requires;
- indexes for critical foreign keys/filters;
- do not use client-side filtering as an authorization boundary;
- avoid N+1 on dashboard summaries.
