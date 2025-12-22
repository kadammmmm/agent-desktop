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
  AgentState
} from '@/types/webex';

interface WebexContextType {
  // Connection state
  isInitialized: boolean;
  isConnected: boolean;
  connectionError: string | null;
  
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
  
  // Metrics
  agentMetrics: AgentMetrics | null;
  
  // Actions
  initialize: () => Promise<void>;
  login: (teamId: string, dialNumber: string) => Promise<void>;
  logout: () => Promise<void>;
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
  outdial: (dialNumber: string, entryPointId: string) => Promise<void>;
  startRecording: (taskId: string) => Promise<void>;
  stopRecording: (taskId: string) => Promise<void>;
  sendChatMessage: (taskId: string, message: string) => Promise<void>;
  selectTask: (taskId: string) => void;
  updateCADVariable: (taskId: string, key: string, value: string) => Promise<void>;
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
];

const mockTeamAgents: TeamAgent[] = [
  { agentId: 'a1', name: 'John Smith', state: 'Available', teamName: 'Sales Team' },
  { agentId: 'a2', name: 'Jane Doe', state: 'Engaged', teamName: 'Sales Team' },
  { agentId: 'a3', name: 'Bob Wilson', state: 'Idle', teamName: 'Support Team' },
  { agentId: 'a4', name: 'Alice Brown', state: 'Available', teamName: 'Support Team' },
];

export function WebexProvider({ children }: { children: React.ReactNode }) {
  const [isInitialized, setIsInitialized] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  
  const [agentProfile, setAgentProfile] = useState<AgentProfile | null>(null);
  const [agentState, setAgentStateInfo] = useState<AgentStateInfo | null>(null);
  
  const [activeTasks, setActiveTasks] = useState<Task[]>([]);
  const [incomingTask, setIncomingTask] = useState<IncomingTask | null>(null);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  
  const [idleCodes] = useState<IdleCode[]>(mockIdleCodes);
  const [wrapUpCodes] = useState<WrapUpCode[]>(mockWrapUpCodes);
  const [queues] = useState<Queue[]>(mockQueues);
  const [teamAgents] = useState<TeamAgent[]>(mockTeamAgents);
  
  const [agentMetrics, setAgentMetrics] = useState<AgentMetrics | null>(null);

  const ronaTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Simulate SDK initialization
  const initialize = useCallback(async () => {
    try {
      // In real implementation, this would call Desktop.config.init()
      await new Promise(resolve => setTimeout(resolve, 1000));
      setIsInitialized(true);
      setIsConnected(true);
      console.log('[WebexCC] SDK Initialized');
    } catch (error) {
      setConnectionError('Failed to initialize SDK');
      console.error('[WebexCC] Init error:', error);
    }
  }, []);

  // Login
  const login = useCallback(async (teamId: string, dialNumber: string) => {
    try {
      await new Promise(resolve => setTimeout(resolve, 500));
      setAgentProfile({
        agentId: 'agent-001',
        name: 'Demo Agent',
        email: 'agent@company.com',
        teamId,
        teamName: 'Demo Team',
        siteId: 'site-001',
        siteName: 'Main Site',
        extension: '1001',
        dialNumber,
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
      console.log('[WebexCC] Agent logged in');
    } catch (error) {
      console.error('[WebexCC] Login error:', error);
      throw error;
    }
  }, []);

  // Logout
  const logout = useCallback(async () => {
    setAgentProfile(null);
    setAgentStateInfo(null);
    setActiveTasks([]);
    setIncomingTask(null);
    setAgentMetrics(null);
    console.log('[WebexCC] Agent logged out');
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
      },
      customerName: 'John Customer',
      customerEmail: 'john@example.com',
      customerPhone: incomingTask.ani,
    };
    
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
    console.log('[WebexCC] Task wrapped up:', taskId, 'with code:', wrapUpCodeId);
  }, [activeTasks, selectedTaskId]);

  // Transfer to queue
  const transferToQueue = useCallback(async (taskId: string, queueId: string) => {
    setActiveTasks(prev => prev.filter(t => t.taskId !== taskId));
    if (selectedTaskId === taskId) {
      setSelectedTaskId(null);
    }
    if (activeTasks.length <= 1) {
      setAgentStateInfo(prev => prev ? { ...prev, state: 'Available' } : null);
    }
    console.log('[WebexCC] Transferred to queue:', queueId);
  }, [activeTasks.length, selectedTaskId]);

  // Transfer to agent
  const transferToAgent = useCallback(async (taskId: string, agentId: string) => {
    setActiveTasks(prev => prev.filter(t => t.taskId !== taskId));
    if (selectedTaskId === taskId) {
      setSelectedTaskId(null);
    }
    if (activeTasks.length <= 1) {
      setAgentStateInfo(prev => prev ? { ...prev, state: 'Available' } : null);
    }
    console.log('[WebexCC] Transferred to agent:', agentId);
  }, [activeTasks.length, selectedTaskId]);

  // Transfer to DN
  const transferToDN = useCallback(async (taskId: string, dialNumber: string) => {
    setActiveTasks(prev => prev.filter(t => t.taskId !== taskId));
    if (selectedTaskId === taskId) {
      setSelectedTaskId(null);
    }
    if (activeTasks.length <= 1) {
      setAgentStateInfo(prev => prev ? { ...prev, state: 'Available' } : null);
    }
    console.log('[WebexCC] Transferred to DN:', dialNumber);
  }, [activeTasks.length, selectedTaskId]);

  // Consult agent
  const consultAgent = useCallback(async (taskId: string, agentId: string) => {
    setActiveTasks(prev => prev.map(t => 
      t.taskId === taskId ? { ...t, state: 'consulting' } : t
    ));
    console.log('[WebexCC] Consulting agent:', agentId);
  }, []);

  // Outdial
  const outdial = useCallback(async (dialNumber: string, entryPointId: string) => {
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
    setActiveTasks(prev => [...prev, newTask]);
    setSelectedTaskId(newTask.taskId);
    setAgentStateInfo(prev => prev ? { ...prev, state: 'Engaged' } : null);
    console.log('[WebexCC] Outdial to:', dialNumber);
  }, [agentProfile?.dialNumber]);

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
    console.log('[WebexCC] CAD updated:', taskId, key, value);
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
    agentMetrics,
    initialize,
    login,
    logout,
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
    outdial,
    startRecording,
    stopRecording,
    sendChatMessage,
    selectTask,
    updateCADVariable,
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
