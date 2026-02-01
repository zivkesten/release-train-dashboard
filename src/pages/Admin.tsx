import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useUserManagement, UserWithRoles } from '@/hooks/useUserManagement';
import { useApps } from '@/hooks/useApps';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ArrowLeft, Plus, Trash2, UserPlus, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';

type AppRole = 'admin' | 'dev' | 'qa';

export default function Admin() {
  const { isAdmin, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { users, loading: usersLoading, addRole, removeRole } = useUserManagement();
  const { apps, loading: appsLoading, createApp, deleteApp } = useApps();

  const [newAppName, setNewAppName] = useState('');
  const [newAppDescription, setNewAppDescription] = useState('');
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [selectedRole, setSelectedRole] = useState<AppRole>('dev');
  const [isAddingRole, setIsAddingRole] = useState(false);
  const [isCreatingApp, setIsCreatingApp] = useState(false);

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Access Denied</CardTitle>
            <CardDescription>
              You don't have permission to access the admin panel.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => navigate('/')}>Go Back</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const handleAddRole = async () => {
    if (!selectedUserId || !selectedRole) return;
    
    setIsAddingRole(true);
    try {
      await addRole(selectedUserId, selectedRole);
      toast.success('Role added successfully');
      setSelectedUserId(null);
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setIsAddingRole(false);
    }
  };

  const handleRemoveRole = async (userId: string, role: AppRole) => {
    try {
      await removeRole(userId, role);
      toast.success('Role removed');
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const handleCreateApp = async () => {
    if (!newAppName.trim()) {
      toast.error('App name is required');
      return;
    }

    setIsCreatingApp(true);
    try {
      await createApp(newAppName.trim(), newAppDescription.trim() || undefined);
      toast.success('App created successfully');
      setNewAppName('');
      setNewAppDescription('');
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setIsCreatingApp(false);
    }
  };

  const handleDeleteApp = async (appId: string, appName: string) => {
    if (!confirm(`Are you sure you want to delete "${appName}"? This will delete all release trains for this app.`)) {
      return;
    }

    try {
      await deleteApp(appId);
      toast.success('App deleted');
    } catch (err: any) {
      toast.error(err.message);
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
            <h1 className="text-lg font-bold">Admin Panel</h1>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-6">
        <Tabs defaultValue="users" className="space-y-6">
          <TabsList>
            <TabsTrigger value="users">Users & Roles</TabsTrigger>
            <TabsTrigger value="apps">Apps</TabsTrigger>
          </TabsList>

          {/* Users Tab */}
          <TabsContent value="users">
            <Card>
              <CardHeader>
                <CardTitle>User Management</CardTitle>
                <CardDescription>
                  Manage user roles. Users need a role (admin, dev, or QA) to edit release trains.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {usersLoading ? (
                  <div className="flex justify-center py-8">
                    <Loader2 className="w-6 h-6 animate-spin" />
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>User</TableHead>
                        <TableHead>Roles</TableHead>
                        <TableHead>Joined</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {users.map((user) => (
                        <TableRow key={user.id}>
                          <TableCell>
                            <div>
                              <p className="font-medium">{user.display_name || 'Unnamed'}</p>
                              <p className="text-sm text-muted-foreground">{user.email}</p>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-1 flex-wrap">
                              {user.roles.map(role => (
                                <Badge 
                                  key={role} 
                                  variant="secondary"
                                  className="capitalize cursor-pointer hover:bg-destructive hover:text-destructive-foreground"
                                  onClick={() => handleRemoveRole(user.id, role)}
                                  title="Click to remove"
                                >
                                  {role}
                                  <Trash2 className="w-3 h-3 ml-1" />
                                </Badge>
                              ))}
                              {user.roles.length === 0 && (
                                <span className="text-sm text-muted-foreground">No roles</span>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {formatDistanceToNow(new Date(user.created_at), { addSuffix: true })}
                          </TableCell>
                          <TableCell className="text-right">
                            <Dialog>
                              <DialogTrigger asChild>
                                <Button 
                                  variant="outline" 
                                  size="sm"
                                  onClick={() => setSelectedUserId(user.id)}
                                >
                                  <UserPlus className="w-4 h-4 mr-1" />
                                  Add Role
                                </Button>
                              </DialogTrigger>
                              <DialogContent>
                                <DialogHeader>
                                  <DialogTitle>Add Role</DialogTitle>
                                  <DialogDescription>
                                    Add a role to {user.display_name || user.email}
                                  </DialogDescription>
                                </DialogHeader>
                                <Select 
                                  value={selectedRole} 
                                  onValueChange={(v) => setSelectedRole(v as AppRole)}
                                >
                                  <SelectTrigger>
                                    <SelectValue placeholder="Select role" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="admin">Admin</SelectItem>
                                    <SelectItem value="dev">Developer</SelectItem>
                                    <SelectItem value="qa">QA</SelectItem>
                                  </SelectContent>
                                </Select>
                                <DialogFooter>
                                  <Button onClick={handleAddRole} disabled={isAddingRole}>
                                    {isAddingRole && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                                    Add Role
                                  </Button>
                                </DialogFooter>
                              </DialogContent>
                            </Dialog>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Apps Tab */}
          <TabsContent value="apps">
            <Card>
              <CardHeader>
                <CardTitle>App Management</CardTitle>
                <CardDescription>
                  Create and manage apps. Each app can have iOS and Android release trains.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Create App Form */}
                <div className="flex gap-3 items-end">
                  <div className="flex-1 space-y-2">
                    <label className="text-sm font-medium">App Name</label>
                    <Input
                      placeholder="e.g., OneStep"
                      value={newAppName}
                      onChange={(e) => setNewAppName(e.target.value)}
                    />
                  </div>
                  <div className="flex-1 space-y-2">
                    <label className="text-sm font-medium">Description (optional)</label>
                    <Input
                      placeholder="Brief description"
                      value={newAppDescription}
                      onChange={(e) => setNewAppDescription(e.target.value)}
                    />
                  </div>
                  <Button onClick={handleCreateApp} disabled={isCreatingApp}>
                    {isCreatingApp ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <Plus className="w-4 h-4 mr-2" />
                    )}
                    Create App
                  </Button>
                </div>

                {/* Apps List */}
                {appsLoading ? (
                  <div className="flex justify-center py-8">
                    <Loader2 className="w-6 h-6 animate-spin" />
                  </div>
                ) : apps.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    No apps yet. Create your first app above.
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>App Name</TableHead>
                        <TableHead>Description</TableHead>
                        <TableHead>Created</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {apps.map((app) => (
                        <TableRow key={app.id}>
                          <TableCell className="font-medium">{app.name}</TableCell>
                          <TableCell className="text-muted-foreground">
                            {app.description || '—'}
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {formatDistanceToNow(new Date(app.created_at), { addSuffix: true })}
                          </TableCell>
                          <TableCell className="text-right">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-destructive hover:text-destructive"
                              onClick={() => handleDeleteApp(app.id, app.name)}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
