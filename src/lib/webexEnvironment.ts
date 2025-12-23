// Environment detection for Webex Contact Center integration
import type { EnvironmentDiagnostics } from '@/types/sdk-debug';

/**
 * Detects if the widget is running inside the Webex CC Agent Desktop
 */
export function isRunningInAgentDesktop(): boolean {
  try {
    // Check for Desktop SDK availability (most reliable check)
    const hasDesktopSDK = typeof (window as any).Desktop !== 'undefined' ||
                          typeof (window as any).wxcc !== 'undefined' ||
                          typeof (window as any).WxCC !== 'undefined';
    
    if (hasDesktopSDK) return true;
    
    // Check if we're in an iframe embedded in Agent Desktop
    if (window.parent === window) return false;
    
    // Check for known Agent Desktop URL patterns
    const referrer = document.referrer.toLowerCase();
    const isWebexDomain = referrer.includes('webex.com') || 
                          referrer.includes('wxcc') || 
                          referrer.includes('cjp.cisco.com');
    
    return isWebexDomain;
  } catch {
    // Cross-origin restrictions might prevent checking
    return false;
  }
}

/**
 * Get the Webex CC region from config or detect from URL
 */
export function getWebexRegion(): 'us1' | 'eu1' | 'eu2' | 'anz1' | 'ca1' | 'jp1' | 'sg1' {
  try {
    const hostname = window.location.hostname;
    const referrer = document.referrer;
    
    // Map hostnames to regions
    if (hostname.includes('eu1') || referrer.includes('eu1')) return 'eu1';
    if (hostname.includes('eu2') || referrer.includes('eu2')) return 'eu2';
    if (hostname.includes('anz1') || referrer.includes('anz1')) return 'anz1';
    if (hostname.includes('ca1') || referrer.includes('ca1')) return 'ca1';
    if (hostname.includes('jp1') || referrer.includes('jp1')) return 'jp1';
    if (hostname.includes('sg1') || referrer.includes('sg1')) return 'sg1';
  } catch {
    // Default to US region
  }
  return 'us1';
}

/**
 * Get the API base URL for the detected region
 */
export function getApiBaseUrl(): string {
  const region = getWebexRegion();
  return `https://api.wxcc-${region}.cisco.com`;
}

/**
 * Get the GraphQL Search API endpoint for the detected region
 */
export function getGraphQLEndpoint(): string {
  const region = getWebexRegion();
  return `https://api.wxcc-${region}.cisco.com/search`;
}

/**
 * Check if demo mode is enabled (not in Agent Desktop)
 */
export function isDemoMode(): boolean {
  // Check localStorage for explicit demo mode setting
  const demoSettings = localStorage.getItem('webex-demo-settings');
  if (demoSettings) {
    try {
      const settings = JSON.parse(demoSettings);
      if (settings.enabled === false) return false;
    } catch {}
  }
  
  // Default to demo mode if not running in Agent Desktop
  return !isRunningInAgentDesktop();
}

/**
 * Get comprehensive environment diagnostics for debugging
 */
export function getEnvironmentDiagnostics(): EnvironmentDiagnostics {
  let parentOrigin: string | null = null;
  
  try {
    // Try to get parent origin (may fail due to cross-origin)
    if (window.parent !== window) {
      parentOrigin = window.parent.location.origin;
    }
  } catch {
    parentOrigin = '[cross-origin - blocked]';
  }
  
  return {
    isIframe: window.parent !== window,
    parentOrigin,
    documentReferrer: document.referrer || '[none]',
    currentUrl: window.location.href,
    hostname: window.location.hostname,
    hasDesktopSDK: typeof (window as any).Desktop !== 'undefined',
    hasWxccGlobal: typeof (window as any).wxcc !== 'undefined' || typeof (window as any).WxCC !== 'undefined',
    detectedRegion: getWebexRegion(),
    isDemoMode: isDemoMode(),
    isRunningInAgentDesktop: isRunningInAgentDesktop(),
    userAgent: navigator.userAgent,
    timestamp: Date.now(),
  };
}
