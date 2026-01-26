
# Feature Parity Implementation: Webex JS SDK Kitchen Sink Sample

## Executive Summary

After deep analysis of the official Webex JS SDK contact center sample (`webex-js-sdk/docs/samples/contact-center/app.js`), I've identified **critical API differences** and **missing features** that need to be addressed for live call testing. The sample uses the **`webex.cc` plugin pattern** with a `currentTask` object that exposes direct methods like `task.answer()`, `task.hold()`, `task.mute()`, etc.

---

## Architecture Comparison

| Aspect | Cisco Sample (`webex.cc` plugin) | Current App (`@wxcc-desktop/sdk`) |
|--------|-----------------------------------|-----------------------------------|
| SDK Type | `webex.cc` plugin (browser SDK) | Desktop Widget SDK |
| Task Model | `currentTask.method()` pattern | `Desktop.agentContact.method({ interactionId })` |
| Audio Handling | `<audio>` element + `task.data.mediaStreams` | Not implemented |
| Outdial | `webex.cc.startOutdial(destination, selectedAni)` | `agentContact.outdial({...})` |
| State Change | `webex.cc.setAgentState({...})` | `agentStateInfo.stateChange({...})` |
| Buddy Agents | `webex.cc.buddyAgents.get()` | Not implemented |

---

## Critical Fixes Required

### 1. Outdial Method - Different API Shape

**Current Implementation (INCORRECT for webex.cc):**
```typescript
await desktopRef.current.agentContact.outdial({
  entryPointId, destination, direction, outboundType, mediaType, attributes
});
```

**Cisco Sample (webex.cc plugin):**
```javascript
await webex.cc.startOutdial(destination, selectedAni);
// destination = phone number
// selectedAni = the ANI caller ID string (not UUID)
```

**Desktop SDK Alternative (what we should use):**
```typescript
await Desktop.dialer.startOutdial({
  data: {
    entryPointId: entryPointId,
    destination: normalizedNumber,
    direction: 'OUTBOUND',
    origin: outdialAniId,  // ANI ID goes in origin, not attributes
    attributes: {},
    mediaType: 'telephony',
    outboundType: 'OUTDIAL',
  }
});
```

### 2. Task Control Methods - Direct Task Object

**Cisco Sample uses `currentTask` object:**
```javascript
await currentTask.answer();
await currentTask.hold();
await currentTask.unHold();
await currentTask.mute();
await currentTask.unmute();
await currentTask.end();
await currentTask.wrapup({ wrapUpReason: codeId });
await currentTask.pauseRecording();
await currentTask.resumeRecording();
await currentTask.consult({ to: destination, destinationType: type });
await currentTask.transfer({ to: destination, destinationType: type });
await currentTask.consultTransfer({ to: destination, destinationType: type });
```

**Our Desktop SDK uses:**
```typescript
await Desktop.agentContact.accept({ interactionId });
await Desktop.agentContact.hold({ interactionId });
await Desktop.agentContact.unHold({ interactionId });
// etc.
```

Both approaches are valid - Desktop SDK is correct for widget context.

### 3. Remote Audio Stream - CRITICAL for Voice Calls

**Cisco Sample Implementation:**
```javascript
function handleIncomingStream(stream) {
  const remoteAudio = document.getElementById('remote-media');
  if (remoteAudio) {
    remoteAudio.srcObject = stream;
    remoteAudio.play().catch(e => console.error("Error playing remote audio:", e));
  }
}

// In task:updated handler:
const remoteStream = task.data.mediaStreams?.telephony?.[task.data.interactionId]?.remoteStream;
if (remoteStream) {
  handleIncomingStream(remoteStream);
}
```

**Required HTML Element:**
```html
<audio id="remote-audio" autoplay></audio>
```

### 4. Buddy Agents Feature

**Cisco Sample:**
```javascript
async function fetchBuddyAgentsNodeList() {
  const buddyAgents = await webex.cc.buddyAgents.get();
  return buddyAgents.data.map(agent => ({
    id: agent.id,
    name: agent.name
  }));
}
```

### 5. ANI Entry Fetching

