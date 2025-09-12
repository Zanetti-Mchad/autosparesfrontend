"use client";
import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { Trash2, X, User, AlertTriangle, Loader2, Search, ArrowLeft, Users, RefreshCw, Edit } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { fetchApi } from '@/lib/apiConfig';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';

interface User {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  role: string;
  isActive: boolean;
  lastLogin?: string;
  createdAt: string;
  updatedAt?: string;
  photo?: string;
}

const DeleteUser = () => {
  const router = useRouter();
  const [isDeleting, setIsDeleting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [users, setUsers] = useState<User[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [userToDelete, setUserToDelete] = useState<User | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

  // Fetch all users from the API
  useEffect(() => {
    const fetchUsers = async () => {
      try {
        setIsLoading(true);
        console.log('🔍 [DELETE USER] Fetching all users...');
        
        const accessToken = localStorage.getItem('accessToken');
        if (!accessToken) {
          toast.error('No access token found. Please log in again.');
          router.push('/sign-in');
          return;
        }

        const apiUrl = `/integration/users`;
        console.log('🔍 [DELETE USER] API URL:', apiUrl);

        const response = await fetchApi(apiUrl, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
          } as any,
        });

        const result = response;
        console.log('📊 [DELETE USER] Raw API Response:', result);
        console.log('📊 [DELETE USER] Response Type:', typeof result);
        console.log('📊 [DELETE USER] Has Data Property:', 'data' in result);

        if (result.data && result.data.users) {
          console.log('📊 [DELETE USER] Users Data:', result.data.users);
          setUsers(result.data.users);
          console.log('✅ [DELETE USER] Users data set successfully');
        } else {
          throw new Error('No users data found in response');
        }
      } catch (error) {
        console.error('❌ [DELETE USER] Error fetching users:', error);
        toast.error('Failed to load users data');
      } finally {
        setIsLoading(false);
        console.log('🏁 [DELETE USER] Loading completed');
      }
    };

    console.log('🚀 [DELETE USER] Starting to fetch users...');
    fetchUsers();
  }, [router]);

  const handleDelete = async () => {
    if (!userToDelete?.id) {
      toast.error('No user selected for deletion');
      return;
    }

    setIsDeleting(true);
    
    try {
      console.log('🗑️ [DELETE USER] Starting deletion for user:', userToDelete.id);
      
      const accessToken = localStorage.getItem('accessToken');
      if (!accessToken) {
        toast.error('No access token found. Please log in again.');
        router.push('/sign-in');
        return;
      }

      const apiUrl = `/integration/users/${userToDelete.id}`;
      console.log('🗑️ [DELETE USER] API URL:', apiUrl);

      const result = await fetchApi(apiUrl, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
        } as any,
      });
      
      console.log('📊 [DELETE USER] Delete Response:', result);
      
      // Remove user from local state
      setUsers(prevUsers => prevUsers.filter(user => user.id !== userToDelete.id));
      
      toast.success(`${userToDelete.firstName} ${userToDelete.lastName} deleted successfully!`, {
        position: 'top-center',
        duration: 3000,
      });
      
      console.log('✅ [DELETE USER] User deleted successfully');
      
      // Close dialog
      setIsDeleteDialogOpen(false);
      setUserToDelete(null);
      
    } catch (error) {
      console.error('❌ [DELETE USER] Error deleting user:', error);
      toast.error('Failed to delete user. Please try again.');
    } finally {
      setIsDeleting(false);
    }
  };

  const openDeleteDialog = (user: User) => {
    setUserToDelete(user);
    setIsDeleteDialogOpen(true);
  };

  const closeDeleteDialog = () => {
    setUserToDelete(null);
    setIsDeleteDialogOpen(false);
  };

  const handleCancel = () => {
    router.back();
  };

  // Filter users based on search term
  const filteredUsers = users.filter(user => {
    const fullName = `${user.firstName} ${user.lastName}`.toLowerCase();
    const matchesSearch = fullName.includes(searchTerm.toLowerCase()) || 
                          user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          user.role.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesSearch;
  });

  const getStatusBadge = (isActive: boolean) => {
    const statusClasses = {
      true: 'bg-green-100 text-green-800',
      false: 'bg-gray-100 text-gray-800'
    };
    
    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusClasses[isActive.toString() as keyof typeof statusClasses] || 'bg-gray-100 text-gray-800'}`}>
        {isActive ? 'Active' : 'Inactive'}
      </span>
    );
  };

  const getRoleBadge = (role: string) => {
    const roleClasses = {
      admin: 'bg-purple-100 text-purple-800',
      manager: 'bg-blue-100 text-blue-800',
      user: 'bg-green-100 text-green-800',
      viewer: 'bg-yellow-100 text-yellow-800'
    };
    
    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${roleClasses[role.toLowerCase() as keyof typeof roleClasses] || 'bg-gray-100 text-gray-800'}`}>
        {role}
      </span>
    );
  };

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="flex flex-col items-center justify-center min-h-[400px]">
          <Loader2 className="w-8 h-8 animate-spin text-primary mb-4" />
          <p className="text-muted-foreground">Loading users...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <button 
            onClick={handleCancel}
            className="flex items-center text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="w-5 h-5 mr-1" />
            <span>Back</span>
          </button>
          <div className="h-6 w-px bg-border mx-2" />
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <Trash2 className="w-8 h-8 text-red-600" />
            Delete Users
          </h1>
        </div>
        <Button onClick={() => window.location.reload()} className="h-9 rounded-md px-3 border border-input bg-background hover:bg-accent hover:text-accent-foreground">
          <RefreshCw className="w-4 h-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Search */}
      <Card className="mb-6">
        <CardContent className="p-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Search users by name, email, or role..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardContent>
      </Card>

      {/* Users List */}
      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          {filteredUsers.length > 0 ? (
            <table className="min-w-full divide-y divide-border">
              <thead className="bg-secondary/20">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    User
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Role
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Last Login
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-card divide-y divide-border">
                {filteredUsers.map((user) => (
                  <tr key={user.id} className="hover:bg-secondary/10 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="w-10 h-10 rounded-full mr-3 overflow-hidden">
                          {user.photo ? (
                            <Image 
                              src={`${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/shopstaff-photos/${user.photo}`}
                              alt={`${user.firstName} ${user.lastName}`}
                              width={40}
                              height={40}
                              className="w-full h-full object-cover"
                              onError={(e) => {
                                const target = e.target as HTMLImageElement;
                                target.style.display = 'none';
                                const parent = target.parentElement;
                                if (parent) {
                                  parent.innerHTML = '<div class="w-full h-full bg-primary/10 flex items-center justify-center"><svg class="w-5 h-5 text-primary" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clip-rule="evenodd"></path></svg></div>';
                                }
                              }}
                            />
                          ) : (
                            <div className="w-full h-full bg-primary/10 flex items-center justify-center">
                              <User className="w-5 h-5 text-primary" />
                            </div>
                          )}
                        </div>
                        <div>
                          <div className="text-sm font-medium text-foreground">
                            {user.firstName} {user.lastName}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {user.email}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {getRoleBadge(user.role)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {getStatusBadge(user.isActive)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground">
                      {user.lastLogin 
                        ? new Date(user.lastLogin).toLocaleDateString() 
                        : 'Never'
                      }
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <Button
                        onClick={() => openDeleteDialog(user)}
                        className="h-8 w-8 p-0 bg-red-600 hover:bg-red-700 text-white"
                      >
                        <Trash2 className="h-4 w-4" />
                        <span className="sr-only">Delete user</span>
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              {searchTerm ? 'No users found matching your search.' : 'No users found.'}
            </div>
          )}
        </div>
      </Card>

      {/* Delete Confirmation Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent className="sm:max-w-[500px] bg-white">
          <DialogHeader className="bg-white">
            <DialogTitle className="flex items-center gap-2 text-red-600 bg-white">
              <AlertTriangle className="w-5 h-5" />
              Delete User
            </DialogTitle>
            <DialogDescription className="bg-white text-gray-700">
              Are you sure you want to delete this user? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          
          {userToDelete && (
            <div className="py-4 bg-white">
              <div className="flex items-center space-x-4 mb-4">
                <div className="w-12 h-12 rounded-full overflow-hidden">
                  {userToDelete.photo ? (
                    <Image 
                      src={`${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/shopstaff-photos/${userToDelete.photo}`}
                      alt={`${userToDelete.firstName} ${userToDelete.lastName}`}
                      width={48}
                      height={48}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        target.style.display = 'none';
                        const parent = target.parentElement;
                        if (parent) {
                          parent.innerHTML = '<div class="w-full h-full bg-primary/10 flex items-center justify-center"><svg class="w-6 h-6 text-primary" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clip-rule="evenodd"></path></svg></div>';
                        }
                      }}
                    />
                  ) : (
                    <div className="w-full h-full bg-primary/10 flex items-center justify-center">
                      <User className="w-6 h-6 text-primary" />
                    </div>
                  )}
                </div>
                <div>
                  <h3 className="font-medium text-gray-900">{userToDelete.firstName} {userToDelete.lastName}</h3>
                  <p className="text-sm text-gray-600">{userToDelete.email}</p>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-gray-500">Role</p>
                  <p className="font-medium capitalize text-gray-900">{userToDelete.role}</p>
                </div>
                <div>
                  <p className="text-gray-500">Status</p>
                  <p className="font-medium">
                    {getStatusBadge(userToDelete.isActive)}
                  </p>
                </div>
                <div>
                  <p className="text-gray-500">Phone</p>
                  <p className="font-medium text-gray-900">{userToDelete.phone || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-gray-500">Last Login</p>
                  <p className="font-medium text-gray-900">
                    {userToDelete.lastLogin 
                      ? new Date(userToDelete.lastLogin).toLocaleDateString() 
                      : 'Never'
                    }
                  </p>
                </div>
              </div>
            </div>
          )}
          
          <div className="flex justify-end gap-2 pt-4 border-t bg-white">
            <Button onClick={closeDeleteDialog} variant="outline" className="bg-white border-gray-300 text-gray-700 hover:bg-gray-50">
              Cancel
            </Button>
            <Button 
              onClick={handleDelete} 
              disabled={isDeleting}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              {isDeleting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Deleting...
                </>
              ) : (
                <>
                  <Trash2 className="w-4 h-4 mr-2" />
                  Delete User
                </>
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default DeleteUser;