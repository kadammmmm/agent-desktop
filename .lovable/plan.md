## Goal
Fix the agent state-change request so Cisco Webex accepts transitions from Idle/Not Ready to Available and keeps the widget synchronized with the platform.

## Root cause
The current code calls `Desktop.agentStateInfo.stateChangeV2()` with this shape:

```ts
{ data: { channelType: ['telephony'], state: 'Available' } }
```

But the Desktop SDK JS API type expects the V2 payload directly:

```ts
{ channelType: ['telephony'], state: 'Available' }
```

Because of the extra `data` wrapper, the routing API tries to decode `.channelType` at the top level and fails with:

```text
DecodingFailure at .channelType: Missing required field
```

## Implementation plan
1. **Correct V2 state-change payloads**
   - Update `setAgentState()` in `src/contexts/WebexContext.tsx`.
   - Pass the direct payload into `agentStateInfo.stateChangeV2(payload)` for both `Available` and `Idle`.
   - Keep `lastStateChangePayloadRef` logging the exact direct payload so future SDK diagnostics match what was actually sent.

2. **Correct legacy state-change fallback shape**
   - The current legacy fallback also wraps the payload in `{ data: ... }`, while the JS API type expects the direct legacy shape.
   - Change fallback calls to:
     - `agentStateInfo.stateChange({ state: 'Available', auxCodeIdArray: '0' })`
     - `agentStateInfo.stateChange({ state: 'Idle', auxCodeIdArray: idleCodeId })`

3. **Improve channel-type selection defensively**
   - Keep using provisioned channel detection.
   - If no SDK channel data is present, continue defaulting to `['telephony']`, but log that it was inferred.
   - This matches the failing payload’s intent while fixing the envelope shape.

4. **Make state sync more reliable after request**
   - After a successful SDK request, immediately re-read `agentStateInfo.latestData` and run the existing sync helper.
   - Still rely on `updated` / `eAgentChannelStateChanged` events as the source of truth.

5. **Validate**
   - Run TypeScript validation.
   - Confirm diagnostics show `lastRequestPayload` at the top level with `channelType`, not nested under `data`.
   - In Webex Desktop, retest Idle → Available and verify no `DecodingFailure at .channelType` error appears.