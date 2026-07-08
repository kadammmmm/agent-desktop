## Plan: repair Agent State synchronization with Webex CC

### Problem to fix
The widget is registered with the Webex Desktop SDK, but agent state is not round-tripping correctly:
- Native Webex Desktop state changes are not reflected in the widget.
- Widget state changes are still failing with `Service.aqm.agent.stateChange` / `reasonCode: 33`.

### Root cause found
The current implementation moved toward `stateChangeV2`, but the installed SDK typings show the method signature is:

```ts
Desktop.agentStateInfo.stateChangeV2({
  data: {
    channelType: string[],
    state: string,
    auxCodeId?: string,
    reason?: string,
    agentId?: string
  }
})
```

The current code calls:

```ts
stateChangeV2({ channelType, state, auxCodeId })
```

That skips the required `data` envelope. The code also only listens to the cumulative `updated` event, while SDK v2 emits channel-specific state events such as `eAgentChannelStateChanged` and relogin state maps via `eAgentChannelReloginSuccess`.

### Implementation steps
1. **Fix outbound state-change calls**
   - Update `setAgentState` to call `stateChangeV2({ data: payload })`.
   - Keep `Available` payload free of `auxCodeId`.
   - Keep `Idle` payload using the selected valid idle-code UUID.
   - Preserve legacy `stateChange({ state, auxCodeIdArray })` only as a fallback when `stateChangeV2` is unavailable.

2. **Add robust channel-state parsing**
   - Add helpers to read v2 channel state from:
     - `latestData.agentChannelStateDetailMap`
     - `latestData.channelsStatesMap`
     - `eAgentChannelStateChanged.data.agentChannelStateDetail`
     - `eAgentChannelReloginSuccess.data.agentChannelStateDetailMap`
   - Prefer `telephony` when present, otherwise use the first valid provisioned channel.
   - Normalize v2 `agentState` into the app’s `AgentState` type.
   - Extract idle code and timestamp from v2 channel-state details when present.

3. **Fix inbound sync from Webex Desktop**
   - Update the existing `updated` listener to prefer v2 channel-state maps over legacy `status/subStatus`.
   - Add listeners for:
     - `eAgentChannelStateChanged`
     - `eAgentChannelReloginSuccess`
   - These listeners will update `agentState` immediately when the native Webex Desktop changes state.

4. **Improve channelType selection for outgoing requests**
   - Derive channel types from SDK data when available (`channelsMap`, state detail maps, connected channels), falling back to `['telephony']`.
   - Log the exact wrapped v2 request payload so the SDK Debug Panel shows what was sent.

5. **Improve failure diagnostics without fake state**
   - On `AgentStateChangeFailed`, keep local state unchanged.
   - Log the failed SDK payload, reason, reasonCode, trackingId, and current SDK channel-state snapshot.
   - Do not use production mock timers or local-only state mutation.

### Validation
After implementation, verify with code-level checks and expected live behavior:
- Changing state in native Webex Desktop updates the widget via v2 channel events.
- Changing state in the widget sends `stateChangeV2({ data: ... })` and updates after SDK confirmation.
- Idle sends a valid UUID `auxCodeId`; Available sends no `auxCodeId`.
- Debug logs show channel-state events and wrapped v2 payloads.