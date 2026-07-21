# WhatsApp Environment Matrix

This document defines the configuration variables required across all deployment stages.

---

## 1. Environment Variables

| Variable Name | Type | Allowed Values | Secret? | Purpose |
|---|---|---|---|---|
| `AI_PROVIDER` | String | `openai` \| `gemini` | No | Defines the active AI adapter. |
| `AI_MODE` | String | `active` \| `human_only` | No | Global override. If `human_only`, AI replies are bypassed. |
| `AI_MAX_TOOL_CALLS` | Integer | `>= 1` (default `5`) | No | Protects against infinite tool loops. |
| `AI_TIMEOUT_MS` | Integer | Default `8000` | No | Timeout for provider calls before falling back. |
| `OPENAI_API_KEY` | String | API Key | Yes | Authentication for OpenAI API. |
| `OPENAI_MODEL` | String | `gpt-4o-mini` \| `gpt-4o` | No | OpenAI model version. |
| `GEMINI_API_KEY` | String | API Key | Yes | Authentication for Gemini API. |
| `GEMINI_MODEL` | String | `gemini-1.5-flash` | No | Gemini model version. |
| `META_VERIFY_TOKEN` | String | Custom Secret | Yes | Verification token sent by Meta during Webhook setup. |
| `META_APP_SECRET` | String | App Secret | Yes | Key used to sign webhook payloads. |
| `META_ACCESS_TOKEN` | String | System User Token | Yes | Permanent token to send messages via WhatsApp API. |
| `META_PHONE_NUMBER_ID` | String | Numeric ID | No | Meta ID for the sender phone number. |
| `META_BUSINESS_ACCOUNT_ID` | String | Numeric ID | No | Meta ID for the Business Account. |
