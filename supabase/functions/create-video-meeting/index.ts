import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface VideoMeetingRequest {
  taskId: string;
  customerName?: string;
  agentName?: string;
}

interface InstantConnectResponse {
  host: { short_link: string };
  guest: { short_link: string };
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const webexBotToken = Deno.env.get('WEBEX_BOT_TOKEN');
    
    if (!webexBotToken) {
      console.error('[create-video-meeting] Missing WEBEX_BOT_TOKEN');
      return new Response(
        JSON.stringify({ error: 'Webex Bot Token not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { taskId, customerName, agentName }: VideoMeetingRequest = await req.json();
    
    console.log('[create-video-meeting] Creating meeting for task:', taskId);

    // Call Webex Instant Connect API
    const instantConnectResponse = await fetch('https://mtg-broker-a.wbx2.com/api/v2/joseencrypt', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${webexBotToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        jwt: {
          sub: taskId,
        },
        aud: 'a4d886b0-979f-4e2c-a958-3e8c14605e51', // Webex Instant Connect audience
        numHost: 1,
        numGuest: 1,
        verticalType: 'gen', // Generic vertical
        provideShortUrls: true,
        hostDisplayName: agentName || 'Support Agent',
        guestDisplayName: customerName || 'Customer',
      }),
    });

    if (!instantConnectResponse.ok) {
      const errorText = await instantConnectResponse.text();
      console.error('[create-video-meeting] Instant Connect API error:', instantConnectResponse.status, errorText);
      return new Response(
        JSON.stringify({ error: 'Failed to create video meeting', details: errorText }),
        { status: instantConnectResponse.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const meetingData: InstantConnectResponse = await instantConnectResponse.json();
    
    console.log('[create-video-meeting] Meeting created successfully');

    return new Response(
      JSON.stringify({
        success: true,
        hostUrl: meetingData.host.short_link,
        guestUrl: meetingData.guest.short_link,
        taskId,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[create-video-meeting] Error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: 'Internal server error', message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