**Cisco Sample:**
```javascript
async function loadOutdialAniEntries(outdialANIId) {
  const aniResponse = await webex.cc.getOutdialAniEntries({ outdialANI: outdialANIId });
  // Returns array of phone numbers to use as caller ID
}
```

### 6. Queue Fetching for Transfers

**Cisco Sample:**
```javascript
async function getQueueListForTelephonyChannel() {
  const queueResponse = await webex.cc.getQueues();
  let queueList = queueResponse.data;
  return queueList.filter(queue => queue.channelType === 'TELEPHONY');
}
```

### 7. Address Book Integration

**Cisco Sample:**
```javascript
async function getDialNumberEntries() {
  const addressBookEntries = await webex.cc.addressBook.getEntries();
  return addressBookEntries.data || [];
}
```

### 8. Auto-Wrapup Timer

**Cisco Sample:**
```javascript
function startAutoWrapupTimer(task) {
  if (!task?.autoWrapup?.isRunning()) return;
  
  autoWrapupInterval = setInterval(() => {
    const timeLeft = task.autoWrapup.getTimeLeftSeconds();
    timerValueElm.textContent = formatTimeRemaining(timeLeft);
    if (timeLeft <= 0) {
      clearInterval(autoWrapupInterval);
    }
  }, 1000);
}
```

### 9. Log Upload Feature

**Cisco Sample:**
```javascript
async function uploadLogs() {
  const uploadResponse = await webex.cc.uploadLogs();
  console.log(`Logs uploaded with feedbackId: ${uploadResponse.feedbackId}`);
}
```

---

## Implementation Plan

### Phase 1: Fix Outdial (Critical for Testing)

**File: `src/contexts/WebexContext.tsx`**

1. Update the `outdial` function to use `Desktop.dialer.startOutdial()` with correct payload:
   - Use `origin` field for ANI ID (not `attributes.outdialAniId`)
   - Use uppercase: `direction: 'OUTBOUND'`, `outboundType: 'OUTDIAL'`
   - Wrap in `{ data: {...} }` structure

2. Add `eOutdialFailed` listener on the dialer module

### Phase 2: Add Remote Audio Element

**File: `src/components/command-center/InteractionArea.tsx`**

1. Add hidden `<audio id="remote-audio" autoplay></audio>` element
2. In WebexContext, when `task:updated` fires for telephony:
   - Extract `remoteStream` from `task.data.mediaStreams.telephony[interactionId].remoteStream`
   - Attach to audio element and play

### Phase 3: Buddy Agents Feature

**File: `src/contexts/WebexContext.tsx`**

1. Add `buddyAgents` state
2. Add `fetchBuddyAgents()` function that calls SDK equivalent
3. For Desktop SDK: use `Desktop.agentContact.buddyAgents` or equivalent

**File: `src/components/command-center/panels/TransferConsultPanel.tsx`**

1. Add "Buddy Agents" tab/section showing real-time agent availability

### Phase 4: Queue & Address Book Fetching

**File: `src/contexts/WebexContext.tsx`**

1. Add real queue fetching using SDK methods (not just mock data)
2. Add address book fetching for quick dial

### Phase 5: Auto-Wrapup Timer

**File: `src/components/command-center/ActiveTaskCard.tsx`**

1. When task is in `wrapup` state, check for `task.autoWrapup`
2. Display countdown timer
3. Handle auto-submission when timer expires

### Phase 6: Enhanced Recording Controls

**File: `src/contexts/WebexContext.tsx`**

1. Update to use `currentTask.pauseRecording()` / `resumeRecording()` pattern
2. Add `autoResumed` parameter support for resumeRecording

### Phase 7: Log Upload Feature

**File: `src/contexts/WebexContext.tsx`**

1. Add `uploadLogs()` function
2. For Desktop SDK: `Desktop.logger.uploadLogs()` or equivalent

**File: `src/components/command-center/panels/SettingsPanel.tsx`**

1. Add "Upload Logs" button for troubleshooting

---

## Files to Create/Modify

