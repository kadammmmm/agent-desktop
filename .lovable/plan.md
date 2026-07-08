
## What the uploaded log tells us

The exported log only covers 19:35:35–19:35:43 (SDK init + `Fetching buddy agents`). No `eAgentOfferContact`, `eAgentContactAssigned`, no state-change attempt, no `updated` events were captured. So we can't see *why* the answered call vanished — we're logging event names but not the raw payloads that would show us.

Two things need to happen: (1) log enough to actually diagnose, (2) close the known gaps that most likely explain "call disappears after answer" and "state stays out of sync".

## Root causes (based on current code)

1. **Call disappears after answer** — In `WebexContext.tsx`:
   - `eAgentOfferContact` populates `incomingTask` and stores `_rawContact`.
   - After the user answers, we rely on `eAgentContactAssigned` to build the active task. On some hardphone/soft-answer paths that event either doesn't fire, fires with a different shape, or `extractContactData` returns no `interactionId` — in which case `handleContactAssigned` creates a `task-<Date.now()>` id that doesn't match anything downstream, then a stray `eAgentContactEnded` (with the *real* interactionId) filters it out and the UI goes empty.
   - `promoteIncomingTaskIfEngaged()` only runs from `syncAgentStateFromSdkData` when the derived state is exactly `Engaged`. If the `updated` event lands with a hardphone status like `Reserved`/`Talking` that maps through `isEngagedLikeState`, that path works — but if it lands as `Available` after answer (some deployments), promotion never happens and no `getTaskMap()` hydration is triggered either.
   - `eAgentOfferContactRona` unconditionally does `setIncomingTask(null)`. If a spurious RONA event fires right around the accept, the incoming card is wiped before promotion.

2. **Agent state still out of sync** — The recent fix polls `agentStateInfo?.latestData`, but that `agentStateInfo` is captured once at the top of `setAgentState()`. `latestData` is a live getter on the SDK object, so this normally works, but we never log the polled `subStatus` transitions, so if the poll times out we have no evidence why. We also don't re-check via `desktopRef.current.agentStateInfo` each iteration, and there is no fallback that forces `syncAgentStateFromSdkData(current, ...)` at the deadline even if the substatus hasn't matched yet.

3. **No raw payloads in the debug export** — Current logs use `Object.keys(contact)` for offer/assigned/ended. We need full payloads (redacted only if needed) so the next log export is actually diagnosable.

## Fix plan (all in `src/contexts/WebexContext.tsx`)

### 1. Log the raw payloads that matter
- In each of `eAgentOfferContact`, `eAgentContactAssigned`, `eAgentContactEnded`, `eAgentOfferContactRona`, `eAgentContactHeld`, `eAgentContactUnHeld`, `eAgentWrapup`, and `eAgentContactWrappedUp` listeners: `addSDKLog('info', '>>> <evt> RAW <<<', { raw: contact }, 'WebexContext')`.
- After `extractContactData(...)` in `handleIncomingContact` / `handleContactAssigned` / `handleContactEnded`, log the extracted object AND `interactionId` resolution path.
- In the `agentStateInfo.updated` listener, log `{ status, subStatus, channelsMap, agentSessionId, lastStateChangeReason }` from the payload.
- Redact PII already handled elsewhere; don't add new PII rules here.

### 2. Make contact-assigned resilient
In `handleContactAssigned`:
- Resolve `taskId` in this order: `contact.interactionId` → `event?.data?.interactionId` → `event?.interactionId` → currently-set `incomingTask?.taskId` → `task-<Date.now()>` (last resort, plus a `warn` log).
- Merge `_rawContact` from the current `incomingTask` when the assigned event is thin (missing ani/queueName/customerName): fall back to the values captured in the offer event.
- Clear `incomingTask` only after the active task has been appended (already done, but keep the order explicit).

In `handleContactEnded`:
- Only remove a task if its `taskId` matches an existing active task; log a `warn` with both ids when a mismatched end event arrives, and do NOT wipe unrelated tasks.
- Guard against ending a task that was just created <500 ms ago with a synthetic id (skip the removal, log a warn).

In `eAgentOfferContactRona`:
- Compare the RONA event's `interactionId` against `incomingTask.taskId`. Only clear `incomingTask` if they match (or the event has no id). This kills the "spurious RONA nukes the incoming card" case discussed in memory `hardphone-safe-rona-handling`.

### 3. Force hydration when the agent goes Engaged (event or updated)
In `syncAgentStateFromSdkData`, when `snapshot.state === 'Engaged'`:
- Keep `promoteIncomingTaskIfEngaged()`.
- Additionally kick a `getTaskMap()` hydrate pass: if it returns tasks and `activeTasks` is empty, build tasks with the same extractor used in the initial-hydration path (lines 1354–1430) and `setActiveTasks(hydratedTasks)`. This recovers the call when `eAgentContactAssigned` was missed entirely.

Also add a short "post-accept safety net": inside `acceptTask()` (after `callAgentContact('accept', ...)` resolves), schedule a one-shot `setTimeout(2500ms)` that:
- If `activeTasks` is still empty AND `incomingTask` is null (was cleared) AND agent state is Engaged-like → run the `getTaskMap()` hydration path.
- Log every branch of this safety net so we can see it fire.

### 4. Tighten the state-sync poll
In `setAgentState()`'s `pollForConfirmation`:
- Read `desktopRef.current?.agentStateInfo?.latestData` fresh each iteration.
- Log every observed `subStatus` change (dedupe consecutive equal values) with elapsed ms so the debug panel shows the timeline.
- On deadline timeout, if `latestData` exists, still call `syncAgentStateFromSdkData(current, 'poll deadline fallback')` so the UI reflects whatever Cisco reports (even if it isn't the requested state) instead of staying optimistic forever.
- Keep the existing optimistic UI update and AQM-timeout swallow.

### 5. Small correctness touch-ups
- Ensure `handleContactAssigned` uses the extracted `mediaResourceId` from *either* the assigned event or the previously stored `_rawContact` — needed for hold/mute/record on hardphone.
- Preserve `startTime` from the incoming task when promoting via `handleContactAssigned` (currently overwritten with `Date.now()` — memory `sdk-timestamp-synchronization` says use the SDK timestamp).

### 6. Ask user to re-export logs after this ships
Provide a short in-chat checklist: reproduce Idle→Available, then reproduce an inbound call (offer → answer → end), then export the SDK debug logs. The new payload logs will pinpoint which event is missing or misshapen if either issue recurs.

## Technical notes
- No backend or SDK-init changes. Purely event-handler resilience + diagnostics inside `src/contexts/WebexContext.tsx`.
- No changes to `setAgentState`'s public contract; only the internal poll gains fresh reads, logging, and a deadline fallback.
- Respects existing memories: production RONA timer suppression, hardphone-safe RONA, SDK timestamp sync, active interaction reconciliation.

## Validation
- TypeScript check.
- In Webex Desktop: place an inbound call. Confirm log panel shows raw offer + assigned payloads; confirm the active task appears and stays through hold/mute/end/wrapup.
- Toggle Idle → Available. Confirm debug panel shows the polled `subStatus` transitions and either an event-driven or poll-driven sync landing on Available.
- If either still misbehaves, export logs and share — the raw payloads will make the next fix a targeted one-liner.
