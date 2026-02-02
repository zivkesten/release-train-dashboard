import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { STOP_CONFIGS, StopConfig } from '@/types/release';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { ArrowLeft, Smartphone, Train, Loader2, Bot, User, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { StopIcon } from '@/components/StopIcon';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface EditableStop {
  number: number;
  title: string;
  description: string;
  ownerType: 'person' | 'automation';
  ownerName: string;
  icon: string;
  enabled: boolean;
}

type Platform = 'ios' | 'android';

interface ExistingApp {
  id: string;
  name: string;
}

export default function CreateTrack() {
  const { user, isAdmin, loading: authLoading } = useAuth();
  const navigate = useNavigate();

  // Form state
  const [useExistingApp, setUseExistingApp] = useState(false);
  const [existingApps, setExistingApps] = useState<ExistingApp[]>([]);
  const [selectedAppId, setSelectedAppId] = useState<string>('');
  const [appName, setAppName] = useState('');
  const [appDescription, setAppDescription] = useState('');
  const [version, setVersion] = useState('v1.0.0');
  const [platform, setPlatform] = useState<Platform>('ios');
  const [stops, setStops] = useState<EditableStop[]>(
    STOP_CONFIGS.map((config, index) => ({
      number: index + 1,
      title: config.title,
      description: config.description,
      ownerType: config.ownerType,
      ownerName: config.ownerName,
      icon: config.icon,
      enabled: true,
    }))
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [duplicateError, setDuplicateError] = useState<string | null>(null);
  const [existingReleases, setExistingReleases] = useState<{version: string, platform: string}[]>([]);

  // Fetch existing apps and releases for duplicate checking
  useEffect(() => {
    const fetchApps = async () => {
      const { data } = await supabase.from('apps').select('id, name');
      if (data) setExistingApps(data);
    };
    fetchApps();
  }, []);

  // Fetch existing releases when app is selected
  useEffect(() => {
    const fetchReleases = async () => {
      if (!selectedAppId) {
        setExistingReleases([]);
        return;
      }
      const { data } = await supabase
        .from('release_trains')
        .select('version, platform')
        .eq('app_id', selectedAppId);
      if (data) setExistingReleases(data);
    };
    if (useExistingApp && selectedAppId) {
      fetchReleases();
    }
  }, [selectedAppId, useExistingApp]);

  // Check for duplicates
  useEffect(() => {
    if (useExistingApp && selectedAppId && version && platform) {
      const isDuplicate = existingReleases.some(
        r => r.version === version.trim() && r.platform === platform
      );
      if (isDuplicate) {
        setDuplicateError(`A release with version "${version}" for ${platform.toUpperCase()} already exists.`);
      } else {
        setDuplicateError(null);
      }
    } else {
      setDuplicateError(null);
    }
  }, [version, platform, existingReleases, selectedAppId, useExistingApp]);

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    navigate('/auth');
    return null;
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Access Denied</CardTitle>
            <CardDescription>
              Only admins can create new release tracks.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => navigate('/')}>Go Back</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const updateStop = (index: number, updates: Partial<EditableStop>) => {
    setStops(prev => prev.map((stop, i) => 
      i === index ? { ...stop, ...updates } : stop
    ));
  };

  const toggleStop = (index: number) => {
    setStops(prev => prev.map((stop, i) => 
      i === index ? { ...stop, enabled: !stop.enabled } : stop
    ));
  };

  const enabledStops = stops.filter(s => s.enabled);

  const handleSubmit = async () => {
    if (!useExistingApp && !appName.trim()) {
      toast.error('Please enter an app name');
      return;
    }

    if (useExistingApp && !selectedAppId) {
      toast.error('Please select an app');
      return;
    }

    if (!version.trim()) {
      toast.error('Please enter a version');
      return;
    }

    if (duplicateError) {
      toast.error(duplicateError);
      return;
    }

    if (enabledStops.length === 0) {
      toast.error('Please enable at least one stop');
      return;
    }

    // Validate enabled stops have required fields
    for (const stop of enabledStops) {
      if (!stop.title.trim() || !stop.ownerName.trim()) {
        toast.error(`Stop ${stop.number} is missing required fields`);
        return;
      }
    }

    setIsSubmitting(true);

    try {
      let appId: string;

      if (useExistingApp) {
        // Check if release already exists
        const { data: existingRelease } = await supabase
          .from('release_trains')
          .select('id')
          .eq('app_id', selectedAppId)
          .eq('platform', platform)
          .eq('version', version.trim())
          .maybeSingle();

        if (existingRelease) {
          toast.error('This release already exists');
          setIsSubmitting(false);
          return;
        }
        appId = selectedAppId;
      } else {
        // 1. Create the app
        const { data: app, error: appError } = await supabase
          .from('apps')
          .insert({ 
            name: appName.trim(), 
            description: appDescription.trim() || null 
          })
          .select()
          .single();

        if (appError) throw appError;
        appId = app.id;
      }

      // 2. Create the release train
      const { data: train, error: trainError } = await supabase
        .from('release_trains')
        .insert({
          app_id: appId,
          platform,
          version: version.trim(),
          is_active: true,
        })
        .select()
        .single();

      if (trainError) throw trainError;

      // 3. Create only enabled stops
      const stopsToCreate = enabledStops.map((stop, index) => ({
        release_train_id: train.id,
        number: index + 1,
        title: stop.title,
        description: stop.description,
        owner_type: stop.ownerType,
        owner_name: stop.ownerName,
        status: (index === 0 ? 'in_progress' : 'not_started') as 'in_progress' | 'not_started',
        started_at: index === 0 ? new Date().toISOString() : null,
      }));

      const { error: stopsError } = await supabase
        .from('stops')
        .insert(stopsToCreate);

      if (stopsError) throw stopsError;

      const displayName = useExistingApp 
        ? existingApps.find(a => a.id === selectedAppId)?.name || 'App'
        : appName;
      toast.success(`Created "${displayName}" with ${platform.toUpperCase()} release track`);
      navigate('/');
    } catch (err: any) {
      console.error('Error creating track:', err);
      toast.error(err.message || 'Failed to create track');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-background/95 backdrop-blur border-b">
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="sm" onClick={() => navigate('/')}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-primary text-primary-foreground">
                <Train className="w-5 h-5" />
              </div>
              <h1 className="text-lg font-bold">Create New Track</h1>
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-6 max-w-3xl">
        <div className="space-y-6">
          {/* App Details */}
          <Card>
            <CardHeader>
              <CardTitle>App Details</CardTitle>
              <CardDescription>
                Create a new app or add a release to an existing one
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Toggle between new and existing app */}
              {existingApps.length > 0 && (
                <div className="flex items-center gap-4 p-3 bg-muted/50 rounded-lg">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="use-existing"
                      checked={useExistingApp}
                      onCheckedChange={(checked) => {
                        setUseExistingApp(checked === true);
                        if (!checked) setSelectedAppId('');
                      }}
                    />
                    <Label htmlFor="use-existing" className="font-normal cursor-pointer">
                      Add release to existing app
                    </Label>
                  </div>
                </div>
              )}

              {useExistingApp ? (
                <div className="space-y-2">
                  <Label>Select App *</Label>
                  <Select value={selectedAppId} onValueChange={setSelectedAppId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Choose an app" />
                    </SelectTrigger>
                    <SelectContent>
                      {existingApps.map((app) => (
                        <SelectItem key={app.id} value={app.id}>
                          {app.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              ) : (
                <>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="app-name">App Name *</Label>
                      <Input
                        id="app-name"
                        placeholder="e.g., OneStep"
                        value={appName}
                        onChange={(e) => setAppName(e.target.value)}
                      />
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="app-desc">Description (optional)</Label>
                    <Textarea
                      id="app-desc"
                      placeholder="Brief description of the app"
                      value={appDescription}
                      onChange={(e) => setAppDescription(e.target.value)}
                      rows={2}
                    />
                  </div>
                </>
              )}

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="version">Version *</Label>
                  <Input
                    id="version"
                    placeholder="e.g., v1.0.0"
                    value={version}
                    onChange={(e) => setVersion(e.target.value)}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label>Platform *</Label>
                  <ToggleGroup 
                    type="single" 
                    value={platform} 
                    onValueChange={(val) => val && setPlatform(val as Platform)}
                    className="justify-start"
                  >
                    <ToggleGroupItem 
                      value="ios" 
                      aria-label="iOS"
                      className="px-4"
                    >
                      <Smartphone className="w-4 h-4 mr-2" />
                      iOS
                    </ToggleGroupItem>
                    <ToggleGroupItem 
                      value="android" 
                      aria-label="Android"
                      className="px-4"
                    >
                      <Smartphone className="w-4 h-4 mr-2" />
                      Android
                    </ToggleGroupItem>
                  </ToggleGroup>
                </div>
              </div>

              {duplicateError && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{duplicateError}</AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>

          {/* Train Steps */}
          <Card>
            <CardHeader>
              <CardTitle>Release Train Steps</CardTitle>
              <CardDescription>
                Enable/disable stops and customize your release workflow. {enabledStops.length} of {stops.length} stops enabled.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Accordion type="single" collapsible className="w-full">
                {stops.map((stop, index) => (
                  <AccordionItem key={index} value={`stop-${index}`} className={!stop.enabled ? 'opacity-50' : ''}>
                    <div className="flex items-center gap-2">
                      <Checkbox
                        checked={stop.enabled}
                        onCheckedChange={() => toggleStop(index)}
                        className="ml-1"
                        onClick={(e) => e.stopPropagation()}
                      />
                      <AccordionTrigger className="hover:no-underline flex-1">
                        <div className="flex items-center gap-3 text-left">
                          <div className={`flex items-center justify-center w-8 h-8 rounded-lg ${stop.enabled ? 'bg-muted text-muted-foreground' : 'bg-muted/50 text-muted-foreground/50'}`}>
                            <StopIcon icon={stop.icon} className="w-4 h-4" />
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-medium text-muted-foreground">
                              Stop {stop.number}
                            </span>
                            {stop.ownerType === 'automation' ? (
                              <Bot className="w-3 h-3 text-muted-foreground" />
                            ) : (
                              <User className="w-3 h-3 text-muted-foreground" />
                            )}
                          </div>
                            <p className="font-medium text-sm">{stop.title || 'Untitled'}</p>
                          </div>
                        </div>
                      </AccordionTrigger>
                    </div>
                    <AccordionContent>
                      <div className="space-y-4 pt-2 pl-14">
                        <div className="space-y-2">
                          <Label>Title *</Label>
                          <Input
                            value={stop.title}
                            onChange={(e) => updateStop(index, { title: e.target.value })}
                            placeholder="Step title"
                          />
                        </div>
                        
                        <div className="space-y-2">
                          <Label>Description</Label>
                          <Textarea
                            value={stop.description}
                            onChange={(e) => updateStop(index, { description: e.target.value })}
                            placeholder="Brief description"
                            rows={2}
                          />
                        </div>

                        <div className="grid gap-4 sm:grid-cols-2">
                          <div className="space-y-2">
                            <Label>Owner Type</Label>
                            <Select
                              value={stop.ownerType}
                              onValueChange={(val) => updateStop(index, { ownerType: val as 'person' | 'automation' })}
                            >
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="person">
                                  <div className="flex items-center gap-2">
                                    <User className="w-4 h-4" />
                                    Person
                                  </div>
                                </SelectItem>
                                <SelectItem value="automation">
                                  <div className="flex items-center gap-2">
                                    <Bot className="w-4 h-4" />
                                    Automation
                                  </div>
                                </SelectItem>
                              </SelectContent>
                            </Select>
                          </div>

                          <div className="space-y-2">
                            <Label>Owner Name *</Label>
                            <Input
                              value={stop.ownerName}
                              onChange={(e) => updateStop(index, { ownerName: e.target.value })}
                              placeholder={stop.ownerType === 'automation' ? 'e.g., GitHub Action' : 'e.g., Diana'}
                            />
                          </div>
                        </div>
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </CardContent>
          </Card>

          {/* Submit */}
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => navigate('/')}>
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Create Track
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