| File | Action | Changes |
|------|--------|---------|
| `src/contexts/WebexContext.tsx` | Modify | Fix outdial, add buddy agents, queue fetch, address book, log upload |
| `src/components/command-center/InteractionArea.tsx` | Modify | Add hidden audio element for remote stream |
| `src/components/command-center/ActiveTaskCard.tsx` | Modify | Add auto-wrapup timer display |
| `src/components/command-center/panels/TransferConsultPanel.tsx` | Modify | Add buddy agents section |
| `src/components/command-center/panels/SettingsPanel.tsx` | Modify | Add upload logs button |
| `src/hooks/useRemoteAudio.ts` | Create | Hook to manage remote audio stream attachment |

---

## Technical Details

### Updated Outdial Function

```typescript
const outdial = useCallback(async (dialNumber: string, entryPointId: string) => {
  const normalizedNumber = dialNumber.trim().replace(/\s+/g, '');
  
  addSDKLog('info', 'Initiating outdial via Desktop.dialer.startOutdial()', { 
    destination: normalizedNumber,
    entryPointId, 
    origin: OUTDIAL_ANI_ID,
  }, 'Outdial');
  
  try {
    if (!runningInDemoMode && desktopRef.current) {
      // Use Desktop.dialer.startOutdial() with correct payload structure
      const result = await desktopRef.current.dialer.startOutdial({
        data: {
          entryPointId: entryPointId,
          destination: normalizedNumber,
          direction: 'OUTBOUND',
          origin: OUTDIAL_ANI_ID,  // ANI goes here
          attributes: {},
          mediaType: 'telephony',
          outboundType: 'OUTDIAL',
        },
      });
      
      addSDKLog('info', 'Outdial request sent', { result }, 'Outdial');
      return;
    }
  } catch (error) {
    addSDKLog('error', 'Outdial failed', { error }, 'Outdial');
    throw error;
  }
  
  // Demo mode fallback...
}, [runningInDemoMode, addSDKLog]);
```

### Remote Audio Hook

```typescript
// src/hooks/useRemoteAudio.ts
export function useRemoteAudio() {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  
  const attachStream = useCallback((stream: MediaStream) => {
    if (audioRef.current && stream) {
      audioRef.current.srcObject = stream;
      audioRef.current.play().catch(e => 
        console.error('Error playing remote audio:', e)
      );
    }
  }, []);
  
  const detachStream = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.srcObject = null;
    }
  }, []);
  
  return { audioRef, attachStream, detachStream };
}
```

### Auto-Wrapup Timer Component

```typescript
function AutoWrapupTimer({ task }: { task: Task }) {
  const [timeLeft, setTimeLeft] = useState<number>(0);
  
  useEffect(() => {
    if (!task.autoWrapup?.isRunning?.()) return;
    
    const interval = setInterval(() => {
      const remaining = task.autoWrapup.getTimeLeftSeconds();
      setTimeLeft(remaining);
      if (remaining <= 0) clearInterval(interval);
    }, 1000);
    
    return () => clearInterval(interval);
  }, [task]);
  
  if (timeLeft <= 0) return null;
  
  return (
    <div className="text-sm text-muted-foreground">
      Auto wrap-up in: {Math.floor(timeLeft / 60)}:{(timeLeft % 60).toString().padStart(2, '0')}
    </div>
  );
}
```

---

## Testing Checklist

After implementation, verify in the real Agent Desktop:

1. **Outdial**: Phone rings when dialing
2. **Answer**: Accept incoming call
3. **Hold/Resume**: Toggle hold state
4. **Mute/Unmute**: Toggle mute
5. **Remote Audio**: Hear the caller (browser login)
6. **Transfer to Queue**: vteamTransfer works
7. **Transfer to Agent**: Buddy agents visible, transfer succeeds
8. **Consult**: Start and complete consultation
9. **Conference**: Merge consulted party
10. **Recording**: Pause/resume works
11. **Wrap-up**: Submit code, auto-timer works
12. **Log Upload**: Generates feedbackId

---

## Expected Outcome

After these changes, the custom desktop will have **feature parity** with the Cisco kitchen sink sample, enabling:
- Real outbound calls that ring
- Proper audio for browser-based softphone
- Full call control suite
- Real-time buddy agent availability
- Troubleshooting via log upload
