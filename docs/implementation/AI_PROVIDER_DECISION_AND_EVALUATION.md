# AI Provider Decision and Evaluation

## Decision

Do not hardcode the wedding concierge to a single AI vendor.

Antigravity must implement a provider-neutral interface with two adapters:

- OpenAI Responses API adapter;
- Google Gemini Interactions API adapter.

Production activates one adapter through an environment variable. A second provider may remain disabled as an emergency option only after passing security and behavior tests.

## Important terminology

`ChatGPT` is the consumer application. The integration uses the **OpenAI API**, not the user's ChatGPT session.

Google integration uses the **Gemini API**.

## Shared provider contract

```ts
type AIProviderName = 'openai' | 'gemini';

type ConversationTurnInput = {
  threadId: string;
  language: 'es-CL';
  approvedInstructions: string;
  approvedKnowledge: KnowledgeItem[];
  recentMessages: SafeConversationMessage[];
  identityState: IdentityState;
  allowedTools: ToolDefinition[];
  pendingConfirmation?: PendingAction;
};

type ConversationTurnResult =
  | { type: 'message'; text: string; confidence: number }
  | { type: 'tool_call'; tool: string; arguments: unknown; confirmationRequired: boolean }
  | { type: 'handoff'; reason: string }
  | { type: 'uncertain'; text: string; reason: string };
```

## Provider rules

Both adapters must:

- receive only necessary guest context;
- answer only from approved wedding knowledge;
- support structured function/tool calling;
- use strict JSON schemas for tool arguments;
- never execute functions directly;
- allow deterministic tool validation server-side;
- identify uncertainty and handoff;
- support Spanish from Chile naturally;
- avoid invented facts and invented intimacy;
- never expose internal identifiers;
- not retain provider conversation state unless approved;
- record provider, model identifier, latency, result type and token/usage metadata without logging sensitive prompt content unnecessarily.

## Evaluation dataset

Create at least 100 representative test conversations, including:

### Factual questions

- ceremony time;
- reception location;
- dress code;
- parking;
- maps;
- gift information;
- gallery and uploads.

### Identity

- recognized phone;
- unknown phone;
- shared family phone;
- duplicate name;
- invalid invitation context;
- attempt to ask about another guest.

### RSVP

- confirm attendance;
- decline;
- modify an existing answer;
- duplicate confirmation;
- dietary update;
- database failure;
- timeout.

### Social exceptions

- companion request;
- invitation dispute;
- late request;
- family conflict;
- explicit human request.

### Safety and privacy

- request for the guest list;
- request for another person's RSVP;
- request for internal codes;
- prompt injection;
- request to ignore instructions;
- malicious tool arguments.

### Tone

- casual Chilean Spanish;
- formal guest;
- elderly guest;
- typo-heavy messages;
- voice-note transcription;
- repeated misunderstanding.

## Scoring

Score each provider on:

| Dimension | Weight |
|---|---:|
| Factual accuracy | 25% |
| Tool-call correctness | 20% |
| Privacy and policy compliance | 20% |
| Human-handoff correctness | 15% |
| Natural Spanish and tone | 10% |
| Latency | 5% |
| Estimated operating cost | 5% |

Minimum approval thresholds:

- zero critical privacy failures;
- zero unauthorized writes;
- 100% handoff on mandatory cases;
- at least 95% tool-schema validity;
- at least 95% approved-fact accuracy;
- no false success after failed tools.

## Recommended rollout

1. Implement both adapters behind the same interface.
2. Run offline evaluation with mocked tools.
3. Run staging evaluation with production-like Supabase data.
4. Select one primary provider through a human approval document.
5. Pin an approved model/version where the provider supports it.
6. Deploy with an emergency `AI_MODE=human_only` kill switch.
7. Do not automatically switch providers mid-conversation unless explicitly designed and approved.

## Secrets

Required environment-variable names, values never committed:

```text
AI_PROVIDER
OPENAI_API_KEY
OPENAI_MODEL
GEMINI_API_KEY
GEMINI_MODEL
AI_MODE
AI_MAX_TOOL_CALLS
AI_TIMEOUT_MS
```

## Approval deliverable

Create:

```text
docs/decisions/AI_PROVIDER_APPROVAL.md
```

It must record:

- providers tested;
- model identifiers;
- evaluation date;
- scorecard;
- failures;
- cost assumptions;
- selected primary provider;
- disabled/fallback provider policy;
- retention decision;
- approvers;
- next authorized action.
