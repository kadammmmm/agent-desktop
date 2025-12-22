// Webex Contact Center GraphQL Search API Service
// https://github.com/WebexSamples/webex-contact-center-api-samples/tree/main/reporting-samples/graphql-sample

import { getGraphQLEndpoint } from '@/lib/webexEnvironment';
import type {
  GraphQLQueryParams,
  GraphQLResponse,
  TaskQueryResult,
  AgentAggregationResult,
  CSRQueryResult,
} from '@/types/webexApi';

/**
 * Execute a GraphQL query against the Webex CC Search API
 */
export async function executeGraphQLQuery<T>(
  params: GraphQLQueryParams,
  accessToken: string
): Promise<GraphQLResponse<T>> {
  const endpoint = getGraphQLEndpoint();

  console.log('[WebexGraphQL] Executing query:', endpoint);
  
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    },
    body: JSON.stringify({
      query: params.query,
      variables: params.variables,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('[WebexGraphQL] Error:', response.status, errorText);
    throw new Error(`GraphQL Error: ${response.status}`);
  }

  const result = await response.json();
  
  if (result.errors?.length) {
    console.error('[WebexGraphQL] Query errors:', result.errors);
  }

  return result;
}

// ============== Pre-built Queries ==============

/**
 * Query for agent task metrics aggregation
 */
export const AGENT_TASK_AGGREGATION_QUERY = `
  query AgentTaskMetrics($filter: TaskFilter!) {
    task(filter: $filter) {
      tasks {
        id
        channelType
        direction
        status
        createdTime
        endedTime
        duration
        queueName
        wrapUpCode
        terminationType
      }
    }
  }
`;

/**
 * Query for tasks by agent with time filter
 */
export const AGENT_TASKS_QUERY = `
  query AgentTasks($agentId: ID!, $from: DateTime!, $to: DateTime!) {
    task(
      filter: {
        agentId: { equals: $agentId }
        createdTime: { gte: $from, lte: $to }
      }
    ) {
      tasks {
        id
        channelType
        direction
        status
        createdTime
        endedTime
        duration
        queueName
        wrapUpCode
      }
    }
  }
`;

/**
 * Query for FCR (First Call Resolution) metrics
 */
export const FCR_METRICS_QUERY = `
  query FCRMetrics($agentId: ID!, $from: DateTime!, $to: DateTime!) {
    task(
      filter: {
        agentId: { equals: $agentId }
        createdTime: { gte: $from, lte: $to }
        terminationType: { in: ["normal", "transfer"] }
      }
    ) {
      tasks {
        id
        terminationType
        wrapUpCode
        ani
      }
    }
  }
`;

/**
 * Query for CSAT data from surveys
 */
export const CSAT_METRICS_QUERY = `
  query CSATMetrics($agentId: ID!, $from: DateTime!, $to: DateTime!) {
    csr(
      filter: {
        tasks: { agentId: { equals: $agentId } }
        startTime: { gte: $from, lte: $to }
      }
    ) {
      records {
        sessionId
        surveys {
          surveyId
          score
        }
      }
    }
  }
`;

/**
 * Query for handle time history (last 7 days)
 */
export const HANDLE_TIME_HISTORY_QUERY = `
  query HandleTimeHistory($agentId: ID!, $from: DateTime!, $to: DateTime!) {
    task(
      filter: {
        agentId: { equals: $agentId }
        createdTime: { gte: $from, lte: $to }
        status: { equals: "ended" }
      }
    ) {
      tasks {
        id
        createdTime
        duration
      }
    }
  }
`;

// ============== Query Execution Functions ==============

/**
 * Get agent tasks for a time range
 */
export async function getAgentTasks(
  agentId: string,
  from: Date,
  to: Date,
  accessToken: string
): Promise<TaskQueryResult> {
  const result = await executeGraphQLQuery<TaskQueryResult>(
    {
      query: AGENT_TASKS_QUERY,
      variables: {
        agentId,
        from: from.toISOString(),
        to: to.toISOString(),
      },
    },
    accessToken
  );

  if (result.errors?.length) {
    throw new Error(result.errors[0].message);
  }

  return result.data!;
}

/**
 * Calculate FCR from task data
 */
