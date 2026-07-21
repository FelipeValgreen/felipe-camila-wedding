# 06 — Content & Interface State Matrix

## Objective

Prevent Antigravity and Stitch from designing only ideal screens. Every important section must be defined for real content, loading, failure, empty and returning-user states.

---

# 1. Canonical content sources

| Content domain | Source of truth | Editable by | Approval required |
|---|---|---|---|
| Event date and schedule | Verified event content record | Operational team | Felipe / Camila |
| Venue names and maps | Verified event content record | Operational team | Felipe / Camila |
| Guest identity | Supabase guest record | Controlled operation | Data rules |
| RSVP status | Supabase RSVP record | Guest / authorized operator | Backend validation |
| Dietary information | Supabase RSVP record | Guest / authorized operator | Explicit confirmation |
| Gallery photos | Supabase metadata + Storage | Guest / moderator | Moderation policy |
| Emotional narrative | Approved copy document | Content owner | Felipe / Camila |
| WhatsApp answers | Approved knowledge base | Operational team | Content approver |

The frontend must not contain an independent conflicting copy of operational facts when a canonical structured source exists.

---

# 2. Entry states

| State | Trigger | Required content | Primary action | Prohibited behavior |
|---|---|---|---|---|
| Personalized | Valid secure guest context | First name, couple, date | Entrar | Expose internal token |
| Neutral | Direct public visit | Couple, date, invitation context | Entrar / confirmar identidad | Guess guest |
| Invalid context | Expired or invalid context | Safe error and help | Revisar enlace / WhatsApp | Reveal database existence |
| Returning confirmed | Existing yes RSVP | Confirmation summary | Ver información / actualizar | Force full intro |
| Returning declined | Existing no RSVP | Recorded response | Revisar / solicitar cambio | Guilt language |
| Offline | Network unavailable | Essential cached content if possible | Reintentar | False personalized state |

---

# 3. Event-information states

| State | Required behavior |
|---|---|
| Verified complete | Show exact venue, time, map and guidance |
| Partially verified | Show only confirmed fields; mark missing operationally, not with invented copy |
| Updated | Display current version and avoid stale duplicated copy |
| Map unavailable | Keep written address and provide retry / copy address |
| Slow network | Text appears before nonessential photography |

Essential event information must not depend on gallery, audio or animation loading.

---

# 4. RSVP state matrix

| State | Interface | Copy direction | Allowed actions |
|---|---|---|---|
| Not identified | Safe identity step | Necesitamos identificar tu invitación | Verify / help |
| Identified pending | Individual form | ¿Podrás acompañarnos? | Yes / no |
| Attending selected | Show dietary options | Restricción alimentaria | Submit |
| Declining selected | Hide unnecessary dietary fields | Confirm response | Submit |
| Validating | Disable duplicate action | Revisando tu respuesta… | None |
| Saving | Persistent progress | Guardando tu respuesta… | None |
| Saved attending | Explicit confirmation | Tu asistencia quedó confirmada | WhatsApp / review |
| Saved declining | Explicit neutral confirmation | Tu respuesta quedó registrada | Review / help |
| Existing response | Summary | Ya tenemos una respuesta registrada | Review / request change |
| Duplicate request | Do not insert another record | Tu respuesta ya estaba registrada | Continue safely |
| Network failure | Preserve form | No pudimos guardar tu respuesta | Retry |
| Backend rejection | Explain recovery | No fue posible completar el cambio | Retry / human help |
| Sheets queued | Only if architecture supports it | Tu respuesta quedó guardada | No duplicate submit |
| Exceptional change | Human review | Dejaremos tu solicitud al equipo | Handoff |

---

# 5. Living-gallery state matrix

