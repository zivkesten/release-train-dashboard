import { App } from '@/hooks/useApps';
import { Platform } from '@/hooks/useReleaseTrains';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { Smartphone } from 'lucide-react';

interface AppSelectorProps {
  apps: App[];
  selectedAppId: string | null;
  selectedPlatform: Platform | null;
  onAppChange: (appId: string) => void;
  onPlatformChange: (platform: Platform) => void;
}

export function AppSelector({
  apps,
  selectedAppId,
  selectedPlatform,
  onAppChange,
  onPlatformChange,
}: AppSelectorProps) {
  return (
    <div className="flex flex-wrap items-center gap-3">
      {/* App Selector */}
      <Select value={selectedAppId || ''} onValueChange={onAppChange}>
        <SelectTrigger className="w-[160px] h-9 text-sm focus-ring">
          <SelectValue placeholder="Select App" />
        </SelectTrigger>
        <SelectContent>
          {apps.map((app) => (
            <SelectItem key={app.id} value={app.id}>
              {app.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Platform Toggle */}
      <ToggleGroup 
        type="single" 
        value={selectedPlatform || ''} 
        onValueChange={(val) => val && onPlatformChange(val as Platform)}
        className="bg-muted rounded-lg p-1"
      >
        <ToggleGroupItem 
          value="ios" 
          aria-label="iOS"
          className="h-7 px-2.5 text-xs data-[state=on]:bg-background"
        >
          <Smartphone className="w-3.5 h-3.5 mr-1" />
          iOS
        </ToggleGroupItem>
        <ToggleGroupItem 
          value="android" 
          aria-label="Android"
          className="h-7 px-2.5 text-xs data-[state=on]:bg-background"
        >
          <Smartphone className="w-3.5 h-3.5 mr-1" />
          Android
        </ToggleGroupItem>
      </ToggleGroup>
    </div>
  );
}
