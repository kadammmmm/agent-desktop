# Fix Agent State Change Failure (reasonCode 33)

## Root Cause

The SDK error payload shows the state change was rejected by Webex CC with:
- `auxCodeId: ""` (empty string)
- `reason: "Internal System Error"`, `reasonCode: 33`
- `type: "AgentStateChangeFailed"`

In `src/contexts/WebexContext.tsx` (`setAgentState`, line ~1431-1437), when transitioning to **Available**, the code sends `auxCodeIdArray: ''` if no prior idle code exists. The Cisco Webex CC SDK's `agentStateInfo.stateChange` API **rejects empty strings** with an Internal System Error.

Per the official Cisco kitchen-sink sample (`webex-js-sdk/docs/samples/contact-center/app.js`), the correct sentinel for Available (no aux code) is the literal string `"0"`, not `""`.

The SDK itself is loading correctly — the diagnostics confirm `AGENTX_SERVICE=Yes`, `wxcc=Yes`, `Running in Agent Desktop=Yes`. The `window.Desktop=No` line is a misleading diagnostic label (the SDK is reached via `AGENTX_SERVICE`, not `window.Desktop`), but is not the source of the error.

## Changes

### `src/contexts/WebexContext.tsx` — `setAgentState` (around line 1431)

For the `Available` branch:
- Replace `const currentAuxCode = agentState?.idleCode?.id || '';` with `const currentAuxCode = '0';`
- Rationale: When going Available, no idle/aux code is applicable. `"0"` is the Cisco-defined sentinel; empty string is invalid.

For the `Idle` branch (already correct):
- Leaves existing UUID validation intact.

Add an SDK log line noting the sentinel value being sent, to make future debugging obvious.

### `src/lib/webexEnvironment.ts` — diagnostic label clarity (optional, minor)

Update the `hasDesktopSDK` diagnostic to also treat presence of `AGENTX_SERVICE` as a positive signal, so the SDK Debug Panel doesn't show a confusing "No" when the SDK is actually available. This is cosmetic only and prevents future user confusion.

## Verification

1. Rebuild the widget and reload inside Agent Desktop.
2. Trigger a state change to **Available** from the state selector.
3. Confirm:
   - No `AgentStateChangeFailed` event in the SDK Debug Panel.
   - Agent state visibly transitions to Available in both the widget and the native Cisco desktop.
4. Trigger a state change to **Idle** with a specific idle code and confirm it still succeeds.

## Out of Scope

- No changes to the transfer/consult/conference logic from the prior turn.
- No changes to the SDK loading flow — the SDK is loading properly; only the state-change payload is malformed.
