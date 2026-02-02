import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useAllReleases, ReleaseWithDetails } from '@/hooks/useAllReleases';
import { useApps } from '@/hooks/useApps';
import { UserMenu } from '@/components/UserMenu';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
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
  Settings
} from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';
import { motion } from 'framer-motion';

const Dashboard = () => {
  const { user, loading: authLoading, isAdmin } = useAuth();
  const navigate = useNavigate();
  const { releases, loading: releasesLoading } = useAllReleases();
  const { apps } = useApps();

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

  const activeReleases = releases.filter(r => r.is_active);
  const completedReleases = releases.filter(r => !r.is_active);
  
  // Stats
  const totalActive = activeReleases.length;
  const totalBlocked = activeReleases.filter(r => r.blocked_stops > 0).length;
  const totalCompleted = completedReleases.length;

  const handleReleaseClick = (release: ReleaseWithDetails) => {
    navigate(`/release/${release.app_id}/${release.platform}/${release.id}`);
  };

  const getStatusBadge = (release: ReleaseWithDetails) => {
    if (release.blocked_stops > 0) {
      return <Badge variant="destructive" className="gap-1"><AlertCircle className="w-3 h-3" /> Blocked</Badge>;
    }
    if (release.completed_stops === release.total_stops) {
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
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Active Releases</p>
                  <p className="text-3xl font-bold">{totalActive}</p>
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
                  <p className="text-3xl font-bold">{totalBlocked}</p>
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
                  <p className="text-3xl font-bold">{totalCompleted}</p>
                </div>
                <div className="w-12 h-12 rounded-full bg-status-done/10 flex items-center justify-center">
                  <CheckCircle2 className="w-6 h-6 text-status-done" />
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
            {/* Active Releases */}
            {activeReleases.length > 0 && (
              <div>
                <h2 className="text-lg font-semibold mb-4">Active Releases</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {activeReleases.map((release, index) => (
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
                                <CardDescription>{release.version}</CardDescription>
                              </div>
                            </div>
                            {getStatusBadge(release)}
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

            {/* Completed Releases */}
            {completedReleases.length > 0 && (
              <div>
                <h2 className="text-lg font-semibold mb-4">Completed Releases</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {completedReleases.map((release, index) => (
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
                                <CardDescription>{release.version}</CardDescription>
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
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default Dashboard;