| State | Home behavior | `/galeria` behavior | Upload behavior |
|---|---|---|---|
| Loading | Editorial skeleton, preserve layout | Progressive archive skeleton | Upload remains accessible if safe |
| Photos available | Curated 8–12 images | Complete paginated / progressive archive | Agrega tu mirada |
| No photos | Honest empty composition | Empty state and upload action | Available |
| Database error | Keep section structure and recovery | Error and retry | Do not imply gallery is empty |
| Offline | Cached or explanatory state | Retry | Disable submission with explanation |
| Album missing | Hide invalid filter | Do not show empty fake category | Unaffected |
| Moderated upload | Explain review state | Not public until approved | Success awaiting review |
| Immediately public upload | Use only if approved policy | Appears after confirmed metadata save | Explicit publication status |
| Storage success / metadata failure | Do not display public success | Reconciliation required | Explain incomplete upload / support |
| Rejected file | No gallery change | No gallery change | Specific validation error |
| Large file | No gallery change | No gallery change | Offer compression guidance |
| Duplicate image | Avoid accidental duplicate display | Flag or deduplicate according to policy | Inform user when relevant |

---

# 6. Photo-upload fields and consent

Minimum:

- uploader name;
- image file;
- preview;
- publication-consent control;
- optional guest association when safely identified;
- event / album context assigned by system or moderation;
- upload timestamp;
- moderation status.

Do not require email unless a documented operational need exists.

Consent copy must clearly distinguish:

- receiving the file;
- storing the file;
- publicly displaying the file;
- moderation;
- removal or correction process.

---

# 7. WhatsApp concierge states

| State | Assistant behavior | Human behavior |
|---|---|---|
| New conversation | Introduce assistant and capabilities | None |
| Recognized guest | Personal but limited greeting | Available on request |
| Unknown guest | Request minimal identity | Available if unresolved |
| Verified factual question | Answer from approved source | None |
| Unknown information | State uncertainty | Receive handoff if requested |
| Proposed data change | Restate and request confirmation | None unless sensitive |
| Tool executing | Wait and show truthful progress | None |
| Tool success | Confirm exact change | Visible in audit |
| Tool failure | Explain failure and retry / handoff | Take over if needed |
| Human requested | Pause AI | Continue in same thread |
| Human active | No competing AI response | Own conversation |
| Resolved | Close or return under explicit rule | Document resolution |

---

# 8. Navigation states

## Before RSVP

Primary persistent action:

`Confirmar asistencia`

## After RSVP

Possible persistent action:

`Ver mi confirmación`

or:

`Hablar por WhatsApp`

## Inside gallery upload

Persistent RSVP CTA must not cover upload controls.

## Reduced motion

Navigation remains fully functional with no dependence on animated transitions.

---

# 9. Content-length constraints

| Element | Recommended limit |
|---|---:|
| Entry emotional statement | 8–18 words |
| Chapter title | 2–8 words |
| Narrative paragraph | 30–55 words maximum |
| Venue description | 15–35 words |
| Button label | 1–5 words |
| System error | 1 concise explanation + 1 recovery action |
| Photo caption | name, date or one short phrase |
| WhatsApp automated answer | fact first, then action |

The design must be tested with maximum approved content, not only short placeholder text.

---

# 10. Required content placeholders

Until final facts or photography are approved, use explicit labels such as:

- `[VERIFIED CEREMONY NAME]`
- `[VERIFIED ADDRESS]`
- `[APPROVED REAL PHOTO — CIVIL]`
- `[APPROVED REAL PHOTO — COUPLE]`
- `[APPROVED ARBOLEDA PHOTO]`
- `[COPY PENDING APPROVAL]`

Never generate believable but unverified production content to fill gaps.

---

# 11. State acceptance criteria

The system passes when:

- no essential flow has only an ideal success screen;
- returning guests are supported;
- offline and network errors preserve user work where possible;
- gallery errors are not misrepresented as an empty archive;
- upload success reflects both Storage and metadata state;
- RSVP success reflects confirmed Supabase state;
- WhatsApp actions have transparent AI / human ownership;
- maximum copy lengths do not break mobile layouts;
- every unknown fact is represented as pending rather than invented.
