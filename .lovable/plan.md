# SDK Integration Gap Analysis & Roadmap

The widget uses `@wxcc-desktop/sdk` (correct choice for an embedded Agent Desktop widget). The separate `@webex/contact-center` JS SDK is only relevant for a standalone, non-Cisco-shell desktop — **not additive here**, so we should stay on `@wxcc-desktop/sdk`.

Core call lifecycle (state, accept/decline/hold/mute/end/wrapup, all consult flavors, transfer, conference, recording pause/resume, outdial, buddy agents, CAD updates, log upload) is solid. Fifteen capability gaps identified, grouped into three phases.

## Phase 1 — Quick wins & correctness (S, blocking / near-blocking)

1. **Remote audio wiring** — `useRemoteAudio` hook exists but is never fed. Subscribe to the SDK media event on task assignment and call `attachStream(stream)`. Without this, voice calls have no audio in the widget.  
   *Files:* `WebexContext.tsx` (task-assignment listener), `useRemoteAudio.ts` (already ready).  
   *Note:* Exact event name (`eAgentContactMedia` vs. nested WebRTC payload) needs a live SDK inspection — will add a defensive multi-path listener.

2. **Screen pop** — Register `Desktop.screenpop.addEventListener("eScreenPop", …)` and surface the pop (URL/CRM record) in a new lightweight `ScreenPopPanel` or auto-open per config.  
   *Files:* new `hooks/useScreenPop.ts`, new `components/command-center/ScreenPopPanel.tsx`, `WebexContext.tsx`.

3. **Desktop notification bus** — Replace/augment `toast()` for incoming-contact and error alerts with `Desktop.actions.fireGeneralAutoDismissNotification` / `fireGeneralSilentNotification` so alerts surface outside the widget iframe.  
   *Files:* new `hooks/useDesktopNotification.ts`, `WebexContext.tsx` (incoming/error paths).

4. **DTMF keypad** — Wrap `Desktop.agentContact.sendDtmf(digit)` and expose a keypad in the active voice interaction view.  
   *Files:* `WebexContext.tsx` (add `sendDtmf` action), new `DtmfKeypad` component, `VoiceInteractionView.tsx`.

5. **Address book population** — Call `Desktop.agentStateInfo.fetchAddressBooks(...)` during initialization so the existing empty `addressBook` state actually populates (used by transfer/consult panels).  
   *Files:* `WebexContext.tsx` init block.

6. **Missing agentContact events** — Register listeners for `eAgentConsultEndFailed`, `eAgentCtqCancelled`, `eAgentCtqFailed`, `eAgentCtqCancelFailed`, `eContactOwnerChanged`, `eParticipantJoinedConference`, `eParticipantLeftConference`, `eAgentConsultTransferring`, `eAgentContactAniUpdated` so failures/transitions no longer leave the UI stuck.  
   *Files:* `WebexContext.tsx`.

## Phase 2 — Feature completeness (M)

7. **Paginated aux codes** — Replace `latestData`-only idle/wrap-up code loading with `Desktop.agentConfigJsApi.fetchPaginatedAuxCodes(...)` + search UI. Needed for tenants with many codes.

8. **V2 agentContact methods** — Migrate `accept/end/wrapup/consult/consultEnd/consultConference/vteamTransfer/blindTransfer/consultTransfer/buddyAgents/pauseRecording/resumeRecording/cancelTask` to their `*V2` counterparts and add `dropConferenceParticipant` + `exitConference` for granular conference control.

9. **Shortcut keys** — `Desktop.shortcutKey.register(...)` + `listenKeyPress` for accept/decline/hold/mute/end. Include conflict listener for multi-widget setups.  
   *Files:* new `hooks/useShortcutKeys.ts`, `WebexContext.tsx`.

10. **Campaign / preview outdial** — Add `previewCampaignAccept/Skip`, `removePreviewContact`, and listen for `eAgentOfferCampaignReserved`, `eAgentAddCampaignReserved`, `eCampaignPreviewAcceptFailed`, `eCampaignPreviewSkipFailed`. New `CampaignContactPanel`.

## Phase 3 — Advanced modules (L)

11. **Supervisor / silent monitor** — Wire `Desktop.monitoring` (start/end/hold/bargeIn + `eMonitoring*` and `eAgentMonitorStateChanged` events) behind a supervisor-only `SupervisorPanel`. Also lets regular agents know when they're monitored (compliance).

12. **AI Assistant / Copilot** — Listen to `Desktop.aiAssistant` / `Desktop.dataNotifsAiAssistant` (`eSuggestedResponseAvailable`, `eMidCallSummaryResponseSubsequentAgent`, `eWellnessBreakEvent`). New `AIAssistantPanel`. Config init already attempts to load the module.

13. **Post-interaction recording playback** — `Desktop.postInteraction.fetchTasks` + `fetchCapture` behind a QA/supervisor `RecordingPlaybackModal`.

14. **SDK i18n** — Adopt `Desktop.i18n.createInstance` + locale-change subscription; migrate string literals to translation files. Enables multi-region deployments.

15. **Behavioral metrics** — Optional `Desktop.webexMetricsInternal.trackBehavioralEvent` at key interaction points.

## Cleanup (bundled with Phase 1)

- Delete or actually use `hooks/useSDKLogger.ts` (currently reimplemented inline in `WebexContext.tsx`).

## Technical notes

- Some payload schemas (screen pop event, V2 args, `eAgentContactMedia`) are not in the public npm README. We'll pull them from `node_modules/@wxcc-desktop/sdk/dist/*.d.ts` at implementation time and add typed wrappers.
- All new SDK subscriptions must be added inside the existing production init guard (skip in demo mode) and cleaned up on unmount to prevent leaks.
- No backend changes required — everything is client-side SDK wiring.

## Recommendation

Start with **Phase 1** (all Small effort, includes the audio blocker) as a single follow-up change, then decide Phase 2 / Phase 3 scope based on which capabilities your deployment needs (supervisor tooling, campaigns, AI Assistant).

Which phase(s) should I implement? I'd suggest Phase 1 first as a self-contained batch.
