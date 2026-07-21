# External Service Inventory

This document tracks the ownership, credentials status, billing, and integration blockers of all external service platforms involved in the WhatsApp AI Concierge system.

---

## 1. Meta / Developer Platform

### Meta Business Portfolio
- **Account Owner:** Felipe Valverde
- **Environment:** Production (meta.business.com)
- **Billing Status:** Unlinked (No billing card set up)
- **Configuration Status:** **UNCONFIGURED**
- **Blocker:** Requires manual business manager creation.
- **Required Human Action:** Create Meta Business Suite portfolio and add billing method.
- **Non-secret Identifier:** Pending creation

### Meta Developer Application
- **Account Owner:** Felipe Valverde
- **Environment:** Development & Production (developers.facebook.com)
- **Authentication Status:** Pending (No Meta login session in sandbox)
- **Configuration Status:** **UNCONFIGURED**
- **Blocker:** Requires creation under Felipe's developer account.
- **Required Human Action:** Create an app of type "Business" and add the "WhatsApp" product.
- **Non-secret Identifier:** App ID (Pending creation)

### WhatsApp Business Account (WABA)
- **Account Owner:** Felipe Valverde
- **Environment:** Sandbox / Production
- **Authentication Status:** Pending
- **Configuration Status:** **UNCONFIGURED**
- **Blocker:** Requires developer app and verified business portfolio.
- **Required Human Action:** Set up WABA inside Meta Business Manager.
- **Non-secret Identifier:** WABA ID (Pending)

---

## 2. Infrastructure & Hosting

### Vercel Project
- **Account Owner:** Felipe Valverde (`FelipeValgreen`)
- **Environment:** Staging / Production
- **Authentication Status:** **VERIFIED LIVE** (Domain felipeycami.cl linked to Vercel production hosting)
- **Configuration Status:** **PARTIALLY CONFIGURABLE**
- **Blocker:** None. Static page is live. Webhook routing logic needs to be deployed.
- **Required Human Action:** Configure secure environment variables (Supabase secrets, API keys).
- **Non-secret Identifier:** `felipe-camila-wedding`

### Supabase Project
- **Account Owner:** Felipe Valverde
- **Environment:** Live Database Instance
- **Authentication Status:** **VERIFIED LIVE** (Connecting with Anon Publishable Key)
- **Configuration Status:** **PARTIALLY CONFIGURABLE**
- **Blocker:** Authenticated database admin (service role) access is unverified in client-side.
- **Required Human Action:** Run DDL migrations for WhatsApp tables (threads, messages, handoffs).
- **Non-secret Identifier:** Project URL `https://mwumnywbvjxekskfrlms.supabase.co`

---

## 3. AI Providers & Automations

### OpenAI API
- **Account Owner:** Felipe Valverde
- **Environment:** Production API access
- **Authentication Status:** Pending
- **Billing Status:** Needs prepaid balance
- **Configuration Status:** **UNCONFIGURED**
- **Blocker:** Requires API Key.
- **Required Human Action:** Create API Key and add billing credits in platform.openai.com.
- **Non-secret Identifier:** Project ID (Pending)

### Google AI Studio (Gemini API)
- **Account Owner:** Felipe Valverde
- **Environment:** Production API access
- **Authentication Status:** Pending
- **Configuration Status:** **UNCONFIGURED**
- **Blocker:** Requires API Key.
- **Required Human Action:** Generate Gemini API Key in aistudio.google.com.
- **Non-secret Identifier:** Project ID (Pending)

### n8n Operational Workspace
- **Account Owner:** Felipe Valverde
- **Environment:** Staging / Production
- **Authentication Status:** Pending
- **Configuration Status:** **UNCONFIGURED**
- **Blocker:** Hosting platform selection (n8n Cloud, self-hosted, or local tunnel).
- **Required Human Action:** Deploy n8n workspace instance and provide connection credentials.
- **Non-secret Identifier:** Workspace URL (Pending)

### Google Sheets API
- **Account Owner:** Camila / Felipe
- **Environment:** Production RSVP Sheet
- **Authentication Status:** **PARTIALLY CONFIGURED** (Linked via Web3Forms API fallback)
- **Configuration Status:** **UNCONFIGURED** (No direct OAuth sync setup)
- **Blocker:** Requires n8n / backend server OAuth authorization.
- **Required Human Action:** Authenticate n8n workflow with Google Account.
- **Non-secret Identifier:** Google Sheet ID (Pending)
