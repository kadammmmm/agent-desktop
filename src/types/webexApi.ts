// Webex Contact Center API Response Types

// ============== Agent Statistics API ==============
// https://developer.webex-cx.com/documentation/agents/v1/get-agent-statistics

export interface AgentStatisticsParams {
  agentId: string;
  from?: string;  // ISO 8601 date
  to?: string;    // ISO 8601 date
  interval?: string;
}

export interface AgentStatisticsResponse {
  data: {
    agentId: string;
    agentName?: string;
    statistics: {
      callsHandled: number;
      callsPresented: number;
      callsAnswered: number;
      callsAbandoned: number;
      avgTalkTime: number;
      avgHoldTime: number;
      avgHandleTime: number;
      avgWrapUpTime: number;
      avgSpeedToAnswer: number;
      maxTalkTime: number;
      totalTalkTime: number;
      totalHoldTime: number;
      totalWrapUpTime: number;
      occupancy: number;
      adherence?: number;
    };
    byChannel?: {
      voice?: ChannelStatistics;
      chat?: ChannelStatistics;
      email?: ChannelStatistics;
    };
  };
}

export interface ChannelStatistics {
  handled: number;
  avgHandleTime: number;
  avgWrapTime: number;
}

// ============== Agent Activities API ==============
// https://developer.webex-cx.com/documentation/agents/v1/get-agent-activities

export interface AgentActivitiesParams {
  agentId: string;
  from: string;   // ISO 8601 date
  to: string;     // ISO 8601 date
  pageSize?: number;
  pageNumber?: number;
}

export interface AgentActivitiesResponse {
  data: {
    activities: AgentActivity[];
    pagination?: {
      pageNumber: number;
      pageSize: number;
      totalPages: number;
      totalRecords: number;
    };
  };
}

export interface AgentActivity {
  activityId: string;
  agentId: string;
  state: string;
  stateReason?: string;
  idleCode?: string;
  startTime: string;
  endTime?: string;
  duration: number;
  channel?: string;
}

// ============== Queue Statistics API ==============
// https://developer.webex-cx.com/documentation/queues

export interface QueueStatisticsParams {
  queueId: string;
  from?: string;
  to?: string;
  interval?: string;
}

export interface QueueStatisticsResponse {
  data: {
    queueId: string;
    queueName: string;
    statistics: {
      callsInQueue: number;
      callsHandled: number;
      callsAbandoned: number;
      avgWaitTime: number;
      maxWaitTime: number;
      avgHandleTime: number;
      serviceLevelMet: number;
      serviceLevelTarget: number;
    };
    byInterval?: QueueIntervalStats[];
  };
}

export interface QueueIntervalStats {
  startTime: string;
  endTime: string;
  callsHandled: number;
  avgWaitTime: number;
}

// ============== GraphQL Search API ==============
// https://github.com/WebexSamples/webex-contact-center-api-samples/tree/main/reporting-samples/graphql-sample

export interface GraphQLQueryParams {
  query: string;
  variables?: Record<string, any>;
}

export interface GraphQLResponse<T> {
  data?: T;
  errors?: GraphQLError[];
}

export interface GraphQLError {
  message: string;
  locations?: { line: number; column: number }[];
  path?: string[];
}

// Task Query Types
export interface TaskQueryResult {
  task: {
    tasks: TaskRecord[];
    pageInfo?: PageInfo;
  };
}

export interface TaskRecord {
  id: string;
  channelType: string;
  direction: string;
  origin: string;
  destination: string;
  status: string;
  createdTime: string;
  endedTime?: string;
  duration?: number;
  queueId?: string;
  queueName?: string;
  agentId?: string;
  agentName?: string;
  wrapUpCode?: string;
  terminationType?: string;
  ani?: string;
  dnis?: string;
  isRecorded?: boolean;
}

export interface PageInfo {
  hasNextPage: boolean;
  endCursor?: string;
}

// Agent Session Query Types
export interface AgentSessionQueryResult {
  agentSession: {
    sessions: AgentSessionRecord[];
  };
}

export interface AgentSessionRecord {
  agentId: string;
  agentName: string;
  sessionId: string;
  startTime: string;
  endTime?: string;
  stateChanges: StateChangeRecord[];
}

export interface StateChangeRecord {
  state: string;
  reason?: string;
  startTime: string;
  duration: number;
}

// Aggregation Query Types
export interface AgentAggregationResult {
  taskAggregation: {
    agentId: string;
    totalTasks: number;
    avgHandleTime: number;
    avgTalkTime: number;
    avgWrapUpTime: number;
    byHour?: {
      hour: number;
      count: number;
    }[];
    byChannel?: {
      channel: string;
      count: number;
    }[];
  };
}

// CSR (Customer Session Record) Types
export interface CSRQueryResult {
  csr: {
    records: CSRRecord[];
  };
}

export interface CSRRecord {
  sessionId: string;
  customerId?: string;
  ani: string;
  dnis: string;
  channelType: string;
  startTime: string;
  endTime?: string;
  tasks: {
    taskId: string;
    agentId?: string;
    queueId?: string;
    status: string;
    duration: number;
  }[];
  surveys?: {
    surveyId: string;
    score: number;
    response?: string;
  }[];
}

// CAR (Contact Activity Record) Types
export interface CARQueryResult {
  car: {
    records: CARRecord[];
  };
}

export interface CARRecord {
  activityId: string;
  taskId: string;
  activityType: string;
  startTime: string;
  endTime?: string;
  duration: number;
  agentId?: string;
  queueId?: string;
  reason?: string;
}
