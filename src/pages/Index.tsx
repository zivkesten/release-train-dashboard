import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/contexts/AuthContext';
import { useApps } from '@/hooks/useApps';
import { useReleaseTrains, Platform, Stop, Note } from '@/hooks/useReleaseTrains';
import { useProfiles } from '@/hooks/useProfiles';
import { STOP_CONFIGS } from '@/types/release';
import { Header } from '@/components/Header';
import { TrainTrack } from '@/components/TrainTrack';
import { PastRunsPanel } from '@/components/PastRunsPanel';
import { AppSelector } from '@/components/AppSelector';
import { UserMenu } from '@/components/UserMenu';
import { ReleaseAnalytics } from '@/components/ReleaseAnalytics';
import { SmokeAnimation } from '@/components/SmokeAnimation';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { History, Sparkles, Plus, Train, Loader2, AlertCircle, RotateCcw, Rocket, ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';

const Index = () => {
  const { user, loading: authLoading, canEdit, isAdmin } = useAuth();
  const navigate = useNavigate();
  const { appId: urlAppId, platform: urlPlatform, releaseId: urlReleaseId } = useParams();
  const { apps, loading: appsLoading } = useApps();
  const { profiles } = useProfiles();

  // Selection state - use URL params if available
  const [selectedAppId, setSelectedAppId] = useState<string | null>(urlAppId || null);
  const [selectedPlatform, setSelectedPlatform] = useState<Platform | null>(
    (urlPlatform as Platform) || null
  );
  const [selectedRunId, setSelectedRunId] = useState<string | null>(urlReleaseId || null);
  const [mobileHistoryOpen, setMobileHistoryOpen] = useState(false);

  // New release dialog
  const [newReleaseOpen, setNewReleaseOpen] = useState(false);
  const [newVersion, setNewVersion] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  // Train start animation
  const [isStarting, setIsStarting] = useState(false);
  const [showSmoke, setShowSmoke] = useState(false);
  const [isResetting, setIsResetting] = useState(false);

  const {
    releaseTrains,
    stops,
    notes,
    loading: trainsLoading,
    createReleaseTrain,
    updateStopStatus,
    updateStopOwner,
    updateStopOwnerType,
    advanceToNextStop,
    startTrain,
    resetTrain,
    addNote,
    getActiveRelease,
    getPastReleases,
  } = useReleaseTrains(selectedAppId, selectedPlatform);

  // Redirect to auth if not logged in
  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth');
    }
  }, [user, authLoading, navigate]);

  // Set from URL params when available
  useEffect(() => {
    if (urlAppId && !selectedAppId) {
      setSelectedAppId(urlAppId);
    }
    if (urlPlatform && !selectedPlatform) {
      setSelectedPlatform(urlPlatform as Platform);
    }
    if (urlReleaseId && !selectedRunId) {
      setSelectedRunId(urlReleaseId);
    }
  }, [urlAppId, urlPlatform, urlReleaseId, selectedAppId, selectedPlatform, selectedRunId]);

  // Auto-select first app if available and no URL param
  useEffect(() => {
    if (apps.length > 0 && !selectedAppId && !urlAppId) {
      setSelectedAppId(apps[0].id);
    }
  }, [apps, selectedAppId, urlAppId]);

  // Auto-select platform if not set and no URL param
  useEffect(() => {
    if (!selectedPlatform && !urlPlatform) {
      setSelectedPlatform('ios');
    }
  }, [selectedPlatform, urlPlatform]);

  if (authLoading || appsLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return null;
  }

  const activeRelease = getActiveRelease();
  const pastReleases = getPastReleases();
  const selectedRelease = selectedRunId 
    ? releaseTrains.find(r => r.id === selectedRunId) 
    : activeRelease;
  const isViewingPast = selectedRunId !== null && selectedRunId !== activeRelease?.id;

  const selectedApp = apps.find(a => a.id === selectedAppId);
  const releaseStops = selectedRelease ? stops[selectedRelease.id] || [] : [];
  const isComplete = releaseStops.every(s => s.status === 'done');
  const isTrainStarted = releaseStops.some(s => s.status !== 'not_started');
  const allNotStarted = releaseStops.every(s => s.status === 'not_started');

  const getProgress = (release: typeof activeRelease) => {
    if (!release) return { completed: 0, total: 10 };
    const releaseStops = stops[release.id] || [];
    const completed = releaseStops.filter(s => s.status === 'done').length;
    return { completed, total: releaseStops.length || 10 };
  };

  // Convert database stops to the format expected by TrainTrack
  const convertToReleaseRun = (release: typeof activeRelease) => {
    if (!release) return null;
    
    const releaseStops = stops[release.id] || [];
    return {
      id: release.id,
      version: release.version,
      platform: release.platform === 'ios' ? 'ios' : release.platform === 'android' ? 'android' : 'both',
      createdAt: release.created_at,
      updatedAt: release.updated_at,
      stops: releaseStops.map(stop => ({
        id: stop.id,
        number: stop.number,
        title: stop.title,
        description: stop.description || '',
        ownerType: stop.owner_type as 'person' | 'automation',
        ownerName: stop.owner_name,
        status: stop.status.replace('_', '-') as 'not-started' | 'in-progress' | 'done' | 'blocked',
        startedAt: stop.started_at,
        completedAt: stop.completed_at,
        notes: (notes[stop.id] || []).map(n => ({
          id: n.id,
          author: n.author_name,
          text: n.text,
          createdAt: n.created_at,
        })),
      })),
    };
  };

  const handleCreateRelease = async () => {
    if (!newVersion.trim()) {
      toast.error('Please enter a version');
      return;
    }

    setIsCreating(true);
    try {
      await createReleaseTrain(newVersion.trim());
      toast.success(`Release ${newVersion} created`);
      setNewVersion('');
      setNewReleaseOpen(false);
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setIsCreating(false);
    }
  };

  const handleUpdateStatus = async (stopId: string, status: 'not-started' | 'in-progress' | 'done' | 'blocked') => {
    try {
      await updateStopStatus(stopId, status.replace('-', '_') as any);
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const handleAdvance = async () => {
    if (!selectedRelease) return;
    try {
      await advanceToNextStop(selectedRelease.id);
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const handleStartTrain = async () => {
    if (!selectedRelease) return;
    
    setIsStarting(true);
    setShowSmoke(true);
    
    try {
      await startTrain(selectedRelease.id);
      toast.success('🚂 All aboard! The train is leaving the station!');
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setIsStarting(false);
    }
  };

  const handleResetTrain = async () => {
    if (!selectedRelease) return;
    
    setIsResetting(true);
    try {
      await resetTrain(selectedRelease.id);
      toast.success('Release train has been reset');
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setIsResetting(false);
    }
  };

  const handleAddNote = async (stopId: string, author: string, text: string) => {
    try {
      await addNote(stopId, text);
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const handleOwnerChange = async (stopId: string, ownerName: string) => {
    try {
      await updateStopOwner(stopId, ownerName);
      toast.success('Owner updated');
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const handleOwnerTypeChange = async (stopId: string, ownerType: 'person' | 'automation') => {
    try {
      await updateStopOwnerType(stopId, ownerType);
      toast.success('Owner type updated');
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  // No apps case
  if (apps.length === 0) {
    return (
      <div className="min-h-screen bg-background">
        <header className="sticky top-0 z-50 bg-background/95 backdrop-blur border-b">
          <div className="container mx-auto px-4 py-3 flex justify-between items-center">
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-primary text-primary-foreground">
                <Train className="w-5 h-5" />
              </div>
              <h1 className="font-bold text-lg">Mobile Release Train</h1>
            </div>
            <UserMenu />
          </div>
        </header>
        
        <div className="container mx-auto px-4 py-12 flex justify-center">
          <Card className="w-full max-w-md">
            <CardHeader className="text-center">
              <AlertCircle className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
              <CardTitle>No Apps Configured</CardTitle>
              <CardDescription>
                {isAdmin 
                  ? "Create your first release track to start tracking releases."
                  : "No apps have been created yet. Ask an admin to set up apps."}
              </CardDescription>
            </CardHeader>
            {isAdmin && (
              <CardContent className="flex flex-col gap-2">
                <Button className="w-full" onClick={() => navigate('/create-track')}>
                  <Plus className="w-4 h-4 mr-2" />
                  Create New Track
                </Button>
                <Button variant="outline" className="w-full" onClick={() => navigate('/admin')}>
                  Go to Admin Panel
                </Button>
              </CardContent>
            )}
          </Card>
        </div>
      </div>
    );
  }

  const releaseRun = convertToReleaseRun(selectedRelease);

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b">
        <div className="container mx-auto px-4 py-3">
          <div className="flex flex-wrap items-center justify-between gap-4">
            {/* Logo & Title */}
            <div className="flex items-center gap-3">
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={() => navigate('/')}
                className="mr-1"
              >
                <ArrowLeft className="w-5 h-5" />
              </Button>
              <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-primary text-primary-foreground">
                <Train className="w-5 h-5" />
              </div>
              <div>
                <h1 className="font-bold text-lg leading-none">Mobile Release Train</h1>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {selectedApp?.name || 'Select an app'}
                </p>
              </div>
            </div>

            {/* App & Platform Selector */}
            <div className="flex items-center gap-3 flex-wrap">
              <AppSelector
                apps={apps}
                selectedAppId={selectedAppId}
                selectedPlatform={selectedPlatform}
                onAppChange={setSelectedAppId}
                onPlatformChange={setSelectedPlatform}
              />

              {/* New Release Button (Admin only) */}
              {isAdmin && selectedAppId && selectedPlatform && (
                <Dialog open={newReleaseOpen} onOpenChange={setNewReleaseOpen}>
                  <DialogTrigger asChild>
                    <Button size="sm" variant="outline" className="h-9">
                      <Plus className="w-4 h-4 mr-1" />
                      New Version
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Create New Release</DialogTitle>
                      <DialogDescription>
                        Start a new release train for {selectedApp?.name} ({selectedPlatform.toUpperCase()})
                      </DialogDescription>
                    </DialogHeader>
                    <Input
                      placeholder="e.g., v3.2.0"
                      value={newVersion}
                      onChange={(e) => setNewVersion(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleCreateRelease()}
                    />
                    <DialogFooter>
                      <Button onClick={handleCreateRelease} disabled={isCreating}>
                        {isCreating && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                        Create Release
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              )}

              {/* Create Track Button (Admin only) */}
              {isAdmin && (
                <Button size="sm" className="h-9" onClick={() => navigate('/create-track')}>
                  <Plus className="w-4 h-4 mr-1" />
                  New Track
                </Button>
              )}

              <UserMenu />
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-6">
        {trainsLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : !selectedRelease ? (
          <Card className="max-w-md mx-auto">
            <CardHeader className="text-center">
              <Train className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
              <CardTitle>No Active Release</CardTitle>
              <CardDescription>
                {isAdmin 
                  ? "Create a new release train to get started."
                  : "No active release train for this app/platform."}
              </CardDescription>
            </CardHeader>
          </Card>
        ) : (
          <div className="flex gap-6">
            {/* Desktop: Left Sidebar with Analytics & Past Runs */}
            <div className="hidden lg:block w-80 flex-shrink-0">
              <div className="sticky top-24 space-y-4">
                {/* Analytics */}
                {releaseRun && (
                  <ReleaseAnalytics run={releaseRun as any} />
                )}
                
                {/* Past Runs */}
                {pastReleases.length > 0 && (
                  <PastRunsPanel
                    pastRuns={pastReleases.map(r => convertToReleaseRun(r)!).filter(Boolean) as any[]}
                    currentRunId={activeRelease?.id || ''}
                    selectedRunId={selectedRunId}
                    onSelectRun={(id) => setSelectedRunId(id === activeRelease?.id ? null : id)}
                    getProgress={(run) => getProgress(releaseTrains.find(r => r.id === run.id))}
                  />
                )}
              </div>
            </div>

            {/* Main Content */}
            <div className="flex-1 min-w-0">
              {/* Release Title & Actions */}
              <div className="mb-6">
                <div className="flex items-center gap-3 mb-2 flex-wrap">
                  <h2 className="text-2xl font-bold">
                    {selectedRelease.version}
                  </h2>
                  {isComplete && (
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      className="flex items-center gap-1 px-2 py-1 rounded-full bg-status-done/10 text-status-done text-xs font-medium"
                    >
                      <Sparkles className="w-3 h-3" />
                      Complete!
                    </motion.div>
                  )}
                  
                  {/* Start Train Button - Admin only, only when all stops are not started */}
                  {isAdmin && allNotStarted && !isViewingPast && (
                    <div className="relative">
                      <Button
                        onClick={handleStartTrain}
                        disabled={isStarting}
                        className="gap-2 bg-gradient-to-r from-primary to-primary-glow hover:opacity-90"
                      >
                        {isStarting ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Rocket className="w-4 h-4" />
                        )}
                        Start the Train!
                      </Button>
                      <SmokeAnimation 
                        isActive={showSmoke} 
                        onComplete={() => setShowSmoke(false)} 
                      />
                    </div>
                  )}
                  
                  {/* Reset Button - Admin only */}
                  {isAdmin && isTrainStarted && !isViewingPast && (
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="outline" size="sm" className="gap-1">
                          <RotateCcw className="w-3.5 h-3.5" />
                          Reset
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Reset Release Train?</AlertDialogTitle>
                          <AlertDialogDescription>
                            This will reset all stops to "Not Started" and clear all timestamps. 
                            Notes will be preserved. This action cannot be undone.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction 
                            onClick={handleResetTrain}
                            disabled={isResetting}
                          >
                            {isResetting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                            Reset Train
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  )}
                </div>
                <p className="text-sm text-muted-foreground">
                  {isViewingPast 
                    ? 'Viewing past release (read-only)'
                    : allNotStarted
                    ? 'Ready to start • Click "Start the Train!" to begin'
                    : `Current release train • ${selectedPlatform?.toUpperCase()}`
                  }
                </p>
              </div>

              {/* Train Track */}
              {releaseRun && (
                <AnimatePresence mode="wait">
                  <motion.div
                    key={selectedRelease.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    transition={{ duration: 0.3 }}
                  >
                    <TrainTrack
                      run={releaseRun as any}
                      isReadOnly={isViewingPast || !canEdit}
                      profiles={profiles}
                      onUpdateStatus={handleUpdateStatus}
                      onAdvance={handleAdvance}
                      onAddNote={handleAddNote}
                      onOwnerChange={handleOwnerChange}
                      onOwnerTypeChange={handleOwnerTypeChange}
                    />
                  </motion.div>
                </AnimatePresence>
              )}

              {/* Analytics - below the track on mobile/tablet */}
              {releaseRun && (
                <div className="mt-6 lg:hidden">
                  <ReleaseAnalytics run={releaseRun as any} />
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Mobile: History Sheet */}
      {pastReleases.length > 0 && (
        <div className="lg:hidden fixed bottom-4 right-4 z-40">
          <Sheet open={mobileHistoryOpen} onOpenChange={setMobileHistoryOpen}>
            <SheetTrigger asChild>
              <Button
                size="lg"
                className="rounded-full shadow-lg h-14 w-14"
                aria-label="View past runs"
              >
                <History className="w-5 h-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="bottom" className="h-[60vh] rounded-t-2xl">
              <div className="pt-4">
                <PastRunsPanel
                  pastRuns={pastReleases.map(r => convertToReleaseRun(r)!).filter(Boolean) as any[]}
                  currentRunId={activeRelease?.id || ''}
                  selectedRunId={selectedRunId}
                  onSelectRun={(id) => {
                    setSelectedRunId(id === activeRelease?.id ? null : id);
                    setMobileHistoryOpen(false);
                  }}
                  getProgress={(run) => getProgress(releaseTrains.find(r => r.id === run.id))}
                />
              </div>
            </SheetContent>
          </Sheet>
        </div>
      )}
    </div>
  );
};

export default Index;
