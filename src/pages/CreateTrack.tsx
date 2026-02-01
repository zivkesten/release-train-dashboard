import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { STOP_CONFIGS, StopConfig } from '@/types/release';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { ArrowLeft, Smartphone, Train, Loader2, GripVertical, Bot, User } from 'lucide-react';
import { toast } from 'sonner';
import { StopIcon } from '@/components/StopIcon';

interface EditableStop {
  number: number;
  title: string;
  description: string;
  ownerType: 'person' | 'automation';
  ownerName: string;
  icon: string;
}

type Platform = 'ios' | 'android';

export default function CreateTrack() {
  const { user, isAdmin, loading: authLoading } = useAuth();
  const navigate = useNavigate();

  // Form state
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
    }))
  );
  const [isSubmitting, setIsSubmitting] = useState(false);

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

  const handleSubmit = async () => {
    if (!appName.trim()) {
      toast.error('Please enter an app name');
      return;
    }

    if (!version.trim()) {
      toast.error('Please enter a version');
      return;
    }

    // Validate all stops have required fields
    for (const stop of stops) {
      if (!stop.title.trim() || !stop.ownerName.trim()) {
        toast.error(`Stop ${stop.number} is missing required fields`);
        return;
      }
    }

    setIsSubmitting(true);

    try {
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

      // 2. Create the release train
      const { data: train, error: trainError } = await supabase
        .from('release_trains')
        .insert({
          app_id: app.id,
          platform,
          version: version.trim(),
          is_active: true,
        })
        .select()
        .single();

      if (trainError) throw trainError;

      // 3. Create all stops
      const stopsToCreate = stops.map((stop, index) => ({
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

      toast.success(`Created "${appName}" with ${platform.toUpperCase()} release track`);
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
                Enter the app name and initial release version
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
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
                <div className="space-y-2">
                  <Label htmlFor="version">Initial Version *</Label>
                  <Input
                    id="version"
                    placeholder="e.g., v1.0.0"
                    value={version}
                    onChange={(e) => setVersion(e.target.value)}
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
            </CardContent>
          </Card>

          {/* Train Steps */}
          <Card>
            <CardHeader>
              <CardTitle>Release Train Steps</CardTitle>
              <CardDescription>
                Customize the 10 stops in your release workflow. Click each step to edit.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Accordion type="single" collapsible className="w-full">
                {stops.map((stop, index) => (
                  <AccordionItem key={index} value={`stop-${index}`}>
                    <AccordionTrigger className="hover:no-underline">
                      <div className="flex items-center gap-3 text-left">
                        <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-muted text-muted-foreground">
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
                    <AccordionContent>
                      <div className="space-y-4 pt-2 pl-11">
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
