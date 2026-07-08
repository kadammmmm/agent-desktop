## What the Cisco console log proves

- `AgentContactReserved` fires, then `AgentOfferContact` (interaction id `3c6c84fc-…`).
- Our `eAgentOfferContact` listener fires **twice** for the same interaction id (duplicate delivery or duplicate registration). Downstream `handleIncomingContact` runs twice.
- After the agent answers, our WebexContext logs show **no `eAgentContactAssigned`** event. The Cisco desktop UI still routes the call, so the assigned notification is being delayed/dropped over AQM (same class of problem as the Available state-change timeout).
- The offer event carries `ronaTimeout: 10`. Even though we disabled the local RONA timer in production, a duplicate/late routing message can still nuke the incoming task under the wrong conditions.

Net effect: the ringing card gets set (twice), no assigned event lands, and something (duplicate offer processing, spurious RONA, or state `updated` flip) clears `incomingTask` without ever creating an active task. The call disappears.

## Fix plan — all in `src/contexts/WebexContext.tsx`

### 1. Idempotency + de-duplication (root cause of thrash)
- Track handled event fingerprints in a `useRef<Map<string, number>>` keyed by `${eventName}:${interactionId}` with a short TTL (e.g. 3 seconds). Ignore duplicate `eAgentOfferContact`, `eAgentContactAssigned`, `eAgentContactEnded`, `eAgentWrapup`, `eAgentContactWrappedUp`, and `eAgentOfferContactRona` events for the same interaction inside that window.
- Guard listener registration itself so the block that registers `agentContact` listeners can only run once per SDK session (a `listenersRegisteredRef` flag). Prevents any accidental double registration during re-init.

### 2. Reliable task materialization without depending on `eAgentContactAssigned`
Add a helper `hydrateActiveTaskFromInteractionId(interactionId, reason)`:
- Reads `desktopRef.current?.actions?.getTaskMap()`.
- If the task exists there, build/replace the active task using the same `extractContactData` extractor.
- If not, fall back to the `_rawContact` stored on the current `incomingTask` when the id matches (data is identical to the offer payload, which we have).
- Sets `activeTasks`, `selectedTaskId`, and `customerProfile` idempotently (no duplicates), preserves `startTime` from the offer.

Call this helper in three places:
- Inside `handleContactAssigned` — still primary path when the event fires.
- Inside `acceptTask()` after `callAgentContact('accept', …)` resolves, wait ~1.2s and hydrate. This is the safety net for the missing/delayed assigned event.
- Inside `syncAgentStateFromSdkData` when derived state becomes `Engaged` and `activeTasks` is empty.

### 3. Only remove tasks when the id truly matches
- `handleContactEnded` / `handleContactWrappedUp` / `eAgentOfferContactRona`: log and no-op when the interaction id does not match either the current `incomingTask.taskId` or any `activeTasks[].taskId`. This kills the "wrong end event wipes the call" failure mode.
- RONA specifically: only clear `incomingTask` when RONA's `interactionId === incomingTask?.taskId`, and only after any pending answer flow (short 800ms grace) — we've seen offers arrive with `ronaTimeout: 10` on this tenant, and the SDK sometimes emits RONA-like events transitionally around answer.

### 4. Preserve the offer timestamp on promotion
- When materializing the active task, use `contact.createdTimestamp` (SDK) or the existing `incomingTask.startTime` — never `Date.now()`. Fixes duration jumping to `0:00` and matches memory `sdk-timestamp-synchronization`.

### 5. Agent state sync tightening (same session as the answer bug)
In `setAgentState()` poll:
- Read `desktopRef.current?.agentStateInfo?.latestData` fresh each iteration.
- Log every observed `subStatus` transition with elapsed ms.
- On deadline, call `syncAgentStateFromSdkData(current, 'poll deadline fallback')` unconditionally so the widget reflects whatever Cisco reports rather than staying optimistic.

Also, when the `agentStateInfo.updated` event fires and derived state is `Engaged` while `activeTasks` is empty and an `incomingTask` exists, immediately run `hydrateActiveTaskFromInteractionId(incomingTask.taskId, 'engaged with no active task')`.

### 6. Diagnostic logs targeted at what's still missing
- Log full raw payload for `eAgentContactAssigned`, `eAgentContactEnded`, `eAgentWrapup`, `eAgentContactWrappedUp`, `eAgentOfferContactRona`, and `agentStateInfo.updated` (already have Offer). This is how we'll confirm in one more log export exactly which channel actually delivers "answered".
- Log every branch of the hydration helper (which source it recovered the task from, and whether it was a no-op).
- Log dedup rejections so we can see duplicate deliveries in the next export.

### 7. Validation
- TypeScript check.
- Retest in Webex Desktop: inbound call → answer → live call remains, timer counts from the true start, hold/mute/end/wrapup behave.
- Retest Idle → Available: widget flips within a couple seconds; poll deadline fallback (if triggered) syncs to whatever Cisco reports.
- Export SDK debug logs after retest. New payload logs + dedup logs will make any remaining issue a one-line fix.

## Technical notes
- No SDK/init flow changes, no backend changes. Purely event-handler resilience and diagnostics inside `WebexContext.tsx`.
- Respects existing memories: production RONA timer suppression, hardphone-safe RONA, active interaction reconciliation, SDK timestamp synchronization.
- Dedup TTL and grace windows are conservative and only affect duplicate deliveries in a 1–3s window; normal singular events are unaffected.