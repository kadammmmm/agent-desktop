# Full parity with Webex CC Tasks Call Control API in the Transfer feature

## Goal

The Transfer panel currently supports: Blind Transfer (agent / DN / queue via vteamTransfer), Consult start (agent / DN / queue), Complete transfer, Cancel consult, Conference. The Webex CC Tasks Call Control API exposes more capabilities that the Transfer UI does not yet surface. This plan adds the missing capabilities so a live agent has the same options here as on the native Cisco desktop.

## Capabilities in the Tasks Call Control API and current status

| # | API Capability | SDK method | Currently in Transfer UI |
|---|---|---|---|
| 1 | Blind transfer to Agent | `agentContact.blindTransfer` | Yes |
| 2 | Blind transfer to Dial Number | `agentContact.blindTransfer` | Yes |
| 3 | Blind transfer to Queue | `agentContact.vteamTransfer` (inboundqueue) | Yes |
| 4 | Blind transfer to Entry Point | `agentContact.vteamTransfer` (inboundentrypoint) | **Missing** |
| 5 | Consult to Agent | `agentContact.consult` (agent) | Yes |
| 6 | Consult to Dial Number | `agentContact.consult` (dialNumber) | Yes |
| 7 | Consult to Queue | `agentContact.consult` (queue) | Yes |
| 8 | Consult to Entry Point | `agentContact.consult` (entryPoint) | **Missing** |
| 9 | Complete transfer after consult | `agentContact.consultTransfer` | Yes |
| 10 | End consult (cancel) | `agentContact.consultEnd` | Yes |
| 11 | Conference (merge consulted party) | `agentContact.conference` | Yes (button) |
| 12 | Consult conference end / exit conference | `agentContact.consultConferenceEnd` (agent leaves conference) | **Missing** |
| 13 | Hold / Resume customer while consulting | `agentContact.holdResume` | Present elsewhere, but not exposed inside the consult view |
| 14 | Buddy agents refresh for transfer targets | `agentContact.buddyAgents` | Yes |
| 15 | Search / filter targets | client-side | Yes (agents only) |

Items 4, 8, 12, plus a couple of UX gaps (queue/EP search, hold-customer while consulting) are the concrete work.

## Changes

### 1. Add "Entry Point" as a transfer/consult target
- Add a fourth tab **Entry Point** to `TransferConsultPanel.tsx` next to Agents / Queues / Number.
- Reuse the already-loaded `entryPoints` list from `WebexContext`. Show name + id, filterable via the same search input pattern used by Agents.
- Add two new context methods:
  - `transferToEntryPoint(taskId, entryPointId)` -> `agentContact.vteamTransfer({ interactionId, data: { vteamId, vteamType: 'inboundentrypoint', mediaType: 'telephony' } })`
  - `consultEntryPoint(taskId, entryPointId)` -> `agentContact.consult({ interactionId, data: { destinationType: 'entryPoint', to: entryPointId, mediaType: 'telephony' } })` and update `consultState` (target type `'entryPoint'`).
- Wire the tab's row click to `handleEntryPointAction` that branches on `transferType` just like the other tabs.

### 2. Add "Exit conference" during an active conference
- Extend `WebexContext` with `exitConference(taskId)` -> `agentContact.consultConferenceEnd({ interactionId: taskId, data: { mediaResourceId, queueId? } })`. Fall back gracefully if the SDK method is absent.
- In `TransferConsultPanel.tsx`, when the selected task's `state === 'conferencing'`, render a conference-active view with:
  - Consulted party name + running timer (reuse existing timer logic).
  - **Exit Conference** button (destructive-ghost) -> calls `exitConference`.
  - **End Consulted Party** button -> reuses existing `consultEnd` (agent stays with customer).
- Update task state transitions so `eAgentConsultConferenceEnded` / `eAgentConferenceEnded` events reset state to `'connected'`.

### 3. Queue and Entry Point search
- Add the same search input used on the Agents tab to Queues and Entry Points tabs so long lists are filterable by name.

### 4. Hold / Resume shortcut inside the consult view
- Inside the "Consult in progress" panel (lines 105-161 of `TransferConsultPanel.tsx`), add a small **Hold / Resume Customer** toggle that calls the existing `holdResume` action from `WebexContext` for the parent task. This is the same API and the same button already available on the call bar, just surfaced where it is needed during a consult so the agent does not have to switch panels.

### 5. State + typing
- Extend `ConsultState.consultTarget.type` and `destinationType` unions in `src/types/webex.ts` to include `'entryPoint'`.
- Extend `WebexContextType` in `WebexContext.tsx` with `transferToEntryPoint`, `consultEntryPoint`, and `exitConference`.
- No schema, no DB, no edge function work — this is UI + SDK-call wiring only.

## Files touched

- `src/types/webex.ts` — union additions.
- `src/contexts/WebexContext.tsx` — three new callbacks and event handling for conference-end.
- `src/components/command-center/panels/TransferConsultPanel.tsx` — new tab, conference-active view, hold shortcut, search on queues/EPs.

## Validation

- Type-check passes.
- Manual live-call test walkthrough:
  1. Blind transfer to an Entry Point completes and the task disappears.
  2. Consult to Entry Point rings, `Complete Transfer` and `Cancel` work.
  3. From an active conference, `Exit Conference` leaves the customer with the consulted party and clears the task locally.
  4. Hold / Resume during a consult toggles customer audio state without ending the consult.
  5. Queue and Entry Point search filters the list.

## Out of scope

- Direct REST calls to `/tasks-call-control` endpoints — everything continues to go through the Webex JS SDK Desktop.agentContact wrappers already in use, matching the Cisco kitchen-sink pattern.
- The wrap-up submission and call-drop-on-answer issues you raised earlier are tracked separately and not part of this change.
