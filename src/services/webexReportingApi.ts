// Webex Contact Center REST API Service
// https://developer.webex-cx.com/documentation/agents

import { getApiBaseUrl } from '@/lib/webexEnvironment';
import type {
  AgentStatisticsParams,
  AgentStatisticsResponse,
  AgentActivitiesParams,
  AgentActivitiesResponse,
  QueueStatisticsParams,
  QueueStatisticsResponse,
} from '@/types/webexApi';

/**
 * Create headers for API requests
 */
function createHeaders(accessToken: string): HeadersInit {
  return {
    'Authorization': `Bearer ${accessToken}`,
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  };
}

/**
 * Handle API errors
 */
async function handleResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const errorText = await response.text();
    console.error('[WebexAPI] Error response:', response.status, errorText);
    throw new Error(`API Error: ${response.status} - ${response.statusText}`);
  }
  return response.json();
}

/**
 * Get Agent Statistics
 * https://developer.webex-cx.com/documentation/agents/v1/get-agent-statistics
 */
export async function getAgentStatistics(
  params: AgentStatisticsParams,
  accessToken: string
): Promise<AgentStatisticsResponse> {
  const baseUrl = getApiBaseUrl();
  const url = new URL(`${baseUrl}/v1/agents/${params.agentId}/statistics`);
  
  if (params.from) url.searchParams.set('from', params.from);
  if (params.to) url.searchParams.set('to', params.to);
  if (params.interval) url.searchParams.set('interval', params.interval);

  console.log('[WebexAPI] Fetching agent statistics:', url.toString());
  
  const response = await fetch(url.toString(), {
    method: 'GET',
    headers: createHeaders(accessToken),
  });

  return handleResponse<AgentStatisticsResponse>(response);
}

/**
 * Get Agent Activities
 * https://developer.webex-cx.com/documentation/agents/v1/get-agent-activities
 */
export async function getAgentActivities(
  params: AgentActivitiesParams,
  accessToken: string
): Promise<AgentActivitiesResponse> {
  const baseUrl = getApiBaseUrl();
  const url = new URL(`${baseUrl}/v1/agents/${params.agentId}/activities`);
  
  url.searchParams.set('from', params.from);
  url.searchParams.set('to', params.to);
  if (params.pageSize) url.searchParams.set('pageSize', params.pageSize.toString());
  if (params.pageNumber) url.searchParams.set('pageNumber', params.pageNumber.toString());

  console.log('[WebexAPI] Fetching agent activities:', url.toString());
  
  const response = await fetch(url.toString(), {
    method: 'GET',
    headers: createHeaders(accessToken),
  });

  return handleResponse<AgentActivitiesResponse>(response);
}

/**
 * Get Queue Statistics
 * https://developer.webex-cx.com/documentation/queues
 */
export async function getQueueStatistics(
  params: QueueStatisticsParams,
  accessToken: string
): Promise<QueueStatisticsResponse> {
  const baseUrl = getApiBaseUrl();
  const url = new URL(`${baseUrl}/v1/queues/${params.queueId}/statistics`);
  
  if (params.from) url.searchParams.set('from', params.from);
  if (params.to) url.searchParams.set('to', params.to);
  if (params.interval) url.searchParams.set('interval', params.interval);

  console.log('[WebexAPI] Fetching queue statistics:', url.toString());
  
  const response = await fetch(url.toString(), {
    method: 'GET',
    headers: createHeaders(accessToken),
  });

  return handleResponse<QueueStatisticsResponse>(response);
}

/**
 * Get multiple queue statistics
 */
export async function getAllQueuesStatistics(
  queueIds: string[],
  accessToken: string,
  from?: string,
  to?: string
): Promise<QueueStatisticsResponse[]> {
  const promises = queueIds.map(queueId =>
    getQueueStatistics({ queueId, from, to }, accessToken)
  );
  return Promise.all(promises);
}

/**
 * Calculate derived metrics from API responses
 */
export function calculateDerivedMetrics(stats: AgentStatisticsResponse['data']['statistics']) {
  return {
    callsHandled: stats.callsHandled,
    avgHandleTime: Math.round(stats.avgHandleTime),
    avgWrapTime: Math.round(stats.avgWrapUpTime),
    occupancy: Math.round(stats.occupancy * 100) / 100,
    adherence: stats.adherence ? Math.round(stats.adherence * 100) / 100 : undefined,
    totalTalkTime: stats.totalTalkTime,
    avgTalkTime: stats.avgTalkTime,
    avgHoldTime: stats.avgHoldTime,
  };
}

/**
 * Aggregate activities by state for state breakdown chart
 */
export function aggregateActivitiesByState(
  activities: AgentActivitiesResponse['data']['activities']
): Record<string, number> {
  const stateTotals: Record<string, number> = {
    Available: 0,
    Engaged: 0,
    Idle: 0,
    WrapUp: 0,
  };

  for (const activity of activities) {
    const state = activity.state;
    const durationMinutes = activity.duration / 60;
    
    if (state === 'Available') {
      stateTotals.Available += durationMinutes;
    } else if (state === 'Engaged' || state === 'Connected' || state === 'Talking') {
      stateTotals.Engaged += durationMinutes;
    } else if (state === 'Idle' || state === 'NotReady') {
      stateTotals.Idle += durationMinutes;
    } else if (state === 'WrapUp' || state === 'AfterCallWork') {
      stateTotals.WrapUp += durationMinutes;
    }
  }

  // Convert to percentages
  const total = Object.values(stateTotals).reduce((a, b) => a + b, 0);
  if (total > 0) {
    for (const key of Object.keys(stateTotals)) {
      stateTotals[key] = Math.round((stateTotals[key] / total) * 100);
    }
  }

  return stateTotals;
}

/**
 * Group activities by hour for hourly chart
 */
export function groupActivitiesByHour(
  activities: AgentActivitiesResponse['data']['activities']
): number[] {
  const hourlyCount = new Array(8).fill(0); // 9 AM to 5 PM (8 hours)
  
  for (const activity of activities) {
    if (activity.state === 'Engaged' || activity.state === 'Connected') {
      const hour = new Date(activity.startTime).getHours();
      if (hour >= 9 && hour < 17) {
        hourlyCount[hour - 9]++;
      }
    }
  }

  return hourlyCount;
}
