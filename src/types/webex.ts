// Webex Contact Center Types

export type AgentState = 
  | 'Available'
  | 'Idle'
  | 'RONA'
  | 'Engaged'
  | 'WrapUp'
  | 'Offline';

export type ChannelType = 'voice' | 'chat' | 'email' | 'social';

export interface AgentProfile {
  agentId: string;
  name: string;
  email: string;
  teamId: string;
  teamName: string;
  siteId: string;
  siteName: string;
  extension: string;
  dialNumber: string;
}

export interface AgentStateInfo {
  state: AgentState;
  subState?: string;
  idleCode?: {
    id: string;
    name: string;
  };
  lastStateChangeTime: number;
}

export interface Task {
  taskId: string;
  mediaType: ChannelType;
  mediaChannel: string;
  state: 'incoming' | 'connected' | 'held' | 'consulting' | 'conferencing' | 'wrapup';
  direction: 'inbound' | 'outbound';
  queueName: string;
  ani: string;
  dnis: string;
  startTime: number;
  isRecording: boolean;
  isMuted: boolean;
  isHeld: boolean;
  wrapUpRequired: boolean;
  cadVariables: Record<string, string>;
  customerName?: string;
  customerEmail?: string;
  customerPhone?: string;
}

export interface IncomingTask {
  taskId: string;
  mediaType: ChannelType;
  ani: string;
  queueName: string;
  ronaTimeout: number;
  startTime: number;
}

export interface TransferTarget {
  type: 'agent' | 'queue' | 'dn' | 'entryPoint';
  id: string;
  name: string;
  status?: 'available' | 'busy' | 'offline';
}

export interface WrapUpCode {
  id: string;
  name: string;
}

export interface IdleCode {
  id: string;
  name: string;
}

export interface Queue {
  id: string;
  name: string;
  waitingTasks: number;
  avgWaitTime: number;
}

export interface TeamAgent {
  agentId: string;
  name: string;
  state: AgentState;
  teamName: string;
}

export interface CallLogEntry {
  taskId: string;
  mediaType: ChannelType;
  ani: string;
  direction: 'inbound' | 'outbound';
  duration: number;
  timestamp: number;
  wrapUpCode?: string;
}

export interface CustomerProfile {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  company?: string;
  notes?: string;
  interactionHistory: CallLogEntry[];
  cadVariables: Record<string, string>;
}

export interface AgentMetrics {
  callsHandled: number;
  avgHandleTime: number;
  avgWrapTime: number;
  occupancy: number;
  adherence: number;
}

export type NavigationSection = 
  | 'interactions'
  | 'customer'
  | 'transfer'
  | 'analytics'
  | 'settings';

export interface EnhancedPanelState {
  customer360: boolean;
  analytics: boolean;
  transferDirectory: boolean;
  notes: boolean;
}
