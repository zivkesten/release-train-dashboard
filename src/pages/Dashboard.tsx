import { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useAllReleases, ReleaseWithDetails } from '@/hooks/useAllReleases';
import { useApps } from '@/hooks/useApps';
import { UserMenu } from '@/components/UserMenu';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Input } from '@/components/ui/input';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { 
  Train, 
  Loader2, 
  Plus, 
  Apple, 
  Smartphone,
  Clock,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  LayoutDashboard,
  Settings,
  Pencil,
  CalendarIcon,
  X,
  Archive,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { format, formatDistanceToNow, isPast, differenceInDays } from 'date-fns';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

const Dashboard = () => {
  const { user, loading: authLoading, isAdmin } = useAuth();
  const navigate = useNavigate();
  const { releases, loading: releasesLoading, updateVersion, updateDeadline, refetch } = useAllReleases();
  const { apps } = useApps();

  // Edit version dialog
  const [editingRelease, setEditingRelease] = useState<ReleaseWithDetails | null>(null);
  const [newVersion, setNewVersion] = useState('');
  const [newDeadline, setNewDeadline] = useState<Date | undefined>();
  const [isSaving, setIsSaving] = useState(false);
  
  // Archive view
  const [showArchive, setShowArchive] = useState(false);
  const [expandedCompletedSection, setExpandedCompletedSection] = useState(true);

  // Helper to compare version strings (simple semver comparison)
  const compareVersions = (a: string, b: string): number => {
    const partsA = a.replace(/[^0-9.]/g, '').split('.').map(Number);
    const partsB = b.replace(/[^0-9.]/g, '').split('.').map(Number);
    for (let i = 0; i < Math.max(partsA.length, partsB.length); i++) {
      const numA = partsA[i] || 0;
      const numB = partsB[i] || 0;
      if (numA > numB) return 1;
      if (numA < numB) return -1;
    }
    return 0;
  };

  // Group releases by track (app_id + platform) and separate by status
  const { currentActiveReleases, recentlyCompletedReleases, archivedReleases, stats } = useMemo(() => {
    // Group by track
    const trackMap = new Map<string, ReleaseWithDetails[]>();
    releases.forEach(r => {
      const trackKey = `${r.app_id}-${r.platform}`;
      if (!trackMap.has(trackKey)) {
        trackMap.set(trackKey, []);
      }
      trackMap.get(trackKey)!.push(r);
    });

    const currentActive: ReleaseWithDetails[] = [];
    const recentlyCompleted: ReleaseWithDetails[] = [];
    const archived: ReleaseWithDetails[] = [];

    trackMap.forEach((trackReleases) => {
      // Sort by version descending (highest first)
      const sorted = [...trackReleases].sort((a, b) => compareVersions(b.version, a.version));
      
      // Find the latest active (non-complete) release for this track
      const latestActive = sorted.find(r => !r.is_complete);
      
      sorted.forEach(release => {
        if (!release.is_complete) {
          // Only show the latest active release per track
          if (release.id === latestActive?.id) {
            currentActive.push(release);
          } else {
            // Other active releases are archived
            archived.push(release);
          }
        } else {
          // Completed releases: most recent completed goes to "recently completed", rest to archive
          const completedInTrack = sorted.filter(r => r.is_complete);
          const isLatestCompleted = completedInTrack.length > 0 && completedInTrack[0].id === release.id;
          
          if (isLatestCompleted) {
            recentlyCompleted.push(release);
          } else {
            archived.push(release);
          }
        }
      });
    });

    // Sort current active by updated_at descending
    currentActive.sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime());
    recentlyCompleted.sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime());
    archived.sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime());

    return {
      currentActiveReleases: currentActive,
      recentlyCompletedReleases: recentlyCompleted,
      archivedReleases: archived,
      stats: {
        totalActive: currentActive.length,
        totalBlocked: currentActive.filter(r => r.blocked_stops > 0).length,
        totalCompleted: recentlyCompleted.length,
        totalArchived: archived.length,
      }
    };
  }, [releases]);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth');
    }
  }, [user, authLoading, navigate]);

  if (authLoading || releasesLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) return null;

  const handleReleaseClick = (release: ReleaseWithDetails) => {
    navigate(`/release/${release.app_id}/${release.platform}/${release.id}`);
  };

  const handleEditClick = (e: React.MouseEvent, release: ReleaseWithDetails) => {
    e.stopPropagation();
    setEditingRelease(release);
    setNewVersion(release.version);
    setNewDeadline(release.deadline ? new Date(release.deadline) : undefined);
  };

  const handleSaveEdit = async () => {
    if (!editingRelease) return;
    
    setIsSaving(true);
    try {
      if (newVersion !== editingRelease.version) {
        await updateVersion(editingRelease.id, newVersion);
      }
      const newDeadlineStr = newDeadline ? newDeadline.toISOString() : null;
      if (newDeadlineStr !== editingRelease.deadline) {
        await updateDeadline(editingRelease.id, newDeadlineStr);
      }
      toast.success('Release updated');
      setEditingRelease(null);
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setIsSaving(false);
    }
  };

  const getStatusBadge = (release: ReleaseWithDetails) => {
    if (release.blocked_stops > 0) {
      return <Badge variant="destructive" className="gap-1"><AlertCircle className="w-3 h-3" /> Blocked</Badge>;
    }
    if (release.is_complete) {
      return <Badge className="gap-1 bg-status-done text-white"><CheckCircle2 className="w-3 h-3" /> Complete</Badge>;
    }
    if (release.in_progress_stops > 0) {
      return <Badge variant="secondary" className="gap-1"><Clock className="w-3 h-3" /> In Progress</Badge>;
    }
    return <Badge variant="outline">Not Started</Badge>;
  };

  const getProgress = (release: ReleaseWithDetails) => {
    if (release.total_stops === 0) return 0;
    return (release.completed_stops / release.total_stops) * 100;
  };

  const getDeadlineBadge = (deadline: string | null) => {
    if (!deadline) return null;
    
    const deadlineDate = new Date(deadline);
    const daysUntil = differenceInDays(deadlineDate, new Date());
    const isOverdue = isPast(deadlineDate);
    
    if (isOverdue) {
      return (
        <Badge variant="destructive" className="gap-1 text-xs">
          <CalendarIcon className="w-3 h-3" />
          Overdue
        </Badge>
      );
    }
    
    if (daysUntil <= 3) {
      return (
        <Badge variant="secondary" className="gap-1 text-xs bg-amber-500/20 text-amber-600 border-amber-500/30">
          <CalendarIcon className="w-3 h-3" />
          {daysUntil === 0 ? 'Due today' : `${daysUntil}d left`}
        </Badge>
      );
    }
    
    return (
      <Badge variant="outline" className="gap-1 text-xs">
        <CalendarIcon className="w-3 h-3" />
        {format(deadlineDate, 'MMM d')}
      </Badge>
    );
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b">
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-primary text-primary-foreground">
                <LayoutDashboard className="w-5 h-5" />
              </div>
              <div>
                <h1 className="font-bold text-lg leading-none">Release Dashboard</h1>
                <p className="text-xs text-muted-foreground mt-0.5">
                  All release trains at a glance
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              {isAdmin && (
                <>
                  <Button size="sm" variant="outline" onClick={() => navigate('/create-track')}>
                    <Plus className="w-4 h-4 mr-1" />
                    New Track
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => navigate('/admin')}>
                    <Settings className="w-4 h-4" />
                  </Button>
                </>
              )}
              <UserMenu />
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-6">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 mb-8">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Active Releases</p>
                  <p className="text-3xl font-bold">{stats.totalActive}</p>
                </div>
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                  <Train className="w-6 h-6 text-primary" />
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Blocked</p>
                  <p className="text-3xl font-bold">{stats.totalBlocked}</p>
                </div>
                <div className="w-12 h-12 rounded-full bg-destructive/10 flex items-center justify-center">
                  <AlertCircle className="w-6 h-6 text-destructive" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Completed</p>
                  <p className="text-3xl font-bold">{stats.totalCompleted}</p>
                </div>
                <div className="w-12 h-12 rounded-full bg-status-done/10 flex items-center justify-center">
                  <CheckCircle2 className="w-6 h-6 text-status-done" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Archived</p>
                  <p className="text-3xl font-bold">{stats.totalArchived}</p>
                </div>
                <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center">
                  <Archive className="w-6 h-6 text-muted-foreground" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {releases.length === 0 ? (
          <Card className="max-w-md mx-auto">
            <CardHeader className="text-center">
              <Train className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
              <CardTitle>No Releases Yet</CardTitle>
              <CardDescription>
                {isAdmin 
                  ? "Create your first release track to get started."
                  : "No releases have been created yet."}
              </CardDescription>
            </CardHeader>
            {isAdmin && (
              <CardContent className="flex justify-center">
                <Button onClick={() => navigate('/create-track')}>
                  <Plus className="w-4 h-4 mr-2" />
                  Create New Track
                </Button>
              </CardContent>
            )}
          </Card>
        ) : (
          <div className="space-y-6">
            {/* Active Releases - One per track */}
            {currentActiveReleases.length > 0 && (
              <div>
                <h2 className="text-lg font-semibold mb-4">Active Releases</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {currentActiveReleases.map((release, index) => (
                    <motion.div
                      key={release.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.05 }}
                    >
                      <Card 
                        className="cursor-pointer hover:shadow-md transition-shadow group"
                        onClick={() => handleReleaseClick(release)}
                      >
                        <CardHeader className="pb-2">
                          <div className="flex items-start justify-between">
                            <div className="flex items-center gap-2">
                              {release.platform === 'ios' ? (
                                <Apple className="w-5 h-5 text-muted-foreground" />
                              ) : (
                                <Smartphone className="w-5 h-5 text-muted-foreground" />
                              )}
                              <div>
                                <CardTitle className="text-base">{release.app_name}</CardTitle>
                                <CardDescription className="flex items-center gap-1">
                                  {release.version}
                                  {isAdmin && (
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-5 w-5 opacity-0 group-hover:opacity-100"
                                      onClick={(e) => handleEditClick(e, release)}
                                    >
                                      <Pencil className="w-3 h-3" />
                                    </Button>
                                  )}
                                </CardDescription>
                              </div>
                            </div>
                            <div className="flex flex-col items-end gap-1">
                              {getStatusBadge(release)}
                              {getDeadlineBadge(release.deadline)}
                            </div>
                          </div>
                        </CardHeader>
                        <CardContent>
                          <div className="space-y-3">
                            <div>
                              <div className="flex justify-between text-sm mb-1">
                                <span className="text-muted-foreground">Progress</span>
                                <span className="font-medium">
                                  {release.completed_stops}/{release.total_stops} stops
                                </span>
                              </div>
                              <Progress value={getProgress(release)} className="h-2" />
                            </div>
                            
                            {release.current_stop_title && (
                              <div className="text-sm">
                                <span className="text-muted-foreground">Current: </span>
                                <span className="font-medium">{release.current_stop_title}</span>
                              </div>
                            )}
                            
                            <div className="flex items-center justify-between text-xs text-muted-foreground pt-2 border-t">
                              <span>Updated {formatDistanceToNow(new Date(release.updated_at), { addSuffix: true })}</span>
                              <ArrowRight className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity" />
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </motion.div>
                  ))}
                </div>
              </div>
            )}

            {/* Recently Completed Releases */}
            {recentlyCompletedReleases.length > 0 && (
              <div>
                <button 
                  className="flex items-center gap-2 text-lg font-semibold mb-4 hover:text-primary transition-colors"
                  onClick={() => setExpandedCompletedSection(!expandedCompletedSection)}
                >
                  {expandedCompletedSection ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                  Recently Completed
                  <Badge variant="secondary" className="ml-2">{recentlyCompletedReleases.length}</Badge>
                </button>
                
                {expandedCompletedSection && (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {recentlyCompletedReleases.map((release, index) => (
                      <motion.div
                        key={release.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.05 }}
                      >
                        <Card 
                          className="cursor-pointer hover:shadow-md transition-shadow opacity-75 hover:opacity-100 group"
                          onClick={() => handleReleaseClick(release)}
                        >
                          <CardHeader className="pb-2">
                            <div className="flex items-start justify-between">
                              <div className="flex items-center gap-2">
                                {release.platform === 'ios' ? (
                                  <Apple className="w-5 h-5 text-muted-foreground" />
                                ) : (
                                  <Smartphone className="w-5 h-5 text-muted-foreground" />
                                )}
                                <div>
                                  <CardTitle className="text-base">{release.app_name}</CardTitle>
                                  <CardDescription className="flex items-center gap-1">
                                    {release.version}
                                    {isAdmin && (
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-5 w-5 opacity-0 group-hover:opacity-100"
                                        onClick={(e) => handleEditClick(e, release)}
                                      >
                                        <Pencil className="w-3 h-3" />
                                      </Button>
                                    )}
                                  </CardDescription>
                                </div>
                              </div>
                              <Badge className="gap-1 bg-status-done/80 text-white">
                                <CheckCircle2 className="w-3 h-3" /> Complete
                              </Badge>
                            </div>
                          </CardHeader>
                          <CardContent>
                            <div className="space-y-2">
                              <Progress value={100} className="h-2" />
                              <div className="flex items-center justify-between text-xs text-muted-foreground pt-2 border-t">
                                <span>Completed {format(new Date(release.updated_at), 'MMM d, yyyy')}</span>
                                <ArrowRight className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity" />
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      </motion.div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* View Past Releases Button */}
            {archivedReleases.length > 0 && (
              <div className="flex justify-center pt-4">
                <Button 
                  variant="outline" 
                  onClick={() => setShowArchive(true)}
                  className="gap-2"
                >
                  <Archive className="w-4 h-4" />
                  View Past Releases ({archivedReleases.length})
                </Button>
              </div>
            )}
          </div>
        )}

        {/* Archived Releases Dialog */}
        <Dialog open={showArchive} onOpenChange={setShowArchive}>
          <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Archive className="w-5 h-5" />
                Past Releases
              </DialogTitle>
              <DialogDescription>
                Older versions and completed releases from all tracks
              </DialogDescription>
            </DialogHeader>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
              {archivedReleases.map((release) => (
                <Card 
                  key={release.id}
                  className="cursor-pointer hover:shadow-md transition-shadow group"
                  onClick={() => {
                    setShowArchive(false);
                    handleReleaseClick(release);
                  }}
                >
                  <CardHeader className="pb-2">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-2">
                        {release.platform === 'ios' ? (
                          <Apple className="w-5 h-5 text-muted-foreground" />
                        ) : (
                          <Smartphone className="w-5 h-5 text-muted-foreground" />
                        )}
                        <div>
                          <CardTitle className="text-base">{release.app_name}</CardTitle>
                          <CardDescription>{release.version}</CardDescription>
                        </div>
                      </div>
                      {getStatusBadge(release)}
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <div>
                        <div className="flex justify-between text-sm mb-1">
                          <span className="text-muted-foreground">Progress</span>
                          <span className="font-medium">
                            {release.completed_stops}/{release.total_stops} stops
                          </span>
                        </div>
                        <Progress value={getProgress(release)} className="h-2" />
                      </div>
                      <div className="flex items-center justify-between text-xs text-muted-foreground pt-2 border-t">
                        <span>Updated {format(new Date(release.updated_at), 'MMM d, yyyy')}</span>
                        <ArrowRight className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Edit Release Dialog */}
      <Dialog open={!!editingRelease} onOpenChange={(open) => !open && setEditingRelease(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Release</DialogTitle>
            <DialogDescription>
              Update the version number and deadline for this release.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Version</label>
              <Input
                value={newVersion}
                onChange={(e) => setNewVersion(e.target.value)}
                placeholder="e.g., v3.2.0"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Deadline (optional)</label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !newDeadline && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {newDeadline ? format(newDeadline, "PPP") : "Pick a deadline"}
                    {newDeadline && (
                      <X 
                        className="ml-auto h-4 w-4 hover:text-destructive" 
                        onClick={(e) => {
                          e.stopPropagation();
                          setNewDeadline(undefined);
                        }}
                      />
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={newDeadline}
                    onSelect={setNewDeadline}
                    initialFocus
                    className="p-3 pointer-events-auto"
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingRelease(null)}>
              Cancel
            </Button>
            <Button onClick={handleSaveEdit} disabled={isSaving}>
              {isSaving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Dashboard;
