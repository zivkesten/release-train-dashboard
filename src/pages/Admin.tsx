import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useAdminUsers, UserWithDetails } from '@/hooks/useAdminUsers';
import { useApps } from '@/hooks/useApps';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Label } from '@/components/ui/label';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ArrowLeft, Plus, Trash2, UserPlus, Loader2, Eye, EyeOff } from 'lucide-react';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';

type AppRole = 'admin' | 'dev' | 'qa';

export default function Admin() {
  const { isAdmin, loading: authLoading, user } = useAuth();
  const navigate = useNavigate();
  const { users, loading: usersLoading, createUser, deleteUser, addRole, removeRole } = useAdminUsers();
  const { apps, loading: appsLoading, createApp, deleteApp } = useApps();

  // New user form state
  const [newUserOpen, setNewUserOpen] = useState(false);
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserPassword, setNewUserPassword] = useState('');
  const [newUserName, setNewUserName] = useState('');
  const [newUserPosition, setNewUserPosition] = useState('');
  const [newUserRole, setNewUserRole] = useState<AppRole>('dev');
  const [showPassword, setShowPassword] = useState(false);
  const [isCreatingUser, setIsCreatingUser] = useState(false);

  // App form state
  const [newAppName, setNewAppName] = useState('');
  const [newAppDescription, setNewAppDescription] = useState('');
  const [isCreatingApp, setIsCreatingApp] = useState(false);

  // Role dialog state
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [selectedRole, setSelectedRole] = useState<AppRole>('dev');
  const [isAddingRole, setIsAddingRole] = useState(false);

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

  const handleCreateUser = async () => {
    if (!newUserEmail.trim() || !newUserPassword || !newUserName.trim() || !newUserRole) {
      toast.error('Please fill in all required fields');
      return;
    }

    if (newUserPassword.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }

    setIsCreatingUser(true);
    try {
      await createUser(
        newUserEmail.trim(),
        newUserPassword,
        newUserName.trim(),
        newUserPosition.trim(),
        newUserRole
      );
      toast.success(`User ${newUserName} created successfully`);
      setNewUserOpen(false);
      resetNewUserForm();
    } catch (err: any) {
      toast.error(err.message || 'Failed to create user');
    } finally {
      setIsCreatingUser(false);
    }
  };

  const resetNewUserForm = () => {
    setNewUserEmail('');
    setNewUserPassword('');
    setNewUserName('');
    setNewUserPosition('');
    setNewUserRole('dev');
    setShowPassword(false);
  };

  const handleDeleteUser = async (userId: string, userName: string) => {
    try {
      await deleteUser(userId);
      toast.success(`User ${userName} deleted`);
    } catch (err: any) {
      toast.error(err.message || 'Failed to delete user');
    }
  };

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
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>User Management</CardTitle>
                  <CardDescription>
                    Add, manage, and remove users. Assign roles to control access.
                  </CardDescription>
                </div>
                <Dialog open={newUserOpen} onOpenChange={(open) => {
                  setNewUserOpen(open);
                  if (!open) resetNewUserForm();
                }}>
                  <DialogTrigger asChild>
                    <Button>
                      <UserPlus className="w-4 h-4 mr-2" />
                      Add User
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                      <DialogTitle>Add New User</DialogTitle>
                      <DialogDescription>
                        Create a new user account with a role assignment.
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                      <div className="space-y-2">
                        <Label htmlFor="name">Name *</Label>
                        <Input
                          id="name"
                          placeholder="Full name"
                          value={newUserName}
                          onChange={(e) => setNewUserName(e.target.value)}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="email">Email *</Label>
                        <Input
                          id="email"
                          type="email"
                          placeholder="user@example.com"
                          value={newUserEmail}
                          onChange={(e) => setNewUserEmail(e.target.value)}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="password">Password *</Label>
                        <div className="relative">
                          <Input
                            id="password"
                            type={showPassword ? 'text' : 'password'}
                            placeholder="Min. 6 characters"
                            value={newUserPassword}
                            onChange={(e) => setNewUserPassword(e.target.value)}
                          />
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="absolute right-0 top-0 h-full px-3"
                            onClick={() => setShowPassword(!showPassword)}
                          >
                            {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </Button>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="position">Position</Label>
                        <Input
                          id="position"
                          placeholder="e.g., QA Engineer, Developer"
                          value={newUserPosition}
                          onChange={(e) => setNewUserPosition(e.target.value)}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Role *</Label>
                        <Select value={newUserRole} onValueChange={(v) => setNewUserRole(v as AppRole)}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="admin">Admin - Full access</SelectItem>
                            <SelectItem value="dev">Developer - Edit releases</SelectItem>
                            <SelectItem value="qa">QA - Edit releases</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <DialogFooter>
                      <Button variant="outline" onClick={() => setNewUserOpen(false)}>
                        Cancel
                      </Button>
                      <Button onClick={handleCreateUser} disabled={isCreatingUser}>
                        {isCreatingUser && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                        Create User
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </CardHeader>
              <CardContent>
                {usersLoading ? (
                  <div className="flex justify-center py-8">
                    <Loader2 className="w-6 h-6 animate-spin" />
                  </div>
                ) : users.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    No users found. Add your first user above.
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>User</TableHead>
                        <TableHead>Position</TableHead>
                        <TableHead>Roles</TableHead>
                        <TableHead>Joined</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {users.map((userItem) => (
                        <TableRow key={userItem.id}>
                          <TableCell>
                            <div>
                              <p className="font-medium">{userItem.display_name || 'Unnamed'}</p>
                              <p className="text-sm text-muted-foreground">{userItem.email}</p>
                            </div>
                          </TableCell>
                          <TableCell className="text-muted-foreground">
                            {userItem.position || '—'}
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-1 flex-wrap">
                              {userItem.roles.map(role => (
                                <Badge 
                                  key={role} 
                                  variant="secondary"
                                  className="capitalize cursor-pointer hover:bg-destructive hover:text-destructive-foreground"
                                  onClick={() => handleRemoveRole(userItem.id, role)}
                                  title="Click to remove"
                                >
                                  {role}
                                  <Trash2 className="w-3 h-3 ml-1" />
                                </Badge>
                              ))}
                              {userItem.roles.length === 0 && (
                                <span className="text-sm text-muted-foreground">No roles</span>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {formatDistanceToNow(new Date(userItem.created_at), { addSuffix: true })}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-2">
                              <Dialog>
                                <DialogTrigger asChild>
                                  <Button 
                                    variant="outline" 
                                    size="sm"
                                    onClick={() => setSelectedUserId(userItem.id)}
                                  >
                                    <Plus className="w-4 h-4 mr-1" />
                                    Role
                                  </Button>
                                </DialogTrigger>
                                <DialogContent>
                                  <DialogHeader>
                                    <DialogTitle>Add Role</DialogTitle>
                                    <DialogDescription>
                                      Add a role to {userItem.display_name || userItem.email}
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

                              {userItem.id !== user?.id && (
                                <AlertDialog>
                                  <AlertDialogTrigger asChild>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="text-destructive hover:text-destructive"
                                    >
                                      <Trash2 className="w-4 h-4" />
                                    </Button>
                                  </AlertDialogTrigger>
                                  <AlertDialogContent>
                                    <AlertDialogHeader>
                                      <AlertDialogTitle>Delete User</AlertDialogTitle>
                                      <AlertDialogDescription>
                                        Are you sure you want to delete {userItem.display_name || userItem.email}? 
                                        This action cannot be undone.
                                      </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                                      <AlertDialogAction
                                        onClick={() => handleDeleteUser(userItem.id, userItem.display_name || userItem.email)}
                                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                      >
                                        Delete
                                      </AlertDialogAction>
                                    </AlertDialogFooter>
                                  </AlertDialogContent>
                                </AlertDialog>
                              )}
                            </div>
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
                    <Label>App Name</Label>
                    <Input
                      placeholder="e.g., OneStep"
                      value={newAppName}
                      onChange={(e) => setNewAppName(e.target.value)}
                    />
                  </div>
                  <div className="flex-1 space-y-2">
                    <Label>Description (optional)</Label>
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
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="text-destructive hover:text-destructive"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Delete App</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    Are you sure you want to delete "{app.name}"? 
                                    This will also delete all release trains for this app.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                                  <AlertDialogAction
                                    onClick={() => handleDeleteApp(app.id, app.name)}
                                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                  >
                                    Delete
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
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
