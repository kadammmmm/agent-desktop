# Fix Agent State Change — Migrate to `stateChangeV2`

## Root Cause

Logs show both Idle transitions failing with `reasonCode: 33 "Internal System Error"` even though the request carries a valid `auxCodeId` UUID (`1ab8a7b9-…`, `9901fbed-…`) that came straight from the idle codes list the SDK returned. The failure is not a bad UUID — it's the wrong API surface.

The current code calls the **legacy** `Desktop.agentStateInfo.stateChange({ state, auxCodeIdArray })`. The SDK typings and the public REST API (`PUT /v2/agents/session/state` at `developer.webex.com/webex-contact-center/docs/api/v1/agents/state-change`) confirm the correct request today is:

```ts
{
  channelType: string[];   // REQUIRED — e.g. ["telephony"]
  state: "Available" | "Idle" | ...;
  auxCodeId?: string;      // UUID for Idle, omitted for Available
  reason?: string;
  agentId?: string;
}
```

The legacy `stateChange` method:
- Takes `auxCodeIdArray` as a single string, not the array shape the API expects.
- Does not send `channelType`, which is now required.
- Returns reasonCode 33 on the backend when the org has been migrated to multi-channel state routing (which this org clearly has — the idle codes load fine but state transitions are rejected).

The SDK exposes the correct method as `Desktop.agentStateInfo.stateChangeV2(...)` with the exact shape above.

The prior `"0"` sentinel for Available is also obsolete under v2 — you simply omit `auxCodeId`.

## Changes — `src/contexts/WebexContext.tsx`

### 1. Rewrite `setAgentState` to use `stateChangeV2`

Replace the two branches inside the `if (!runningInDemoMode && desktopRef.current)` block:

- **Idle branch:** Keep UUID validation. Call:
  ```ts
  await desktopRef.current.agentStateInfo.stateChangeV2({
    channelType: getActiveChannelTypes(),   // helper below
    state: 'Idle',
    auxCodeId: idleCodeId,
  });
  ```

- **Available branch:** Drop the `"0"` sentinel and any `agentState?.idleCode?.id` fallback. Call:
  ```ts
  await desktopRef.current.agentStateInfo.stateChangeV2({
    channelType: getActiveChannelTypes(),
    state: 'Available',
  });
  ```

- **Fallback:** If `stateChangeV2` is not available on the SDK build (older desktop), log a warning and fall back to the legacy `stateChange` path so the widget still works in older environments. Do not silently mutate local state on failure — the existing catch block already avoids that.

### 2. Add `getActiveChannelTypes()` helper

Small helper inside the context that returns the channel-type list from the agent's active channels reported by `latestData` / `agentInfo`. If none can be resolved, default to `['telephony']` (the widget's core channel and the one the current agent profile has enabled per the logs — telephony DN registration is in the trace).

### 3. Update SDK logging

Change the two `addSDKLog('info', 'State change request sent: …')` lines to include the exact v2 payload sent (channel types + auxCodeId when present), so future debugging shows the real request shape.

### 4. Types

If `src/types/webex.ts` declares any narrow `stateChange` payload types tied to `auxCodeIdArray`, widen or add a `StateChangeV2Payload` type mirroring the SDK's `StateChangeV2` shape. No breaking changes to `AgentState` string union.

## Out of Scope

- No changes to transfer/consult/conference (fixed in earlier turns).
- No changes to SDK loading — logs show init succeeds.
- No changes to idle code fetching — the 20 loaded codes are correct.
- No REST-API calls from the client; we continue to use the SDK method.

## Verification

1. Reload the widget inside Agent Desktop.
2. From the state selector, switch to **Available** — confirm no `AgentStateChangeFailed` event, state visible as Available in both widget and native desktop.
3. Switch to **Idle** and pick a specific idle code — confirm success and that the chosen code name renders in the state selector.
4. Confirm the SDK Debug Panel shows `stateChangeV2` request log lines carrying `channelType`, `state`, and `auxCodeId` (Idle) / no `auxCodeId` (Available).
5. Trigger a call to confirm engaged/wrap-up state transitions still work end-to-end.
