import React, { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';
import type { 
  AgentProfile, 
  AgentStateInfo, 
  Task, 
  IncomingTask, 
  IdleCode, 
  WrapUpCode,
  Queue,
  TeamAgent,
  AgentMetrics,
  AgentState,
  EntryPoint,
  RecentOutboundCall,
  ConsultState,
  CustomerProfile,
  CustomerNote,
  CustomerTag,
  CallLogEntry,
  ExtendedMetrics,
  ChannelType
} from '@/types/webex';
import type { SDKLogEntry, SDKLogLevel } from '@/types/sdk-debug';
import { getScenarioById } from '@/lib/demoScenarios';
import { isDemoMode, getEnvironmentDiagnostics } from '@/lib/webexEnvironment';
import { toast } from '@/hooks/use-toast';
import { desktopNotify } from '@/hooks/useDesktopNotification';
import { fetchAuxCodes } from '@/services/auxCodes';

export interface ScreenPopEvent {
  interactionId?: string;
  url?: string;
  type?: string;
  autoOpen?: boolean;
  data?: Record<string, unknown>;
  raw?: unknown;
}

export interface CampaignContact {
  interactionId: string;
  campaignId?: string;
  campaignName?: string;
  customerName?: string;
  phoneNumber?: string;
  previewDeadline?: number;
  raw?: unknown;
}


interface WebexContextType {
  // Connection state
  isInitialized: boolean;
  isConnected: boolean;
  connectionError: string | null;
  isLoading: boolean;
  isDemoMode: boolean;
  
  // Agent info
  agentProfile: AgentProfile | null;
  agentState: AgentStateInfo | null;
  
  // Tasks
  activeTasks: Task[];
  incomingTask: IncomingTask | null;
  selectedTaskId: string | null;
  
  // Reference data
  idleCodes: IdleCode[];
  wrapUpCodes: WrapUpCode[];
  queues: Queue[];
  teamAgents: TeamAgent[];
  entryPoints: EntryPoint[];
  buddyAgents: TeamAgent[];
  addressBook: { id: string; name: string; number: string }[];
  outdialAniList: { id: string; name: string; number: string }[];
  
  // Metrics
  agentMetrics: AgentMetrics | null;
  extendedMetrics: ExtendedMetrics | null;
  
  // Consult state
  consultState: ConsultState;
  
  // Outbound
  recentOutboundCalls: RecentOutboundCall[];
  
  // Customer data
  customerProfile: CustomerProfile | null;
  customerNotes: CustomerNote[];
  interactionHistory: CallLogEntry[];
  
  // SDK Debug Logs
  sdkLogs: SDKLogEntry[];
  clearSDKLogs: () => void;
  exportSDKLogs: () => string;

  // Screen pop (Desktop.screenpop -> eScreenPop)
  screenPop: ScreenPopEvent | null;
  dismissScreenPop: () => void;

  // Campaign reservations (preview/progressive outbound)
  campaignContacts: CampaignContact[];
  acceptCampaignContact: (interactionId: string) => Promise<void>;
  skipCampaignContact: (interactionId: string) => Promise<void>;
  removeCampaignContact: (interactionId: string) => Promise<void>;

  // Paginated aux-code search
  searchIdleCodes: (query: string) => Promise<void>;
  searchWrapUpCodes: (query: string) => Promise<void>;
  idleCodesHasMore: boolean;
  wrapUpCodesHasMore: boolean;
  
  // Demo settings reference
  demoAutoIncomingEnabled: boolean;
  setDemoAutoIncomingEnabled: (enabled: boolean) => void;
  
  // Actions
  initialize: () => Promise<void>;
  setAgentState: (state: AgentState, idleCodeId?: string) => Promise<void>;
  acceptTask: (taskId: string) => Promise<void>;
  declineTask: (taskId: string) => Promise<void>;
  holdTask: (taskId: string) => Promise<void>;
  resumeTask: (taskId: string) => Promise<void>;
  muteTask: (taskId: string) => Promise<void>;
  unmuteTask: (taskId: string) => Promise<void>;
  sendDtmf: (taskId: string, digit: string) => Promise<void>;
  endTask: (taskId: string) => Promise<void>;
  wrapUpTask: (taskId: string, wrapUpCodeId: string) => Promise<void>;
  transferToQueue: (taskId: string, queueId: string) => Promise<void>;
  transferToAgent: (taskId: string, agentId: string) => Promise<void>;
  transferToDN: (taskId: string, dialNumber: string) => Promise<void>;
  transferToEntryPoint: (taskId: string, entryPointId: string) => Promise<void>;
  consultAgent: (taskId: string, agentId: string) => Promise<void>;
  consultQueue: (taskId: string, queueId: string) => Promise<void>;
  consultDN: (taskId: string, dialNumber: string) => Promise<void>;
  consultEntryPoint: (taskId: string, entryPointId: string) => Promise<void>;
  completeTransfer: (taskId: string) => Promise<void>;
  cancelConsult: (taskId: string) => Promise<void>;
  conferenceCall: (taskId: string) => Promise<void>;
  exitConference: (taskId: string) => Promise<void>;
  dropConferenceParticipant: (taskId: string, participantId: string) => Promise<void>;
  outdial: (dialNumber: string, entryPointId: string) => Promise<void>;
  startRecording: (taskId: string) => Promise<void>;
  stopRecording: (taskId: string) => Promise<void>;
  sendChatMessage: (taskId: string, message: string) => Promise<void>;
  selectTask: (taskId: string) => void;
  updateCADVariable: (taskId: string, key: string, value: string) => Promise<void>;
  addCustomerNote: (note: string) => Promise<void>;
  toggleFavoriteAgent: (agentId: string) => void;
  escalateToVideo: (taskId: string) => Promise<void>;
  
  // SDK-specific actions
  uploadLogs: () => Promise<string | null>;
  fetchBuddyAgents: () => Promise<void>;
  pauseRecording: (taskId: string) => Promise<void>;
  resumeRecording: (taskId: string) => Promise<void>;
  
  // Demo-specific actions
  triggerIncomingTask: (mediaType: ChannelType, queueId?: string) => void;
  applyCustomerScenario: (scenarioId: string) => void;
  triggerRONA: () => void;
  clearAllTasks: () => void;
}

const WebexContext = createContext<WebexContextType | null>(null);

// Mock data for demo
const mockIdleCodes: IdleCode[] = [
  { id: 'break', name: 'Break' },
  { id: 'lunch', name: 'Lunch' },
  { id: 'training', name: 'Training' },
  { id: 'meeting', name: 'Meeting' },
];

const mockWrapUpCodes: WrapUpCode[] = [
  { id: 'resolved', name: 'Issue Resolved' },
  { id: 'escalated', name: 'Escalated' },
  { id: 'callback', name: 'Callback Scheduled' },
  { id: 'info', name: 'Information Provided' },
  { id: 'sales', name: 'Sale Completed' },
];

const mockQueues: Queue[] = [
  { id: 'q1', name: 'Sales Queue', waitingTasks: 5, avgWaitTime: 120 },
  { id: 'q2', name: 'Support Queue', waitingTasks: 12, avgWaitTime: 240 },
  { id: 'q3', name: 'Billing Queue', waitingTasks: 3, avgWaitTime: 60 },
  { id: 'q4', name: 'Technical Support', waitingTasks: 8, avgWaitTime: 180 },
  { id: 'q5', name: 'Premium Support', waitingTasks: 2, avgWaitTime: 45 },
];

const mockTeamAgents: TeamAgent[] = [
  { agentId: 'a1', name: 'John Smith', state: 'Available', teamName: 'Sales Team', skills: ['Sales', 'Upsell'], isFavorite: true },
  { agentId: 'a2', name: 'Jane Doe', state: 'Engaged', teamName: 'Sales Team', skills: ['Sales', 'Retention'] },
  { agentId: 'a3', name: 'Bob Wilson', state: 'Idle', teamName: 'Support Team', skills: ['Technical', 'Billing'] },
  { agentId: 'a4', name: 'Alice Brown', state: 'Available', teamName: 'Support Team', skills: ['Technical', 'Premium'], isFavorite: true },
  { agentId: 'a5', name: 'Charlie Davis', state: 'WrapUp', teamName: 'Support Team', skills: ['Billing', 'Claims'] },
  { agentId: 'a6', name: 'Diana Miller', state: 'Available', teamName: 'Premium Team', skills: ['Premium', 'VIP'] },
  { agentId: 'a7', name: 'Edward Johnson', state: 'Offline', teamName: 'Sales Team', skills: ['Sales'] },
];

const mockEntryPoints: EntryPoint[] = [
  { id: 'ep-001', name: 'Sales Outbound', description: 'Outbound sales calls' },
  { id: 'ep-002', name: 'Support Callback', description: 'Customer callbacks' },
  { id: 'ep-003', name: 'Collections', description: 'Payment collection calls' },
  { id: 'ep-004', name: 'Survey', description: 'Customer satisfaction surveys' },
];

const mockRecentOutboundCalls: RecentOutboundCall[] = [
  { number: '+1-555-0123', timestamp: Date.now() - 120000, duration: 245, entryPointId: 'ep-001', entryPointName: 'Sales Outbound' },
  { number: '+1-555-9876', timestamp: Date.now() - 3600000, duration: 180, entryPointId: 'ep-002', entryPointName: 'Support Callback' },
  { number: '+1-555-4567', timestamp: Date.now() - 7200000, duration: 320, entryPointId: 'ep-001', entryPointName: 'Sales Outbound' },
];

const mockInteractionHistory: CallLogEntry[] = [
  { taskId: 'hist-1', mediaType: 'voice', ani: '+1-555-1234', direction: 'inbound', duration: 320, timestamp: Date.now() - 86400000 * 2, wrapUpCode: 'resolved' },
  { taskId: 'hist-2', mediaType: 'chat', ani: 'chat-session', direction: 'inbound', duration: 480, timestamp: Date.now() - 86400000 * 5, wrapUpCode: 'info' },
  { taskId: 'hist-3', mediaType: 'email', ani: 'email', direction: 'inbound', duration: 600, timestamp: Date.now() - 86400000 * 7, wrapUpCode: 'callback' },
  { taskId: 'hist-4', mediaType: 'voice', ani: '+1-555-1234', direction: 'outbound', duration: 180, timestamp: Date.now() - 86400000 * 10, wrapUpCode: 'resolved' },
];

const mockCustomerNotes: CustomerNote[] = [
  { id: 'note-1', text: 'Customer prefers email communication. VIP account - handle with priority.', timestamp: Date.now() - 86400000, author: 'Jane Doe', isPinned: true },
  { id: 'note-2', text: 'Discussed renewal options. Customer interested in premium tier upgrade.', timestamp: Date.now() - 86400000 * 3, author: 'John Smith' },
];

const mockExtendedMetrics: ExtendedMetrics = {
  callsHandled: 24,
  avgHandleTime: 320,
  avgWrapTime: 45,
  occupancy: 78,
  adherence: 95,
  fcr: 85,
  csat: 4.2,
  handleTimeHistory: [280, 310, 295, 340, 320, 310, 330],
  callsByHour: [2, 3, 5, 4, 6, 3, 1],
  stateBreakdown: { available: 45, engaged: 35, idle: 15, wrapup: 5 },
  callsYesterday: 22,
  callsTrend: 'up',
};

export function WebexProvider({ children }: { children: React.ReactNode }) {
  const [isInitialized, setIsInitialized] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [runningInDemoMode, setRunningInDemoMode] = useState(true);
  
  const [agentProfile, setAgentProfile] = useState<AgentProfile | null>(null);
  const [agentState, setAgentStateInfo] = useState<AgentStateInfo | null>(null);
  
  const [activeTasks, setActiveTasks] = useState<Task[]>([]);
  const [incomingTask, setIncomingTask] = useState<IncomingTask | null>(null);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  
  // Initialize reference data to empty arrays in production, mock data set in initialize() for demo mode only
  const [idleCodes, setIdleCodes] = useState<IdleCode[]>([]);
  const [wrapUpCodes, setWrapUpCodes] = useState<WrapUpCode[]>([]);
  const [queues, setQueues] = useState<Queue[]>([]);
  const [teamAgents, setTeamAgents] = useState<TeamAgent[]>([]);
  const [entryPoints, setEntryPoints] = useState<EntryPoint[]>([]);
  const [buddyAgents, setBuddyAgents] = useState<TeamAgent[]>([]);
  const [addressBook, setAddressBook] = useState<{ id: string; name: string; number: string }[]>([]);
  const [outdialAniList, setOutdialAniList] = useState<{ id: string; name: string; number: string }[]>([]);
  
  const [agentMetrics, setAgentMetrics] = useState<AgentMetrics | null>(null);
  const [extendedMetrics, setExtendedMetrics] = useState<ExtendedMetrics | null>(null);
  
  const [consultState, setConsultState] = useState<ConsultState>({ isConsulting: false });
  const [recentOutboundCalls, setRecentOutboundCalls] = useState<RecentOutboundCall[]>(mockRecentOutboundCalls);
  
  const [customerProfile, setCustomerProfile] = useState<CustomerProfile | null>(null);
  const [customerNotes, setCustomerNotes] = useState<CustomerNote[]>(mockCustomerNotes);
  const [interactionHistory, setInteractionHistory] = useState<CallLogEntry[]>(mockInteractionHistory);
  
  // Demo control state
  const [demoAutoIncomingEnabled, setDemoAutoIncomingEnabled] = useState(true);

  // Screen pop
  const [screenPop, setScreenPop] = useState<ScreenPopEvent | null>(null);
  const dismissScreenPop = useCallback(() => setScreenPop(null), []);

  // Campaign reservations
  const [campaignContacts, setCampaignContacts] = useState<CampaignContact[]>([]);

  // Aux-code pagination flags
  const [idleCodesHasMore, setIdleCodesHasMore] = useState(false);
  const [wrapUpCodesHasMore, setWrapUpCodesHasMore] = useState(false);

  // SDK Debug Logs state
  const [sdkLogs, setSdkLogs] = useState<SDKLogEntry[]>([]);
  const logIdCounter = useRef(0);

  const ronaTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const desktopRef = useRef<any>(null);
  const idleCodesRef = useRef<IdleCode[]>([]);
  const lastStateChangePayloadRef = useRef<any>(null);
  // Event de-duplication: SDK sometimes delivers the same contact event twice
  // within milliseconds. Fingerprints kept for a short TTL to swallow the copy.
  const handledEventsRef = useRef<Map<string, number>>(new Map());
  // Guard against double-registration of agentContact listeners.
  const listenersRegisteredRef = useRef(false);
  // Live refs so async safety-nets and hydration paths can read latest state
  // without stale closures.
  const activeTasksRef = useRef<Task[]>([]);
  const incomingTaskRef = useRef<IncomingTask | null>(null);
  const agentStateRef = useRef<AgentStateInfo | null>(null);

  // SDK Logging helper
  const addSDKLog = useCallback((level: SDKLogLevel, message: string, data?: unknown, source?: string) => {
    const entry: SDKLogEntry = {
      id: `log-${Date.now()}-${logIdCounter.current++}`,
      timestamp: Date.now(),
      level,
      message,
      data,
      source,
    };

    // Also log to console
    const consoleMethod = level === 'error' ? console.error 
                        : level === 'warn' ? console.warn 
                        : level === 'debug' ? console.debug 
                        : console.log;
    consoleMethod(`[SDK ${level.toUpperCase()}] ${source ? `[${source}] ` : ''}${message}`, data ?? '');

    setSdkLogs(prev => {
      const newLogs = [...prev, entry];
      // Keep only last 500 logs
      if (newLogs.length > 500) {
        return newLogs.slice(-500);
      }
      return newLogs;
    });
  }, []);

  const clearSDKLogs = useCallback(() => {
    setSdkLogs([]);
  }, []);

  const exportSDKLogs = useCallback(() => {
    return JSON.stringify({
      exportedAt: new Date().toISOString(),
      logs: sdkLogs.map(log => ({
        ...log,
        timestampISO: new Date(log.timestamp).toISOString(),
      })),
    }, null, 2);
  }, [sdkLogs]);

  useEffect(() => {
    idleCodesRef.current = idleCodes;
  }, [idleCodes]);

  // Keep live refs in sync so out-of-render callbacks (SDK events, safety-net
  // setTimeouts, poll loops) never operate on stale closure snapshots.
  useEffect(() => { activeTasksRef.current = activeTasks; }, [activeTasks]);
  useEffect(() => { incomingTaskRef.current = incomingTask; }, [incomingTask]);
  useEffect(() => { agentStateRef.current = agentState; }, [agentState]);

  // Return true if this (event, interactionId) was already handled in the
  // last `ttlMs` ms. Used to swallow duplicate SDK deliveries.
  const isDuplicateEvent = useCallback((eventName: string, interactionId: string | undefined, ttlMs = 3000): boolean => {
    if (!interactionId) return false;
    const key = `${eventName}:${interactionId}`;
    const now = Date.now();
    // Sweep expired entries opportunistically.
    for (const [k, ts] of handledEventsRef.current) {
      if (now - ts > ttlMs) handledEventsRef.current.delete(k);
    }
    const last = handledEventsRef.current.get(key);
    if (last !== undefined && now - last < ttlMs) return true;
    handledEventsRef.current.set(key, now);
    return false;
  }, []);


  // Check if a state indicates the agent is actively handling a contact.
  const isEngagedLikeState = useCallback((state: string): boolean => {
    const normalized = state?.toLowerCase() || '';
    const engagedLikeStates = [
      'engaged',
      'engagedother',
      'engaged_other',
      'connected',
      'talking',
      'oncall',
      'on call',
      'on_call',
      'busy',
      'reserved',
      'handling',
      'ringing',
      'consulting',
      'consult',
    ];
    return engagedLikeStates.includes(normalized);
  }, []);

  // Map SDK state strings to our AgentState type.
  const mapSdkStateToAgentState = useCallback((sdkState: string): AgentState => {
    const normalized = sdkState?.toLowerCase() || '';
    
    if (isEngagedLikeState(normalized)) {
      return 'Engaged';
    }
    
    const stateMap: Record<string, AgentState> = {
      'available': 'Available',
      'idle': 'Idle',
      'rona': 'RONA',
      'wrapup': 'WrapUp',
      'wrap-up': 'WrapUp',
      'wrap_up': 'WrapUp',
      'aftercallwork': 'WrapUp',
      'after_call_work': 'WrapUp',
      'acw': 'WrapUp',
      'offline': 'Offline',
      'loggedin': 'Idle',
      'logged_in': 'Idle',
      'loggedout': 'Offline',
      'logged_out': 'Offline',
      'notready': 'Idle',
      'not_ready': 'Idle',
    };
    return stateMap[normalized] || 'Idle';
  }, [isEngagedLikeState]);

  // Helper to validate if a string is a valid UUID format.
  const isValidUUID = useCallback((str: string): boolean => {
    if (!str || typeof str !== 'string') return false;
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    return uuidRegex.test(str);
  }, []);

  const normalizeSdkChannelType = useCallback((channel?: string | null): string | null => {
    if (!channel || typeof channel !== 'string') return null;
    const normalized = channel.trim().toLowerCase();
    const channelMap: Record<string, string> = {
      voice: 'telephony',
      phone: 'telephony',
      telephony: 'telephony',
      chat: 'chat',
      social: 'social',
      email: 'email',
      workitem: 'workItem',
      work_item: 'workItem',
      workitemchannel: 'workItem',
      custommessaging: 'customMessaging',
      custom_messaging: 'customMessaging',
    };
    return channelMap[normalized] || null;
  }, []);

  const getChannelStateMap = useCallback((source: any): Record<string, any> | null => {
    const data = source?.data ?? source;
    const maps = [
      data?.agentChannelStateDetailMap,
      data?.channelsStatesMap,
      source?.agentChannelStateDetailMap,
      source?.channelsStatesMap,
    ];

    for (const map of maps) {
      if (map && typeof map === 'object' && !Array.isArray(map) && Object.keys(map).length > 0) {
        return map;
      }
    }
    return null;
  }, []);

  const getPreferredChannelStateDetail = useCallback((source: any): { channelType: string; detail: any } | null => {
    const data = source?.data ?? source;
    const directDetail = data?.agentChannelStateDetail || source?.agentChannelStateDetail;
    const directChannel = normalizeSdkChannelType(data?.channelType || source?.channelType);

    if (directDetail && typeof directDetail === 'object') {
      return {
        channelType: directChannel || 'telephony',
        detail: directDetail,
      };
    }

    const stateMap = getChannelStateMap(source);
    if (!stateMap) return null;

    const entries = Object.entries(stateMap)
      .map(([channel, detail]) => ({ channelType: normalizeSdkChannelType(channel), detail }))
      .filter((entry): entry is { channelType: string; detail: any } => !!entry.channelType && !!entry.detail);

    return entries.find(entry => entry.channelType === 'telephony')
      || entries.find(entry => typeof entry.detail?.agentState === 'string')
      || entries[0]
      || null;
  }, [getChannelStateMap, normalizeSdkChannelType]);

  const getIdleCodeFromSdkData = useCallback((sdkData: any, detail?: any): AgentStateInfo['idleCode'] | undefined => {
    const data = sdkData?.data ?? sdkData;
    const auxCodeId = detail?.auxCodeId || data?.auxCodeId || sdkData?.auxCodeId;
    const auxCodeName = detail?.idleCodeName || data?.auxCodeName || sdkData?.auxCodeName;
    const explicitIdleCode = data?.idleCode || sdkData?.idleCode;

    if (explicitIdleCode?.id) {
      return {
        id: explicitIdleCode.id,
        name: explicitIdleCode.name || auxCodeName || '',
      };
    }

    if (!auxCodeId) return undefined;
    const matchedCode = idleCodesRef.current.find(code => code.id === auxCodeId);
    return {
      id: auxCodeId,
      name: auxCodeName || matchedCode?.name || '',
    };
  }, []);

  const buildAgentStateSnapshot = useCallback((sdkData: any, source: string): (AgentStateInfo & { rawState: string; channelType?: string; source: string }) | null => {
    if (!sdkData) return null;

    const data = sdkData?.data ?? sdkData;
    const channelState = getPreferredChannelStateDetail(sdkData);

    if (channelState?.detail) {
      const rawState = channelState.detail.agentState
        || channelState.detail.agentStateToDisplay
        || channelState.detail.localizedAgentState
        || data?.subStatus
        || data?.status
        || 'Idle';

      return {
        state: mapSdkStateToAgentState(rawState),
        idleCode: getIdleCodeFromSdkData(sdkData, channelState.detail),
        lastStateChangeTime: channelState.detail.stateChangeTimestamp
          || channelState.detail.lastIdleCodeChangeTimestamp
          || data?.lastStateChangeTimestamp
          || data?.eventTime
          || Date.now(),
        rawState,
        channelType: channelState.channelType,
        source,
      };
    }

    const rawState = data?.subStatus || data?.status || sdkData?.subStatus || sdkData?.status;
    if (!rawState) return null;

    return {
      state: mapSdkStateToAgentState(rawState),
      idleCode: getIdleCodeFromSdkData(sdkData),
      lastStateChangeTime: data?.lastStateChangeTimestamp || data?.eventTime || Date.now(),
      rawState,
      source,
    };
  }, [getIdleCodeFromSdkData, getPreferredChannelStateDetail, mapSdkStateToAgentState]);

  const getProvisionedChannelTypes = useCallback((sdkData?: any): string[] => {
    const data = sdkData?.data ?? sdkData ?? desktopRef.current?.agentStateInfo?.latestData;
    const channelCandidates: string[] = [];

    const pushChannel = (channel: unknown) => {
      if (typeof channel !== 'string') return;
      const normalized = normalizeSdkChannelType(channel);
      if (normalized && !channelCandidates.includes(normalized)) {
        channelCandidates.push(normalized);
      }
    };

    const channelStateMap = getChannelStateMap(data);
    if (channelStateMap) Object.keys(channelStateMap).forEach(pushChannel);

    if (data?.channelsMap && typeof data.channelsMap === 'object') {
      Object.keys(data.channelsMap).forEach(pushChannel);
      Object.values(data.channelsMap).flat().forEach(pushChannel);
    }

    if (Array.isArray(data?.channelTypes)) data.channelTypes.forEach(pushChannel);
    if (Array.isArray(data?.connectedChannels)) data.connectedChannels.forEach(pushChannel);
    if (Array.isArray(data?.reservedAgentChannelIds)) data.reservedAgentChannelIds.forEach(pushChannel);

    if (channelCandidates.includes('telephony')) {
      return ['telephony', ...channelCandidates.filter(channel => channel !== 'telephony')];
    }

    return channelCandidates.length > 0 ? channelCandidates : ['telephony'];
  }, [getChannelStateMap, normalizeSdkChannelType]);

  // Helper to check if agent info is fully ready (not just truthy but with key fields).
  const isAgentInfoReady = useCallback((agentInfo: any): boolean => {
    if (!agentInfo) return false;
    const hasIdentity = !!(agentInfo.agentName || agentInfo.agentId || agentInfo.agentProfileID);
    const hasState = !!(agentInfo.status || agentInfo.subStatus || getPreferredChannelStateDetail(agentInfo));
    return hasIdentity && hasState;
  }, [getPreferredChannelStateDetail]);

  const promoteIncomingTaskIfEngaged = useCallback(() => {
    setIncomingTask(currentIncoming => {
      if (!currentIncoming) return currentIncoming;

      addSDKLog('info', '>>> PROMOTION: Agent Engaged with incomingTask - promoting to activeTasks <<<', {
        taskId: currentIncoming.taskId,
        ani: currentIncoming.ani,
        customerName: currentIncoming.customerName,
      }, 'WebexContext');
      
      if (ronaTimerRef.current) {
        clearTimeout(ronaTimerRef.current);
        ronaTimerRef.current = null;
      }
      
      const rawContact = (currentIncoming as any)._rawContact;
      const promotedTask: Task = {
        taskId: currentIncoming.taskId,
        mediaType: currentIncoming.mediaType,
        mediaChannel: rawContact?.mediaChannel || (currentIncoming.mediaType === 'voice' ? 'telephony' : currentIncoming.mediaType),
        state: 'connected',
        direction: rawContact?.direction as 'inbound' | 'outbound' || 'inbound',
        queueName: currentIncoming.queueName,
        ani: currentIncoming.ani,
        dnis: rawContact?.dnis || '',
        startTime: currentIncoming.startTime,
        isRecording: rawContact?.isRecording || false,
        isMuted: false,
        isHeld: false,
        wrapUpRequired: true,
        cadVariables: rawContact?.cadVariables || {},
        customerName: currentIncoming.customerName,
        customerEmail: rawContact?.customerEmail,
        customerPhone: rawContact?.customerPhone || currentIncoming.ani,
        mediaResourceId: rawContact?.mediaResourceId,
        isConsult: false,
        isPostCallConsult: false,
      };
      
      setActiveTasks(prev => {
        if (prev.some(t => t.taskId === promotedTask.taskId)) {
          addSDKLog('info', 'Task already in activeTasks, skipping promotion', { taskId: promotedTask.taskId }, 'WebexContext');
          return prev;
        }
        addSDKLog('info', 'Adding promoted task to activeTasks', { taskId: promotedTask.taskId }, 'WebexContext');
        return [...prev, promotedTask];
      });
      setSelectedTaskId(promotedTask.taskId);
      setCustomerProfile({
        id: promotedTask.taskId,
        name: promotedTask.customerName || promotedTask.ani || 'Unknown Customer',
        email: promotedTask.customerEmail || '',
        phone: promotedTask.customerPhone || promotedTask.ani || '',
        company: rawContact?.company || '',
        isVerified: false,
        tags: [] as CustomerTag[],
        interactionHistory: [] as CallLogEntry[],
        cadVariables: promotedTask.cadVariables || {},
      });
      
      return null;
    });

    (async () => {
      try {
        addSDKLog('info', 'Agent Engaged - attempting getTaskMap sync...', null, 'WebexContext');
        const actionsAvailable = desktopRef.current?.actions;
        addSDKLog('debug', 'Desktop.actions availability', {
          hasActions: !!actionsAvailable,
          actionKeys: actionsAvailable ? Object.keys(actionsAvailable) : [],
          getTaskMapType: typeof actionsAvailable?.getTaskMap,
        }, 'WebexContext');
        
        if (actionsAvailable?.getTaskMap) {
          const taskMap = await actionsAvailable.getTaskMap();
          addSDKLog('info', 'getTaskMap on Engaged result', {
            taskMapType: typeof taskMap,
            taskMapKeys: taskMap ? Object.keys(taskMap) : [],
            taskMap,
          }, 'WebexContext');
        }
      } catch (e) {
        addSDKLog('warn', 'getTaskMap on Engaged failed', e, 'WebexContext');
      }
    })();
  }, [addSDKLog]);

  const syncAgentStateFromSdkData = useCallback((sdkData: any, source: string) => {
    const snapshot = buildAgentStateSnapshot(sdkData, source);
    if (!snapshot) {
      addSDKLog('warn', 'Unable to derive agent state from SDK data', { source, sdkData }, 'WebexContext');
      return null;
    }

    setAgentStateInfo({
      state: snapshot.state,
      idleCode: snapshot.idleCode,
      lastStateChangeTime: snapshot.lastStateChangeTime,
    });

    addSDKLog('info', `Agent state synchronized to: ${snapshot.state}`, {
      source,
      rawState: snapshot.rawState,
      channelType: snapshot.channelType,
      idleCode: snapshot.idleCode,
      lastStateChangeTime: snapshot.lastStateChangeTime,
    }, 'WebexContext');

    if (snapshot.state === 'Engaged') {
      promoteIncomingTaskIfEngaged();
    }

    return snapshot;
  }, [addSDKLog, buildAgentStateSnapshot, promoteIncomingTaskIfEngaged]);

  // Initialize SDK and auto-fetch agent session
  const initialize = useCallback(async () => {
    setIsLoading(true);
    const demoMode = isDemoMode();
    setRunningInDemoMode(demoMode);
    
    // CRITICAL: If NOT in demo mode, explicitly disable demo auto-incoming to prevent interference
    if (!demoMode) {
      setDemoAutoIncomingEnabled(false);
      console.log('[WebexCC] Production mode - disabled demo auto-incoming');
    }
    
    // Log environment diagnostics for debugging
    const diagnostics = getEnvironmentDiagnostics();
    console.log('[WebexCC] Environment diagnostics:', diagnostics);
    console.log('[WebexCC] AGENTX_SERVICE available:', typeof (window as any).AGENTX_SERVICE !== 'undefined');
    console.log('[WebexCC] Demo mode detected:', demoMode);
    
    try {
      if (demoMode) {
        // Demo mode: simulate SDK initialization and provide mock agent data
        console.log('[WebexCC] Running in DEMO mode - not embedded in Agent Desktop');
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Set mock reference data ONLY in demo mode
        setIdleCodes(mockIdleCodes);
        setWrapUpCodes(mockWrapUpCodes);
        setQueues(mockQueues);
        setTeamAgents(mockTeamAgents);
        setEntryPoints(mockEntryPoints);
        
        // Auto-populate agent profile (agent is already logged in via Webex CC)
        setAgentProfile({
          agentId: 'agent-001',
          name: 'Demo Agent',
          email: 'agent@company.com',
          teamId: 'team-001',
          teamName: 'Demo Team',
          siteId: 'site-001',
          siteName: 'Main Site',
          extension: '1001',
          dialNumber: '+1-800-555-0100',
        });
        
        setAgentStateInfo({
          state: 'Offline',
          lastStateChangeTime: Date.now(),
        });
        
        setAgentMetrics({
          callsHandled: 24,
          avgHandleTime: 320,
          avgWrapTime: 45,
          occupancy: 78,
          adherence: 95,
        });
        
        setExtendedMetrics(mockExtendedMetrics);
        
        console.log('[WebexCC] Demo mode - Agent session loaded');
      } else {
        // Real SDK integration - running inside Webex CC Agent Desktop
        console.log('[WebexCC] Running in PRODUCTION mode - embedded in Agent Desktop');
        addSDKLog('info', 'Starting SDK initialization in production mode', null, 'WebexContext');
        
        try {
          // Import SDK using named export (not default)
          addSDKLog('info', 'Importing @wxcc-desktop/sdk...', null, 'WebexContext');
          const { Desktop } = await import('@wxcc-desktop/sdk');
          desktopRef.current = Desktop;
          addSDKLog('info', 'SDK module imported successfully', { hasDesktop: !!Desktop }, 'WebexContext');
          
          // Initialize the SDK config - wrap only this in try-catch to handle AQM/AI Assistant errors gracefully
          addSDKLog('info', 'Calling Desktop.config.init()...', null, 'WebexContext');
          try {
            await desktopRef.current.config.init({
              widgetName: 'BSAgentDesktop',
              widgetProvider: 'b+s',
            });
            addSDKLog('info', 'Desktop.config.init() completed', null, 'WebexContext');
            console.log('[WebexCC] SDK config initialized successfully');
          } catch (initError) {
            const errorMessage = initError instanceof Error ? initError.message : String(initError);
            
            // Check if this is the expected AQM/AI Assistant error (AQM feature not yet available)
            if (errorMessage.includes('aiAssistant') || errorMessage.includes('aqm')) {
              addSDKLog('warn', 
                'AQM/AI Assistant module not available (expected - AQM not yet enabled) - continuing with full core functionality', 
                { error: errorMessage }, 
                'WebexContext'
              );
              console.warn('[WebexCC] AQM/AI Assistant not available, continuing with core SDK:', errorMessage);
              // Continue - don't throw, core SDK functionality works fine without AQM
            } else {
              // Unexpected error - re-throw to be caught by outer handler
              addSDKLog('error', 'SDK config.init() failed with unexpected error', 
                { error: errorMessage, stack: (initError as Error)?.stack }, 
                'WebexContext'
              );
              throw initError;
            }
          }
          
          // Continue with normal initialization (works regardless of AQM availability)
          // Wait for agent data to become fully available (poll for up to 10 seconds)
          let agentInfo = desktopRef.current.agentStateInfo?.latestData;
          let attempts = 0;
          const maxAttempts = 20; // 20 * 500ms = 10 seconds
          
          while (!isAgentInfoReady(agentInfo) && attempts < maxAttempts) {
            addSDKLog('debug', `Waiting for agent data... attempt ${attempts + 1}/${maxAttempts}`, null, 'WebexContext');
            await new Promise(resolve => setTimeout(resolve, 500));
            agentInfo = desktopRef.current.agentStateInfo?.latestData;
            attempts++;
          }
          
          if (isAgentInfoReady(agentInfo)) {
            addSDKLog('info', 'Agent data received from SDK', {
              agentName: agentInfo.agentName,
              status: agentInfo.status,
              subStatus: agentInfo.subStatus,
              dn: agentInfo.dn,
              teamName: agentInfo.teamName,
              idleCodesCount: agentInfo.idleCodes?.length,
            }, 'WebexContext');
            
            setAgentProfile({
              agentId: agentInfo.agentId || agentInfo.agentProfileID || '',
              name: agentInfo.agentName || agentInfo.agentId || 'Agent',
              email: agentInfo.agentMailId || agentInfo.agentEmail || '',
              teamId: agentInfo.teamId || '',
              teamName: agentInfo.teamName || '',
              siteId: agentInfo.siteId || '',
              siteName: agentInfo.siteName || '',
              extension: agentInfo.extension || '',
              dialNumber: agentInfo.dn || '',
            });
            
            const initialStateSnapshot = syncAgentStateFromSdkData(agentInfo, 'initial latestData');
            const mappedState = initialStateSnapshot?.state || mapSdkStateToAgentState(agentInfo.subStatus || agentInfo.status || 'Idle');
            
            // Source idleCodes and wrapUpCodes from latestData if available
            if (agentInfo.idleCodes && Array.isArray(agentInfo.idleCodes) && agentInfo.idleCodes.length > 0) {
              setIdleCodes(agentInfo.idleCodes.map((code: any) => ({
                id: code.id,
                name: code.name,
              })));
              addSDKLog('info', `Loaded ${agentInfo.idleCodes.length} idle codes from latestData`, null, 'WebexContext');
            }
            
            if (agentInfo.wrapupCodes && Array.isArray(agentInfo.wrapupCodes) && agentInfo.wrapupCodes.length > 0) {
              setWrapUpCodes(agentInfo.wrapupCodes.map((code: any) => ({
                id: code.id,
                name: code.name,
              })));
              addSDKLog('info', `Loaded ${agentInfo.wrapupCodes.length} wrap-up codes from latestData`, null, 'WebexContext');
            }
            
            // Hardcoded fallback IDs for outbound dialing
            // Entry Point ID: identifies the outbound dial configuration
            // Outdial ANI ID: specifies the caller ID (ANI) for outbound calls
            const FALLBACK_ENTRY_POINT_ID = 'c97bf9ea-ca01-4e43-ad45-89c20055179b';
            const FALLBACK_OUTDIAL_ANI_ID = '84f80945-2f92-4086-aead-6a4afbb79dd9';
            
            const FALLBACK_OUTDIAL_ENTRY_POINT: EntryPoint = {
              id: FALLBACK_ENTRY_POINT_ID,
              name: 'Default Outdial',
              description: 'Primary outbound entry point'
            };
            
            // Log outbound configuration for debugging
            addSDKLog('info', 'Outbound configuration loaded', {
              entryPointId: FALLBACK_ENTRY_POINT_ID,
              outdialAniId: FALLBACK_OUTDIAL_ANI_ID,
              isOutboundEnabledForAgent: agentInfo?.isOutboundEnabledForAgent,
              isOutboundEnabledForTenant: agentInfo?.isOutboundEnabledForTenant,
              isAdhocDialingEnabled: agentInfo?.isAdhocDialingEnabled,
              outDialEp: agentInfo?.outDialEp,
              outdialANIId: agentInfo?.outdialANIId,
            }, 'Outbound');
            
            // Fetch entry points for outbound dialing
            try {
              addSDKLog('info', 'Fetching entry points from SDK...', null, 'WebexContext');
              
              // Try multiple methods to get entry points
              let entryPointsData: any = null;
              
              // Method 1: Try agentContact.entryPoints
              if (desktopRef.current.agentContact?.entryPoints) {
                const epModule = desktopRef.current.agentContact.entryPoints;
                if (typeof epModule.getAllEntryPoints === 'function') {
                  entryPointsData = await epModule.getAllEntryPoints();
                } else if (typeof epModule.fetch === 'function') {
                  entryPointsData = await epModule.fetch();
                } else if (epModule.data) {
                  entryPointsData = epModule.data;
                }
              }
              
              // Method 2: Try from latestData if not found above
              if (!entryPointsData && agentInfo.entryPoints) {
                entryPointsData = agentInfo.entryPoints;
              }
              
              // Method 3: Try actions.getEntryPoints if available
              if (!entryPointsData && desktopRef.current.actions?.getEntryPoints) {
                entryPointsData = await desktopRef.current.actions.getEntryPoints();
              }
              
              // Debug: log what we got back
              console.log('[WebexCC] Raw entry points response:', typeof entryPointsData, entryPointsData);
              addSDKLog('info', `Entry points raw response type: ${typeof entryPointsData}`, 
                { keys: entryPointsData ? Object.keys(entryPointsData) : 'null' }, 'WebexContext');
              
              // Normalize: handle object wrapper formats like { data: [...] } or { entryPoints: [...] }
              let entryPointsArray: any[] | null = null;
              if (Array.isArray(entryPointsData)) {
                entryPointsArray = entryPointsData;
              } else if (entryPointsData?.data && Array.isArray(entryPointsData.data)) {
                entryPointsArray = entryPointsData.data;
              } else if (entryPointsData?.entryPoints && Array.isArray(entryPointsData.entryPoints)) {
                entryPointsArray = entryPointsData.entryPoints;
              }
              
              if (entryPointsArray && entryPointsArray.length > 0) {
                const mappedEntryPoints: EntryPoint[] = entryPointsArray.map((ep: any) => ({
                  id: ep.id || ep.entryPointId || ep.entrypointId || '',
                  name: ep.name || ep.entryPointName || ep.entrypointName || 'Unknown Entry Point',
                  description: ep.description || ep.address || ep.mediaType || '',
                }));
                setEntryPoints(mappedEntryPoints);
                addSDKLog('info', `Loaded ${mappedEntryPoints.length} entry points from SDK`, 
                  { entryPoints: mappedEntryPoints.map(ep => ({ id: ep.id, name: ep.name })) }, 
                  'WebexContext'
                );
                console.log('[WebexCC] Entry points loaded:', mappedEntryPoints.length, mappedEntryPoints);
              } else {
                // Use hardcoded fallback entry point
                setEntryPoints([FALLBACK_OUTDIAL_ENTRY_POINT]);
                addSDKLog('warn', 'No entry points from SDK - using hardcoded fallback entry point', 
                  { fallback: FALLBACK_OUTDIAL_ENTRY_POINT }, 'WebexContext');
                console.warn('[WebexCC] Using fallback entry point:', FALLBACK_OUTDIAL_ENTRY_POINT);
              }
            } catch (epError) {
              // Use hardcoded fallback entry point on error
              setEntryPoints([FALLBACK_OUTDIAL_ENTRY_POINT]);
              addSDKLog('warn', 'Failed to fetch entry points - using hardcoded fallback', 
                { error: epError instanceof Error ? epError.message : String(epError), fallback: FALLBACK_OUTDIAL_ENTRY_POINT }, 
                'WebexContext'
              );
              console.warn('[WebexCC] Failed to fetch entry points, using fallback:', epError);
            }

            // Fetch address book entries (populates transfer/consult DN picker)
            try {
              if (typeof desktopRef.current.agentStateInfo?.fetchAddressBooks === 'function') {
                const abResp = await desktopRef.current.agentStateInfo.fetchAddressBooks();
                const rawEntries: any[] = Array.isArray(abResp)
                  ? abResp
                  : Array.isArray(abResp?.data)
                    ? abResp.data
                    : Array.isArray(abResp?.entries)
                      ? abResp.entries
                      : [];
                // Address books can be nested (book -> entries); flatten one level
                const flattened = rawEntries.flatMap((item: any) =>
                  Array.isArray(item?.entries) ? item.entries : [item]
                );
                const book = flattened
                  .map((e: any) => ({
                    id: e.id || e.entryId || e.number || `${e.name}-${e.number}`,
                    name: e.name || e.displayName || e.number || 'Unknown',
                    number: e.number || e.phoneNumber || e.dn || '',
                  }))
                  .filter((e) => e.number);
                if (book.length > 0) {
                  setAddressBook(book);
                  addSDKLog('info', `Loaded ${book.length} address book entries`, null, 'WebexContext');
                } else {
                  addSDKLog('warn', 'Address book response was empty', { abResp }, 'WebexContext');
                }
              }
            } catch (abErr) {
              addSDKLog('warn', 'Could not fetch address books', { error: abErr instanceof Error ? abErr.message : String(abErr) }, 'WebexContext');
            }

            console.log('[WebexCC] Agent info loaded:', agentInfo.agentName, 'State:', mappedState);
          } else {
            addSDKLog('warn', 'Agent data not ready after waiting', null, 'WebexContext');
            console.warn('[WebexCC] Agent data not ready after 10 seconds');
            setConnectionError('Agent data not available - please ensure you are logged in');
          }
          
          // Subscribe to agent state changes
          // The 'updated' event passes an array of changed fields, so we re-read latestData
          desktopRef.current.agentStateInfo.addEventListener('updated', (changes: any) => {
            addSDKLog('debug', 'Agent state updated event received', changes, 'WebexContext');
            console.log('[WebexCC] Agent state update event:', changes);
            
            // Re-read the full latestData to get complete state and sync config
            const latestData = desktopRef.current?.agentStateInfo?.latestData;
            if (latestData) {
              syncAgentStateFromSdkData(latestData, 'agentStateInfo.updated');
              
              // Also sync idleCodes and wrapUpCodes if they've been populated
              if (latestData.idleCodes && Array.isArray(latestData.idleCodes) && latestData.idleCodes.length > 0) {
                setIdleCodes(latestData.idleCodes.map((code: any) => ({
                  id: code.id,
                  name: code.name,
                })));
              }
              if (latestData.wrapupCodes && Array.isArray(latestData.wrapupCodes) && latestData.wrapupCodes.length > 0) {
                setWrapUpCodes(latestData.wrapupCodes.map((code: any) => ({
                  id: code.id,
                  name: code.name,
                })));
              }
            }
          });

          if (typeof desktopRef.current.agentStateInfo.addEventListener === 'function') {
            desktopRef.current.agentStateInfo.addEventListener('eAgentChannelStateChanged', (event: any) => {
              addSDKLog('info', '>>> eAgentChannelStateChanged EVENT FIRED <<<', {
                channelType: event?.data?.channelType || event?.channelType,
                agentChannelStateDetail: event?.data?.agentChannelStateDetail || event?.agentChannelStateDetail,
                connectedChannels: event?.data?.connectedChannels || event?.connectedChannels,
                trackingId: event?.data?.trackingId || event?.trackingId,
              }, 'WebexContext');
              syncAgentStateFromSdkData(event, 'eAgentChannelStateChanged');
            });
            addSDKLog('info', 'Registered: eAgentChannelStateChanged listener', null, 'WebexContext');

            desktopRef.current.agentStateInfo.addEventListener('eAgentChannelReloginSuccess', (event: any) => {
              addSDKLog('info', '>>> eAgentChannelReloginSuccess EVENT FIRED <<<', {
                status: event?.data?.status || event?.status,
                channelTypes: getProvisionedChannelTypes(event),
                trackingId: event?.data?.trackingId || event?.trackingId,
              }, 'WebexContext');
              syncAgentStateFromSdkData(event, 'eAgentChannelReloginSuccess');
            });
            addSDKLog('info', 'Registered: eAgentChannelReloginSuccess listener', null, 'WebexContext');
          }
          
          // Fetch idle + wrap-up codes (paginated via agentConfigJsApi when available)
          try {
            addSDKLog('info', 'Fetching idle codes (paginated)...', null, 'WebexContext');
            const idlePage = await fetchAuxCodes({ workType: 'IDLE_CODE', page: 0, pageSize: 100 });
            if (idlePage.codes.length > 0) {
              setIdleCodes(idlePage.codes);
              setIdleCodesHasMore(idlePage.hasMore);
              addSDKLog('info', `Loaded ${idlePage.codes.length}/${idlePage.totalRecords || idlePage.codes.length} idle codes`, null, 'WebexContext');
            }
          } catch (e) {
            addSDKLog('warn', 'Could not fetch idle codes', e, 'WebexContext');
          }

          try {
            addSDKLog('info', 'Fetching wrap-up codes (paginated)...', null, 'WebexContext');
            const wrapPage = await fetchAuxCodes({ workType: 'WRAP_UP_CODE', page: 0, pageSize: 100 });
            if (wrapPage.codes.length > 0) {
              setWrapUpCodes(wrapPage.codes);
              setWrapUpCodesHasMore(wrapPage.hasMore);
              addSDKLog('info', `Loaded ${wrapPage.codes.length}/${wrapPage.totalRecords || wrapPage.codes.length} wrap-up codes`, null, 'WebexContext');
            }
          } catch (e) {
            addSDKLog('warn', 'Could not fetch wrap-up codes', e, 'WebexContext');
          }
          
          // Register event listeners for real-time updates
          addSDKLog('info', 'Registering SDK event listeners...', null, 'WebexContext');

          // Verify agentContact module is available
          if (desktopRef.current.agentContact) {
            addSDKLog('info', 'agentContact module available', {
              hasAgentContact: true,
              agentContactKeys: Object.keys(desktopRef.current.agentContact),
            }, 'WebexContext');
          } else {
            addSDKLog('error', 'agentContact module NOT available!', null, 'WebexContext');
          }

          if (listenersRegisteredRef.current) {
            addSDKLog('warn', 'agentContact listeners already registered — skipping duplicate registration', null, 'WebexContext');
          } else {
            listenersRegisteredRef.current = true;

          desktopRef.current.agentContact.addEventListener('eAgentOfferContact', (contact: any) => {
            const iid = extractContactData(contact)?.interactionId;
            addSDKLog('info', '>>> eAgentOfferContact EVENT FIRED <<<', { interactionId: iid, raw: contact }, 'WebexContext');
            console.log('[WebexCC] >>> eAgentOfferContact EVENT FIRED:', contact);
            if (isDuplicateEvent('eAgentOfferContact', iid)) {
              addSDKLog('debug', 'Duplicate eAgentOfferContact swallowed', { interactionId: iid }, 'WebexContext');
              return;
            }
            handleIncomingContact(contact);
          });
          addSDKLog('info', 'Registered: eAgentOfferContact listener', null, 'WebexContext');
          
          desktopRef.current.agentContact.addEventListener('eAgentContactAssigned', (contact: any) => {
            const iid = extractContactData(contact)?.interactionId;
            addSDKLog('info', '>>> eAgentContactAssigned EVENT FIRED <<<', { interactionId: iid, raw: contact }, 'WebexContext');
            console.log('[WebexCC] >>> eAgentContactAssigned EVENT FIRED:', contact);
            if (isDuplicateEvent('eAgentContactAssigned', iid)) {
              addSDKLog('debug', 'Duplicate eAgentContactAssigned swallowed', { interactionId: iid }, 'WebexContext');
              return;
            }
            handleContactAssigned(contact);
          });
          addSDKLog('info', 'Registered: eAgentContactAssigned listener', null, 'WebexContext');
          
          desktopRef.current.agentContact.addEventListener('eAgentContactEnded', (contact: any) => {
            const iid = extractContactData(contact)?.interactionId;
            addSDKLog('info', '>>> eAgentContactEnded EVENT FIRED <<<', { interactionId: iid, raw: contact }, 'WebexContext');
            console.log('[WebexCC] >>> eAgentContactEnded EVENT FIRED:', contact);
            if (isDuplicateEvent('eAgentContactEnded', iid)) {
              addSDKLog('debug', 'Duplicate eAgentContactEnded swallowed', { interactionId: iid }, 'WebexContext');
              return;
            }
            handleContactEnded(contact);
          });
          addSDKLog('info', 'Registered: eAgentContactEnded listener', null, 'WebexContext');
          
          desktopRef.current.agentContact.addEventListener('eAgentContactWrappedUp', (contact: any) => {
            const iid = extractContactData(contact)?.interactionId;
            addSDKLog('info', '>>> eAgentContactWrappedUp EVENT FIRED <<<', { interactionId: iid, raw: contact }, 'WebexContext');
            console.log('[WebexCC] >>> eAgentContactWrappedUp EVENT FIRED:', contact);
            if (isDuplicateEvent('eAgentContactWrappedUp', iid)) return;
            handleContactWrappedUp(contact);
          });
          addSDKLog('info', 'Registered: eAgentContactWrappedUp listener', null, 'WebexContext');
          
          desktopRef.current.agentContact.addEventListener('eAgentWrapup', (contact: any) => {
            const iid = extractContactData(contact)?.interactionId;
            addSDKLog('info', '>>> eAgentWrapup EVENT FIRED <<<', { interactionId: iid, raw: contact }, 'WebexContext');
            console.log('[WebexCC] >>> eAgentWrapup EVENT FIRED:', contact);
            if (isDuplicateEvent('eAgentWrapup', iid)) return;
            handleAgentWrapup(contact);
          });
          addSDKLog('info', 'Registered: eAgentWrapup listener', null, 'WebexContext');
          
          // Additional event listeners for comprehensive contact handling
          desktopRef.current.agentContact.addEventListener('eAgentOfferContactRona', (contact: any) => {
            const iid = extractContactData(contact)?.interactionId;
            addSDKLog('info', '>>> eAgentOfferContactRona EVENT FIRED <<<', { interactionId: iid, raw: contact }, 'WebexContext');
            if (isDuplicateEvent('eAgentOfferContactRona', iid)) return;
            // Only clear the ringing card when this RONA matches the current
            // incoming task (or event has no id). Prevents a stray RONA from
            // wiping a call the agent has actually answered.
            const currentIncoming = incomingTaskRef.current;
            if (!iid || (currentIncoming && currentIncoming.taskId === iid)) {
              setIncomingTask(null);
              setAgentStateInfo(prev => prev ? { ...prev, state: 'RONA' } : null);
              addSDKLog('info', 'RONA matched incoming task — cleared', { interactionId: iid }, 'WebexContext');
            } else {
              addSDKLog('warn', 'RONA event ignored — no matching incoming task', {
                ronaInteractionId: iid,
                currentIncomingId: currentIncoming?.taskId,
              }, 'WebexContext');
            }
          });
          addSDKLog('info', 'Registered: eAgentOfferContactRona listener', null, 'WebexContext');

          
          desktopRef.current.agentContact.addEventListener('eAgentContactHeld', (contact: any) => {
            addSDKLog('info', '>>> eAgentContactHeld EVENT FIRED <<<', contact, 'WebexContext');
            const taskId = contact.interactionId || contact.id;
            setActiveTasks(prev => prev.map(t => 
              t.taskId === taskId ? { ...t, isHeld: true, state: 'held' } : t
            ));
          });
          addSDKLog('info', 'Registered: eAgentContactHeld listener', null, 'WebexContext');
          
          desktopRef.current.agentContact.addEventListener('eAgentContactUnHeld', (contact: any) => {
            addSDKLog('info', '>>> eAgentContactUnHeld EVENT FIRED <<<', contact, 'WebexContext');
            const taskId = contact.interactionId || contact.id;
            setActiveTasks(prev => prev.map(t => 
              t.taskId === taskId ? { ...t, isHeld: false, state: 'connected' } : t
            ));
          });
          addSDKLog('info', 'Registered: eAgentContactUnHeld listener', null, 'WebexContext');

          // Consult lifecycle listeners
          desktopRef.current.agentContact.addEventListener('eAgentConsultCreated', (contact: any) => {
            addSDKLog('info', '>>> eAgentConsultCreated EVENT FIRED <<<', contact, 'Consult');
            const taskId = contact?.interactionId || contact?.data?.interactionId;
            const mediaResourceId = contact?.mediaResourceId || contact?.data?.mediaResourceId;
            setConsultState(prev => ({ ...prev, isConsulting: true, consultConnected: true, mediaResourceId }));
            if (taskId) {
              setActiveTasks(prev => prev.map(t =>
                t.taskId === taskId ? { ...t, state: 'consulting', isHeld: true, mediaResourceId: mediaResourceId ?? t.mediaResourceId } : t
              ));
            }
          });
          addSDKLog('info', 'Registered: eAgentConsultCreated listener', null, 'WebexContext');

          desktopRef.current.agentContact.addEventListener('eAgentConsultEnded', (contact: any) => {
            addSDKLog('info', '>>> eAgentConsultEnded EVENT FIRED <<<', contact, 'Consult');
            const taskId = contact?.interactionId || contact?.data?.interactionId;
            setConsultState({ isConsulting: false });
            if (taskId) {
              setActiveTasks(prev => prev.map(t =>
                t.taskId === taskId && t.state === 'consulting' ? { ...t, state: 'connected', isHeld: false } : t
              ));
            }
          });
          addSDKLog('info', 'Registered: eAgentConsultEnded listener', null, 'WebexContext');

          desktopRef.current.agentContact.addEventListener('eAgentConsultFailed', (contact: any) => {
            addSDKLog('error', '>>> eAgentConsultFailed EVENT FIRED <<<', contact, 'Consult');
            const taskId = contact?.interactionId || contact?.data?.interactionId;
            setConsultState({ isConsulting: false });
            if (taskId) {
              setActiveTasks(prev => prev.map(t =>
                t.taskId === taskId && t.state === 'consulting' ? { ...t, state: 'connected', isHeld: false } : t
              ));
            }
            toast({ title: 'Consult failed', description: 'The consulted party could not be reached.', variant: 'destructive' });
          });
          addSDKLog('info', 'Registered: eAgentConsultFailed listener', null, 'WebexContext');

          desktopRef.current.agentContact.addEventListener('eAgentConsultConferenced', (contact: any) => {
            addSDKLog('info', '>>> eAgentConsultConferenced EVENT FIRED <<<', contact, 'Consult');
            const taskId = contact?.interactionId || contact?.data?.interactionId;
            setConsultState({ isConsulting: false });
            if (taskId) {
              setActiveTasks(prev => prev.map(t =>
                t.taskId === taskId ? { ...t, state: 'conferencing', isHeld: false } : t
              ));
            }
          });
          addSDKLog('info', 'Registered: eAgentConsultConferenced listener', null, 'WebexContext');
          
          desktopRef.current.agentContact.addEventListener('eCallRecordingStarted', (contact: any) => {
            addSDKLog('info', '>>> eCallRecordingStarted EVENT FIRED <<<', contact, 'WebexContext');
            const taskId = contact.interactionId || contact.id;
            setActiveTasks(prev => prev.map(t => 
              t.taskId === taskId ? { ...t, isRecording: true } : t
            ));
          });
          addSDKLog('info', 'Registered: eCallRecordingStarted listener', null, 'WebexContext');

          // ---- Additional agentContact events for error recovery & rich UI ----
          const registerSafe = (evt: string, handler: (e: any) => void) => {
            try {
              desktopRef.current.agentContact.addEventListener(evt, handler);
              addSDKLog('info', `Registered: ${evt} listener`, null, 'WebexContext');
            } catch (err) {
              addSDKLog('warn', `Could not register ${evt}`, { error: err instanceof Error ? err.message : String(err) }, 'WebexContext');
            }
          };

          registerSafe('eAgentConsultEndFailed', (event: any) => {
            addSDKLog('error', '>>> eAgentConsultEndFailed <<<', event, 'Consult');
            setConsultState({ isConsulting: false });
            toast({ title: 'Consult end failed', description: 'Could not end the consult session.', variant: 'destructive' });
          });
          registerSafe('eAgentCtqCancelled', (event: any) => {
            addSDKLog('info', '>>> eAgentCtqCancelled <<<', event, 'Consult');
            setConsultState({ isConsulting: false });
          });
          registerSafe('eAgentCtqFailed', (event: any) => {
            addSDKLog('error', '>>> eAgentCtqFailed <<<', event, 'Consult');
            toast({ title: 'Consult-to-queue failed', description: 'Please try a different target.', variant: 'destructive' });
          });
          registerSafe('eAgentCtqCancelFailed', (event: any) => {
            addSDKLog('error', '>>> eAgentCtqCancelFailed <<<', event, 'Consult');
          });
          registerSafe('eAgentConsultTransferring', (event: any) => {
            addSDKLog('info', '>>> eAgentConsultTransferring <<<', event, 'Consult');
          });
          registerSafe('eAgentContactAniUpdated', (event: any) => {
            addSDKLog('info', '>>> eAgentContactAniUpdated <<<', event, 'WebexContext');
            const c = extractContactData(event);
            if (c.interactionId && c.ani) {
              setActiveTasks(prev => prev.map(t =>
                t.taskId === c.interactionId ? { ...t, ani: c.ani, customerPhone: c.customerPhone || c.ani } : t
              ));
            }
          });
          registerSafe('eContactOwnerChanged', (event: any) => {
            addSDKLog('info', '>>> eContactOwnerChanged <<<', event, 'WebexContext');
          });
          registerSafe('eParticipantJoinedConference', (event: any) => {
            addSDKLog('info', '>>> eParticipantJoinedConference <<<', event, 'Conference');
          });
          registerSafe('eParticipantLeftConference', (event: any) => {
            addSDKLog('info', '>>> eParticipantLeftConference <<<', event, 'Conference');
          });
          registerSafe('eAgentConsultConferenceEnded', (event: any) => {
            addSDKLog('info', '>>> eAgentConsultConferenceEnded <<<', event, 'Conference');
            const c = extractContactData(event);
            if (c.interactionId) {
              setActiveTasks(prev => prev.map(t =>
                t.taskId === c.interactionId ? { ...t, state: 'connected' } : t
              ));
            }
          });

          // ---- Screen pop (Desktop.screenpop -> eScreenPop) ----
          try {
            if (desktopRef.current.screenpop?.addEventListener) {
              desktopRef.current.screenpop.addEventListener('eScreenPop', (event: any) => {
                addSDKLog('info', '>>> eScreenPop EVENT FIRED <<<', event, 'ScreenPop');
                const payload = event?.data ?? event ?? {};
                const url: string | undefined =
                  payload.screenPopUrl || payload.url || payload.data?.url;
                const interactionId: string | undefined =
                  payload.interactionId || payload.data?.interactionId;
                const data: Record<string, unknown> | undefined =
                  payload.screenPopData || payload.data?.screenPopData ||
                  (typeof payload.data === 'object' && !url ? payload.data : undefined);
                setScreenPop({
                  interactionId,
                  url,
                  type: payload.type || payload.screenPopType,
                  autoOpen: payload.autoOpen !== false,
                  data,
                  raw: event,
                });
              });
              addSDKLog('info', 'Registered: eScreenPop listener', null, 'WebexContext');
            } else {
              addSDKLog('warn', 'screenpop module not available', null, 'WebexContext');
            }
          } catch (e) {
            addSDKLog('warn', 'Could not register eScreenPop listener', { error: e instanceof Error ? e.message : String(e) }, 'WebexContext');
          }

          
          // Listen for outdial failures
          try {
            if (desktopRef.current.dialer) {
              desktopRef.current.dialer.addEventListener('eOutdialFailed', (event: any) => {
                console.error('[WebexCC] >>> eOutdialFailed EVENT FIRED <<<', event);
                addSDKLog('error', '>>> eOutdialFailed EVENT FIRED <<<', {
                  reason: event?.data?.reason || event?.reason || 'Unknown',
                  trackingId: event?.data?.trackingId || event?.trackingId,
                  errorCode: event?.data?.errorCode || event?.errorCode,
                  payload: event?.data || event,
                }, 'Dialer');
              });
              addSDKLog('info', 'Registered: eOutdialFailed listener (dialer module)', null, 'WebexContext');
            } else {
              addSDKLog('warn', 'Dialer module not available - eOutdialFailed listener not registered', null, 'WebexContext');
            }
          } catch (e) {
            addSDKLog('warn', 'Could not register eOutdialFailed listener', { error: e instanceof Error ? e.message : String(e) }, 'WebexContext');
          }

          // ---- Campaign / preview outdial events ----
          const extractCampaignContact = (event: any): CampaignContact => {
            const raw = event?.data?.interaction ?? event?.interaction ?? event?.data ?? event ?? {};
            const cad = raw.callAssociatedData || {};
            const cd = raw.callAssociatedDetails || {};
            return {
              interactionId: raw.interactionId || event?.interactionId || `campaign-${Date.now()}`,
              campaignId: raw.campaignId || raw.outboundCampaignId,
              campaignName: raw.campaignName || cad.CampaignName?.value,
              customerName: cad.G_Customer_Name?.value || cad.L_Caller_Name?.value,
              phoneNumber: cd.ani || raw.dn || raw.phoneNumber,
              previewDeadline:
                typeof raw.previewTimeout === 'number'
                  ? Date.now() + raw.previewTimeout * 1000
                  : undefined,
              raw: event,
            };
          };

          try {
            registerSafe('eAgentOfferCampaignReserved', (event: any) => {
              addSDKLog('info', '>>> eAgentOfferCampaignReserved <<<', event, 'Campaign');
              const c = extractCampaignContact(event);
              setCampaignContacts((prev) => [...prev.filter((p) => p.interactionId !== c.interactionId), c]);
              desktopNotify({
                title: `Campaign reservation${c.campaignName ? ` · ${c.campaignName}` : ''}`,
                data: c.customerName || c.phoneNumber || '',
                type: 'info',
              });
            });
            registerSafe('eAgentAddCampaignReserved', (event: any) => {
              addSDKLog('info', '>>> eAgentAddCampaignReserved <<<', event, 'Campaign');
              const c = extractCampaignContact(event);
              setCampaignContacts((prev) => [...prev.filter((p) => p.interactionId !== c.interactionId), c]);
            });
            registerSafe('eAgentCampaignContactUpdated', (event: any) => {
              addSDKLog('info', '>>> eAgentCampaignContactUpdated <<<', event, 'Campaign');
              const c = extractCampaignContact(event);
              setCampaignContacts((prev) => prev.map((p) => (p.interactionId === c.interactionId ? { ...p, ...c } : p)));
            });
          } catch (e) {
            addSDKLog('warn', 'Could not register campaign contact listeners', { error: e instanceof Error ? e.message : String(e) }, 'WebexContext');
          }

          try {
            if (desktopRef.current.dialer?.addEventListener) {
              desktopRef.current.dialer.addEventListener('eCampaignPreviewAcceptFailed', (event: any) => {
                addSDKLog('error', '>>> eCampaignPreviewAcceptFailed <<<', event, 'Campaign');
                toast({ title: 'Campaign accept failed', description: event?.data?.reason || 'Unknown error', variant: 'destructive' });
              });
              desktopRef.current.dialer.addEventListener('eCampaignPreviewSkipFailed', (event: any) => {
                addSDKLog('error', '>>> eCampaignPreviewSkipFailed <<<', event, 'Campaign');
              });
              desktopRef.current.dialer.addEventListener?.('eCampaignPreviewRemoveFailed', (event: any) => {
                addSDKLog('error', '>>> eCampaignPreviewRemoveFailed <<<', event, 'Campaign');
              });
              addSDKLog('info', 'Registered: campaign dialer failure listeners', null, 'WebexContext');
            }
          } catch (e) {
            addSDKLog('warn', 'Could not register campaign dialer listeners', { error: e instanceof Error ? e.message : String(e) }, 'WebexContext');
          }

          } // end: if (!listenersRegisteredRef.current) else { ... }

          addSDKLog('info', 'SDK initialization complete - all event listeners registered', null, 'WebexContext');


          
          // Hydrate current interactions from TaskMap
          try {
            addSDKLog('info', 'Fetching TaskMap to hydrate existing contacts...', null, 'WebexContext');
            const taskMap = await desktopRef.current.actions?.getTaskMap();
            addSDKLog('info', 'TaskMap raw response', { 
              taskMapType: typeof taskMap,
              taskMapKeys: taskMap ? Object.keys(taskMap) : [],
              taskMapContent: taskMap,
            }, 'WebexContext');
            
            if (taskMap && typeof taskMap === 'object') {
              const tasks = Object.values(taskMap) as any[];
              addSDKLog('info', `Processing ${tasks.length} tasks from TaskMap`, null, 'WebexContext');
              
              const hydratedTasks: Task[] = tasks.map((taskEntry: any) => {
                // Use extractContactData for consistent data extraction
                const contact = extractContactData(taskEntry);
                addSDKLog('info', 'Hydrating task with extracted data', { 
                  taskId: contact.interactionId,
                  ani: contact.ani,
                  customerName: contact.customerName,
                  state: contact.state,
                }, 'WebexContext');
                
                return {
                  taskId: contact.interactionId || `task-${Date.now()}`,
                  mediaType: mapMediaType(contact.mediaType),
                  mediaChannel: contact.mediaChannel || 'telephony',
                  state: mapContactState(contact.state || 'connected'),
                  direction: contact.direction as 'inbound' | 'outbound',
                  queueName: contact.queueName || 'Unknown Queue',
                  ani: contact.ani || '',
                  dnis: contact.dnis || '',
                  startTime: Date.now(),
                  isRecording: contact.isRecording || false,
                  isMuted: false,
                  isHeld: false,
                  wrapUpRequired: true,
                  cadVariables: contact.cadVariables || {},
                  customerName: contact.customerName,
                  customerEmail: contact.customerEmail,
                  customerPhone: contact.customerPhone || contact.ani,
                  mediaResourceId: contact.mediaResourceId,
                  isConsult: false,
                  isPostCallConsult: false,
                };
              });
              
              if (hydratedTasks.length > 0) {
                setActiveTasks(hydratedTasks);
                setSelectedTaskId(hydratedTasks[0].taskId);
                
                // Also populate customer profile from first task
                const firstContact = extractContactData(tasks[0]);
                if (firstContact.customerName || firstContact.ani) {
                  setCustomerProfile({
                    id: hydratedTasks[0].taskId,
                    name: firstContact.customerName || firstContact.ani || 'Unknown Customer',
                    email: firstContact.customerEmail || '',
                    phone: firstContact.customerPhone || firstContact.ani || '',
                    company: firstContact.company || '',
                    isVerified: false,
                    tags: [] as CustomerTag[],
                    interactionHistory: [] as CallLogEntry[],
                    cadVariables: firstContact.cadVariables || {},
                  });
                }
                
                addSDKLog('info', `Hydrated ${hydratedTasks.length} active tasks from TaskMap`, { 
                  firstTaskId: hydratedTasks[0].taskId,
                  firstTaskAni: hydratedTasks[0].ani,
                  firstTaskCustomerName: hydratedTasks[0].customerName,
                }, 'WebexContext');
              }
            }
          } catch (taskMapError) {
            addSDKLog('warn', 'Could not fetch TaskMap', taskMapError, 'WebexContext');
          }
        } catch (sdkError) {
          // Outer catch - only reached if SDK import fails or re-thrown error from config.init
          const errorMessage = sdkError instanceof Error ? sdkError.message : String(sdkError);
          addSDKLog('error', 'SDK initialization failed', { error: errorMessage }, 'WebexContext');
          setIsConnected(false);
          setConnectionError(`SDK initialization failed: ${errorMessage}`);
          console.error('[WebexCC] SDK initialization error:', sdkError);
        }
      }
      
      setIsInitialized(true);
      setIsConnected(true);
      console.log('[WebexCC] SDK Initialized');
    } catch (error) {
      setConnectionError('Failed to initialize SDK');
      console.error('[WebexCC] Init error:', error);
    } finally {
      setIsLoading(false);
    }
  }, [addSDKLog, getProvisionedChannelTypes, isAgentInfoReady, mapSdkStateToAgentState, syncAgentStateFromSdkData]);
  
  // ============================================================================
  // SDK Contact Data Extractor
  // SDK events nest data under event.data.interaction - this helper normalizes it
  // ============================================================================
  const extractContactData = (event: any) => {
    // SDK events can have data nested under event.data.interaction
    const interaction = event?.data?.interaction || event?.interaction || event;
    const callAssociatedDetails = interaction?.callAssociatedDetails || {};
    const callAssociatedData = interaction?.callAssociatedData || {};
    const callProcessingDetails = interaction?.callProcessingDetails || {};
    const participants = interaction?.participants || {};
    
    // Find customer participant for ANI
    const customerParticipant = Object.values(participants).find(
      (p: any) => p.pType === 'Customer' || p.type === 'Customer'
    ) as any;
    
    // Extract CAD variables as key-value pairs
    const cadVariables: Record<string, string> = {};
    if (callAssociatedData && typeof callAssociatedData === 'object') {
      for (const [key, val] of Object.entries(callAssociatedData)) {
        const cadVal = val as any;
        if (cadVal?.value !== undefined) {
          cadVariables[key] = cadVal.value;
        }
      }
    }
    
    return {
      interactionId: interaction?.interactionId || event?.interactionId || event?.data?.interactionId,
      mediaType: interaction?.mediaType || event?.mediaType || 'telephony',
      mediaResourceId: interaction?.mainInteractionId || interaction?.mediaResourceId || event?.mediaResourceId,
      ani: callAssociatedDetails?.ani || interaction?.ani || customerParticipant?.id || '',
      dnis: callAssociatedDetails?.dn || interaction?.dnis || callProcessingDetails?.dnis || '',
      queueName: callAssociatedDetails?.virtualTeamName || callProcessingDetails?.virtualTeamName || interaction?.queueName || '',
      ronaTimeout: parseInt(callAssociatedDetails?.ronaTimeout || '15'),
      direction: interaction?.contactDirection?.type?.toLowerCase() === 'inbound' ? 'inbound' : 'outbound',
      state: interaction?.state || 'connected',
      customerName: callAssociatedData?.L_Caller_Name?.value || callAssociatedData?.G_Customer_Name?.value || '',
      customerEmail: callAssociatedData?.Customer_Email?.value || '',
      customerPhone: callAssociatedData?.L_Calling_Number?.value || callAssociatedDetails?.ani || '',
      company: callAssociatedData?.Company?.value || '',
      cadVariables,
      mediaChannel: interaction?.mediaChannel || 'telephony',
      isRecording: callProcessingDetails?.recordInProgress === 'true',
      // Use SDK timestamp when available for accurate timing
      createdTimestamp: interaction?.createdTimestamp || event?.data?.eventTime || null,
      raw: interaction, // Keep raw data for debugging
    };
  };
  
  // Handle incoming contact offer
  const handleIncomingContact = (event: any) => {
    // Extract contact data from nested SDK payload
    const contact = extractContactData(event);
    
    addSDKLog('info', 'handleIncomingContact - extracted data', {
      extracted: contact,
      rawEventKeys: Object.keys(event || {}),
      hasDataProperty: !!event?.data,
      hasInteractionProperty: !!event?.data?.interaction,
    }, 'WebexContext');
    console.log('[WebexCC] handleIncomingContact - EXTRACTED:', JSON.stringify(contact, null, 2));
    
    const taskId = contact.interactionId || `task-${Date.now()}`;
    // Use SDK timestamp if available, otherwise current time
    const startTime = contact.createdTimestamp || Date.now();
    
    const incomingTaskData = {
      taskId,
      mediaType: mapMediaType(contact.mediaType),
      ani: contact.ani || 'Unknown',
      queueName: contact.queueName || 'Unknown Queue',
      ronaTimeout: contact.ronaTimeout || 15,
      startTime,
      customerName: contact.customerName,
      // Store full contact data for later promotion to activeTasks
      _rawContact: contact,
    };
    
    addSDKLog('info', 'Setting incomingTask state with real data', incomingTaskData, 'WebexContext');
    setIncomingTask(incomingTaskData as any);

    // Surface via Desktop notification bus so agents see it outside this widget
    desktopNotify({
      title: `Incoming ${incomingTaskData.mediaType} · ${incomingTaskData.queueName}`,
      data: incomingTaskData.customerName || incomingTaskData.ani,
      type: 'info',
      autoDismissMs: (contact.ronaTimeout || 15) * 1000,
    });
    
    // Clear any existing RONA timer
    if (ronaTimerRef.current) {
      clearTimeout(ronaTimerRef.current);
      ronaTimerRef.current = null;
    }
    
    // RONA timer - ONLY in demo mode
    // In production, rely on SDK's eAgentOfferContactRona event for RONA handling
    if (runningInDemoMode) {
      const timeout = (contact.ronaTimeout || 15) * 1000;
      ronaTimerRef.current = setTimeout(() => {
        addSDKLog('info', 'RONA timeout triggered (demo mode)', { taskId }, 'WebexContext');
        setIncomingTask(null);
        setAgentStateInfo(prev => prev ? { ...prev, state: 'RONA' } : null);
      }, timeout);
    } else {
      addSDKLog('info', 'Production mode - relying on SDK for RONA handling, no local timer', { taskId }, 'WebexContext');
    }
  };
  
  // Handle contact assigned (accepted)
  const handleContactAssigned = (event: any) => {
    // Extract contact data from nested SDK payload
    const contact = extractContactData(event);
    
    addSDKLog('info', 'handleContactAssigned - extracted data', {
      extracted: contact,
      rawEventKeys: Object.keys(event || {}),
      hasDataProperty: !!event?.data,
      hasInteractionProperty: !!event?.data?.interaction,
      currentIncomingTaskId: incomingTask?.taskId,
      currentActiveTasksCount: activeTasks.length,
    }, 'WebexContext');
    console.log('[WebexCC] handleContactAssigned - EXTRACTED:', JSON.stringify(contact, null, 2));
    
    if (ronaTimerRef.current) {
      clearTimeout(ronaTimerRef.current);
      addSDKLog('info', 'Cleared RONA timer', null, 'WebexContext');
    }
    
    const taskId = contact.interactionId || `task-${Date.now()}`;
    const newTask: Task = {
      taskId,
      mediaType: mapMediaType(contact.mediaType),
      mediaChannel: contact.mediaChannel || 'telephony',
      state: 'connected',
      direction: contact.direction as 'inbound' | 'outbound',
      queueName: contact.queueName || 'Unknown Queue',
      ani: contact.ani || '',
      dnis: contact.dnis || '',
      startTime: Date.now(),
      isRecording: contact.isRecording || false,
      isMuted: false,
      isHeld: false,
      wrapUpRequired: true,
      cadVariables: contact.cadVariables || {},
      customerName: contact.customerName,
      customerEmail: contact.customerEmail,
      customerPhone: contact.customerPhone || contact.ani,
      // SDK-specific fields for call controls
      mediaResourceId: contact.mediaResourceId,
      isConsult: false,
      isPostCallConsult: false,
    };
    
    addSDKLog('info', 'Creating active task from extracted contact', { taskId, newTask }, 'WebexContext');
    
    setActiveTasks(prev => {
      const updated = [...prev.filter(t => t.taskId !== taskId), newTask];
      addSDKLog('info', 'Updated activeTasks', { previousCount: prev.length, newCount: updated.length }, 'WebexContext');
      return updated;
    });
    setSelectedTaskId(taskId);
    setIncomingTask(null);
    
    // Set agent state to Engaged when contact is assigned
    setAgentStateInfo(prev => prev ? { 
      ...prev, 
      state: 'Engaged',
      lastStateChangeTime: Date.now()
    } : null);
    
    // Populate customer profile from extracted contact data
    const customerProfileData = {
      id: taskId,
      name: contact.customerName || contact.ani || 'Unknown Customer',
      email: contact.customerEmail || '',
      phone: contact.customerPhone || contact.ani || '',
      company: contact.company || '',
      isVerified: false,
      tags: [] as CustomerTag[],
      interactionHistory: [] as CallLogEntry[],
      cadVariables: contact.cadVariables || {},
    };
    addSDKLog('info', 'Setting customer profile from extracted data', customerProfileData, 'WebexContext');
    setCustomerProfile(customerProfileData);
    
    addSDKLog('info', `Contact assigned complete - Agent state set to Engaged`, { 
      taskId, 
      ani: contact.ani,
      customerName: contact.customerName 
    }, 'WebexContext');
  };
  
  // Handle contact ended
  const handleContactEnded = (event: any) => {
    const contact = extractContactData(event);
    const taskId = contact.interactionId || event?.data?.interactionId || event?.interactionId;
    
    addSDKLog('info', 'handleContactEnded - extracted data', { extracted: contact, taskId }, 'WebexContext');
    
    const task = activeTasks.find(t => t.taskId === taskId);
    
    if (task?.wrapUpRequired) {
      setActiveTasks(prev => prev.map(t => 
        t.taskId === taskId ? { ...t, state: 'wrapup' } : t
      ));
      // Set agent state to WrapUp
      setAgentStateInfo(prev => prev ? { 
        ...prev, 
        state: 'WrapUp',
        lastStateChangeTime: Date.now()
      } : null);
      addSDKLog('info', `Contact ended - Agent state set to WrapUp`, { taskId }, 'WebexContext');
    } else {
      setActiveTasks(prev => {
        const remaining = prev.filter(t => t.taskId !== taskId);
        // Set agent state back to Available if no more tasks
        if (remaining.length === 0) {
          setAgentStateInfo(prevState => prevState ? { 
            ...prevState, 
            state: 'Available',
            lastStateChangeTime: Date.now()
          } : null);
          addSDKLog('info', `Contact ended - No remaining tasks, Agent state set to Available`, { taskId }, 'WebexContext');
        }
        return remaining;
      });
      if (selectedTaskId === taskId) {
        setSelectedTaskId(activeTasks.find(t => t.taskId !== taskId)?.taskId || null);
      }
    }
  };
  
  // Handle contact wrapped up
  const handleContactWrappedUp = (event: any) => {
    const contact = extractContactData(event);
    const taskId = contact.interactionId || event?.data?.interactionId || event?.interactionId;
    
    addSDKLog('info', 'handleContactWrappedUp - extracted data', { extracted: contact, taskId }, 'WebexContext');
    
    setActiveTasks(prev => {
      const remaining = prev.filter(t => t.taskId !== taskId);
      // Set agent state back to Available if no more tasks
      if (remaining.length === 0) {
        setAgentStateInfo(prevState => prevState ? { 
          ...prevState, 
          state: 'Available',
          lastStateChangeTime: Date.now()
        } : null);
        addSDKLog('info', `Contact wrapped up - No remaining tasks, Agent state set to Available`, { taskId }, 'WebexContext');
      }
      return remaining;
    });
    if (selectedTaskId === taskId) {
      setSelectedTaskId(activeTasks.find(t => t.taskId !== taskId)?.taskId || null);
    }
    setCustomerProfile(null);
  };
  
  // Handle wrapup state (eAgentWrapup event)
  const handleAgentWrapup = (event: any) => {
    const contact = extractContactData(event);
    const taskId = contact.interactionId || event?.data?.interactionId || event?.interactionId;
    
    addSDKLog('info', 'handleAgentWrapup - extracted data', { 
      extracted: contact, 
      taskId,
      customerName: contact.customerName,
      ani: contact.ani 
    }, 'WebexContext');
    
    // If we don't have this task yet (missed the offer/assigned events), create it now
    setActiveTasks(prev => {
      const existingTask = prev.find(t => t.taskId === taskId);
      if (existingTask) {
        // Task exists, just update state to wrapup
        return prev.map(t => t.taskId === taskId ? { ...t, state: 'wrapup' as const } : t);
      } else {
        // Task doesn't exist - create it from the wrapup event data
        addSDKLog('info', 'Creating task from wrapup event (missed earlier events)', { taskId, contact }, 'WebexContext');
        const newTask: Task = {
          taskId,
          mediaType: mapMediaType(contact.mediaType),
          mediaChannel: contact.mediaChannel || 'telephony',
          state: 'wrapup',
          direction: contact.direction as 'inbound' | 'outbound',
          queueName: contact.queueName || 'Unknown Queue',
          ani: contact.ani || '',
          dnis: contact.dnis || '',
          startTime: Date.now(),
          isRecording: contact.isRecording || false,
          isMuted: false,
          isHeld: false,
          wrapUpRequired: true,
          cadVariables: contact.cadVariables || {},
          customerName: contact.customerName,
          customerEmail: contact.customerEmail,
          customerPhone: contact.customerPhone || contact.ani,
          mediaResourceId: contact.mediaResourceId,
          isConsult: false,
          isPostCallConsult: false,
        };
        return [...prev, newTask];
      }
    });
    
    // Also populate customer profile if we have data
    if (contact.customerName || contact.ani) {
      setCustomerProfile({
        id: taskId,
        name: contact.customerName || contact.ani || 'Unknown Customer',
        email: contact.customerEmail || '',
        phone: contact.customerPhone || contact.ani || '',
        company: contact.company || '',
        isVerified: false,
        tags: [] as CustomerTag[],
        interactionHistory: [] as CallLogEntry[],
        cadVariables: contact.cadVariables || {},
      });
    }
    
    setSelectedTaskId(taskId);
    
    // Set agent state to WrapUp
    setAgentStateInfo(prev => prev ? { 
      ...prev, 
      state: 'WrapUp',
      lastStateChangeTime: Date.now()
    } : null);
  };
  
  // Map SDK media type to our ChannelType
  const mapMediaType = (sdkMediaType: string): ChannelType => {
    const typeMap: Record<string, ChannelType> = {
      'telephony': 'voice',
      'voice': 'voice',
      'chat': 'chat',
      'email': 'email',
      'social': 'social',
    };
    return typeMap[sdkMediaType?.toLowerCase()] || 'voice';
  };
  
  // Map SDK contact state to our Task state
  const mapContactState = (sdkState: string): Task['state'] => {
    const stateMap: Record<string, Task['state']> = {
      'connected': 'connected',
      'held': 'held',
      'wrapup': 'wrapup',
      'consulting': 'consulting',
      'conferencing': 'conferencing',
      'incoming': 'incoming',
      'ringing': 'incoming',
      'offered': 'incoming',
    };
    return stateMap[sdkState?.toLowerCase()] || 'connected';
  };

  // Build a Task object from an extracted contact (offer/assigned/taskMap).
  const buildTaskFromContact = (contact: any, startTimeOverride?: number): Task => ({
    taskId: contact.interactionId,
    mediaType: mapMediaType(contact.mediaType),
    mediaChannel: contact.mediaChannel || 'telephony',
    state: mapContactState(contact.state || 'connected'),
    direction: (contact.direction as 'inbound' | 'outbound') || 'inbound',
    queueName: contact.queueName || 'Unknown Queue',
    ani: contact.ani || '',
    dnis: contact.dnis || '',
    startTime: startTimeOverride ?? contact.createdTimestamp ?? Date.now(),
    isRecording: !!contact.isRecording,
    isMuted: false,
    isHeld: false,
    wrapUpRequired: true,
    cadVariables: contact.cadVariables || {},
    customerName: contact.customerName,
    customerEmail: contact.customerEmail,
    customerPhone: contact.customerPhone || contact.ani,
    mediaResourceId: contact.mediaResourceId,
    isConsult: false,
    isPostCallConsult: false,
  });

  // Idempotently ensure an active task exists for `interactionId`. Tries
  // Desktop.actions.getTaskMap() first (authoritative), then falls back to
  // the offer payload stashed on the current incomingTask when the id matches.
  // Safe to call repeatedly — will not create duplicates and will only clear
  // the incomingTask card after the active task exists.
  const hydrateActiveTaskFromInteractionId = useCallback(async (
    interactionId: string | undefined,
    reason: string,
  ): Promise<boolean> => {
    if (!interactionId) {
      addSDKLog('debug', 'hydrateActiveTask: no interactionId supplied', { reason }, 'WebexContext');
      return false;
    }
    if (activeTasksRef.current.some(t => t.taskId === interactionId)) {
      addSDKLog('debug', 'hydrateActiveTask: task already active', { interactionId, reason }, 'WebexContext');
      return true;
    }

    let contact: any = null;
    let source: 'taskMap' | 'incomingOffer' | null = null;

    // 1) TaskMap (authoritative)
    try {
      const taskMap = await desktopRef.current?.actions?.getTaskMap?.();
      if (taskMap && typeof taskMap === 'object') {
        const entry = (taskMap as any)[interactionId]
          ?? Object.values(taskMap).find((t: any) => extractContactData(t)?.interactionId === interactionId);
        if (entry) {
          contact = extractContactData(entry);
          source = 'taskMap';
        }
      }
    } catch (e) {
      addSDKLog('warn', 'hydrateActiveTask: getTaskMap failed', { reason, error: e instanceof Error ? e.message : String(e) }, 'WebexContext');
    }

    // 2) Fall back to the stashed offer payload
    if (!contact) {
      const incoming = incomingTaskRef.current;
      if (incoming && incoming.taskId === interactionId && (incoming as any)._rawContact) {
        contact = (incoming as any)._rawContact;
        source = 'incomingOffer';
      }
    }

    if (!contact) {
      addSDKLog('warn', 'hydrateActiveTask: no source found for interactionId', { interactionId, reason }, 'WebexContext');
      return false;
    }

    const incoming = incomingTaskRef.current;
    const startTime = incoming && incoming.taskId === interactionId
      ? incoming.startTime
      : (contact.createdTimestamp || Date.now());

    const newTask = buildTaskFromContact({ ...contact, interactionId }, startTime);
    if (newTask.state === 'incoming') newTask.state = 'connected';

    setActiveTasks(prev => {
      if (prev.some(t => t.taskId === interactionId)) return prev;
      return [...prev, newTask];
    });
    setSelectedTaskId(interactionId);
    setCustomerProfile({
      id: interactionId,
      name: contact.customerName || contact.ani || 'Unknown Customer',
      email: contact.customerEmail || '',
      phone: contact.customerPhone || contact.ani || '',
      company: contact.company || '',
      isVerified: false,
      tags: [] as CustomerTag[],
      interactionHistory: [] as CallLogEntry[],
      cadVariables: contact.cadVariables || {},
    });
    // Clear ringing card only after active task is in place
    if (incoming && incoming.taskId === interactionId) {
      setIncomingTask(null);
    }

    addSDKLog('info', 'hydrateActiveTask: materialized active task', {
      interactionId, reason, source, startTime,
      ani: contact.ani, customerName: contact.customerName,
    }, 'WebexContext');
    return true;
  }, [addSDKLog]);



  // Set agent state
  const setAgentState = useCallback(async (state: AgentState, idleCodeId?: string) => {
    if (runningInDemoMode || !desktopRef.current) {
      // Demo mode - update local state directly
      const idleCode = idleCodeId ? idleCodes.find(c => c.id === idleCodeId) : undefined;
      setAgentStateInfo({
        state,
        idleCode,
        lastStateChangeTime: Date.now(),
      });
      return;
    }

    console.log('[WebexCC] Setting agent state via SDK:', state, idleCodeId);
    addSDKLog('info', `Requesting state change: ${state}`, { idleCodeId }, 'WebexContext');

    const agentStateInfo = desktopRef.current.agentStateInfo;
    const hasV2 = typeof agentStateInfo?.stateChangeV2 === 'function';
    const latestData = agentStateInfo?.latestData;
    const channelType = getProvisionedChannelTypes(latestData);

    // Idle requires a valid UUID auxCodeId
    if (state === 'Idle' && (!idleCodeId || !isValidUUID(idleCodeId))) {
      addSDKLog('error',
        `Cannot change to Idle state: invalid or missing idle code ID. Received: "${idleCodeId}".`,
        { idleCodeId, idleCodesLoaded: idleCodes.length },
        'WebexContext');
      return;
    }
    if (state !== 'Available' && state !== 'Idle') {
      addSDKLog('warn', `State ${state} not directly settable via stateChange API`, null, 'WebexContext');
      return;
    }

    // Build payload
    let payload: any;
    let sdkMethod: 'stateChangeV2' | 'stateChange';
    if (hasV2) {
      sdkMethod = 'stateChangeV2';
      payload = state === 'Idle'
        ? { channelType, state: 'Idle' as const, auxCodeId: idleCodeId }
        : { channelType, state: 'Available' as const };
    } else {
      sdkMethod = 'stateChange';
      payload = state === 'Idle'
        ? { state: 'Idle' as const, auxCodeIdArray: idleCodeId! }
        : { state: 'Available' as const, auxCodeIdArray: '0' };
    }
    lastStateChangePayloadRef.current = payload;

    // Detect AQM notification timeout: Cisco accepts the PUT (202) but the
    // AgentChannelStateChanged notification over the AQM WebSocket is delayed
    // or not delivered. The state DID change on Cisco's side, so we must not
    // block the UI.
    const isAqmTimeout = (err: any): boolean => {
      const id = err?.id || err?.details?.id;
      const status = err?.details?.resAxios?.status ?? err?.resAxios?.status;
      return id === 'Service.aqm.reqs.Timeout' || status === 202;
    };

    let requestAccepted = false;
    try {
      await agentStateInfo[sdkMethod](payload);
      requestAccepted = true;
      addSDKLog('info', `${sdkMethod} resolved`, { payload }, 'WebexContext');
    } catch (error: any) {
      if (isAqmTimeout(error)) {
        requestAccepted = true;
        addSDKLog('warn',
          `${sdkMethod} AQM notification timed out (HTTP 202 accepted). Cisco applied the state change; syncing via poll.`,
          { payload, error },
          'WebexContext');
      } else {
        addSDKLog('error', `State change failed:`, {
          error,
          sdkMethod,
          lastRequestPayload: payload,
          latestDataSnapshot: agentStateInfo?.latestData,
        }, 'WebexContext');
        console.error('[WebexCC] State change failed:', error);
        return;
      }
    }

    if (!requestAccepted) return;

    // Optimistic UI update — poll/events will overwrite if Cisco reports different.
    const optimisticIdleCode = state === 'Idle' && idleCodeId
      ? { id: idleCodeId, name: (idleCodesRef.current.find(c => c.id === idleCodeId)?.name) || '' }
      : undefined;
    setAgentStateInfo({
      state,
      idleCode: optimisticIdleCode,
      lastStateChangeTime: Date.now(),
    });

    // Poll latestData for up to ~10s to confirm state change and drive full sync.
    const desiredSubStatus = state === 'Available' ? 'available' : 'idle';
    const pollStart = Date.now();
    const pollDeadline = pollStart + 10_000;
    const pollInterval = 500;

    const pollForConfirmation = async () => {
      while (Date.now() < pollDeadline) {
        await new Promise(r => setTimeout(r, pollInterval));
        const current = agentStateInfo?.latestData;
        const currentSubStatus = (current?.subStatus || '').toLowerCase();
        const currentAuxCode = current?.idleCode?.id;

        const stateMatches = currentSubStatus === desiredSubStatus;
        const auxMatches = state === 'Available' || currentAuxCode === idleCodeId;

        if (stateMatches && auxMatches) {
          syncAgentStateFromSdkData(current, `poll after ${sdkMethod}`);
          addSDKLog('info', `State change confirmed via poll after ${Date.now() - pollStart}ms`,
            { state, subStatus: currentSubStatus, auxCode: currentAuxCode }, 'WebexContext');
          return;
        }
      }
      addSDKLog('warn',
        `State change poll timed out after ${Date.now() - pollStart}ms; relying on SDK events.`,
        { requestedState: state, latestSubStatus: agentStateInfo?.latestData?.subStatus },
        'WebexContext');
    };

    // Fire and forget — the SDK 'updated' / 'eAgentChannelStateChanged' listeners
    // will also drive sync if they arrive first.
    pollForConfirmation();
  }, [runningInDemoMode, idleCodes, addSDKLog, getProvisionedChannelTypes, isValidUUID, syncAgentStateFromSdkData]);



  // Accept incoming task
  const acceptTask = useCallback(async (taskId: string) => {
    if (!incomingTask || incomingTask.taskId !== taskId) return;
    
    if (ronaTimerRef.current) {
      clearTimeout(ronaTimerRef.current);
    }
    
    try {
      if (!runningInDemoMode && desktopRef.current) {
        // Real SDK call
        console.log('[WebexCC] Accepting task via SDK:', taskId);
        await callAgentContact('accept', { interactionId: taskId });
        // Task assignment will be handled via event listener
        return;
      }
    } catch (error) {
      console.error('[WebexCC] Accept task failed:', error);
    }
    
    // Demo mode or fallback
    const newTask: Task = {
      taskId,
      mediaType: incomingTask.mediaType,
      mediaChannel: incomingTask.mediaType === 'voice' ? 'telephony' : incomingTask.mediaType,
      state: 'connected',
      direction: 'inbound',
      queueName: incomingTask.queueName,
      ani: incomingTask.ani,
      dnis: '+1-800-555-0100',
      startTime: Date.now(),
      isRecording: false,
      isMuted: false,
      isHeld: false,
      wrapUpRequired: true,
      cadVariables: {
        CustomerType: 'Premium',
        AccountNumber: 'ACC-123456',
        LastContact: '2024-01-15',
        Sentiment: 'Positive',
        Priority: 'High',
      },
      customerName: 'John Customer',
      customerEmail: 'john@example.com',
      customerPhone: incomingTask.ani,
    };
    
    // Set customer profile when task is accepted
    setCustomerProfile({
      id: 'cust-001',
      name: 'John Customer',
      email: 'john@example.com',
      phone: incomingTask.ani,
      company: 'Acme Corporation',
      address: '123 Main St, San Francisco, CA 94105',
      isVerified: true,
      tags: [
        { label: 'Premium', color: 'bg-amber-500/10 text-amber-600' },
        { label: 'Insurance', color: 'bg-blue-500/10 text-blue-600' },
        { label: 'Home Policy', color: 'bg-green-500/10 text-green-600' },
      ],
      interactionHistory: mockInteractionHistory,
      cadVariables: newTask.cadVariables,
    });
    
    setActiveTasks(prev => [...prev, newTask]);
    setSelectedTaskId(taskId);
    setIncomingTask(null);
    setAgentStateInfo(prev => prev ? { ...prev, state: 'Engaged' } : null);
    console.log('[WebexCC] Task accepted:', taskId);
  }, [incomingTask, runningInDemoMode]);

  // Decline incoming task
  const declineTask = useCallback(async (taskId: string) => {
    if (ronaTimerRef.current) {
      clearTimeout(ronaTimerRef.current);
    }
    
    try {
      if (!runningInDemoMode && desktopRef.current) {
        console.log('[WebexCC] Declining task via SDK:', taskId);
        // SDK requires mediaResourceId and isConsult for decline
        const task = activeTasks.find(t => t.taskId === taskId);
        await desktopRef.current.agentContact.decline({ 
          interactionId: taskId,
          data: {
            mediaResourceId: task?.mediaResourceId || '',
          },
          isConsult: task?.isConsult || false,
        });
      }
    } catch (error) {
      console.error('[WebexCC] Decline task failed:', error);
    }
    
    setIncomingTask(null);
    console.log('[WebexCC] Task declined:', taskId);
  }, [runningInDemoMode, activeTasks]);

  // Hold task
  const holdTask = useCallback(async (taskId: string) => {
    try {
      if (!runningInDemoMode && desktopRef.current) {
        console.log('[WebexCC] Holding task via SDK:', taskId);
        const task = activeTasks.find(t => t.taskId === taskId);
        await desktopRef.current.agentContact.hold({ 
          interactionId: taskId,
          data: {
            mediaResourceId: task?.mediaResourceId || '',
          },
          isPostCallConsult: task?.isPostCallConsult || false,
        });
      }
    } catch (error) {
      console.error('[WebexCC] Hold task failed:', error);
    }
    
    setActiveTasks(prev => prev.map(t => 
      t.taskId === taskId ? { ...t, isHeld: true, state: 'held' } : t
    ));
    console.log('[WebexCC] Task held:', taskId);
  }, [runningInDemoMode, activeTasks]);

  // Resume task
  const resumeTask = useCallback(async (taskId: string) => {
    try {
      if (!runningInDemoMode && desktopRef.current) {
        console.log('[WebexCC] Resuming task via SDK:', taskId);
        const task = activeTasks.find(t => t.taskId === taskId);
        // SDK uses unHold (capital H) not unhold
        await desktopRef.current.agentContact.unHold({ 
          interactionId: taskId,
          data: {
            mediaResourceId: task?.mediaResourceId || '',
          },
          isPostCallConsult: task?.isPostCallConsult || false,
        });
      }
    } catch (error) {
      console.error('[WebexCC] Resume task failed:', error);
    }
    
    setActiveTasks(prev => prev.map(t => 
      t.taskId === taskId ? { ...t, isHeld: false, state: 'connected' } : t
    ));
    console.log('[WebexCC] Task resumed:', taskId);
  }, [runningInDemoMode, activeTasks]);

  // Mute task
  const muteTask = useCallback(async (taskId: string) => {
    try {
      if (!runningInDemoMode && desktopRef.current) {
        console.log('[WebexCC] Muting task via SDK:', taskId);
        await desktopRef.current.agentContact.mute({ interactionId: taskId });
      }
    } catch (error) {
      console.error('[WebexCC] Mute task failed:', error);
    }
    
    setActiveTasks(prev => prev.map(t => 
      t.taskId === taskId ? { ...t, isMuted: true } : t
    ));
    console.log('[WebexCC] Task muted:', taskId);
  }, [runningInDemoMode]);

  // Unmute task
  const unmuteTask = useCallback(async (taskId: string) => {
    try {
      if (!runningInDemoMode && desktopRef.current) {
        console.log('[WebexCC] Unmuting task via SDK:', taskId);
        await desktopRef.current.agentContact.unmute({ interactionId: taskId });
      }
    } catch (error) {
      console.error('[WebexCC] Unmute task failed:', error);
    }
    
    setActiveTasks(prev => prev.map(t => 
      t.taskId === taskId ? { ...t, isMuted: false } : t
    ));
    console.log('[WebexCC] Task unmuted:', taskId);
  }, [runningInDemoMode]);

  // Send DTMF tone via SDK (Desktop.agentContact.sendDtmf)
  const sendDtmf = useCallback(async (taskId: string, digit: string) => {
    addSDKLog('debug', 'sendDtmf', { taskId, digit }, 'DTMF');
    try {
      if (!runningInDemoMode && desktopRef.current?.agentContact?.sendDtmf) {
        desktopRef.current.agentContact.sendDtmf(digit);
      }
    } catch (error) {
      addSDKLog('error', 'sendDtmf failed', { error: error instanceof Error ? error.message : String(error), digit }, 'DTMF');
      console.error('[WebexCC] sendDtmf failed:', error);
    }
  }, [runningInDemoMode, addSDKLog]);

  // ---- Paginated aux-code search (idle + wrap-up) ----
  const searchIdleCodes = useCallback(async (query: string) => {
    const q = query?.trim() || '';
    // Empty query: don't hit paginated API — refresh from latestData if available,
    // otherwise leave existing state intact.
    if (!q) {
      const latest = desktopRef.current?.agentStateInfo?.latestData?.idleCodes;
      if (Array.isArray(latest) && latest.length > 0) {
        setIdleCodes(latest.map((c: any) => ({ id: c.id, name: c.name })));
        setIdleCodesHasMore(false);
      }
      return;
    }
    try {
      const page = await fetchAuxCodes({ workType: 'IDLE_CODE', page: 0, pageSize: 100, search: q });
      if (page.codes.length > 0) {
        setIdleCodes(page.codes);
        setIdleCodesHasMore(page.hasMore);
      }
      addSDKLog('debug', 'searchIdleCodes', { query: q, count: page.codes.length }, 'AuxCodes');
    } catch (e) {
      addSDKLog('warn', 'searchIdleCodes failed', { error: e instanceof Error ? e.message : String(e) }, 'AuxCodes');
    }
  }, [addSDKLog]);

  const searchWrapUpCodes = useCallback(async (query: string) => {
    const q = query?.trim() || '';
    if (!q) {
      const latest = desktopRef.current?.agentStateInfo?.latestData?.wrapupCodes;
      if (Array.isArray(latest) && latest.length > 0) {
        setWrapUpCodes(latest.map((c: any) => ({ id: c.id, name: c.name })));
        setWrapUpCodesHasMore(false);
      }
      return;
    }
    try {
      const page = await fetchAuxCodes({ workType: 'WRAP_UP_CODE', page: 0, pageSize: 100, search: q });
      if (page.codes.length > 0) {
        setWrapUpCodes(page.codes);
        setWrapUpCodesHasMore(page.hasMore);
      }
      addSDKLog('debug', 'searchWrapUpCodes', { query: q, count: page.codes.length }, 'AuxCodes');
    } catch (e) {
      addSDKLog('warn', 'searchWrapUpCodes failed', { error: e instanceof Error ? e.message : String(e) }, 'AuxCodes');
    }
  }, [addSDKLog]);


  // ---- V2 agentContact helper: prefer *V2 methods when available ----
  const callAgentContact = useCallback((baseMethod: string, payload: any) => {
    const ac: any = desktopRef.current?.agentContact;
    if (!ac) throw new Error('agentContact SDK not available');
    const v2Name = `${baseMethod}V2`;
    if (typeof ac[v2Name] === 'function') {
      return ac[v2Name](payload);
    }
    if (typeof ac[baseMethod] === 'function') {
      addSDKLog('debug', `Using V1 fallback for ${baseMethod}`, null, 'V2');
      return ac[baseMethod](payload);
    }
    throw new Error(`agentContact.${baseMethod} not available`);
  }, [addSDKLog]);

  // ---- Drop a specific participant from a conference (V2 only) ----
  const dropConferenceParticipant = useCallback(async (taskId: string, participantId: string) => {
    if (runningInDemoMode || !desktopRef.current?.agentContact?.dropConferenceParticipant) {
      addSDKLog('warn', 'dropConferenceParticipant not available', { runningInDemoMode }, 'Conference');
      return;
    }
    try {
      await desktopRef.current.agentContact.dropConferenceParticipant({
        interactionId: taskId,
        data: { participantId },
      });
      addSDKLog('info', 'dropConferenceParticipant success', { taskId, participantId }, 'Conference');
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      addSDKLog('error', 'dropConferenceParticipant failed', { error: msg }, 'Conference');
      toast({ title: 'Could not remove participant', description: msg, variant: 'destructive' });
    }
  }, [runningInDemoMode, addSDKLog]);

  // ---- Campaign accept / skip / remove ----
  const acceptCampaignContact = useCallback(async (interactionId: string) => {
    const c = campaignContacts.find((x) => x.interactionId === interactionId);
    try {
      if (!runningInDemoMode && desktopRef.current?.dialer?.previewCampaignAccept) {
        await desktopRef.current.dialer.previewCampaignAccept({
          data: { interactionId, campaignId: c?.campaignId },
        });
      }
      setCampaignContacts((prev) => prev.filter((p) => p.interactionId !== interactionId));
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      addSDKLog('error', 'acceptCampaignContact failed', { error: msg }, 'Campaign');
      toast({ title: 'Accept failed', description: msg, variant: 'destructive' });
    }
  }, [campaignContacts, runningInDemoMode, addSDKLog]);

  const skipCampaignContact = useCallback(async (interactionId: string) => {
    const c = campaignContacts.find((x) => x.interactionId === interactionId);
    try {
      if (!runningInDemoMode && desktopRef.current?.dialer?.previewCampaignSkip) {
        await desktopRef.current.dialer.previewCampaignSkip({
          data: { interactionId, campaignId: c?.campaignId },
        });
      }
      setCampaignContacts((prev) => prev.filter((p) => p.interactionId !== interactionId));
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      addSDKLog('error', 'skipCampaignContact failed', { error: msg }, 'Campaign');
      toast({ title: 'Skip failed', description: msg, variant: 'destructive' });
    }
  }, [campaignContacts, runningInDemoMode, addSDKLog]);

  const removeCampaignContact = useCallback(async (interactionId: string) => {
    const c = campaignContacts.find((x) => x.interactionId === interactionId);
    try {
      if (!runningInDemoMode && desktopRef.current?.dialer?.removePreviewContact) {
        await desktopRef.current.dialer.removePreviewContact({
          data: { interactionId, campaignId: c?.campaignId },
        });
      }
      setCampaignContacts((prev) => prev.filter((p) => p.interactionId !== interactionId));
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      addSDKLog('error', 'removeCampaignContact failed', { error: msg }, 'Campaign');
    }
  }, [campaignContacts, runningInDemoMode, addSDKLog]);

  // End task
  const endTask = useCallback(async (taskId: string) => {
    try {
      if (!runningInDemoMode && desktopRef.current) {
        console.log('[WebexCC] Ending task via SDK:', taskId);
        await callAgentContact('end', { interactionId: taskId });
        // State will be updated via event listener
        return;
      }
    } catch (error) {
      console.error('[WebexCC] End task failed:', error);
    }
    
    // Demo mode or fallback
    const task = activeTasks.find(t => t.taskId === taskId);
    if (task?.wrapUpRequired) {
      setActiveTasks(prev => prev.map(t => 
        t.taskId === taskId ? { ...t, state: 'wrapup' } : t
      ));
      setAgentStateInfo(prev => prev ? { ...prev, state: 'WrapUp' } : null);
    } else {
      setActiveTasks(prev => prev.filter(t => t.taskId !== taskId));
      if (selectedTaskId === taskId) {
        setSelectedTaskId(activeTasks.find(t => t.taskId !== taskId)?.taskId || null);
      }
      setAgentStateInfo(prev => prev ? { ...prev, state: 'Available' } : null);
    }
    setConsultState({ isConsulting: false });
    console.log('[WebexCC] Task ended:', taskId);
  }, [activeTasks, selectedTaskId, runningInDemoMode]);

  // Wrap up task
  const wrapUpTask = useCallback(async (taskId: string, wrapUpCodeId: string) => {
    try {
      if (!runningInDemoMode && desktopRef.current) {
        console.log('[WebexCC] Wrapping up task via SDK:', taskId, wrapUpCodeId);
        const codeName = wrapUpCodes.find((c) => c.id === wrapUpCodeId)?.name || 'Wrap Up';
        await callAgentContact('wrapup', {
          interactionId: taskId,
          data: { wrapUpReason: codeName, auxCodeId: wrapUpCodeId },
        });
        // State will be updated via event listener
        return;
      }
    } catch (error) {
      console.error('[WebexCC] Wrap up task failed:', error);
    }
    
    // Demo mode or fallback
    setActiveTasks(prev => prev.filter(t => t.taskId !== taskId));
    if (selectedTaskId === taskId) {
      setSelectedTaskId(activeTasks.find(t => t.taskId !== taskId)?.taskId || null);
    }
    if (activeTasks.length <= 1) {
      setAgentStateInfo(prev => prev ? { ...prev, state: 'Available' } : null);
    }
    setCustomerProfile(null);
    console.log('[WebexCC] Task wrapped up:', taskId, 'with code:', wrapUpCodeId);
  }, [activeTasks, selectedTaskId, runningInDemoMode]);

  // Transfer to queue - use vteamTransfer for queue transfers per Cisco sample
  const transferToQueue = useCallback(async (taskId: string, queueId: string) => {
    try {
      if (!runningInDemoMode && desktopRef.current) {
        console.log('[WebexCC] Transferring to queue via vteamTransfer:', taskId, queueId);
        addSDKLog('info', 'Initiating vteamTransfer to queue', { taskId, queueId }, 'Transfer');
        
        // Use vteamTransfer for queue transfers per Cisco sample
        await desktopRef.current.agentContact.vteamTransfer({
          interactionId: taskId,
          data: {
            vteamId: queueId,
            vteamType: 'inboundqueue',
          },
        });
        
        addSDKLog('info', 'vteamTransfer successful', { taskId, queueId }, 'Transfer');
        return;
      }
    } catch (error) {
      console.error('[WebexCC] Transfer to queue failed:', error);
      addSDKLog('error', 'vteamTransfer failed', { error: error instanceof Error ? error.message : String(error) }, 'Transfer');
    }
    
    // Demo mode or fallback
    setActiveTasks(prev => prev.filter(t => t.taskId !== taskId));
    if (selectedTaskId === taskId) {
      setSelectedTaskId(null);
    }
    if (activeTasks.length <= 1) {
      setAgentStateInfo(prev => prev ? { ...prev, state: 'Available' } : null);
    }
    setConsultState({ isConsulting: false });
    setCustomerProfile(null);
    console.log('[WebexCC] Transferred to queue:', queueId);
  }, [activeTasks.length, selectedTaskId, runningInDemoMode, addSDKLog]);

  // Transfer to agent (blind)
  const transferToAgent = useCallback(async (taskId: string, agentId: string) => {
    if (!runningInDemoMode && desktopRef.current) {
      try {
        addSDKLog('info', 'Initiating blindTransfer to agent', { taskId, agentId }, 'Transfer');
        await desktopRef.current.agentContact.blindTransfer({
          interactionId: taskId,
          data: { agentId, destinationType: 'agent' },
        });
        addSDKLog('info', 'blindTransfer to agent successful', { taskId, agentId }, 'Transfer');
      } catch (error) {
        const msg = error instanceof Error ? error.message : String(error);
        addSDKLog('error', 'blindTransfer to agent failed', { error: msg }, 'Transfer');
        toast({ title: 'Transfer failed', description: msg, variant: 'destructive' });
      }
      return;
    }

    // Demo mode
    setActiveTasks(prev => prev.filter(t => t.taskId !== taskId));
    if (selectedTaskId === taskId) setSelectedTaskId(null);
    if (activeTasks.length <= 1) {
      setAgentStateInfo(prev => prev ? { ...prev, state: 'Available' } : null);
    }
    setConsultState({ isConsulting: false });
    setCustomerProfile(null);
  }, [activeTasks.length, selectedTaskId, runningInDemoMode, addSDKLog]);

  // Transfer to DN (blind)
  const transferToDN = useCallback(async (taskId: string, dialNumber: string) => {
    if (!runningInDemoMode && desktopRef.current) {
      try {
        addSDKLog('info', 'Initiating blindTransfer to DN', { taskId, dialNumber }, 'Transfer');
        await desktopRef.current.agentContact.blindTransfer({
          interactionId: taskId,
          data: { to: dialNumber, destinationType: 'dialNumber' },
        });
        addSDKLog('info', 'blindTransfer to DN successful', { taskId, dialNumber }, 'Transfer');
      } catch (error) {
        const msg = error instanceof Error ? error.message : String(error);
        addSDKLog('error', 'blindTransfer to DN failed', { error: msg }, 'Transfer');
        toast({ title: 'Transfer failed', description: msg, variant: 'destructive' });
      }
      return;
    }

    // Demo mode
    setActiveTasks(prev => prev.filter(t => t.taskId !== taskId));
    if (selectedTaskId === taskId) setSelectedTaskId(null);
    if (activeTasks.length <= 1) {
      setAgentStateInfo(prev => prev ? { ...prev, state: 'Available' } : null);
    }
    setConsultState({ isConsulting: false });
    setCustomerProfile(null);
  }, [activeTasks.length, selectedTaskId, runningInDemoMode, addSDKLog]);

  // Blind transfer to Entry Point (uses vteamTransfer with inboundentrypoint)
  const transferToEntryPoint = useCallback(async (taskId: string, entryPointId: string) => {
    if (!runningInDemoMode && desktopRef.current) {
      try {
        addSDKLog('info', 'Initiating vteamTransfer to entryPoint', { taskId, entryPointId }, 'Transfer');
        await desktopRef.current.agentContact.vteamTransfer({
          interactionId: taskId,
          data: {
            vteamId: entryPointId,
            vteamType: 'inboundentrypoint',
            mediaType: 'telephony',
          },
        });
        addSDKLog('info', 'vteamTransfer to entryPoint successful', { taskId, entryPointId }, 'Transfer');
      } catch (error) {
        const msg = error instanceof Error ? error.message : String(error);
        addSDKLog('error', 'vteamTransfer to entryPoint failed', { error: msg }, 'Transfer');
        toast({ title: 'Transfer failed', description: msg, variant: 'destructive' });
      }
      return;
    }
    // Demo mode
    setActiveTasks(prev => prev.filter(t => t.taskId !== taskId));
    if (selectedTaskId === taskId) setSelectedTaskId(null);
    setConsultState({ isConsulting: false });
    setCustomerProfile(null);
  }, [selectedTaskId, runningInDemoMode, addSDKLog]);

  // Consult agent (warm transfer start)
  const consultAgent = useCallback(async (taskId: string, agentId: string) => {
    const agent = teamAgents.find(a => a.agentId === agentId) || buddyAgents.find(a => a.agentId === agentId);
    if (!runningInDemoMode && desktopRef.current) {
      try {
        addSDKLog('info', 'Initiating consult to agent', { taskId, agentId }, 'Consult');
        await desktopRef.current.agentContact.consult({
          interactionId: taskId,
          data: { agentId, destinationType: 'agent' },
        });
        addSDKLog('info', 'consult to agent request accepted', { taskId, agentId }, 'Consult');
        setActiveTasks(prev => prev.map(t =>
          t.taskId === taskId ? { ...t, state: 'consulting', isHeld: true } : t
        ));
        setConsultState({
          isConsulting: true,
          consultTarget: { type: 'agent', id: agentId, name: agent?.name || agentId, destinationType: 'agent' },
          consultStartTime: Date.now(),
          consultConnected: false,
        });
      } catch (error) {
        const msg = error instanceof Error ? error.message : String(error);
        addSDKLog('error', 'consult to agent failed', { error: msg }, 'Consult');
        toast({ title: 'Consult failed', description: msg, variant: 'destructive' });
      }
      return;
    }

    // Demo mode
    setActiveTasks(prev => prev.map(t =>
      t.taskId === taskId ? { ...t, state: 'consulting', isHeld: true } : t
    ));
    setConsultState({
      isConsulting: true,
      consultTarget: { type: 'agent', id: agentId, name: agent?.name || agentId, destinationType: 'agent' },
      consultStartTime: Date.now(),
      consultConnected: true,
    });
  }, [teamAgents, buddyAgents, runningInDemoMode, addSDKLog]);

  // Consult queue (warm transfer start)
  const consultQueue = useCallback(async (taskId: string, queueId: string) => {
    const queue = queues.find(q => q.id === queueId);
    if (!runningInDemoMode && desktopRef.current) {
      try {
        addSDKLog('info', 'Initiating consult to queue', { taskId, queueId }, 'Consult');
        await desktopRef.current.agentContact.consult({
          interactionId: taskId,
          data: { to: queueId, destinationType: 'queue' },
        });
        addSDKLog('info', 'consult to queue request accepted', { taskId, queueId }, 'Consult');
        setActiveTasks(prev => prev.map(t =>
          t.taskId === taskId ? { ...t, state: 'consulting', isHeld: true } : t
        ));
        setConsultState({
          isConsulting: true,
          consultTarget: { type: 'queue', id: queueId, name: queue?.name || queueId, destinationType: 'queue' },
          consultStartTime: Date.now(),
          consultConnected: false,
        });
      } catch (error) {
        const msg = error instanceof Error ? error.message : String(error);
        addSDKLog('error', 'consult to queue failed', { error: msg }, 'Consult');
        toast({ title: 'Consult failed', description: msg, variant: 'destructive' });
      }
      return;
    }

    // Demo mode
    setActiveTasks(prev => prev.map(t =>
      t.taskId === taskId ? { ...t, state: 'consulting', isHeld: true } : t
    ));
    setConsultState({
      isConsulting: true,
      consultTarget: { type: 'queue', id: queueId, name: queue?.name || queueId, destinationType: 'queue' },
      consultStartTime: Date.now(),
      consultConnected: true,
    });
  }, [queues, runningInDemoMode, addSDKLog]);

  // Consult DN (warm transfer start)
  const consultDN = useCallback(async (taskId: string, dialNumber: string) => {
    if (!runningInDemoMode && desktopRef.current) {
      try {
        addSDKLog('info', 'Initiating consult to DN', { taskId, dialNumber }, 'Consult');
        await desktopRef.current.agentContact.consult({
          interactionId: taskId,
          data: { to: dialNumber, destinationType: 'dialNumber' },
        });
        addSDKLog('info', 'consult to DN request accepted', { taskId, dialNumber }, 'Consult');
        setActiveTasks(prev => prev.map(t =>
          t.taskId === taskId ? { ...t, state: 'consulting', isHeld: true } : t
        ));
        setConsultState({
          isConsulting: true,
          consultTarget: { type: 'dn', id: dialNumber, name: dialNumber, destinationType: 'dialNumber' },
          consultStartTime: Date.now(),
          consultConnected: false,
        });
      } catch (error) {
        const msg = error instanceof Error ? error.message : String(error);
        addSDKLog('error', 'consult to DN failed', { error: msg }, 'Consult');
        toast({ title: 'Consult failed', description: msg, variant: 'destructive' });
      }
      return;
    }

    // Demo mode
    setActiveTasks(prev => prev.map(t =>
      t.taskId === taskId ? { ...t, state: 'consulting', isHeld: true } : t
    ));
    setConsultState({
      isConsulting: true,
      consultTarget: { type: 'dn', id: dialNumber, name: dialNumber, destinationType: 'dialNumber' },
      consultStartTime: Date.now(),
      consultConnected: true,
    });
  }, [runningInDemoMode, addSDKLog]);

  // Consult to Entry Point (warm transfer start)
  const consultEntryPoint = useCallback(async (taskId: string, entryPointId: string) => {
    const ep = entryPoints.find(e => e.id === entryPointId);
    if (!runningInDemoMode && desktopRef.current) {
      try {
        addSDKLog('info', 'Initiating consult to entryPoint', { taskId, entryPointId }, 'Consult');
        await desktopRef.current.agentContact.consult({
          interactionId: taskId,
          data: { to: entryPointId, destinationType: 'entryPoint' },
        });
        addSDKLog('info', 'consult to entryPoint request accepted', { taskId, entryPointId }, 'Consult');
        setActiveTasks(prev => prev.map(t =>
          t.taskId === taskId ? { ...t, state: 'consulting', isHeld: true } : t
        ));
        setConsultState({
          isConsulting: true,
          consultTarget: { type: 'entryPoint', id: entryPointId, name: ep?.name || entryPointId, destinationType: 'entryPoint' },
          consultStartTime: Date.now(),
          consultConnected: false,
        });
      } catch (error) {
        const msg = error instanceof Error ? error.message : String(error);
        addSDKLog('error', 'consult to entryPoint failed', { error: msg }, 'Consult');
        toast({ title: 'Consult failed', description: msg, variant: 'destructive' });
      }
      return;
    }
    // Demo mode
    setActiveTasks(prev => prev.map(t =>
      t.taskId === taskId ? { ...t, state: 'consulting', isHeld: true } : t
    ));
    setConsultState({
      isConsulting: true,
      consultTarget: { type: 'entryPoint', id: entryPointId, name: ep?.name || entryPointId, destinationType: 'entryPoint' },
      consultStartTime: Date.now(),
      consultConnected: true,
    });
  }, [entryPoints, runningInDemoMode, addSDKLog]);



  // Complete transfer (after consult)
  const completeTransfer = useCallback(async (taskId: string) => {
    if (!runningInDemoMode && desktopRef.current) {
      try {
        addSDKLog('info', 'Initiating consultTransfer', { taskId }, 'Transfer');
        await desktopRef.current.agentContact.consultTransfer({ interactionId: taskId });
        addSDKLog('info', 'consultTransfer successful', { taskId }, 'Transfer');
      } catch (error) {
        const msg = error instanceof Error ? error.message : String(error);
        addSDKLog('error', 'consultTransfer failed', { error: msg }, 'Transfer');
        toast({ title: 'Complete transfer failed', description: msg, variant: 'destructive' });
      }
      return;
    }

    // Demo mode
    setActiveTasks(prev => prev.filter(t => t.taskId !== taskId));
    if (selectedTaskId === taskId) setSelectedTaskId(null);
    if (activeTasks.length <= 1) {
      setAgentStateInfo(prev => prev ? { ...prev, state: 'Available' } : null);
    }
    setConsultState({ isConsulting: false });
    setCustomerProfile(null);
  }, [activeTasks.length, selectedTaskId, runningInDemoMode, addSDKLog]);

  // Cancel consult
  const cancelConsult = useCallback(async (taskId: string) => {
    const task = activeTasks.find(t => t.taskId === taskId);
    if (!runningInDemoMode && desktopRef.current) {
      try {
        addSDKLog('info', 'Initiating consultEnd', { taskId, mediaResourceId: task?.mediaResourceId }, 'Consult');
        await desktopRef.current.agentContact.consultEnd({
          interactionId: taskId,
          isConsult: true,
          taskId,
          mediaResourceId: task?.mediaResourceId,
        });
        addSDKLog('info', 'consultEnd successful', { taskId }, 'Consult');
      } catch (error) {
        const msg = error instanceof Error ? error.message : String(error);
        addSDKLog('error', 'consultEnd failed', { error: msg }, 'Consult');
        toast({ title: 'Cancel consult failed', description: msg, variant: 'destructive' });
      }
      return;
    }

    // Demo mode
    setActiveTasks(prev => prev.map(t =>
      t.taskId === taskId ? { ...t, state: 'connected', isHeld: false } : t
    ));
    setConsultState({ isConsulting: false });
  }, [activeTasks, runningInDemoMode, addSDKLog]);

  // Conference call (merge consulted party)
  const conferenceCall = useCallback(async (taskId: string) => {
    if (!runningInDemoMode && desktopRef.current) {
      try {
        const consulted = consultState.consultTarget;
        if (!consulted) {
          const msg = 'No consulted party to conference with';
          addSDKLog('error', 'conference blocked', { taskId, reason: msg }, 'Conference');
          toast({ title: 'Conference failed', description: msg, variant: 'destructive' });
          return;
        }
        const destinationType = consulted.destinationType || (consulted.type === 'dn' ? 'dialNumber' : consulted.type);
        const data: Record<string, unknown> = { destinationType };
        if (destinationType === 'agent') {
          data.agentId = consulted.id;
        } else {
          data.to = consulted.id;
        }
        addSDKLog('info', 'Initiating conference', { taskId, data }, 'Conference');
        await desktopRef.current.agentContact.conference({ interactionId: taskId, data });
        addSDKLog('info', 'conference successful', { taskId }, 'Conference');
      } catch (error) {
        const msg = error instanceof Error ? error.message : String(error);
        addSDKLog('error', 'conference failed', { error: msg }, 'Conference');
        toast({ title: 'Conference failed', description: msg, variant: 'destructive' });
      }
      return;
    }

    // Demo mode
    setActiveTasks(prev => prev.map(t =>
      t.taskId === taskId ? { ...t, state: 'conferencing', isHeld: false } : t
    ));
  }, [consultState, runningInDemoMode, addSDKLog]);

  // Exit conference - agent leaves conference, customer stays with consulted party
  const exitConference = useCallback(async (taskId: string) => {
    const task = activeTasks.find(t => t.taskId === taskId);
    if (!runningInDemoMode && desktopRef.current) {
      try {
        const ac: any = desktopRef.current.agentContact;
        // V2 SDK exposes a first-class exitConference(interactionId); prefer it.
        if (typeof ac.exitConference === 'function') {
          addSDKLog('info', 'Initiating exitConference (V2)', { taskId }, 'Conference');
          await ac.exitConference({ interactionId: taskId });
          addSDKLog('info', 'exitConference successful', { taskId }, 'Conference');
        } else {
          const method = ac.consultConferenceEnd || ac.conferenceEnd || ac.consultEnd;
          if (!method) throw new Error('SDK does not expose an exitConference method');
          addSDKLog('info', 'Initiating consultConferenceEnd (fallback)', { taskId, mediaResourceId: task?.mediaResourceId }, 'Conference');
          await method.call(ac, {
            interactionId: taskId,
            isConsult: true,
            taskId,
            mediaResourceId: task?.mediaResourceId,
          });
          addSDKLog('info', 'consultConferenceEnd successful', { taskId }, 'Conference');
        }
      } catch (error) {
        const msg = error instanceof Error ? error.message : String(error);
        addSDKLog('error', 'consultConferenceEnd failed', { error: msg }, 'Conference');
        toast({ title: 'Exit conference failed', description: msg, variant: 'destructive' });
      }
      return;
    }
    // Demo mode
    setActiveTasks(prev => prev.filter(t => t.taskId !== taskId));
    if (selectedTaskId === taskId) setSelectedTaskId(null);
    setConsultState({ isConsulting: false });
  }, [activeTasks, selectedTaskId, runningInDemoMode, addSDKLog]);





  // Outdial - Use Desktop.dialer.startOutdial per Cisco sample
  const OUTDIAL_ENTRY_POINT_ID = 'c97bf9ea-ca01-4e43-ad45-89c20055179b';
  const OUTDIAL_ANI_ID = '84f80945-2f92-4086-aead-6a4afbb79dd9';
  
  const outdial = useCallback(async (dialNumber: string, entryPointId: string) => {
    // Normalize phone number: trim spaces, remove internal spaces
    const normalizedNumber = dialNumber.trim().replace(/\s+/g, '');
    
    // Use provided entryPointId or fallback
    const effectiveEntryPointId = entryPointId || OUTDIAL_ENTRY_POINT_ID;
    
    // Use first ANI from list or fallback
    const effectiveAniId = outdialAniList[0]?.id || OUTDIAL_ANI_ID;
    
    addSDKLog('info', 'Initiating outdial via Desktop.dialer.startOutdial', { 
      rawDialNumber: dialNumber,
      normalizedNumber,
      entryPointId: effectiveEntryPointId, 
      origin: effectiveAniId,
      demoMode: runningInDemoMode 
    }, 'Outdial');
    
    try {
      if (!runningInDemoMode && desktopRef.current) {
        console.log('[WebexCC] Outdialing via SDK:', normalizedNumber, effectiveEntryPointId, effectiveAniId);
        
        // Use Desktop.dialer.startOutdial() with correct payload structure per Cisco sample
        // Key differences from previous implementation:
        // - Uses Desktop.dialer.startOutdial() not agentContact.outdial()
        // - Payload wrapped in { data: {...} }
        // - Uses 'origin' field for ANI (not attributes.outdialAniId)
        // - Direction and outboundType are uppercase: 'OUTBOUND', 'OUTDIAL'
        const result = await desktopRef.current.dialer.startOutdial({
          data: {
            entryPointId: effectiveEntryPointId,
            destination: normalizedNumber,
            direction: 'OUTBOUND',
            origin: effectiveAniId,
            attributes: {},
            mediaType: 'telephony',
            outboundType: 'OUTDIAL',
          },
        });
        
        addSDKLog('info', 'Outdial request sent successfully via dialer.startOutdial', { 
          destination: normalizedNumber,
          entryPointId: effectiveEntryPointId,
          result,
        }, 'Outdial');
        // Contact will be created via event listener (eAgentOfferContact / eAgentContactAssigned)
        return;
      }
    } catch (error) {
      console.error('[WebexCC] Outdial failed:', error);
      addSDKLog('error', 'Outdial SDK call failed', { 
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
        dialNumber: normalizedNumber,
        entryPointId,
        outdialAniId: OUTDIAL_ANI_ID,
      }, 'Outdial');
      throw error; // Re-throw so UI can show error
    }
    
    // Demo mode fallback - create mock outbound task
    addSDKLog('info', 'Demo mode - creating mock outbound task', { dialNumber: normalizedNumber }, 'Outdial');
    const entryPoint = entryPoints.find(ep => ep.id === entryPointId);
    const newTask: Task = {
      taskId: `outbound-${Date.now()}`,
      mediaType: 'voice',
      mediaChannel: 'telephony',
      state: 'connected',
      direction: 'outbound',
      queueName: 'Outbound',
      ani: agentProfile?.dialNumber || '',
      dnis: normalizedNumber,
      startTime: Date.now(),
      isRecording: false,
      isMuted: false,
      isHeld: false,
      wrapUpRequired: true,
      cadVariables: {},
    };
    
    // Add to recent calls
    setRecentOutboundCalls(prev => [
      {
        number: normalizedNumber,
        timestamp: Date.now(),
        duration: 0,
        entryPointId,
        entryPointName: entryPoint?.name || 'Unknown',
      },
      ...prev.slice(0, 9),
    ]);
    
    setActiveTasks(prev => [...prev, newTask]);
    setSelectedTaskId(newTask.taskId);
    setAgentStateInfo(prev => prev ? { ...prev, state: 'Engaged' } : null);
    console.log('[WebexCC] Outdial to:', normalizedNumber);
  }, [agentProfile?.dialNumber, entryPoints, runningInDemoMode, addSDKLog]);

  // Recording controls - use pauseRecording/resumeRecording per Cisco sample
  const pauseRecording = useCallback(async (taskId: string) => {
    try {
      if (!runningInDemoMode && desktopRef.current) {
        console.log('[WebexCC] Pausing recording via SDK:', taskId);
        addSDKLog('info', 'Pausing recording', { taskId }, 'Recording');
        await callAgentContact('pauseRecording', { interactionId: taskId });
        addSDKLog('info', 'Recording paused', { taskId }, 'Recording');
      }
    } catch (error) {
      console.error('[WebexCC] Pause recording failed:', error);
      addSDKLog('error', 'Pause recording failed', { error: error instanceof Error ? error.message : String(error) }, 'Recording');
    }
    
    setActiveTasks(prev => prev.map(t => 
      t.taskId === taskId ? { ...t, isRecording: false } : t
    ));
    console.log('[WebexCC] Recording paused:', taskId);
  }, [runningInDemoMode, addSDKLog]);

  const resumeRecording = useCallback(async (taskId: string) => {
    try {
      if (!runningInDemoMode && desktopRef.current) {
        console.log('[WebexCC] Resuming recording via SDK:', taskId);
        addSDKLog('info', 'Resuming recording', { taskId }, 'Recording');
        await callAgentContact('resumeRecording', { interactionId: taskId, data: { autoResumed: false } });
        addSDKLog('info', 'Recording resumed', { taskId }, 'Recording');
      }
    } catch (error) {
      console.error('[WebexCC] Resume recording failed:', error);
      addSDKLog('error', 'Resume recording failed', { error: error instanceof Error ? error.message : String(error) }, 'Recording');
    }
    
    setActiveTasks(prev => prev.map(t => 
      t.taskId === taskId ? { ...t, isRecording: true } : t
    ));
    console.log('[WebexCC] Recording resumed:', taskId);
  }, [runningInDemoMode, addSDKLog]);

  // Legacy recording controls (wrapper functions)
  const startRecording = useCallback(async (taskId: string) => {
    await resumeRecording(taskId);
  }, [resumeRecording]);

  const stopRecording = useCallback(async (taskId: string) => {
    await pauseRecording(taskId);
  }, [pauseRecording]);

  // Send chat message
  const sendChatMessage = useCallback(async (taskId: string, message: string) => {
    try {
      if (!runningInDemoMode && desktopRef.current) {
        console.log('[WebexCC] Sending chat message via SDK:', taskId);
        await desktopRef.current.agentContact.sendChatMessage({
          interactionId: taskId,
          message: message,
        });
      }
    } catch (error) {
      console.error('[WebexCC] Send chat message failed:', error);
    }
    
    console.log('[WebexCC] Chat message sent:', taskId, message);
  }, [runningInDemoMode]);

  // Select task
  const selectTask = useCallback((taskId: string) => {
    setSelectedTaskId(taskId);
  }, []);

  // Update CAD variable - use Desktop.dialer.updateCadVariables per Cisco sample
  const updateCADVariable = useCallback(async (taskId: string, key: string, value: string) => {
    try {
      if (!runningInDemoMode && desktopRef.current) {
        console.log('[WebexCC] Updating CAD variable via SDK:', taskId, key, value);
        addSDKLog('info', 'Updating CAD variable', { taskId, key, value }, 'CAD');
        
        // Use Desktop.dialer.updateCadVariables with data.attributes structure per Cisco sample
        await desktopRef.current.dialer.updateCadVariables({
          interactionId: taskId,
          data: {
            attributes: { [key]: value },
          },
        });
        
        addSDKLog('info', 'CAD variable updated', { taskId, key, value }, 'CAD');
      }
    } catch (error) {
      console.error('[WebexCC] Update CAD variable failed:', error);
      addSDKLog('error', 'Update CAD variable failed', { error: error instanceof Error ? error.message : String(error) }, 'CAD');
    }
    
    setActiveTasks(prev => prev.map(t => 
      t.taskId === taskId 
        ? { ...t, cadVariables: { ...t.cadVariables, [key]: value } }
        : t
    ));
    // Also update customer profile CAD vars
    setCustomerProfile(prev => prev 
      ? { ...prev, cadVariables: { ...prev.cadVariables, [key]: value } }
      : null
    );
    console.log('[WebexCC] CAD updated:', taskId, key, value);
  }, [runningInDemoMode, addSDKLog]);

  // Add customer note
  const addCustomerNote = useCallback(async (note: string) => {
    const newNote: CustomerNote = {
      id: `note-${Date.now()}`,
      text: note,
      timestamp: Date.now(),
      author: agentProfile?.name || 'Agent',
    };
    setCustomerNotes(prev => [newNote, ...prev]);
    console.log('[WebexCC] Note added:', note);
  }, [agentProfile?.name]);

  // Toggle favorite agent
  const toggleFavoriteAgent = useCallback((agentId: string) => {
    setTeamAgents(prev => prev.map(a => 
      a.agentId === agentId ? { ...a, isFavorite: !a.isFavorite } : a
    ));
  }, []);

  // Escalate to video - creates Instant Connect meeting
  const escalateToVideo = useCallback(async (taskId: string) => {
    const task = activeTasks.find(t => t.taskId === taskId);
    if (!task) {
      console.error('[WebexCC] Task not found for video escalation:', taskId);
      throw new Error('Task not found');
    }

    console.log('[WebexCC] Escalating to video:', taskId, 'Demo mode:', runningInDemoMode);

    if (runningInDemoMode) {
      // Demo mode - simulate video escalation
      const demoHostUrl = `https://instant.webex.com/demo-host-${taskId}`;
      const demoGuestUrl = `https://instant.webex.com/demo-guest-${taskId}`;
      
      console.log('[WebexCC Demo] Video meeting created:', { hostUrl: demoHostUrl, guestUrl: demoGuestUrl });
      
      // Open demo host URL in new tab
      window.open(demoHostUrl, '_blank');
      
      // Log that guest link would be sent
      console.log('[WebexCC Demo] Guest link would be sent to customer:', demoGuestUrl);
      
      return;
    }

    // Production mode - call edge function
    try {
      const response = await fetch('/functions/v1/create-video-meeting', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          taskId,
          customerName: task.customerName || 'Customer',
          agentName: agentProfile?.name || 'Agent',
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to create video meeting');
      }

      const data = await response.json();
      console.log('[WebexCC] Video meeting created:', data);

      // Open host URL for agent
      if (data.hostUrl) {
        window.open(data.hostUrl, '_blank');
      }

      // Send guest link to customer via chat
      if (data.guestUrl && task.mediaType === 'chat') {
        await sendChatMessage(taskId, `Join the video call: ${data.guestUrl}`);
      }
    } catch (error) {
      console.error('[WebexCC] Video escalation failed:', error);
      throw error;
    }
  }, [activeTasks, runningInDemoMode, agentProfile?.name, sendChatMessage]);

  // Upload logs - per Cisco sample for troubleshooting
  const uploadLogs = useCallback(async (): Promise<string | null> => {
    try {
      if (!runningInDemoMode && desktopRef.current) {
        console.log('[WebexCC] Uploading logs via SDK');
        addSDKLog('info', 'Initiating log upload', null, 'Diagnostics');
        
        // Try Desktop.logger.uploadLogs() or Desktop.diagnostics.uploadLogs()
        let uploadResponse;
        if (desktopRef.current.logger?.uploadLogs) {
          uploadResponse = await desktopRef.current.logger.uploadLogs();
        } else if (desktopRef.current.diagnostics?.uploadLogs) {
          uploadResponse = await desktopRef.current.diagnostics.uploadLogs();
        } else {
          addSDKLog('warn', 'Log upload not available - SDK method not found', null, 'Diagnostics');
          return null;
        }
        
        const feedbackId = uploadResponse?.feedbackId || uploadResponse?.data?.feedbackId;
        addSDKLog('info', 'Log upload successful', { feedbackId }, 'Diagnostics');
        console.log('[WebexCC] Logs uploaded with feedbackId:', feedbackId);
        return feedbackId;
      }
    } catch (error) {
      console.error('[WebexCC] Log upload failed:', error);
      addSDKLog('error', 'Log upload failed', { error: error instanceof Error ? error.message : String(error) }, 'Diagnostics');
    }
    
    // Demo mode
    const mockFeedbackId = `DEMO-${Date.now().toString(36).toUpperCase()}`;
    addSDKLog('info', 'Demo mode - mock log upload', { feedbackId: mockFeedbackId }, 'Diagnostics');
    return mockFeedbackId;
  }, [runningInDemoMode, addSDKLog]);

  // Fetch buddy agents - per Cisco sample for real-time availability
  const fetchBuddyAgents = useCallback(async (): Promise<void> => {
    try {
      if (!runningInDemoMode && desktopRef.current) {
        console.log('[WebexCC] Fetching buddy agents via SDK');
        addSDKLog('info', 'Fetching buddy agents', null, 'BuddyAgents');
        
        // Try multiple methods to get buddy agents
        let buddyAgentsData: any = null;
        
        if (desktopRef.current.agentContact?.buddyAgents?.get) {
          buddyAgentsData = await desktopRef.current.agentContact.buddyAgents.get();
        } else if (desktopRef.current.actions?.getBuddyAgents) {
          buddyAgentsData = await desktopRef.current.actions.getBuddyAgents();
        }
        
        if (buddyAgentsData?.data && Array.isArray(buddyAgentsData.data)) {
          const mappedAgents: TeamAgent[] = buddyAgentsData.data.map((agent: any) => ({
            agentId: agent.id || agent.agentId,
            name: agent.name || agent.agentName || 'Unknown Agent',
            state: mapSdkStateToAgentState(agent.state || agent.status || 'Offline'),
            teamName: agent.teamName || agent.team || '',
            skills: agent.skills || [],
            isFavorite: false,
          }));
          setBuddyAgents(mappedAgents);
          addSDKLog('info', `Loaded ${mappedAgents.length} buddy agents`, null, 'BuddyAgents');
        } else {
          addSDKLog('warn', 'No buddy agents data returned', null, 'BuddyAgents');
        }
        return;
      }
    } catch (error) {
      console.error('[WebexCC] Fetch buddy agents failed:', error);
      addSDKLog('error', 'Fetch buddy agents failed', { error: error instanceof Error ? error.message : String(error) }, 'BuddyAgents');
    }
    
    // Demo mode - use mock team agents as buddy agents
    setBuddyAgents(mockTeamAgents);
  }, [runningInDemoMode, addSDKLog]);

  // Demo: Trigger incoming task manually
  const triggerIncomingTask = useCallback((mediaType: ChannelType, queueId?: string) => {
    if (!runningInDemoMode) {
      console.log('[WebexCC] Demo functions disabled in production mode');
      return;
    }
    
    const taskId = `task-${Date.now()}`;
    const queue = queueId 
      ? mockQueues.find(q => q.id === queueId) 
      : mockQueues[Math.floor(Math.random() * mockQueues.length)];
    
    setIncomingTask({
      taskId,
      mediaType,
      ani: '+1-555-' + Math.floor(Math.random() * 9000 + 1000),
      queueName: queue?.name || 'Unknown Queue',
      ronaTimeout: 15,
      startTime: Date.now(),
    });
    
    // RONA timer
    ronaTimerRef.current = setTimeout(() => {
      setIncomingTask(null);
      setAgentStateInfo(prev => prev ? { ...prev, state: 'RONA' } : null);
    }, 15000);
    
    console.log('[WebexCC Demo] Triggered incoming task:', mediaType);
  }, [runningInDemoMode]);

  // Demo: Apply customer scenario
  const applyCustomerScenario = useCallback((scenarioId: string) => {
    const scenario = getScenarioById(scenarioId);
    if (!scenario) {
      console.warn('[WebexCC Demo] Scenario not found:', scenarioId);
      return;
    }
    
    // Update customer profile with scenario data
    setCustomerProfile(prev => ({
      id: scenario.customerProfile.id || prev?.id || 'cust-demo',
      name: scenario.customerProfile.name || 'Demo Customer',
      email: scenario.customerProfile.email,
      phone: scenario.customerProfile.phone,
      company: scenario.customerProfile.company,
      address: scenario.customerProfile.address,
      isVerified: scenario.customerProfile.isVerified,
      tags: scenario.customerProfile.tags,
      interactionHistory: scenario.interactionHistory,
      cadVariables: scenario.cadVariables,
    }));
    
    // Update interaction history
    setInteractionHistory(scenario.interactionHistory);
    
    console.log('[WebexCC Demo] Applied scenario:', scenarioId);
  }, []);

  // Demo: Trigger RONA
  const triggerRONA = useCallback(() => {
    if (!runningInDemoMode) {
      console.log('[WebexCC] Demo functions disabled in production mode');
      return;
    }
    
    setIncomingTask(null);
    setAgentStateInfo(prev => prev ? { ...prev, state: 'RONA' } : null);
    console.log('[WebexCC Demo] Triggered RONA');
  }, [runningInDemoMode]);

  // Demo: Clear all tasks
  const clearAllTasks = useCallback(() => {
    setActiveTasks([]);
    setIncomingTask(null);
    setSelectedTaskId(null);
    setCustomerProfile(null);
    setConsultState({ isConsulting: false });
    if (ronaTimerRef.current) {
      clearTimeout(ronaTimerRef.current);
    }
    console.log('[WebexCC Demo] Cleared all tasks');
  }, []);

  // Simulate incoming call for demo (respects demoAutoIncomingEnabled)
  useEffect(() => {
    if (!runningInDemoMode) return;
    if (!demoAutoIncomingEnabled) return;
    if (!agentState || agentState.state !== 'Available') return;
    
    const timer = setTimeout(() => {
      const taskId = `task-${Date.now()}`;
      const mediaTypes: Array<'voice' | 'chat' | 'email'> = ['voice', 'chat', 'email'];
      const randomType = mediaTypes[Math.floor(Math.random() * mediaTypes.length)];
      
      setIncomingTask({
        taskId,
        mediaType: randomType,
        ani: '+1-555-' + Math.floor(Math.random() * 9000 + 1000),
        queueName: mockQueues[Math.floor(Math.random() * mockQueues.length)].name,
        ronaTimeout: 15,
        startTime: Date.now(),
      });
      
      // RONA timer
      ronaTimerRef.current = setTimeout(() => {
        setIncomingTask(null);
        setAgentStateInfo(prev => prev ? { ...prev, state: 'RONA' } : null);
      }, 15000);
    }, 8000);
    
    return () => clearTimeout(timer);
  }, [agentState?.state, demoAutoIncomingEnabled, runningInDemoMode]);

  const value: WebexContextType = {
    isInitialized,
    isConnected,
    isLoading,
    connectionError,
    isDemoMode: runningInDemoMode,
    agentProfile,
    agentState,
    activeTasks,
    incomingTask,
    selectedTaskId,
    idleCodes,
    wrapUpCodes,
    queues,
    teamAgents,
    entryPoints,
    buddyAgents,
    addressBook,
    outdialAniList,
    agentMetrics,
    extendedMetrics,
    consultState,
    recentOutboundCalls,
    customerProfile,
    customerNotes,
    interactionHistory,
    sdkLogs,
    clearSDKLogs,
    exportSDKLogs,
    screenPop,
    dismissScreenPop,
    campaignContacts,
    acceptCampaignContact,
    skipCampaignContact,
    removeCampaignContact,
    searchIdleCodes,
    searchWrapUpCodes,
    idleCodesHasMore,
    wrapUpCodesHasMore,
    demoAutoIncomingEnabled,
    setDemoAutoIncomingEnabled,
    initialize,
    setAgentState,
    acceptTask,
    declineTask,
    holdTask,
    resumeTask,
    muteTask,
    unmuteTask,
    sendDtmf,
    endTask,
    wrapUpTask,
    transferToQueue,
    transferToAgent,
    transferToDN,
    transferToEntryPoint,
    consultAgent,
    consultQueue,
    consultDN,
    consultEntryPoint,
    completeTransfer,
    cancelConsult,
    conferenceCall,
    exitConference,
    dropConferenceParticipant,
    outdial,
    startRecording,
    stopRecording,
    sendChatMessage,
    selectTask,
    updateCADVariable,
    addCustomerNote,
    toggleFavoriteAgent,
    escalateToVideo,
    uploadLogs,
    fetchBuddyAgents,
    pauseRecording,
    resumeRecording,
    triggerIncomingTask,
    applyCustomerScenario,
    triggerRONA,
    clearAllTasks,
  };

  return (
    <WebexContext.Provider value={value}>
      {children}
    </WebexContext.Provider>
  );
}

export function useWebex() {
  const context = useContext(WebexContext);
  if (!context) {
    throw new Error('useWebex must be used within a WebexProvider');
  }
  return context;
}
