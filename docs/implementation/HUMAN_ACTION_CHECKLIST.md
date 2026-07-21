# Human Action Checklist

This checklist tracks tasks that must be performed by a human user (Felipe or Camila) due to access, security, or authentication boundaries.

---

## 1. Critical Credentials & Account Setup

| ID | Task | Platform / Location | Purpose | Required Outcome | Agent Parallel Work |
|---|---|---|---|---|---|
| **HA-001** | Create Meta Developer App | [Meta Developers](https://developers.facebook.com) | Creates the API access point for WhatsApp integration. | App ID and WhatsApp product configured. | Build mock webhook server & test normalizers locally. |
| **HA-002** | Verify WABA & Link Number | [Meta Business Suite](https://business.facebook.com) | Registers the official number (`+569...`) to send templates. | WABA ID and Phone ID verified. | Code tool contracts and state-machine transitions. |
| **HA-003** | Provide OpenAI API Key | [OpenAI Platform](https://platform.openai.com) | Activates the OpenAI adapter for conversation testing. | OpenAI Key registered in local env. | Implement OpenAI adapter client under local test mocks. |
| **HA-004** | Provide Gemini API Key | [Google AI Studio](https://aistudio.google.com) | Activates the Gemini adapter for model comparison. | Gemini Key registered in local env. | Implement Gemini adapter client under local test mocks. |
| **HA-005** | Deploy n8n Instance | [n8n Console](https://n8n.io) or Docker | Hosts the workflows (Sheets sync, reconfirmations). | Accessible n8n URL. | Export n8n workflow JSONs locally in `automation/n8n/`. |
| **HA-006** | Authorize Google Sheets OAuth | Google Cloud Console | Allows n8n to sync RSVPs to the spreadsheet. | Client ID and Secret generated. | Code local Sheets validation logic. |

---

## 2. Meta WhatsApp App Review / Release

| ID | Task | Platform | Purpose | Required Outcome |
|---|---|---|---|---|
| **HA-007** | Submit WhatsApp Message Templates | Meta WABA Console | Approves first-contact notification templates. | Template status changed to "Approved". |
| **HA-008** | Verify Webhook Callback | Meta App Dashboard | Links Vercel URL to Meta Webhook events. | Meta Webhook Status active. |
