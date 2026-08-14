# ENVIRONMENT_MATRIX.md

| Propiedad | Development | Preview | Staging | Production |
|---|---|---|---|---|
| Datos reales | No | Lectura sólo si es imprescindible | No | Sí |
| Escritura productiva | No | No | No | Sí |
| Supabase | local/staging | prod read-only o staging | staging aislado | prod |
| Google Sheets | off/test | off | test | prod |
| PII ficticia | Sí | Preferida | Sí | No necesariamente |
| `ALLOW_NON_PRODUCTION_WRITES` | false salvo local/staging | false salvo staging verificado | true | n/a |
| `NEXT_PUBLIC_ALLOW_NON_PRODUCTION_WRITES` | false salvo local/staging | false salvo staging verificado | true | n/a |
| `ALLOW_NON_PRODUCTION_EXTERNAL_SYNC` | false | false | true sólo con Sheet test | n/a |
| E2E mutante | local/staging | no contra prod | Sí | smoke controlado |
| LLM | mock/fallback | opcional | clave staging | prod según configuración |

## Reglas

- No habilitar un flag sólo para “hacer funcionar” un Preview sin comprobar destino.
- Production, Staging y Preview deben tener secretos separados cuando la integración lo permita.
- Staging es un entorno de infraestructura, no sólo una variable booleana.
- Una UI en Vercel Preview conectada a DB productiva read-only no equivale a staging.
