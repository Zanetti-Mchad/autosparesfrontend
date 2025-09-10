"use client";
// src/components/users/UsersList.tsx
import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { useToast } from '@/hooks/use-toast';
import { Button, type ButtonProps } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Card,
  CardContent,
  CardHeader,
} from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Plus, Search, MoreVertical, Edit, ArrowUpDown, Users, RefreshCw, X, User, Mail, Phone, Key, Lock, Shield, Eye, CheckCircle, Calendar, Clock, Save } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

// Users will be fetched from the database

// Helper function to format dates
const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
};

interface UsersListProps {
  editMode?: boolean;
}

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
  photo?: string; // API uses 'photo' not 'staff_photo'
};

const UsersList = ({ editMode = false }: UsersListProps) => {
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const { toast } = useToast();

  // Log environment variables and component initialization
  console.log('🚀 [COMPONENT INIT] UsersList component initialized');
  console.log('🚀 [COMPONENT INIT] Edit mode:', editMode);
  console.log('🚀 [COMPONENT INIT] API URL:', process.env.NEXT_PUBLIC_API_URL);
  console.log('🚀 [COMPONENT INIT] Environment variables:', {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL,
    NODE_ENV: process.env.NODE_ENV
  });
  const [users, setUsers] = useState<User[]>([]);
  const [editFormData, setEditFormData] = useState<User>({
    id: '',
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    role: '',
    isActive: true,
    lastLogin: '',
    createdAt: '',
    updatedAt: '',
    photo: ''
  });
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [roleFilter, setRoleFilter] = useState('all');
  const [sortConfig, setSortConfig] = useState<{ key: keyof User; direction: 'asc' | 'desc' } | null>(null);
  const [selectedUsers, setSelectedUsers] = useState<Set<string>>(new Set());
  const [selectAll, setSelectAll] = useState(false);

  // Toggle select all users
  const toggleSelectAll = () => {
    if (selectAll) {
      setSelectedUsers(new Set());
    } else {
      const allUserIds = new Set(users.map(user => user.id));
      setSelectedUsers(allUserIds);
    }
    setSelectAll(!selectAll);
  };

  // Toggle selection for a single user
  const toggleUserSelection = (userId: string, event: React.MouseEvent) => {
    event.stopPropagation();
    const newSelectedUsers = new Set(selectedUsers);
    if (newSelectedUsers.has(userId)) {
      newSelectedUsers.delete(userId);
    } else {
      newSelectedUsers.add(userId);
    }
    setSelectedUsers(newSelectedUsers);
    setSelectAll(newSelectedUsers.size === users.length);
  };

  // Check if a user is selected
  const isUserSelected = (userId: string) => selectedUsers.has(userId);

  // Filter users based on search and filters
  const filteredUsers = users.filter(user => {
    const fullName = `${user.firstName} ${user.lastName}`.toLowerCase();
    const matchesSearch = fullName.includes(searchTerm.toLowerCase()) || 
                          user.email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || (statusFilter === 'active' ? user.isActive : !user.isActive);
    const matchesRole = roleFilter === 'all' || user.role.toLowerCase() === roleFilter.toLowerCase();
    
    return matchesSearch && matchesStatus && matchesRole;
  });

  // Sort users
  const sortedUsers = [...filteredUsers].sort((a, b) => {
    if (!sortConfig) return 0;
    
    const aValue = a[sortConfig.key] as string;
    const bValue = b[sortConfig.key] as string;
    
    if (aValue < bValue) {
      return sortConfig.direction === 'asc' ? -1 : 1;
    }
    if (aValue > bValue) {
      return sortConfig.direction === 'asc' ? 1 : -1;
    }
    return 0;
  });

  const requestSort = (key: keyof User) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const handleUserAction = (action: string, user: User) => {
    // In a real app, this would be an API call
    console.log(`Performing ${action} on user:`, user.id);
    if (action === 'delete') {
      toast({
        title: 'Success',
        description: `${user.firstName} ${user.lastName} has been deleted`,
        variant: 'default',
      });
    } else {
      toast({
        title: 'Success',
        description: `${action} action performed on ${user.firstName} ${user.lastName}`,
        variant: 'default',
      });
    }
  };


  const handleEditUser = (user: User) => {
    console.log('✏️ [EDIT USER] Opening edit dialog for user:', user.id);
    console.log('✏️ [EDIT USER] User data:', user);
    console.log('✏️ [EDIT USER] User keys:', Object.keys(user));
    console.log('✏️ [EDIT USER] User values:', {
      id: user.id,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      phone: user.phone,
      role: user.role,
      isActive: user.isActive,
      lastLogin: user.lastLogin,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
      photo: user.photo
    });

    setCurrentUser(user);
    setEditFormData({
      id: user.id,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      phone: user.phone,
      role: user.role,
      isActive: user.isActive,
      lastLogin: user.lastLogin || '',
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
      photo: user.photo || ''
    });
    
    console.log('✏️ [EDIT USER] Edit form data set:', {
      id: user.id,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      phone: user.phone,
      role: user.role,
      isActive: user.isActive,
      lastLogin: user.lastLogin || '',
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
      photo: user.photo || ''
    });
    
    setIsEditDialogOpen(true);
    console.log('✅ [EDIT USER] Edit dialog opened');
  };

  const handleSaveChanges = async () => {
    try {
      const accessToken = localStorage.getItem('accessToken');
      if (!accessToken) {
        toast({
          title: 'Error',
          description: 'No access token found. Please log in again.',
          variant: 'destructive',
        });
        return;
      }

      const apiUrl = `${process.env.NEXT_PUBLIC_API_URL}/integration/users/${editFormData.id}`;
      console.log('✏️ [UPDATE USER] API URL:', apiUrl);
      console.log('✏️ [UPDATE USER] User ID:', editFormData.id);
      console.log('✏️ [UPDATE USER] Access Token:', accessToken ? 'Present' : 'Missing');
      console.log('✏️ [UPDATE USER] Update Data:', editFormData);
      console.log('✏️ [UPDATE USER] Update Data Keys:', Object.keys(editFormData));

      // Update user via API
      const response = await fetch(apiUrl, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`,
        },
        body: JSON.stringify(editFormData),
      });

      console.log('✏️ [UPDATE USER] Response Status:', response.status);
      console.log('✏️ [UPDATE USER] Response OK:', response.ok);
      console.log('✏️ [UPDATE USER] Response Headers:', Object.fromEntries(response.headers.entries()));

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('❌ [UPDATE USER] Error Response Body:', errorData);
        throw new Error(errorData.message || 'Failed to update user');
      }

      const result = await response.json();
      console.log('📊 [UPDATE USER] Response Data:', result);
      console.log('📊 [UPDATE USER] Response Type:', typeof result);

      // Update local state
      setUsers(prevUsers => 
        prevUsers.map(user => 
          user.id === editFormData.id ? editFormData : user
        )
      );

      console.log('✅ [UPDATE USER] User updated successfully in local state');
      console.log('✅ [UPDATE USER] Updated user data:', editFormData);

      toast({
        title: 'Success',
        description: `${editFormData.firstName} ${editFormData.lastName}'s profile has been updated successfully`,
        variant: 'default',
      });
      
      setIsEditDialogOpen(false);
      console.log('🏁 [UPDATE USER] Edit dialog closed');
    } catch (error) {
      console.error('❌ [UPDATE USER] Error updating user:', error);
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to update user',
        variant: 'destructive',
      });
    }
  };

  const handleBulkAction = async (action: string) => {
    console.log('🔄 [BULK ACTION] Starting bulk action:', action);
    console.log('🔄 [BULK ACTION] Selected users count:', selectedUsers.size);
    console.log('🔄 [BULK ACTION] Selected user IDs:', Array.from(selectedUsers));

    if (selectedUsers.size === 0) {
      console.log('❌ [BULK ACTION] No users selected');
      toast({
        title: 'No Users Selected',
        description: 'Please select at least one user to perform this action',
        variant: 'destructive',
      });
      return;
    }

    // Get the selected user objects
    const usersToUpdate = users.filter(user => selectedUsers.has(user.id));
    console.log('🔄 [BULK ACTION] Users to update:', usersToUpdate);
    console.log('🔄 [BULK ACTION] Users to update count:', usersToUpdate.length);
    
    // Update users in bulk
    const updatePromises = usersToUpdate.map(async (user) => {
      const accessToken = localStorage.getItem('accessToken');
      if (!accessToken) {
        console.error('❌ [BULK ACTION] No access token for user:', user.id);
        return;
      }

      const updatedUser = { ...user };
      if (action === 'activate') {
        updatedUser.isActive = true;
        console.log('🔄 [BULK ACTION] Activating user:', user.id);
      } else if (action === 'deactivate') {
        updatedUser.isActive = false;
        console.log('🔄 [BULK ACTION] Deactivating user:', user.id);
      }

      const apiUrl = `${process.env.NEXT_PUBLIC_API_URL}/integration/users/${user.id}`;
      console.log('🔄 [BULK ACTION] API URL for user', user.id, ':', apiUrl);
      console.log('🔄 [BULK ACTION] Update data for user', user.id, ':', updatedUser);

      try {
        const response = await fetch(apiUrl, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${accessToken}`,
          },
          body: JSON.stringify(updatedUser),
        });

        console.log('🔄 [BULK ACTION] Response for user', user.id, ':', response.status, response.ok);

        if (response.ok) {
          const result = await response.json();
          console.log('📊 [BULK ACTION] Response data for user', user.id, ':', result);
          
          // Update local state
          setUsers(prevUsers => 
            prevUsers.map(u => u.id === user.id ? updatedUser : u)
          );
          console.log('✅ [BULK ACTION] User', user.id, 'updated successfully in local state');
        } else {
          const errorData = await response.json().catch(() => ({}));
          console.error('❌ [BULK ACTION] Error updating user', user.id, ':', errorData);
        }
      } catch (error) {
        console.error('❌ [BULK ACTION] Error updating user', user.id, ':', error);
      }
    });

    console.log('🔄 [BULK ACTION] Executing', updatePromises.length, 'update promises');
    await Promise.all(updatePromises);
    console.log('✅ [BULK ACTION] All update promises completed');
    
    let actionText = '';
    switch (action) {
      case 'activate':
        actionText = 'activated';
        break;
      case 'deactivate':
        actionText = 'deactivated';
        break;
      default:
        actionText = 'updated';
    }
    
    console.log('✅ [BULK ACTION] Bulk action completed:', actionText);
    toast({
      title: 'Action Completed',
      description: `${selectedUsers.size} users have been ${actionText} successfully`,
      variant: 'default',
    });
    
    // Clear selection after action
    setSelectedUsers(new Set());
    setSelectAll(false);
    console.log('🏁 [BULK ACTION] Selection cleared');
  };

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

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        setIsLoading(true);
        const accessToken = localStorage.getItem('accessToken');
        if (!accessToken) {
          throw new Error('No access token found');
        }

        const apiUrl = `${process.env.NEXT_PUBLIC_API_URL}/integration/users`;
        console.log('🔍 [FETCH USERS] API URL:', apiUrl);
        console.log('🔍 [FETCH USERS] Access Token:', accessToken ? 'Present' : 'Missing');

        const response = await fetch(apiUrl, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
          },
        });

        console.log('🔍 [FETCH USERS] Response Status:', response.status);
        console.log('🔍 [FETCH USERS] Response OK:', response.ok);
        console.log('🔍 [FETCH USERS] Response Headers:', Object.fromEntries(response.headers.entries()));

        if (!response.ok) {
          const errorText = await response.text();
          console.error('❌ [FETCH USERS] Error Response Body:', errorText);
          throw new Error('Failed to fetch users');
        }

        const result = await response.json();
        console.log('📊 [FETCH USERS] Raw API Response:', result);
        console.log('📊 [FETCH USERS] Response Type:', typeof result);
        console.log('📊 [FETCH USERS] Is Array:', Array.isArray(result));
        console.log('📊 [FETCH USERS] Has Data Property:', 'data' in result);
        console.log('📊 [FETCH USERS] Has Status Property:', 'status' in result);
        
        if (result.data) {
          console.log('📊 [FETCH USERS] Data Property:', result.data);
          console.log('📊 [FETCH USERS] Data Type:', typeof result.data);
          console.log('📊 [FETCH USERS] Data Has Users Property:', 'users' in result.data);
          console.log('📊 [FETCH USERS] Data Has Pagination Property:', 'pagination' in result.data);
          
          if (result.data.users) {
            console.log('📊 [FETCH USERS] Users Array:', result.data.users);
            console.log('📊 [FETCH USERS] Users Array Length:', result.data.users.length);
            console.log('📊 [FETCH USERS] Users Array Type:', typeof result.data.users);
            console.log('📊 [FETCH USERS] Users Array Is Array:', Array.isArray(result.data.users));
          }
          
          if (result.data.pagination) {
            console.log('📊 [FETCH USERS] Pagination Info:', result.data.pagination);
          }
        }

        // Handle the API response structure - API returns { data: { users: [...] } }
        const usersData = result.data?.users || result.data || result;
        console.log('📊 [FETCH USERS] Processed Users Data:', usersData);
        console.log('📊 [FETCH USERS] Processed Data Type:', typeof usersData);
        console.log('📊 [FETCH USERS] Processed Data Is Array:', Array.isArray(usersData));
        
        const finalUsers = Array.isArray(usersData) ? usersData : [];
        console.log('📊 [FETCH USERS] Final Users Array:', finalUsers);
        console.log('📊 [FETCH USERS] Final Users Count:', finalUsers.length);
        
        if (finalUsers.length > 0) {
          console.log('📊 [FETCH USERS] First User Structure:', finalUsers[0]);
          console.log('📊 [FETCH USERS] First User Keys:', Object.keys(finalUsers[0]));
          console.log('📊 [FETCH USERS] Sample User Data:', {
            id: finalUsers[0].id,
            firstName: finalUsers[0].firstName,
            lastName: finalUsers[0].lastName,
            email: finalUsers[0].email,
            phone: finalUsers[0].phone,
            role: finalUsers[0].role,
            isActive: finalUsers[0].isActive,
            lastLogin: finalUsers[0].lastLogin,
            createdAt: finalUsers[0].createdAt,
            photo: finalUsers[0].photo
          });
        }
        
        setUsers(finalUsers);
        console.log('✅ [FETCH USERS] Users set in state successfully');
      } catch (error) {
        console.error('❌ [FETCH USERS] Error loading users:', error);
        toast({
          title: 'Error',
          description: 'Failed to load users',
          variant: 'destructive',
        });
      } finally {
        setIsLoading(false);
        console.log('🏁 [FETCH USERS] Loading completed');
      }
    };

    console.log('🚀 [FETCH USERS] Starting to fetch users...');
    fetchUsers();
  }, [toast]);

  return (
    <div className="p-6">
      {/* Edit User Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-[600px] bg-gradient-to-br from-yellow-50 to-yellow-100 border-yellow-200">
          <DialogHeader>
            <div className="flex items-center gap-3 mb-2">
              <div className="w-12 h-12 rounded-full overflow-hidden">
                {editFormData.photo ? (
                  <Image 
                    src={`${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/shopstaff-photos/${editFormData.photo}`}
                    alt={`${editFormData.firstName} ${editFormData.lastName}`}
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
                <DialogTitle className="text-yellow-800">Edit User: {editFormData.firstName} {editFormData.lastName}</DialogTitle>
                <DialogDescription className="text-yellow-700">
                  Update user information below. All fields are required.
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="id" className="flex items-center gap-2">
                <User className="w-4 h-4" />
                User ID
              </Label>
              <Input
                id="id"
                value={editFormData.id}
                disabled
                className="bg-yellow-50 border-yellow-200 text-yellow-800"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="firstName" className="flex items-center gap-2">
                <User className="w-4 h-4" />
                First Name
              </Label>
              <Input
                id="firstName"
                value={editFormData.firstName}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEditFormData({...editFormData, firstName: e.target.value})}
                className="bg-white border-yellow-300 focus:border-yellow-500 focus:ring-yellow-500"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="lastName" className="flex items-center gap-2">
                <User className="w-4 h-4" />
                Last Name
              </Label>
              <Input
                id="lastName"
                value={editFormData.lastName}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEditFormData({...editFormData, lastName: e.target.value})}
                className="bg-white border-yellow-300 focus:border-yellow-500 focus:ring-yellow-500"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email" className="flex items-center gap-2">
                <Mail className="w-4 h-4" />
                Email Address
              </Label>
              <Input
                id="email"
                type="email"
                value={editFormData.email}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEditFormData({...editFormData, email: e.target.value})}
                className="bg-white border-yellow-300 focus:border-yellow-500 focus:ring-yellow-500"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone" className="flex items-center gap-2">
                <Phone className="w-4 h-4" />
                Phone Number
              </Label>
              <Input
                id="phone"
                type="tel"
                value={editFormData.phone}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEditFormData({...editFormData, phone: e.target.value})}
                className="bg-white border-yellow-300 focus:border-yellow-500 focus:ring-yellow-500"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="role" className="flex items-center gap-2">
                <Shield className="w-4 h-4" />
                Role
              </Label>
              <Select 
                value={editFormData.role}
                onValueChange={(value: string) => setEditFormData({...editFormData, role: value})}
              >
                <SelectTrigger className="bg-white border-yellow-300 focus:border-yellow-500 focus:ring-yellow-500">
                  <SelectValue placeholder="Select role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">Admin</SelectItem>
                  <SelectItem value="manager">Manager</SelectItem>
                  <SelectItem value="user">User</SelectItem>
                  <SelectItem value="viewer">Viewer</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="isActive" className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4" />
                Status
              </Label>
              <Select 
                value={editFormData.isActive ? 'active' : 'inactive'}
                onValueChange={(value: string) => setEditFormData({...editFormData, isActive: value === 'active'})}
              >
                <SelectTrigger className="bg-white border-yellow-300 focus:border-yellow-500 focus:ring-yellow-500">
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                Created Date
              </Label>
              <Input
                value={editFormData.createdAt ? new Date(editFormData.createdAt).toLocaleDateString() : ''}
                disabled
                className="bg-yellow-50 border-yellow-200 text-yellow-800"
              />
            </div>
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Clock className="w-4 h-4" />
                Last Login
              </Label>
              <Input
                value={editFormData.lastLogin ? new Date(editFormData.lastLogin).toLocaleString() : 'Never'}
                disabled
                className="bg-yellow-50 border-yellow-200 text-yellow-800"
              />
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-4 border-t border-yellow-200">
            <Button onClick={() => setIsEditDialogOpen(false)} className="border border-yellow-300 bg-white text-yellow-700 hover:bg-yellow-50 hover:border-yellow-400">
              Cancel
            </Button>
            <Button onClick={handleSaveChanges} className="gap-2 bg-gradient-to-r from-yellow-500 to-yellow-600 hover:from-yellow-600 hover:to-yellow-700 text-white shadow-lg">
              <Save className="w-4 h-4" />
              Save Changes
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold flex items-center gap-3">
          <Users className="w-8 h-8" />
          User Management
        </h1>
        <div className="flex items-center space-x-2">
          <Button onClick={async () => {
            try {
              setIsLoading(true);
              const accessToken = localStorage.getItem('accessToken');
              if (!accessToken) {
                throw new Error('No access token found');
              }

              const apiUrl = `${process.env.NEXT_PUBLIC_API_URL}/integration/users`;
              console.log('🔄 [REFRESH USERS] API URL:', apiUrl);
              console.log('🔄 [REFRESH USERS] Access Token:', accessToken ? 'Present' : 'Missing');

              const response = await fetch(apiUrl, {
                method: 'GET',
                headers: {
                  'Authorization': `Bearer ${accessToken}`,
                },
              });

              console.log('🔄 [REFRESH USERS] Response Status:', response.status);
              console.log('🔄 [REFRESH USERS] Response OK:', response.ok);

              if (!response.ok) {
                const errorText = await response.text();
                console.error('❌ [REFRESH USERS] Error Response Body:', errorText);
                throw new Error('Failed to fetch users');
              }

              const result = await response.json();
              console.log('📊 [REFRESH USERS] Raw API Response:', result);
              console.log('📊 [REFRESH USERS] Response Type:', typeof result);
              console.log('📊 [REFRESH USERS] Is Array:', Array.isArray(result));
              console.log('📊 [REFRESH USERS] Has Data Property:', 'data' in result);
              console.log('📊 [REFRESH USERS] Has Status Property:', 'status' in result);
              
              if (result.data) {
                console.log('📊 [REFRESH USERS] Data Property:', result.data);
                console.log('📊 [REFRESH USERS] Data Has Users Property:', 'users' in result.data);
                console.log('📊 [REFRESH USERS] Data Has Pagination Property:', 'pagination' in result.data);
                
                if (result.data.users) {
                  console.log('📊 [REFRESH USERS] Users Array:', result.data.users);
                  console.log('📊 [REFRESH USERS] Users Array Length:', result.data.users.length);
                }
              }

              // Handle the API response structure - API returns { data: { users: [...] } }
              const usersData = result.data?.users || result.data || result;
              console.log('📊 [REFRESH USERS] Processed Users Data:', usersData);
              console.log('📊 [REFRESH USERS] Processed Data Type:', typeof usersData);
              console.log('📊 [REFRESH USERS] Processed Data Is Array:', Array.isArray(usersData));
              
              const finalUsers = Array.isArray(usersData) ? usersData : [];
              console.log('📊 [REFRESH USERS] Final Users Array:', finalUsers);
              console.log('📊 [REFRESH USERS] Final Users Count:', finalUsers.length);
              
              setUsers(finalUsers);
              console.log('✅ [REFRESH USERS] Users refreshed successfully');
              
              toast({
                title: 'Success',
                description: 'User list refreshed!',
                variant: 'default',
              });
            } catch (error) {
              console.error('❌ [REFRESH USERS] Error refreshing users:', error);
              toast({
                title: 'Error',
                description: 'Failed to refresh users',
                variant: 'destructive',
              });
            } finally {
              setIsLoading(false);
              console.log('🏁 [REFRESH USERS] Refresh completed');
            }
          }} className="h-9 rounded-md px-3 border border-input bg-background hover:bg-accent hover:text-accent-foreground">
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
          <Button onClick={() => router.push('/pages/adduser/adduser')} className="h-9 rounded-md px-3">
            <Plus className="w-4 h-4 mr-2" />
            Add User
          </Button>
        </div>
      </div>
      
      {/* Filters and Search Section */}
      <Card className="mb-6">
        <CardContent className="p-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="relative sm:col-span-2 lg:col-span-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Search by name or email..."
                value={searchTerm}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchTerm(e.target.value)}
                className="pl-10 w-full"
              />
            </div>
            <div className="w-full">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Filter by Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                  <SelectItem value="suspended">Suspended</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="w-full">
              <Select value={roleFilter} onValueChange={setRoleFilter}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Filter by Role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Roles</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                  <SelectItem value="manager">Manager</SelectItem>
                  <SelectItem value="user">User</SelectItem>
                  <SelectItem value="viewer">Viewer</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          
          {/* Checkbox Usage Instructions */}
          <div className="mt-3 text-xs text-muted-foreground">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center bg-secondary/30 px-2 py-1 rounded">
                <Checkbox className="h-3 w-3 mr-1.5 border-foreground/50" checked disabled />
                <span>Select users</span>
              </span>
              <span className="text-foreground/50 hidden sm:inline">•</span>
              <span className="hidden sm:inline">Use checkboxes to select multiple users</span>
              <span className="text-foreground/50 hidden sm:inline">•</span>
              <span>Then choose from <span className="font-medium">Bulk Actions</span> <span className="ml-1">⬇️</span></span>
            </div>
          </div>
          <div className="mt-3 sm:mt-0 sm:ml-auto">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button 
                  className="w-full sm:w-auto border border-input bg-background hover:bg-accent hover:text-accent-foreground"
                  disabled={selectedUsers.size === 0}
                >
                  Bulk Actions
                  {selectedUsers.size > 0 && (
                    <span className="ml-2 bg-primary text-primary-foreground rounded-full h-5 w-5 flex items-center justify-center text-xs">
                      {selectedUsers.size}
                    </span>
                  )}
                </Button>
              </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem onClick={() => handleBulkAction('activate')}>
                Activate
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleBulkAction('deactivate')}>
                Deactivate
              </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </CardContent>
      </Card>
      
      {/* Users Table Section */}
      <Card className="overflow-hidden">
        <div className="relative">
          <div className="overflow-x-auto">
          {isLoading ? (
            <div className="flex justify-center items-center h-40">
              <RefreshCw className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-border">
                <thead className="bg-secondary/20">
                  <tr>
                    <th className="sticky left-0 z-10 px-3 sm:px-6 py-3 bg-background text-left text-xs font-medium text-muted-foreground uppercase tracking-wider w-12">
                      <div className="flex items-center">
                        <Checkbox 
                          checked={selectAll}
                          onCheckedChange={toggleSelectAll}
                          className="h-4 w-4 rounded"
                        />
                      </div>
                    </th>
                    <th className="sticky left-12 z-10 px-3 sm:px-6 py-3 bg-background text-left text-xs font-medium text-muted-foreground uppercase tracking-wider w-12">
                      #
                    </th>
                    <th 
                      onClick={() => requestSort('firstName')}
                      className="cursor-pointer px-3 sm:px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider min-w-[150px]"
                    >
                      <div className="flex items-center gap-1">
                        <span className="hidden sm:inline">Name</span>
                        <span className="sm:hidden">User</span>
                        <ArrowUpDown className="w-3 h-3 text-gray-400" />
                      </div>
                    </th>
                    <th 
                      onClick={() => requestSort('role')}
                      className="hidden sm:table-cell cursor-pointer px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider min-w-[100px]"
                    >
                      <div className="flex items-center gap-1">
                        Role
                        <ArrowUpDown className="w-3 h-3 text-gray-400" />
                      </div>
                    </th>
                    <th 
                      onClick={() => requestSort('isActive')}
                      className="hidden md:table-cell cursor-pointer px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider min-w-[100px]"
                    >
                      <div className="flex items-center gap-1">
                        Status
                        <ArrowUpDown className="w-3 h-3 text-gray-400" />
                      </div>
                    </th>
                    <th 
                      onClick={() => requestSort('lastLogin')}
                      className="hidden lg:table-cell cursor-pointer px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider min-w-[120px]"
                    >
                      <div className="flex items-center gap-1">
                        Last Login
                        <ArrowUpDown className="w-3 h-3 text-gray-400" />
                      </div>
                    </th>
                    <th className="sticky right-0 z-10 px-3 sm:px-6 py-3 bg-background text-right text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      <span className="sr-only sm:not-sr-only">Actions</span>
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-card divide-y divide-border">
                  {sortedUsers.length > 0 ? (
                    sortedUsers.map((user, index) => (
                      <tr 
                        key={user.id} 
                        className="hover:bg-secondary/10 transition-colors cursor-pointer group" 
                        onClick={() => handleEditUser(user)}
                      >
                        <td className="sticky left-0 z-5 px-3 sm:px-6 py-4 bg-background whitespace-nowrap">
                          <div className="flex items-center">
                            <Checkbox 
                              checked={isUserSelected(user.id)}
                              onCheckedChange={() => {}}
                              onClick={(e: React.MouseEvent) => toggleUserSelection(user.id, e)}
                              className="h-4 w-4 rounded"
                            />
                          </div>
                        </td>
                        <td className="sticky left-12 z-5 px-3 sm:px-6 py-4 bg-background whitespace-nowrap text-sm text-muted-foreground">
                          {index + 1}
                        </td>
                        <td className="px-3 sm:px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className="w-10 h-10 rounded-full mr-3 overflow-hidden flex-shrink-0">
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
                            <div className="flex flex-col min-w-0">
                              <div className="text-sm font-medium text-foreground">{user.firstName} {user.lastName}</div>
                              <div className="text-sm text-muted-foreground truncate max-w-[150px] sm:max-w-none">
                                {user.email}
                              </div>
                              <div className="sm:hidden mt-1">
                                {getRoleBadge(user.role)}
                                <span className="mx-2 text-muted-foreground">•</span>
                                {getStatusBadge(user.isActive)}
                              </div>
                              <div className="sm:hidden text-xs text-muted-foreground mt-1">
                                Last: {user.lastLogin ? new Date(user.lastLogin).toLocaleDateString() : 'Never'}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="hidden sm:table-cell px-6 py-4 whitespace-nowrap text-sm text-foreground">
                          {getRoleBadge(user.role)}
                        </td>
                        <td className="hidden md:table-cell px-6 py-4 whitespace-nowrap text-sm text-foreground">
                          {getStatusBadge(user.isActive)}
                        </td>
                        <td className="hidden lg:table-cell px-6 py-4 whitespace-nowrap text-sm text-muted-foreground">
                          {user.lastLogin ? formatDate(user.lastLogin) : 'Never'}
                        </td>
                        <td className="sticky right-0 z-5 px-3 sm:px-6 py-4 bg-background whitespace-nowrap text-right text-sm font-medium">
                              <div className="flex items-center justify-end gap-1">
                                <Button 
                                  className="h-8 w-8 p-0 bg-gradient-to-r from-yellow-400 to-yellow-600 hover:from-yellow-500 hover:to-yellow-700 text-white shadow-lg hover:shadow-xl transition-all duration-200"
                                  onClick={(e: React.MouseEvent) => {
                                    e.stopPropagation();
                                    handleEditUser(user);
                                  }}
                                >
                                  <Edit className="h-4 w-4" />
                                  <span className="sr-only">Edit user</span>
                                </Button>
                              </div>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={6} className="text-center py-8 text-muted-foreground">
                        No users found matching your criteria.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
          </div>
        </div>
      </Card>
    </div>
  );
};

// Page component that wraps the UsersList
export default function ViewEditUserPage() {
  return <UsersList editMode={true} />;
}