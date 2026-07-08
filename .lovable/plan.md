# Fix Transfer, Consult (Warm), and Conference to Match Cisco SDK Contract

## Problems Found

Comparing `src/contexts/WebexContext.tsx` (lines 1649–1894) with the official Cisco kitchen-sink sample:

1. **`blindTransfer` / `consult` payload shape is wrong.** SDK expects a nested `data` object with `destinationType`; we're passing flat `transferTo`/`transferType`/`consultTo`/`consultType`. The SDK ignores these fields → transfer either 400s or targets nothing.
2. **`consultEnd` missing required fields** (`isConsult`, `mediaResourceId`, `taskId`) — cancel-consult usually fails on agent/DN legs.
3. **`conference` never receives the consulted-party target** — 3-way merge cannot happen without it.
4. **No consult lifecycle events wired** — `eAgentConsultCreated`, `eAgentConsultConferenced`, `eAgentConsultEnded` are not listened to, so the "Complete Transfer" and "Conference" buttons are enabled before the consulted party is actually connected.
5. **Demo fallback masks real SDK errors.** On production, a failed SDK call currently still mutates local state as if it succeeded, hiding the failure and confusing the agent.

## Changes (frontend only, `src/contexts/WebexContext.tsx`)

### 1. Fix `transferToAgent` (blind → agent)

```ts
await desktopRef.current.agentContact.blindTransfer({
  interactionId: taskId,
  data: { agentId, destinationType: 'agent' },
});
```

### 2. Fix `transferToDN` (blind → dial number)

```ts
await desktopRef.current.agentContact.blindTransfer({
  interactionId: taskId,
  data: { to: dialNumber, destinationType: 'dialNumber' },
});
```

`transferToQueue` already uses `vteamTransfer` correctly — leave as-is.

### 3. Fix `consultAgent` / `consultQueue` / `consultDN`

```ts
// agent
data: { agentId, destinationType: 'agent' }
// queue
data: { to: queueId, destinationType: 'queue' }
// dn
data: { to: dialNumber, destinationType: 'dialNumber' }
```

Capture returned consulted party info onto `consultState` (store `mediaResourceId`, `isConsult`, consulted `agentId`/`to`, `destinationType`) so subsequent complete/cancel/conference calls have the required fields.

### 4. Fix `cancelConsult` (`consultEnd`)

```ts
await desktopRef.current.agentContact.consultEnd({
  interactionId: taskId,
  isConsult: true,
  taskId,
  mediaResourceId: task.mediaResourceId,
});
```

### 5. Fix `conferenceCall`

Pass the currently-consulted target from `consultState`:

```ts
await desktopRef.current.agentContact.conference({
  interactionId: taskId,
  data: {
    ...(consulted.type === 'agent'
        ? { agentId: consulted.id }
        : { to: consulted.id }),
    destinationType: consulted.type === 'agent'
      ? 'agent'
      : consulted.type === 'queue' ? 'queue' : 'dialNumber',
  },
});
```

### 6. Wire consult lifecycle events

Add listeners in the SDK-init block alongside existing `eAgentContact*` listeners:

- `eAgentConsultCreated` → `consultState.isConsulting = true`, capture consulted party from event payload (authoritative).
- `eAgentConsultEnded` / `eAgentConsultFailed` → clear `consultState`, restore task state to `'connected'`, surface a toast if it failed.
- `eAgentConsultConferenced` → set task `state = 'conferencing'`, clear `consultState.isConsulting` (party is now merged, not consulted).
- `eAgentContactAssignedFailed` (blind transfer failure) → toast + do NOT mutate local task state.

Every listener logs via `addSDKLog` (matches existing SDK Debug Panel convention).

### 7. Stop demo-mode fallback from running after real SDK errors

In each of the six transfer/consult/conference functions, restructure to:

```ts
if (!runningInDemoMode && desktopRef.current) {
  try {
    await desktopRef.current.agentContact.<method>({ ... });
    addSDKLog('info', '<method> success', {...}, 'Transfer');
  } catch (error) {
    addSDKLog('error', '<method> failed', {...}, 'Transfer');
    toast({ title: 'Transfer failed', description: <msg>, variant: 'destructive' });
  }
  return; // do NOT fall through to demo mutation
}

// demo branch untouched
```

### 8. UI guard in `TransferConsultPanel.tsx`

Only enable **Complete Transfer** and **Conference** buttons once `consultState.consultConnected === true` (new field set by `eAgentConsultCreated`). Show a "Ringing consulted party…" state until then.

## Files Touched

- `src/contexts/WebexContext.tsx` — six call-control functions, three new SDK listeners, extended `ConsultState` type usage.
- `src/types/webex.ts` — extend `ConsultState` with `consultConnected?: boolean`, `mediaResourceId?: string`, `destinationType?: 'agent'|'queue'|'dialNumber'`.
- `src/components/command-center/panels/TransferConsultPanel.tsx` — disable Complete/Conference until `consultConnected`.

## Test Matrix (post-fix, live embed)

1. Blind → Agent, Blind → DN, Blind → Queue: call leaves current agent, appears on target.
2. Consult → Agent → Complete: 3rd party rings, on answer buttons enable, complete hands over.
3. Consult → DN → Cancel: consulted leg drops, original call resumes off hold.
4. Consult → Agent → Conference: all 3 legs joined; SDK reports `eAgentConsultConferenced`.
5. Failed transfer (invalid DN): toast surfaces, original task remains active and connected.

## Expected Outcome

All transfer, warm-consult, cold-blind, and conference flows use the correct SDK contract, wait for real SDK acknowledgement before UI transitions, and surface failures instead of silently pretending success.