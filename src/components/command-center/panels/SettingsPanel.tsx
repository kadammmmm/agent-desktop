import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';

export function SettingsPanel() {
  return (
    <div className="space-y-4 animate-fade-in">
      <Card>
        <CardHeader><CardTitle>Preferences</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <Label htmlFor="auto-answer">Auto-answer calls</Label>
            <Switch id="auto-answer" />
          </div>
          <div className="flex items-center justify-between">
            <Label htmlFor="notifications">Desktop notifications</Label>
            <Switch id="notifications" defaultChecked />
          </div>
          <div className="flex items-center justify-between">
            <Label htmlFor="sounds">Sound alerts</Label>
            <Switch id="sounds" defaultChecked />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
