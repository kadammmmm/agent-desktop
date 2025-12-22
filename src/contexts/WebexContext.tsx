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
  ExtendedMetrics
} from '@/types/webex';

interface WebexContextType {
  // Connection state
  isInitialized: boolean;
  isConnected: boolean;
  connectionError: string | null;
  isLoading: boolean;
  
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

// Demo mode detection - set to true when not running inside Webex CC Desktop
const DEMO_MODE = true;

export function WebexProvider({ children }: { children: React.ReactNode }) {
  const [isInitialized, setIsInitialized] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  
  const [agentProfile, setAgentProfile] = useState<AgentProfile | null>(null);
  const [agentState, setAgentStateInfo] = useState<AgentStateInfo | null>(null);
  
  const [activeTasks, setActiveTasks] = useState<Task[]>([]);
  const [incomingTask, setIncomingTask] = useState<IncomingTask | null>(null);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  
  const [idleCodes] = useState<IdleCode[]>(mockIdleCodes);
  const [wrapUpCodes] = useState<WrapUpCode[]>(mockWrapUpCodes);
  const [queues] = useState<Queue[]>(mockQueues);
  const [teamAgents, setTeamAgents] = useState<TeamAgent[]>(mockTeamAgents);
  const [entryPoints] = useState<EntryPoint[]>(mockEntryPoints);
  
  const [agentMetrics, setAgentMetrics] = useState<AgentMetrics | null>(null);
  const [extendedMetrics, setExtendedMetrics] = useState<ExtendedMetrics | null>(null);
  
  const [consultState, setConsultState] = useState<ConsultState>({ isConsulting: false });
  const [recentOutboundCalls, setRecentOutboundCalls] = useState<RecentOutboundCall[]>(mockRecentOutboundCalls);
  
  const [customerProfile, setCustomerProfile] = useState<CustomerProfile | null>(null);
  const [customerNotes, setCustomerNotes] = useState<CustomerNote[]>(mockCustomerNotes);
  const [interactionHistory] = useState<CallLogEntry[]>(mockInteractionHistory);

  const ronaTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Initialize SDK and auto-fetch agent session
  const initialize = useCallback(async () => {
    setIsLoading(true);
    try {
      if (DEMO_MODE) {
        // Demo mode: simulate SDK initialization and provide mock agent data
        await new Promise(resolve => setTimeout(resolve, 1000));
        
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
        // Real SDK integration
        // const Desktop = await import('@wxcc-desktop/sdk');
        // await Desktop.default.config.init();
        // const agentInfo = await Desktop.default.agentStateInfo.getAgentInfo();
        // Subscribe to state change events, etc.
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
  }, []);

  // Set agent state
  const setAgentState = useCallback(async (state: AgentState, idleCodeId?: string) => {
    const idleCode = idleCodeId ? idleCodes.find(c => c.id === idleCodeId) : undefined;
    setAgentStateInfo({
      state,
      idleCode,
      lastStateChangeTime: Date.now(),
    });
    console.log('[WebexCC] State changed to:', state, idleCode?.name);
  }, [idleCodes]);

  // Accept incoming task
  const acceptTask = useCallback(async (taskId: string) => {
    if (!incomingTask || incomingTask.taskId !== taskId) return;
    
    if (ronaTimerRef.current) {
      clearTimeout(ronaTimerRef.current);
    }
    
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
  }, [incomingTask]);

  // Decline incoming task
  const declineTask = useCallback(async (taskId: string) => {
    if (ronaTimerRef.current) {
      clearTimeout(ronaTimerRef.current);
    }
    setIncomingTask(null);
    console.log('[WebexCC] Task declined:', taskId);
  }, []);

  // Hold task
  const holdTask = useCallback(async (taskId: string) => {
    setActiveTasks(prev => prev.map(t => 
      t.taskId === taskId ? { ...t, isHeld: true, state: 'held' } : t
    ));
    console.log('[WebexCC] Task held:', taskId);
  }, []);

  // Resume task
  const resumeTask = useCallback(async (taskId: string) => {
    setActiveTasks(prev => prev.map(t => 
      t.taskId === taskId ? { ...t, isHeld: false, state: 'connected' } : t
    ));
    console.log('[WebexCC] Task resumed:', taskId);
  }, []);

  // Mute task
  const muteTask = useCallback(async (taskId: string) => {
    setActiveTasks(prev => prev.map(t => 
      t.taskId === taskId ? { ...t, isMuted: true } : t
    ));
    console.log('[WebexCC] Task muted:', taskId);
  }, []);

  // Unmute task
  const unmuteTask = useCallback(async (taskId: string) => {
    setActiveTasks(prev => prev.map(t => 
      t.taskId === taskId ? { ...t, isMuted: false } : t
    ));
    console.log('[WebexCC] Task unmuted:', taskId);
  }, []);

  // End task
  const endTask = useCallback(async (taskId: string) => {
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
  }, [activeTasks, selectedTaskId]);

  // Wrap up task
  const wrapUpTask = useCallback(async (taskId: string, wrapUpCodeId: string) => {
    setActiveTasks(prev => prev.filter(t => t.taskId !== taskId));
    if (selectedTaskId === taskId) {
      setSelectedTaskId(activeTasks.find(t => t.taskId !== taskId)?.taskId || null);
    }
    if (activeTasks.length <= 1) {
      setAgentStateInfo(prev => prev ? { ...prev, state: 'Available' } : null);
    }
    setCustomerProfile(null);
    console.log('[WebexCC] Task wrapped up:', taskId, 'with code:', wrapUpCodeId);
  }, [activeTasks, selectedTaskId]);

  // Transfer to queue (blind)
  const transferToQueue = useCallback(async (taskId: string, queueId: string) => {
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
  }, [activeTasks.length, selectedTaskId]);

  // Transfer to agent (blind)
  const transferToAgent = useCallback(async (taskId: string, agentId: string) => {
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
  }, [activeTasks.length, selectedTaskId]);

  // Transfer to DN (blind)
  const transferToDN = useCallback(async (taskId: string, dialNumber: string) => {
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
  }, [activeTasks.length, selectedTaskId]);

  // Consult agent (warm transfer start)
  const consultAgent = useCallback(async (taskId: string, agentId: string) => {
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
  }, [teamAgents]);

  // Consult queue (warm transfer start)
  const consultQueue = useCallback(async (taskId: string, queueId: string) => {
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
  }, [queues]);

  // Consult DN (warm transfer start)
  const consultDN = useCallback(async (taskId: string, dialNumber: string) => {
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
  }, []);

  // Complete transfer (after consult)
  const completeTransfer = useCallback(async (taskId: string) => {
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
  }, [activeTasks.length, selectedTaskId]);

  // Cancel consult
  const cancelConsult = useCallback(async (taskId: string) => {
    setActiveTasks(prev => prev.map(t => 
      t.taskId === taskId ? { ...t, state: 'connected', isHeld: false } : t
    ));
    setConsultState({ isConsulting: false });
    console.log('[WebexCC] Consult cancelled');
  }, []);

  // Conference call
  const conferenceCall = useCallback(async (taskId: string) => {
    setActiveTasks(prev => prev.map(t => 
      t.taskId === taskId ? { ...t, state: 'conferencing', isHeld: false } : t
    ));
    console.log('[WebexCC] Conference started');
  }, []);

  // Outdial
  const outdial = useCallback(async (dialNumber: string, entryPointId: string) => {
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
  }, [agentProfile?.dialNumber, entryPoints]);

  // Recording controls
  const startRecording = useCallback(async (taskId: string) => {
    setActiveTasks(prev => prev.map(t => 
      t.taskId === taskId ? { ...t, isRecording: true } : t
    ));
    console.log('[WebexCC] Recording started:', taskId);
  }, []);

  const stopRecording = useCallback(async (taskId: string) => {
    setActiveTasks(prev => prev.map(t => 
      t.taskId === taskId ? { ...t, isRecording: false } : t
    ));
    console.log('[WebexCC] Recording stopped:', taskId);
  }, []);

  // Send chat message
  const sendChatMessage = useCallback(async (taskId: string, message: string) => {
    console.log('[WebexCC] Chat message sent:', taskId, message);
  }, []);

  // Select task
  const selectTask = useCallback((taskId: string) => {
    setSelectedTaskId(taskId);
  }, []);

  // Update CAD variable
  const updateCADVariable = useCallback(async (taskId: string, key: string, value: string) => {
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
  }, []);

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

  // Simulate incoming call for demo
  useEffect(() => {
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
  }, [agentState?.state]);

  const value: WebexContextType = {
    isInitialized,
    isConnected,
    isLoading,
    connectionError,
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