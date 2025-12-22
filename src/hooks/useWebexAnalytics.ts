// Hook for fetching Webex CC analytics data with real API integration

import { useState, useEffect, useCallback } from 'react';
import { useWebex } from '@/contexts/WebexContext';
import { isDemoMode } from '@/lib/webexEnvironment';
import { getAgentStatistics, getAgentActivities, aggregateActivitiesByState } from '@/services/webexReportingApi';
import { calculateFCR, calculateCSAT, getHandleTimeHistory, getCallsByHour } from '@/services/webexGraphQL';
import type { ExtendedMetrics, AgentMetrics } from '@/types/webex';

interface UseWebexAnalyticsResult {
  metrics: AgentMetrics | null;
  extendedMetrics: ExtendedMetrics | null;
  isLoading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  lastUpdated: Date | null;
}

// Mock extended metrics for demo mode
const mockExtendedMetrics: ExtendedMetrics = {
  callsHandled: 24,
  avgHandleTime: 320,
  avgWrapTime: 45,
  occupancy: 78,
  adherence: 95,
  fcr: 85,
  csat: 4.2,
  handleTimeHistory: [280, 310, 295, 340, 320, 310, 330],
  callsByHour: [2, 3, 5, 4, 6, 3, 1, 2],
  stateBreakdown: { available: 45, engaged: 35, idle: 15, wrapup: 5 },
  callsYesterday: 22,
  callsTrend: 'up',
};

export function useWebexAnalytics(): UseWebexAnalyticsResult {
  const { agentProfile, agentMetrics: contextMetrics, extendedMetrics: contextExtended } = useWebex();
  
  const [metrics, setMetrics] = useState<AgentMetrics | null>(null);
  const [extendedMetrics, setExtendedMetrics] = useState<ExtendedMetrics | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const fetchAnalytics = useCallback(async () => {
    if (!agentProfile) {
      setError('No agent profile available');
      return;
    }

    // In demo mode, use mock data from context
    if (isDemoMode()) {
      console.log('[useWebexAnalytics] Demo mode - using mock data');
      setMetrics(contextMetrics);
      setExtendedMetrics(contextExtended || mockExtendedMetrics);
      setLastUpdated(new Date());
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Get access token from Desktop SDK
      let accessToken: string;
      try {
        const { Desktop } = await import('@wxcc-desktop/sdk');
        const token = await Desktop.actions.getToken();
        if (!token) throw new Error('No token available');
        accessToken = token;
      } catch (sdkError) {
        console.error('[useWebexAnalytics] SDK token error:', sdkError);
        throw new Error('Failed to get access token from Desktop SDK');
      }

      const agentId = agentProfile.agentId;
      const now = new Date();
      const startOfDay = new Date(now);
      startOfDay.setHours(0, 0, 0, 0);

      // Fetch data in parallel
      const [
        statsResponse,
        activitiesResponse,
        fcr,
        csat,
        handleTimeHistory,
        callsByHour,
      ] = await Promise.all([
        getAgentStatistics({ agentId, from: startOfDay.toISOString(), to: now.toISOString() }, accessToken),
        getAgentActivities({ agentId, from: startOfDay.toISOString(), to: now.toISOString() }, accessToken),
        calculateFCR(agentId, startOfDay, now, accessToken),
        calculateCSAT(agentId, startOfDay, now, accessToken),
        getHandleTimeHistory(agentId, accessToken),
        getCallsByHour(agentId, accessToken),
      ]);

      const stats = statsResponse.data.statistics;
      const stateBreakdown = aggregateActivitiesByState(activitiesResponse.data.activities);

      // Build metrics
      const newMetrics: AgentMetrics = {
        callsHandled: stats.callsHandled,
        avgHandleTime: Math.round(stats.avgHandleTime),
        avgWrapTime: Math.round(stats.avgWrapUpTime),
        occupancy: Math.round(stats.occupancy * 100),
        adherence: stats.adherence ? Math.round(stats.adherence * 100) : 95,
        fcr,
        csat,
      };

      // Get yesterday's calls for trend
      const yesterday = new Date(startOfDay);
      yesterday.setDate(yesterday.getDate() - 1);
      let callsYesterday: number | undefined;
      let callsTrend: 'up' | 'down' | 'same' | undefined;
      
      try {
        const yesterdayStats = await getAgentStatistics({
          agentId,
          from: yesterday.toISOString(),
          to: startOfDay.toISOString(),
        }, accessToken);
        callsYesterday = yesterdayStats.data.statistics.callsHandled;
        callsTrend = stats.callsHandled > callsYesterday ? 'up' : 
                     stats.callsHandled < callsYesterday ? 'down' : 'same';
      } catch {
        // Yesterday's data optional
      }

      const newExtendedMetrics: ExtendedMetrics = {
        ...newMetrics,
        handleTimeHistory,
        callsByHour,
        stateBreakdown: {
          available: stateBreakdown.Available || 0,
          engaged: stateBreakdown.Engaged || 0,
          idle: stateBreakdown.Idle || 0,
          wrapup: stateBreakdown.WrapUp || 0,
        },
        callsYesterday,
        callsTrend,
      };

      setMetrics(newMetrics);
      setExtendedMetrics(newExtendedMetrics);
      setLastUpdated(new Date());
      console.log('[useWebexAnalytics] Data fetched successfully');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to fetch analytics';
      console.error('[useWebexAnalytics] Error:', message);
      setError(message);
      
      // Fallback to context data on error
      if (contextMetrics) {
        setMetrics(contextMetrics);
        setExtendedMetrics(contextExtended || mockExtendedMetrics);
      }
    } finally {
      setIsLoading(false);
    }
  }, [agentProfile, contextMetrics, contextExtended]);

  // Initial fetch
  useEffect(() => {
    fetchAnalytics();
  }, [fetchAnalytics]);

  // Auto-refresh every 30 seconds
  useEffect(() => {
    const interval = setInterval(fetchAnalytics, 30000);
    return () => clearInterval(interval);
  }, [fetchAnalytics]);

  return {
    metrics,
    extendedMetrics,
    isLoading,
    error,
    refresh: fetchAnalytics,
    lastUpdated,
  };
}
