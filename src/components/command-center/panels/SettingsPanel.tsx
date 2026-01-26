import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useWebex } from '@/contexts/WebexContext';
import { useTheme } from '@/contexts/ThemeContext';
import { isDemoMode } from '@/lib/webexEnvironment';
import { toast } from 'sonner';
import {
  Settings, Volume2, Mic, Monitor, Bell, Keyboard,
  Sun, Moon, User, Building, Upload, Loader2
} from 'lucide-react';

interface AudioDevice {
  deviceId: string;
  label: string;
  kind: 'audioinput' | 'audiooutput';
}

interface AgentPreferences {
  autoAnswer: boolean;
  desktopNotifications: boolean;
  soundAlerts: boolean;
  theme: 'light' | 'dark' | 'system';
  speakerVolume: number;
  ringerVolume: number;
  microphoneId: string;
  speakerId: string;
}

const DEFAULT_PREFERENCES: AgentPreferences = {
  autoAnswer: false,
  desktopNotifications: true,
  soundAlerts: true,
  theme: 'system',
  speakerVolume: 80,
  ringerVolume: 70,
  microphoneId: 'default',
  speakerId: 'default',
};

const KEYBOARD_SHORTCUTS = [
  { keys: ['Ctrl', 'Shift', 'A'], action: 'Accept incoming task' },
  { keys: ['Ctrl', 'Shift', 'D'], action: 'Decline task / Toggle demo panel' },
  { keys: ['Ctrl', 'Shift', 'H'], action: 'Hold/Resume call' },
  { keys: ['Ctrl', 'Shift', 'M'], action: 'Mute/Unmute' },
  { keys: ['Ctrl', 'Shift', 'E'], action: 'End call' },
  { keys: ['Ctrl', 'Shift', 'T'], action: 'Open transfer panel' },
  { keys: ['Ctrl', 'Shift', 'R'], action: 'Toggle recording' },
  { keys: ['Ctrl', 'K'], action: 'Global search' },
];

