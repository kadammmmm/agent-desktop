import { useEffect, useState } from 'react';
import { useWebex } from '@/contexts/WebexContext';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Phone, PhoneOff, SkipForward, X, Clock } from 'lucide-react';

/**
 * Floating card for outbound campaign reservations (preview/progressive dial).
 * Powered by Desktop.dialer campaign events + previewCampaignAccept/Skip/Remove.
 */
export function CampaignContactPanel() {
  const {
    campaignContacts,
    acceptCampaignContact,
    skipCampaignContact,
    removeCampaignContact,
  } = useWebex();

  const first = campaignContacts[0];
  if (!first) return null;

  return (
    <div className="fixed bottom-4 right-4 z-40 w-96 max-w-[calc(100vw-2rem)]">
      <Card className="shadow-xl border-primary/40">
        <div className="flex items-center justify-between px-3 py-2 border-b border-border bg-primary/5">
          <div className="flex items-center gap-2 min-w-0">
            <Phone className="h-4 w-4 text-primary shrink-0" />
            <span className="text-sm font-medium truncate">
              Campaign Reservation{first.campaignName ? ` · ${first.campaignName}` : ''}
            </span>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={() => removeCampaignContact(first.interactionId)}
            aria-label="Remove reservation"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="p-3 space-y-3">
          <div>
            <p className="text-sm font-medium">
              {first.customerName || first.phoneNumber || 'Reserved contact'}
            </p>
            {first.phoneNumber && (
              <p className="text-xs text-muted-foreground">{first.phoneNumber}</p>
            )}
          </div>

          <CampaignCountdown deadline={first.previewDeadline} />

          <div className="grid grid-cols-2 gap-2">
            <Button
              size="sm"
              onClick={() => acceptCampaignContact(first.interactionId)}
              className="w-full"
            >
              <Phone className="h-4 w-4 mr-1" /> Accept
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => skipCampaignContact(first.interactionId)}
              className="w-full"
            >
              <SkipForward className="h-4 w-4 mr-1" /> Skip
            </Button>
          </div>
        </div>

        {campaignContacts.length > 1 && (
          <p className="px-3 pb-2 text-xs text-muted-foreground">
            +{campaignContacts.length - 1} more waiting
          </p>
        )}
      </Card>
    </div>
  );
}

function CampaignCountdown({ deadline }: { deadline?: number }) {
  const [left, setLeft] = useState(deadline ? Math.max(0, deadline - Date.now()) : 0);
  useEffect(() => {
    if (!deadline) return;
    const tick = () => setLeft(Math.max(0, deadline - Date.now()));
    tick();
    const id = setInterval(tick, 500);
    return () => clearInterval(id);
  }, [deadline]);
  if (!deadline || left <= 0) return null;
  const s = Math.ceil(left / 1000);
  return (
    <div className="flex items-center gap-1 text-xs text-muted-foreground">
      <Clock className="h-3 w-3" /> Auto-dial in {s}s
    </div>
  );
}
