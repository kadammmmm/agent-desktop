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
  CallLogEntry,
  ExtendedMetrics,
  ChannelType
} from '@/types/webex';
import type { SDKLogEntry, SDKLogLevel } from '@/types/sdk-debug';
import { getScenarioById } from '@/lib/demoScenarios';
import { isDemoMode, getEnvironmentDiagnostics } from '@/lib/webexEnvironment';
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
  endTask: (taskId: string) => Promise<void>;
  wrapUpTask: (taskId: string, wrapUpCodeId: string) => Promise<void>;
  transferToQueue: (taskId: string, queueId: string) => Promise<void>;
  transferToAgent: (taskId: string, agentId: string) => Promise<void>;
  transferToDN: (taskId: string, dialNumber: string) => Promise<void>;
  consultAgent: (taskId: string, agentId: string) => Promise<void>;
  consultQueue: (taskId: string, queueId: string) => Promise<void>;
  consultDN: (taskId: string, dialNumber: string) => Promise<void>;
  completeTransfer: (taskId: string) => Promise<void>;
  cancelConsult: (taskId: string) => Promise<void>;
  conferenceCall: (taskId: string) => Promise<void>;
  outdial: (dialNumber: string, entryPointId: string) => Promise<void>;
  startRecording: (taskId: string) => Promise<void>;
  stopRecording: (taskId: string) => Promise<void>;
  sendChatMessage: (taskId: string, message: string) => Promise<void>;
  selectTask: (taskId: string) => void;
  updateCADVariable: (taskId: string, key: string, value: string) => Promise<void>;
  addCustomerNote: (note: string) => Promise<void>;
  toggleFavoriteAgent: (agentId: string) => void;
  escalateToVideo: (taskId: string) => Promise<void>;
  
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
  
  const [agentMetrics, setAgentMetrics] = useState<AgentMetrics | null>(null);
  const [extendedMetrics, setExtendedMetrics] = useState<ExtendedMetrics | null>(null);
  
  const [consultState, setConsultState] = useState<ConsultState>({ isConsulting: false });
  const [recentOutboundCalls, setRecentOutboundCalls] = useState<RecentOutboundCall[]>(mockRecentOutboundCalls);
  
  const [customerProfile, setCustomerProfile] = useState<CustomerProfile | null>(null);
  const [customerNotes, setCustomerNotes] = useState<CustomerNote[]>(mockCustomerNotes);
  const [interactionHistory, setInteractionHistory] = useState<CallLogEntry[]>(mockInteractionHistory);
  
  // Demo control state
  const [demoAutoIncomingEnabled, setDemoAutoIncomingEnabled] = useState(true);

  // SDK Debug Logs state
  const [sdkLogs, setSdkLogs] = useState<SDKLogEntry[]>([]);
  const logIdCounter = useRef(0);

  const ronaTimerRef = useRef<NodeJS.Timeout | null>(null);
  const desktopRef = useRef<any>(null);

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

  // Initialize SDK and auto-fetch agent session
  const initialize = useCallback(async () => {
    setIsLoading(true);
    const demoMode = isDemoMode();
    setRunningInDemoMode(demoMode);
    
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
            
            // Map SDK status to our AgentState
            const mappedState = mapSdkStateToAgentState(agentInfo.subStatus || agentInfo.status || 'Idle');
            setAgentStateInfo({
              state: mappedState,
              idleCode: agentInfo.idleCode || (agentInfo.auxCodeId ? { id: agentInfo.auxCodeId, name: agentInfo.auxCodeName || '' } : undefined),
              lastStateChangeTime: agentInfo.lastStateChangeTimestamp || Date.now(),
            });
            
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
              const mappedState = mapSdkStateToAgentState(latestData.subStatus || latestData.status || 'Idle');
              setAgentStateInfo({
                state: mappedState,
                idleCode: latestData.idleCode || (latestData.auxCodeId ? { id: latestData.auxCodeId, name: latestData.auxCodeName || '' } : undefined),
                lastStateChangeTime: latestData.lastStateChangeTimestamp || Date.now(),
              });
              addSDKLog('info', `Agent state changed to: ${mappedState}`, { status: latestData.status, subStatus: latestData.subStatus }, 'WebexContext');
              
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
          
          // Fetch idle codes from the SDK
          try {
            addSDKLog('info', 'Fetching idle codes...', null, 'WebexContext');
            const sdkIdleCodes = await desktopRef.current.actions.getIdleCodes();
            if (sdkIdleCodes && Array.isArray(sdkIdleCodes)) {
              setIdleCodes(sdkIdleCodes.map((code: any) => ({
                id: code.id,
                name: code.name,
              })));
              addSDKLog('info', `Loaded ${sdkIdleCodes.length} idle codes`, null, 'WebexContext');
            }
          } catch (e) {
            addSDKLog('warn', 'Could not fetch idle codes', e, 'WebexContext');
            console.warn('[WebexCC] Could not fetch idle codes:', e);
          }
          
          // Fetch wrap-up codes from the SDK
          try {
            addSDKLog('info', 'Fetching wrap-up codes...', null, 'WebexContext');
            const sdkWrapUpCodes = await desktopRef.current.actions.getWrapUpCodes();
            if (sdkWrapUpCodes && Array.isArray(sdkWrapUpCodes)) {
              setWrapUpCodes(sdkWrapUpCodes.map((code: any) => ({
                id: code.id,
                name: code.name,
              })));
              addSDKLog('info', `Loaded ${sdkWrapUpCodes.length} wrap-up codes`, null, 'WebexContext');
            }
          } catch (e) {
            addSDKLog('warn', 'Could not fetch wrap-up codes', e, 'WebexContext');
            console.warn('[WebexCC] Could not fetch wrap-up codes:', e);
          }
          
          // Subscribe to contact events
          desktopRef.current.agentContact.addEventListener('eAgentOfferContact', (contact: any) => {
            addSDKLog('info', 'Incoming contact offer', contact, 'WebexContext');
            console.log('[WebexCC] Incoming contact offer:', contact);
            handleIncomingContact(contact);
          });
          
          desktopRef.current.agentContact.addEventListener('eAgentContactAssigned', (contact: any) => {
            addSDKLog('info', 'Contact assigned', contact, 'WebexContext');
            console.log('[WebexCC] Contact assigned:', contact);
            handleContactAssigned(contact);
          });
          
          desktopRef.current.agentContact.addEventListener('eAgentContactEnded', (contact: any) => {
            addSDKLog('info', 'Contact ended', contact, 'WebexContext');
            console.log('[WebexCC] Contact ended:', contact);
            handleContactEnded(contact);
          });
          
          desktopRef.current.agentContact.addEventListener('eAgentContactWrappedUp', (contact: any) => {
            addSDKLog('info', 'Contact wrapped up', contact, 'WebexContext');
            console.log('[WebexCC] Contact wrapped up:', contact);
            handleContactWrappedUp(contact);
          });
          
          desktopRef.current.agentContact.addEventListener('eAgentWrapup', (contact: any) => {
            addSDKLog('info', 'Agent wrapup state', contact, 'WebexContext');
            console.log('[WebexCC] Agent wrapup state:', contact);
            handleAgentWrapup(contact);
          });
          
          // Additional event listeners for comprehensive contact handling
          desktopRef.current.agentContact.addEventListener('eAgentOfferContactRona', (contact: any) => {
            addSDKLog('info', 'RONA event received', contact, 'WebexContext');
            setIncomingTask(null);
            setAgentStateInfo(prev => prev ? { ...prev, state: 'RONA' } : null);
          });
          
          desktopRef.current.agentContact.addEventListener('eAgentContactHeld', (contact: any) => {
            addSDKLog('info', 'Contact held', contact, 'WebexContext');
            const taskId = contact.interactionId || contact.id;
            setActiveTasks(prev => prev.map(t => 
              t.taskId === taskId ? { ...t, isHeld: true, state: 'held' } : t
            ));
          });
          
          desktopRef.current.agentContact.addEventListener('eAgentContactUnHeld', (contact: any) => {
            addSDKLog('info', 'Contact unheld', contact, 'WebexContext');
            const taskId = contact.interactionId || contact.id;
            setActiveTasks(prev => prev.map(t => 
              t.taskId === taskId ? { ...t, isHeld: false, state: 'connected' } : t
            ));
          });
          
          desktopRef.current.agentContact.addEventListener('eCallRecordingStarted', (contact: any) => {
            addSDKLog('info', 'Recording started', contact, 'WebexContext');
            const taskId = contact.interactionId || contact.id;
            setActiveTasks(prev => prev.map(t => 
              t.taskId === taskId ? { ...t, isRecording: true } : t
            ));
          });
          
          addSDKLog('info', 'SDK initialization complete - all event listeners registered', null, 'WebexContext');
          
          // Hydrate current interactions from TaskMap
          try {
            addSDKLog('info', 'Fetching TaskMap to hydrate existing contacts...', null, 'WebexContext');
            const taskMap = await desktopRef.current.actions?.getTaskMap();
            if (taskMap && typeof taskMap === 'object') {
              const tasks = Object.values(taskMap) as any[];
              addSDKLog('info', `Fetched TaskMap with ${tasks.length} tasks`, taskMap, 'WebexContext');
              
              const hydratedTasks: Task[] = tasks.map((contact: any) => ({
                taskId: contact.interactionId || contact.id,
                mediaType: mapMediaType(contact.mediaType),
                mediaChannel: contact.mediaChannel || 'telephony',
                state: mapContactState(contact.state || contact.status || 'connected'),
                direction: contact.direction || 'inbound',
                queueName: contact.queueName || 'Unknown Queue',
                ani: contact.ani || contact.from || '',
                dnis: contact.dnis || contact.to || '',
                startTime: contact.startTimestamp || Date.now(),
                isRecording: contact.isRecording || false,
                isMuted: contact.isMuted || false,
                isHeld: contact.isHeld || false,
                wrapUpRequired: contact.wrapUpRequired !== false,
                cadVariables: contact.cadVariables || {},
                customerName: contact.customerName,
                customerEmail: contact.customerEmail,
                customerPhone: contact.ani,
                mediaResourceId: contact.mediaResourceId,
                isConsult: contact.isConsult || false,
                isPostCallConsult: contact.isPostCallConsult || false,
              }));
              
              if (hydratedTasks.length > 0) {
                setActiveTasks(hydratedTasks);
                setSelectedTaskId(hydratedTasks[0].taskId);
                addSDKLog('info', `Hydrated ${hydratedTasks.length} active tasks from TaskMap`, null, 'WebexContext');
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
  }, [addSDKLog]);
  
  // Map SDK state strings to our AgentState type
  // SDK uses status/subStatus - status is main state, subStatus provides more detail
  // Handles both lowercase and uppercase variants for robustness
  const mapSdkStateToAgentState = (sdkState: string): AgentState => {
    const normalized = sdkState?.toLowerCase() || '';
    const stateMap: Record<string, AgentState> = {
      'available': 'Available',
      'idle': 'Idle',
      'rona': 'RONA',
      'engaged': 'Engaged',
      'wrapup': 'WrapUp',
      'wrap-up': 'WrapUp',
      'wrap_up': 'WrapUp',
      'offline': 'Offline',
      'loggedin': 'Idle', // LoggedIn with subStatus Idle
      'logged_in': 'Idle',
      'loggedout': 'Offline',
      'logged_out': 'Offline',
      'notready': 'Idle',
      'not_ready': 'Idle',
    };
    return stateMap[normalized] || 'Offline';
  };
  
  // Helper to validate if a string is a valid UUID format
  const isValidUUID = (str: string): boolean => {
    if (!str || typeof str !== 'string') return false;
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    return uuidRegex.test(str);
  };
  
  // Helper to check if agent info is fully ready (not just truthy but with key fields)
  const isAgentInfoReady = (agentInfo: any): boolean => {
    if (!agentInfo) return false;
    // Must have at least agentName or agentId, plus a status
    const hasIdentity = !!(agentInfo.agentName || agentInfo.agentId || agentInfo.agentProfileID);
    const hasStatus = !!(agentInfo.status || agentInfo.subStatus);
    return hasIdentity && hasStatus;
  };
  
  // Handle incoming contact offer
  const handleIncomingContact = (contact: any) => {
    const taskId = contact.interactionId || contact.id || `task-${Date.now()}`;
    setIncomingTask({
      taskId,
      mediaType: mapMediaType(contact.mediaType),
      ani: contact.ani || contact.from || 'Unknown',
      queueName: contact.queueName || 'Unknown Queue',
      ronaTimeout: contact.ronaTimeout || 15,
      startTime: Date.now(),
    });
    
    // RONA timer
    const timeout = (contact.ronaTimeout || 15) * 1000;
    ronaTimerRef.current = setTimeout(() => {
      setIncomingTask(null);
      setAgentStateInfo(prev => prev ? { ...prev, state: 'RONA' } : null);
    }, timeout);
  };
  
  // Handle contact assigned (accepted)
  const handleContactAssigned = (contact: any) => {
    if (ronaTimerRef.current) {
      clearTimeout(ronaTimerRef.current);
    }
    
    const taskId = contact.interactionId || contact.id;
    const newTask: Task = {
      taskId,
      mediaType: mapMediaType(contact.mediaType),
      mediaChannel: contact.mediaChannel || 'telephony',
      state: 'connected',
      direction: contact.direction || 'inbound',
      queueName: contact.queueName || 'Unknown Queue',
      ani: contact.ani || contact.from || '',
      dnis: contact.dnis || contact.to || '',
      startTime: Date.now(),
      isRecording: contact.isRecording || false,
      isMuted: false,
      isHeld: false,
      wrapUpRequired: contact.wrapUpRequired !== false,
      cadVariables: contact.cadVariables || {},
      customerName: contact.customerName,
      customerEmail: contact.customerEmail,
      customerPhone: contact.ani,
      // SDK-specific fields for call controls
      mediaResourceId: contact.mediaResourceId,
      isConsult: contact.isConsult || false,
      isPostCallConsult: contact.isPostCallConsult || false,
    };
    
    setActiveTasks(prev => [...prev.filter(t => t.taskId !== taskId), newTask]);
    setSelectedTaskId(taskId);
    setIncomingTask(null);
    
    // Set agent state to Engaged when contact is assigned
    setAgentStateInfo(prev => prev ? { 
      ...prev, 
      state: 'Engaged',
      lastStateChangeTime: Date.now()
    } : null);
    
    // Populate customer profile from contact data
    setCustomerProfile({
      id: contact.customerId || taskId,
      name: contact.customerName || contact.ani || contact.from || 'Unknown Customer',
      email: contact.customerEmail || '',
      phone: contact.ani || contact.from || '',
      company: contact.company || '',
      isVerified: contact.isVerified || false,
      tags: [],
      interactionHistory: [],
      cadVariables: contact.cadVariables || {},
    });
    
    addSDKLog('info', `Contact assigned - Agent state set to Engaged`, { taskId, ani: contact.ani }, 'WebexContext');
  };
  
  // Handle contact ended
  const handleContactEnded = (contact: any) => {
    const taskId = contact.interactionId || contact.id;
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
  const handleContactWrappedUp = (contact: any) => {
    const taskId = contact.interactionId || contact.id;
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
  
  // Handle wrapup state
  const handleAgentWrapup = (contact: any) => {
    const taskId = contact.interactionId || contact.id;
    setActiveTasks(prev => prev.map(t => 
      t.taskId === taskId ? { ...t, state: 'wrapup' } : t
    ));
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

  // Set agent state
  const setAgentState = useCallback(async (state: AgentState, idleCodeId?: string) => {
    try {
      if (!runningInDemoMode && desktopRef.current) {
        // Real SDK call - stateChange expects { state: "Available" | "Idle", auxCodeIdArray: string }
        console.log('[WebexCC] Setting agent state via SDK:', state, idleCodeId);
        addSDKLog('info', `Requesting state change: ${state}`, { idleCodeId }, 'WebexContext');
        
        // The SDK only supports Available and Idle via stateChange
        if (state === 'Idle') {
          // Idle state REQUIRES a valid UUID auxCodeId
          if (!idleCodeId || !isValidUUID(idleCodeId)) {
            const errorMsg = `Cannot change to Idle state: invalid or missing idle code ID. Received: "${idleCodeId}". Ensure idle codes are loaded.`;
            addSDKLog('error', errorMsg, { idleCodeId, idleCodesLoaded: idleCodes.length }, 'WebexContext');
            console.error('[WebexCC]', errorMsg);
            // Don't update local state - the request is invalid
            return;
          }
          await desktopRef.current.agentStateInfo.stateChange({
            state: 'Idle',
            auxCodeIdArray: idleCodeId,
          });
          addSDKLog('info', `State change request sent: Idle with code ${idleCodeId}`, null, 'WebexContext');
        } else if (state === 'Available') {
          // Available state - pass current aux code if available, otherwise empty
          const currentAuxCode = agentState?.idleCode?.id || '';
          await desktopRef.current.agentStateInfo.stateChange({
            state: 'Available',
            auxCodeIdArray: currentAuxCode,
          });
          addSDKLog('info', `State change request sent: Available`, null, 'WebexContext');
        } else {
          // For other states (Offline, etc), log a warning - these may need different SDK calls
          addSDKLog('warn', `State ${state} not directly settable via stateChange API`, null, 'WebexContext');
          console.warn(`[WebexCC] State ${state} may require different SDK call`);
        }
        // State will be updated via the 'updated' event listener
      } else {
        // Demo mode - update local state directly
        const idleCode = idleCodeId ? idleCodes.find(c => c.id === idleCodeId) : undefined;
        setAgentStateInfo({
          state,
          idleCode,
          lastStateChangeTime: Date.now(),
        });
      }
      console.log('[WebexCC] State change requested:', state, idleCodeId);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      addSDKLog('error', `State change failed:`, error, 'WebexContext');
      console.error('[WebexCC] State change failed:', error);
      // Don't update local state on error - let SDK events drive state
    }
  }, [runningInDemoMode, idleCodes, addSDKLog, agentState?.idleCode?.id]);

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
        await desktopRef.current.agentContact.accept({ interactionId: taskId });
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

  // End task
  const endTask = useCallback(async (taskId: string) => {
    try {
      if (!runningInDemoMode && desktopRef.current) {
        console.log('[WebexCC] Ending task via SDK:', taskId);
        await desktopRef.current.agentContact.end({ interactionId: taskId });
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
        await desktopRef.current.agentContact.wrapup({
          interactionId: taskId,
          wrapUpCodeId: wrapUpCodeId,
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

  // Transfer to queue (blind)
  const transferToQueue = useCallback(async (taskId: string, queueId: string) => {
    try {
      if (!runningInDemoMode && desktopRef.current) {
        console.log('[WebexCC] Transferring to queue via SDK:', taskId, queueId);
        await desktopRef.current.agentContact.blindTransfer({
          interactionId: taskId,
          transferTo: queueId,
          transferType: 'queue',
        });
        return;
      }
    } catch (error) {
      console.error('[WebexCC] Transfer to queue failed:', error);
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
  }, [activeTasks.length, selectedTaskId, runningInDemoMode]);

  // Transfer to agent (blind)
  const transferToAgent = useCallback(async (taskId: string, agentId: string) => {
    try {
      if (!runningInDemoMode && desktopRef.current) {
        console.log('[WebexCC] Transferring to agent via SDK:', taskId, agentId);
        await desktopRef.current.agentContact.blindTransfer({
          interactionId: taskId,
          transferTo: agentId,
          transferType: 'agent',
        });
        return;
      }
    } catch (error) {
      console.error('[WebexCC] Transfer to agent failed:', error);
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
    console.log('[WebexCC] Transferred to agent:', agentId);
  }, [activeTasks.length, selectedTaskId, runningInDemoMode]);

  // Transfer to DN (blind)
  const transferToDN = useCallback(async (taskId: string, dialNumber: string) => {
    try {
      if (!runningInDemoMode && desktopRef.current) {
        console.log('[WebexCC] Transferring to DN via SDK:', taskId, dialNumber);
        await desktopRef.current.agentContact.blindTransfer({
          interactionId: taskId,
          transferTo: dialNumber,
          transferType: 'dn',
        });
        return;
      }
    } catch (error) {
      console.error('[WebexCC] Transfer to DN failed:', error);
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
    console.log('[WebexCC] Transferred to DN:', dialNumber);
  }, [activeTasks.length, selectedTaskId, runningInDemoMode]);

  // Consult agent (warm transfer start)
  const consultAgent = useCallback(async (taskId: string, agentId: string) => {
    try {
      if (!runningInDemoMode && desktopRef.current) {
        console.log('[WebexCC] Consulting agent via SDK:', taskId, agentId);
        await desktopRef.current.agentContact.consult({
          interactionId: taskId,
          consultTo: agentId,
          consultType: 'agent',
        });
      }
    } catch (error) {
      console.error('[WebexCC] Consult agent failed:', error);
    }
    
    const agent = teamAgents.find(a => a.agentId === agentId);
    setActiveTasks(prev => prev.map(t => 
      t.taskId === taskId ? { ...t, state: 'consulting', isHeld: true } : t
    ));
    setConsultState({
      isConsulting: true,
      consultTarget: {
        type: 'agent',
        id: agentId,
        name: agent?.name || agentId,
      },
      consultStartTime: Date.now(),
    });
    console.log('[WebexCC] Consulting agent:', agentId);
  }, [teamAgents, runningInDemoMode]);

  // Consult queue (warm transfer start)
  const consultQueue = useCallback(async (taskId: string, queueId: string) => {
    try {
      if (!runningInDemoMode && desktopRef.current) {
        console.log('[WebexCC] Consulting queue via SDK:', taskId, queueId);
        await desktopRef.current.agentContact.consult({
          interactionId: taskId,
          consultTo: queueId,
          consultType: 'queue',
        });
      }
    } catch (error) {
      console.error('[WebexCC] Consult queue failed:', error);
    }
    
    const queue = queues.find(q => q.id === queueId);
    setActiveTasks(prev => prev.map(t => 
      t.taskId === taskId ? { ...t, state: 'consulting', isHeld: true } : t
    ));
    setConsultState({
      isConsulting: true,
      consultTarget: {
        type: 'queue',
        id: queueId,
        name: queue?.name || queueId,
      },
      consultStartTime: Date.now(),
    });
    console.log('[WebexCC] Consulting queue:', queueId);
  }, [queues, runningInDemoMode]);

  // Consult DN (warm transfer start)
  const consultDN = useCallback(async (taskId: string, dialNumber: string) => {
    try {
      if (!runningInDemoMode && desktopRef.current) {
        console.log('[WebexCC] Consulting DN via SDK:', taskId, dialNumber);
        await desktopRef.current.agentContact.consult({
          interactionId: taskId,
          consultTo: dialNumber,
          consultType: 'dn',
        });
      }
    } catch (error) {
      console.error('[WebexCC] Consult DN failed:', error);
    }
    
    setActiveTasks(prev => prev.map(t => 
      t.taskId === taskId ? { ...t, state: 'consulting', isHeld: true } : t
    ));
    setConsultState({
      isConsulting: true,
      consultTarget: {
        type: 'dn',
        id: dialNumber,
        name: dialNumber,
      },
      consultStartTime: Date.now(),
    });
    console.log('[WebexCC] Consulting DN:', dialNumber);
  }, [runningInDemoMode]);

  // Complete transfer (after consult)
  const completeTransfer = useCallback(async (taskId: string) => {
    try {
      if (!runningInDemoMode && desktopRef.current) {
        console.log('[WebexCC] Completing transfer via SDK:', taskId);
        await desktopRef.current.agentContact.consultTransfer({ interactionId: taskId });
        return;
      }
    } catch (error) {
      console.error('[WebexCC] Complete transfer failed:', error);
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
    console.log('[WebexCC] Transfer completed');
  }, [activeTasks.length, selectedTaskId, runningInDemoMode]);

  // Cancel consult
  const cancelConsult = useCallback(async (taskId: string) => {
    try {
      if (!runningInDemoMode && desktopRef.current) {
        console.log('[WebexCC] Cancelling consult via SDK:', taskId);
        await desktopRef.current.agentContact.consultEnd({ interactionId: taskId });
      }
    } catch (error) {
      console.error('[WebexCC] Cancel consult failed:', error);
    }
    
    setActiveTasks(prev => prev.map(t => 
      t.taskId === taskId ? { ...t, state: 'connected', isHeld: false } : t
    ));
    setConsultState({ isConsulting: false });
    console.log('[WebexCC] Consult cancelled');
  }, [runningInDemoMode]);

  // Conference call
  const conferenceCall = useCallback(async (taskId: string) => {
    try {
      if (!runningInDemoMode && desktopRef.current) {
        console.log('[WebexCC] Starting conference via SDK:', taskId);
        await desktopRef.current.agentContact.conference({ interactionId: taskId });
      }
    } catch (error) {
      console.error('[WebexCC] Conference failed:', error);
    }
    
    setActiveTasks(prev => prev.map(t => 
      t.taskId === taskId ? { ...t, state: 'conferencing', isHeld: false } : t
    ));
    console.log('[WebexCC] Conference started');
  }, [runningInDemoMode]);

  // Outdial
  const outdial = useCallback(async (dialNumber: string, entryPointId: string) => {
    try {
      if (!runningInDemoMode && desktopRef.current) {
        console.log('[WebexCC] Outdialing via SDK:', dialNumber, entryPointId);
        await desktopRef.current.agentContact.outdial({
          dialNumber: dialNumber,
          entryPointId: entryPointId,
        });
        // Contact will be created via event listener
        return;
      }
    } catch (error) {
      console.error('[WebexCC] Outdial failed:', error);
    }
    
    // Demo mode or fallback
    const entryPoint = entryPoints.find(ep => ep.id === entryPointId);
    const newTask: Task = {
      taskId: `outbound-${Date.now()}`,
      mediaType: 'voice',
      mediaChannel: 'telephony',
      state: 'connected',
      direction: 'outbound',
      queueName: 'Outbound',
      ani: agentProfile?.dialNumber || '',
      dnis: dialNumber,
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
        number: dialNumber,
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
    console.log('[WebexCC] Outdial to:', dialNumber);
  }, [agentProfile?.dialNumber, entryPoints, runningInDemoMode]);

  // Recording controls
  const startRecording = useCallback(async (taskId: string) => {
    try {
      if (!runningInDemoMode && desktopRef.current) {
        console.log('[WebexCC] Starting recording via SDK:', taskId);
        await desktopRef.current.agentContact.pauseRecording({ interactionId: taskId, pause: false });
      }
    } catch (error) {
      console.error('[WebexCC] Start recording failed:', error);
    }
    
    setActiveTasks(prev => prev.map(t => 
      t.taskId === taskId ? { ...t, isRecording: true } : t
    ));
    console.log('[WebexCC] Recording started:', taskId);
  }, [runningInDemoMode]);

  const stopRecording = useCallback(async (taskId: string) => {
    try {
      if (!runningInDemoMode && desktopRef.current) {
        console.log('[WebexCC] Stopping recording via SDK:', taskId);
        await desktopRef.current.agentContact.pauseRecording({ interactionId: taskId, pause: true });
      }
    } catch (error) {
      console.error('[WebexCC] Stop recording failed:', error);
    }
    
    setActiveTasks(prev => prev.map(t => 
      t.taskId === taskId ? { ...t, isRecording: false } : t
    ));
    console.log('[WebexCC] Recording stopped:', taskId);
  }, [runningInDemoMode]);

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

  // Update CAD variable
  const updateCADVariable = useCallback(async (taskId: string, key: string, value: string) => {
    try {
      if (!runningInDemoMode && desktopRef.current) {
        console.log('[WebexCC] Updating CAD variable via SDK:', taskId, key, value);
        await desktopRef.current.agentContact.updateCadVariables({
          interactionId: taskId,
          cadVariables: { [key]: value },
        });
      }
    } catch (error) {
      console.error('[WebexCC] Update CAD variable failed:', error);
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
  }, [runningInDemoMode]);

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
    endTask,
    wrapUpTask,
    transferToQueue,
    transferToAgent,
    transferToDN,
    consultAgent,
    consultQueue,
    consultDN,
    completeTransfer,
    cancelConsult,
    conferenceCall,
    outdial,
    startRecording,
    stopRecording,
    sendChatMessage,
    selectTask,
    updateCADVariable,
    addCustomerNote,
    toggleFavoriteAgent,
    escalateToVideo,
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
