# Phase 2 — Feature Completeness

Four medium-effort SDK integrations that bring the widget to parity with Cisco's reference Agent Desktop. Each item is independent and can ship on its own; recommended order below.

## 1. Paginated aux codes (idle + wrap-up)

**Problem:** Idle/wrap-up codes are loaded once from `actions.getIdleCodes()` / `getWrapUpCodes()` (and `latestData` fallback). Tenants with many codes (>50 is common in enterprise) may get truncated results, and there's no way to search.

**Change:**
- Add a small `auxCodes.ts` service that wraps `Desktop.agentConfigJsApi.fetchPaginatedAuxCodes({ workType: 'IDLE_CODE' | 'WRAP_UP_CODE', page, pageSize: 50, search })` with graceful fallback to the current path when the module is unavailable.
- On init, fetch page 1 for each work type and store into existing `idleCodes` / `wrapUpCodes` state. Keep a `hasMore` flag + `search` helper in context.
- Idle-code selector (`AgentStateSelector`) and wrap-up modal (`VoiceInteractionView` wrap-up view + any chat/email variants) get a search input; typing calls the paginated fetch with the search term (debounced 250 ms) and shows a "Load more" row when `hasMore`.
- Preserve existing UUID validation for state changes — `has_role`-style guard already lives in `setAgentState`.

**Files:** new `src/services/auxCodes.ts`; edit `src/contexts/WebexContext.tsx` (state + fetch action), `src/components/command-center/AgentStateSelector.tsx`, wrap-up view in `VoiceInteractionView.tsx`.

## 2. V2 agentContact API migration

**Problem:** All contact actions use V1 methods (`accept`, `end`, `wrapup`, `consult`, `consultEnd`, `consultTransfer`, `consultConference`, `vteamTransfer`, `blindTransfer`, `buddyAgents`, `pauseRecording`, `resumeRecording`, `cancelTask`). Cisco recommends V2, and only V2 exposes `dropConferenceParticipant` and `exitConference`, which the UI can't do today.

**Change:**
- Introduce a tiny helper `callAgentContact(method, payload)` in `WebexContext.tsx` that prefers `agentContact[`${method}V2`]` and falls back to the V1 method — logged when it happens.
- Migrate the 13 call sites through the helper. Payload shapes for V2 are pulled from `node_modules/@wxcc-desktop/sdk/dist/types/jsapi/agent-contact-jsapi.d.ts` at implementation time; wrap them in typed helpers to keep call sites clean.
- Add two new actions to context:
  - `dropConferenceParticipant(taskId, participantId)`
  - `exitConference(taskId)` (currently `exitConference` exists but just ends the task; wire the real SDK method).
- Update conference UI (participants list from `eParticipantJoinedConference` state) to show a "Remove" button per party.

**Files:** `src/contexts/WebexContext.tsx` (13 methods + 2 new actions), possibly new small `ConferenceParticipants` UI in `VoiceInteractionView.tsx`.

## 3. Keyboard shortcuts

**Problem:** No keyboard shortcuts. Power agents want accept / decline / hold / mute / end from the keyboard.

**Change:**
- New `src/hooks/useShortcutKeys.ts` that:
  - Registers shortcuts via `Desktop.shortcutKey.register([...])` (SDK-scoped, avoids conflicts with other widgets).
  - Subscribes `Desktop.shortcutKey.listenKeyPress` and dispatches to context actions.
  - Subscribes `Desktop.shortcutKey.listenKeyConflict` and logs conflicts to SDK debug panel.
  - Falls back to plain `window.addEventListener('keydown')` when the SDK module isn't present (demo mode / standalone), guarded by focus checks so it doesn't hijack typing in inputs.
- Default bindings (configurable later): `Ctrl+Shift+A` accept, `Ctrl+Shift+D` decline, `Ctrl+Shift+H` toggle hold, `Ctrl+Shift+M` toggle mute, `Ctrl+Shift+E` end. Debug panel (`Ctrl+Shift+D`) stays — will pick a different letter or namespace the debug one.
- Mount the hook once inside `CommandCenterLayout`.

**Files:** new `src/hooks/useShortcutKeys.ts`; edit `src/components/command-center/CommandCenterLayout.tsx`; small config block in `SettingsPanel.tsx` to display the active bindings (read-only for this phase).

## 4. Campaign / preview outdial

**Problem:** Widget doesn't handle outbound campaign mode. Agents on progressive/preview campaigns see nothing.

**Change:**
- Register listeners: `eAgentOfferCampaignReserved`, `eAgentAddCampaignReserved`, `eAgentCampaignContactUpdated`, `eCampaignPreviewAcceptFailed`, `eCampaignPreviewSkipFailed`.
- Store reserved campaign contacts in a new `campaignContacts` context slice; each has customer info + preview timer + campaign metadata.
- New actions on context: `acceptCampaignContact(id)` → `Desktop.dialer.previewCampaignAccept(...)`, `skipCampaignContact(id, reason)` → `previewCampaignSkip(...)`, `removeCampaignContact(id)` → `removePreviewContact(...)`.
- New `CampaignContactPanel` (floating card like `ScreenPopPanel` or a slot in `InteractionArea` when a reservation exists) with Accept / Skip / Remove buttons + preview countdown.
- Fire `desktopNotify` when a campaign contact is reserved so agents notice it outside the widget.

**Files:** new `src/components/command-center/CampaignContactPanel.tsx`; edit `src/contexts/WebexContext.tsx` (state + 3 actions + 5 listeners), `src/components/command-center/CommandCenterLayout.tsx` (mount panel), `src/types/webex.ts` (small `CampaignContact` type).

## Suggested order

1. **Paginated aux codes** — smallest surface area, immediate value for enterprise tenants.
2. **V2 API migration** — foundation; other phases benefit from typed helpers.
3. **Shortcut keys** — self-contained UX win.
4. **Campaign outdial** — largest, most feature-specific; only needed if outbound campaigns are in scope.

## Technical notes

- All new SDK calls stay behind the existing production init guard (skip in demo mode).
- Payload types pulled from the SDK's own `.d.ts` files to avoid guessing.
- No backend changes.
- No breaking changes to existing context API — new actions/state are additive; V2 migration is transparent behind helper.

## Ask before I start

Do you want all four in one batch, or should I ship them one at a time so you can validate each in production before the next? And is campaign outdial in scope for your deployment, or should I drop item 4?