export function SettingsPanel() {
  const { agentProfile, uploadLogs } = useWebex();
  const { theme, setTheme } = useTheme();
  const demoMode = isDemoMode();
  const [isUploadingLogs, setIsUploadingLogs] = useState(false);
  
  const [preferences, setPreferences] = useState<AgentPreferences>(() => {
    const saved = localStorage.getItem('agent-preferences');
    return saved ? { ...DEFAULT_PREFERENCES, ...JSON.parse(saved) } : DEFAULT_PREFERENCES;
  });
  
  const [audioDevices, setAudioDevices] = useState<AudioDevice[]>([]);
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission>('default');

  // Load audio devices
  useEffect(() => {
    async function loadDevices() {
      try {
        // Request permission first
        await navigator.mediaDevices.getUserMedia({ audio: true });
        const devices = await navigator.mediaDevices.enumerateDevices();
        const audioDevs: AudioDevice[] = devices
          .filter(d => d.kind === 'audioinput' || d.kind === 'audiooutput')
          .map(d => ({
            deviceId: d.deviceId,
            label: d.label || `${d.kind === 'audioinput' ? 'Microphone' : 'Speaker'} ${d.deviceId.slice(0, 4)}`,
            kind: d.kind as 'audioinput' | 'audiooutput',
          }));
        setAudioDevices(audioDevs);
      } catch (error) {
        console.log('[Settings] Audio device enumeration not available');
      }
    }
    loadDevices();
  }, []);

  // Check notification permission
  useEffect(() => {
    if ('Notification' in window) {
      setNotificationPermission(Notification.permission);
    }
  }, []);

  // Save preferences on change
  useEffect(() => {
    localStorage.setItem('agent-preferences', JSON.stringify(preferences));
  }, [preferences]);

  const updatePreference = <K extends keyof AgentPreferences>(key: K, value: AgentPreferences[K]) => {
    setPreferences(prev => ({ ...prev, [key]: value }));
  };

  const requestNotificationPermission = async () => {
    if ('Notification' in window) {
      const permission = await Notification.requestPermission();
      setNotificationPermission(permission);
    }
  };

  const handleUploadLogs = async () => {
    setIsUploadingLogs(true);
    try {
      const feedbackId = await uploadLogs();
      if (feedbackId) {
        toast.success(`Logs uploaded successfully`, {
          description: `Feedback ID: ${feedbackId}`,
          duration: 10000,
        });
      } else {
        toast.error('Log upload not available');
      }
    } catch (error) {
      toast.error('Failed to upload logs', {
        description: error instanceof Error ? error.message : 'Unknown error',
      });
    } finally {
      setIsUploadingLogs(false);
    }
  };

  const microphones = audioDevices.filter(d => d.kind === 'audioinput');
  const speakers = audioDevices.filter(d => d.kind === 'audiooutput');

  return (
    <div className="space-y-6 animate-fade-in max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-lg bg-primary/10">
          <Settings className="w-5 h-5 text-primary" />
        </div>
        <div>
          <h2 className="text-lg font-semibold">Settings</h2>
          <p className="text-sm text-muted-foreground">Configure your agent desktop preferences</p>
        </div>
        {demoMode && (
          <Badge variant="outline" className="ml-auto">Demo Mode</Badge>
        )}
      </div>

      {/* Agent Profile Card */}
      {agentProfile && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <User className="w-4 h-4" />
              Agent Profile
            </CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <Label className="text-muted-foreground">Name</Label>
              <p className="font-medium">{agentProfile.name}</p>
            </div>
            <div>
              <Label className="text-muted-foreground">Email</Label>
              <p className="font-medium">{agentProfile.email}</p>
            </div>
            <div>
              <Label className="text-muted-foreground">Team</Label>
              <p className="font-medium">{agentProfile.teamName}</p>
            </div>
            <div>
              <Label className="text-muted-foreground">Site</Label>
              <p className="font-medium">{agentProfile.siteName}</p>
            </div>
            <div>
              <Label className="text-muted-foreground">Extension</Label>
              <p className="font-medium">{agentProfile.extension}</p>
            </div>
            <div>
              <Label className="text-muted-foreground">Dial Number</Label>
              <p className="font-medium">{agentProfile.dialNumber}</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Preferences */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Monitor className="w-4 h-4" />
            Preferences
          </CardTitle>
          <CardDescription>General agent desktop settings</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="auto-answer">Auto-answer calls</Label>
              <p className="text-xs text-muted-foreground">Automatically accept incoming tasks</p>
            </div>
            <Switch
              id="auto-answer"
              checked={preferences.autoAnswer}
              onCheckedChange={(checked) => updatePreference('autoAnswer', checked)}
            />
          </div>

          <Separator />

          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="notifications">Desktop notifications</Label>
              <p className="text-xs text-muted-foreground">Show browser notifications for incoming tasks</p>
            </div>
            <div className="flex items-center gap-2">
              {notificationPermission === 'denied' && (
                <Badge variant="destructive" className="text-xs">Blocked</Badge>
              )}
              {notificationPermission === 'default' && (
                <Button variant="outline" size="sm" onClick={requestNotificationPermission}>
                  Enable
                </Button>
              )}
              <Switch
                id="notifications"
                checked={preferences.desktopNotifications && notificationPermission === 'granted'}
                onCheckedChange={(checked) => updatePreference('desktopNotifications', checked)}
                disabled={notificationPermission !== 'granted'}
              />
            </div>
          </div>

          <Separator />

          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="sounds">Sound alerts</Label>
              <p className="text-xs text-muted-foreground">Play sounds for incoming tasks and events</p>
            </div>
            <Switch
              id="sounds"
              checked={preferences.soundAlerts}
              onCheckedChange={(checked) => updatePreference('soundAlerts', checked)}
            />
          </div>

          <Separator />

          <div className="flex items-center justify-between">
            <div>
              <Label>Theme</Label>
              <p className="text-xs text-muted-foreground">Choose your preferred appearance</p>
            </div>
            <div className="flex items-center gap-1 border rounded-lg p-1">
              <Button
                variant={theme === 'light' ? 'secondary' : 'ghost'}
                size="sm"
                className="h-7 px-2"
                onClick={() => setTheme('light')}
              >
                <Sun className="w-4 h-4" />
              </Button>
              <Button
                variant={theme === 'dark' ? 'secondary' : 'ghost'}
                size="sm"
                className="h-7 px-2"
                onClick={() => setTheme('dark')}
              >
                <Moon className="w-4 h-4" />
              </Button>
              <Button
                variant={theme === 'system' ? 'secondary' : 'ghost'}
                size="sm"
                className="h-7 px-2"
                onClick={() => setTheme('system')}
              >
                <Monitor className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Audio Settings */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Volume2 className="w-4 h-4" />
            Audio Settings
          </CardTitle>
          <CardDescription>Configure microphone and speaker settings</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Microphone Selection */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <Mic className="w-4 h-4" />
              Microphone
            </Label>
            <Select
              value={preferences.microphoneId}
              onValueChange={(value) => updatePreference('microphoneId', value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select microphone" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="default">System Default</SelectItem>
                {microphones.map(device => (
                  <SelectItem key={device.deviceId} value={device.deviceId}>
                    {device.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Speaker Selection */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <Volume2 className="w-4 h-4" />
              Speaker
            </Label>
            <Select
              value={preferences.speakerId}
              onValueChange={(value) => updatePreference('speakerId', value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select speaker" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="default">System Default</SelectItem>
                {speakers.map(device => (
                  <SelectItem key={device.deviceId} value={device.deviceId}>
                    {device.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Separator />

          {/* Volume Controls */}
          <div className="space-y-3">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Speaker Volume</Label>
                <span className="text-sm text-muted-foreground">{preferences.speakerVolume}%</span>
              </div>
              <Slider
                value={[preferences.speakerVolume]}
                onValueChange={([value]) => updatePreference('speakerVolume', value)}
                max={100}
                step={5}
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Ringer Volume</Label>
                <span className="text-sm text-muted-foreground">{preferences.ringerVolume}%</span>
              </div>
              <Slider
                value={[preferences.ringerVolume]}
                onValueChange={([value]) => updatePreference('ringerVolume', value)}
                max={100}
                step={5}
              />
            </div>
          </div>

          {/* Test Audio */}
          <div className="flex gap-2 pt-2">
            <Button variant="outline" size="sm" className="flex-1">
              <Mic className="w-4 h-4 mr-2" />
              Test Microphone
            </Button>
            <Button variant="outline" size="sm" className="flex-1">
              <Volume2 className="w-4 h-4 mr-2" />
              Test Speaker
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Keyboard Shortcuts */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Keyboard className="w-4 h-4" />
            Keyboard Shortcuts
          </CardTitle>
          <CardDescription>Quick reference for keyboard commands</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {KEYBOARD_SHORTCUTS.map((shortcut, index) => (
              <div
                key={index}
                className="flex items-center justify-between py-2 border-b border-border last:border-0"
              >
                <span className="text-sm">{shortcut.action}</span>
                <div className="flex items-center gap-1">
                  {shortcut.keys.map((key, i) => (
                    <kbd
                      key={i}
                      className="px-2 py-1 text-xs font-semibold bg-muted rounded border border-border"
                    >
                      {key}
                    </kbd>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Diagnostics */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Upload className="w-4 h-4" />
            Diagnostics
          </CardTitle>
          <CardDescription>Troubleshooting and support tools</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Label>Upload Logs</Label>
              <p className="text-xs text-muted-foreground">
                Send diagnostic logs to Webex support for troubleshooting
              </p>
            </div>
            <Button 
              variant="outline" 
              size="sm"
              onClick={handleUploadLogs}
              disabled={isUploadingLogs}
            >
              {isUploadingLogs ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Uploading...
                </>
              ) : (
                <>
                  <Upload className="w-4 h-4 mr-2" />
                  Upload Logs
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* About */}
      <Card className="border-dashed">
        <CardContent className="p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Building className="w-4 h-4 text-muted-foreground" />
            <div>
              <p className="text-sm font-medium">Webex Contact Center Widget</p>
              <p className="text-xs text-muted-foreground">Version 1.0.0</p>
            </div>
          </div>
          {demoMode && (
            <Badge variant="secondary">Running in Demo Mode</Badge>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