export async function calculateFCR(
  agentId: string,
  from: Date,
  to: Date,
  accessToken: string
): Promise<number | undefined> {
  try {
    const result = await executeGraphQLQuery<TaskQueryResult>(
      {
        query: FCR_METRICS_QUERY,
        variables: {
          agentId,
          from: from.toISOString(),
          to: to.toISOString(),
        },
      },
      accessToken
    );

    if (!result.data?.task?.tasks?.length) return undefined;

    const tasks = result.data.task.tasks;
    
    // Group by ANI to find repeat callers
    const aniCounts: Record<string, number> = {};
    for (const task of tasks) {
      if (task.ani) {
        aniCounts[task.ani] = (aniCounts[task.ani] || 0) + 1;
      }
    }

    // FCR = calls that didn't result in a callback within the period
    const uniqueCallers = Object.keys(aniCounts).length;
    const repeatCallers = Object.values(aniCounts).filter(c => c > 1).length;
    
    if (uniqueCallers === 0) return undefined;
    
    const fcr = ((uniqueCallers - repeatCallers) / uniqueCallers) * 100;
    return Math.round(fcr);
  } catch (error) {
    console.error('[WebexGraphQL] FCR calculation error:', error);
    return undefined;
  }
}

/**
 * Calculate CSAT from survey data
 */
export async function calculateCSAT(
  agentId: string,
  from: Date,
  to: Date,
  accessToken: string
): Promise<number | undefined> {
  try {
    const result = await executeGraphQLQuery<CSRQueryResult>(
      {
        query: CSAT_METRICS_QUERY,
        variables: {
          agentId,
          from: from.toISOString(),
          to: to.toISOString(),
        },
      },
      accessToken
    );

    if (!result.data?.csr?.records?.length) return undefined;

    const allScores: number[] = [];
    for (const record of result.data.csr.records) {
      if (record.surveys) {
        for (const survey of record.surveys) {
          if (typeof survey.score === 'number') {
            allScores.push(survey.score);
          }
        }
      }
    }

    if (allScores.length === 0) return undefined;

    const avgScore = allScores.reduce((a, b) => a + b, 0) / allScores.length;
    return Math.round(avgScore * 10) / 10;
  } catch (error) {
    console.error('[WebexGraphQL] CSAT calculation error:', error);
    return undefined;
  }
}

/**
 * Get handle time history for last 7 days
 */
export async function getHandleTimeHistory(
  agentId: string,
  accessToken: string
): Promise<number[]> {
  try {
    const to = new Date();
    const from = new Date();
    from.setDate(from.getDate() - 7);

    const result = await executeGraphQLQuery<TaskQueryResult>(
      {
        query: HANDLE_TIME_HISTORY_QUERY,
        variables: {
          agentId,
          from: from.toISOString(),
          to: to.toISOString(),
        },
      },
      accessToken
    );

    if (!result.data?.task?.tasks?.length) {
      return [0, 0, 0, 0, 0, 0, 0];
    }

    // Group by day and calculate average
    const dailyTotals: { total: number; count: number }[] = Array(7)
      .fill(null)
      .map(() => ({ total: 0, count: 0 }));

    for (const task of result.data.task.tasks) {
      if (task.duration) {
        const taskDate = new Date(task.createdTime);
        const daysAgo = Math.floor((to.getTime() - taskDate.getTime()) / (1000 * 60 * 60 * 24));
        if (daysAgo >= 0 && daysAgo < 7) {
          const index = 6 - daysAgo; // Most recent at the end
          dailyTotals[index].total += task.duration;
          dailyTotals[index].count++;
        }
      }
    }

    return dailyTotals.map(d => (d.count > 0 ? Math.round(d.total / d.count) : 0));
  } catch (error) {
    console.error('[WebexGraphQL] Handle time history error:', error);
    return [0, 0, 0, 0, 0, 0, 0];
  }
}

/**
 * Get calls by hour for today
 */
export async function getCallsByHour(
  agentId: string,
  accessToken: string
): Promise<number[]> {
  try {
    const to = new Date();
    const from = new Date();
    from.setHours(0, 0, 0, 0);

    const result = await executeGraphQLQuery<TaskQueryResult>(
      {
        query: AGENT_TASKS_QUERY,
        variables: {
          agentId,
          from: from.toISOString(),
          to: to.toISOString(),
        },
      },
      accessToken
    );

    // Initialize hourly counts (9 AM to 5 PM)
    const hourlyCounts = new Array(8).fill(0);

    if (result.data?.task?.tasks) {
      for (const task of result.data.task.tasks) {
        const hour = new Date(task.createdTime).getHours();
        if (hour >= 9 && hour < 17) {
          hourlyCounts[hour - 9]++;
        }
      }
    }

    return hourlyCounts;
  } catch (error) {
    console.error('[WebexGraphQL] Calls by hour error:', error);
    return [0, 0, 0, 0, 0, 0, 0, 0];
  }
}
