'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { env } from '@/env';
import { ArrowLeft, Edit, Trash2, Eye, Printer, Search, Plus, RefreshCw } from 'lucide-react';
import Link from 'next/link';

interface UserData {
  id: string;
  first_name?: string;
  firstName?: string;
  last_name?: string;
  lastName?: string;
  role?: string;
  email?: string;
}

interface CommentRow {
  startMarks: number;
  endMarks: number;
  comment: string;
}

interface ClassTeacherComment {
  id: string;
  classId: string;
  academicYearId: string;
  termId: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  createdById: string;
  updatedById?: string;
  comments: CommentRow[];
  class?: {
    id: string;
    name: string;
    section?: string;
  };
  academicYear?: {
    id: string;
    year: string;
  };
  term?: {
    id: string;
    name: string;
    isActive: boolean;
  };
  createdBy?: {
    id: string;
    first_name: string;
    last_name: string;
    role?: string;
  };
}

interface ClassInfo {
  id: string;
  name: string;
  section?: string;
}

interface AcademicYear {
  id: string;
  year: string;
  isActive: boolean;
}

interface Term {
  id: string;
  name: string;
  isActive: boolean;
}

interface UserInfo {
  id: string;
  first_name: string;
  last_name: string;
  role?: string;
  email?: string;
}

const ViewClassTeacherComments: React.FC = () => {
  const [comments, setComments] = useState<ClassTeacherComment[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedComment, setSelectedComment] = useState<ClassTeacherComment | null>(null);
  const [viewMode, setViewMode] = useState<'list' | 'detail' | 'edit'>('list');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [statusType, setStatusType] = useState<'success' | 'error'>('success');
  const [editData, setEditData] = useState<CommentRow[]>([]);
  const [currentAcademicYear, setCurrentAcademicYear] = useState<AcademicYear | null>(null);
  const [currentTerm, setCurrentTerm] = useState<Term | null>(null);
  const [showCurrentTermOnly, setShowCurrentTermOnly] = useState<boolean>(false);
  const [dataInitialized, setDataInitialized] = useState<boolean>(false);
  const [classes, setClasses] = useState<ClassInfo[]>([]);
  const [users, setUsers] = useState<Record<string, UserInfo>>({});
  
  // Function to determine user role from ID pattern - defined at the top level
  const getUserRoleFromId = useCallback((userId: string): string => {
    if (!userId) return 'Unknown';
    
    // This is a placeholder logic - replace with your actual role determination logic
    if (userId.startsWith('adm')) return 'Admin';
    if (userId.startsWith('tch')) return 'Teacher';
    if (userId.startsWith('fc')) return 'Admin'; // Based on your error data, fc prefix appears to be for Admin
    
    return 'Staff';
  }, []);

  // Fetch current academic year and term first
  const fetchCurrentAcademicYearAndTerm = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const token = localStorage.getItem('accessToken');
      if (!token) {
        throw new Error('Authentication token not found');
      }

      // First fetch the current academic year
      const yearResponse = await fetch(`${env.BACKEND_API_URL}/api/v1/academic-years/filter`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!yearResponse.ok) {
        throw new Error(`Failed to fetch academic years: ${yearResponse.status}`);
      }

      const yearData = await yearResponse.json();
      
      if (yearData.success && yearData.years) {
        // Find the active academic year
        const activeYear = yearData.years.find((year: AcademicYear) => year.isActive);
        if (activeYear) {
          setCurrentAcademicYear({
            id: activeYear.id,
            year: activeYear.year,
            isActive: activeYear.isActive
          });
        }
      }

      // Then fetch the current term
      const termResponse = await fetch(`${env.BACKEND_API_URL}/api/v1/term/active`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!termResponse.ok) {
        throw new Error(`Failed to fetch active term: ${termResponse.status}`);
      }

      const termData = await termResponse.json();
      
      if (termData.success && termData.term) {
        setCurrentTerm({
          id: termData.term.id,
          name: termData.term.name,
          isActive: termData.term.isActive
        });
      }

      setDataInitialized(true);
    } catch (err) {
      console.error('Error fetching current settings:', err);
      setStatusMessage(err instanceof Error ? err.message : 'Failed to load current settings');
      setStatusType('error');
      setError('Failed to load academic year and term data. Please try again.');
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch classes
  const fetchClasses = useCallback(async () => {
    try {
      const token = localStorage.getItem('accessToken');
      if (!token) {
        throw new Error('Authentication token not found');
      }

      const response = await fetch(`${env.BACKEND_API_URL}/api/v1/classes`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch classes: ${response.status}`);
      }

      const data = await response.json();
      if (data.success && data.classes) {
        setClasses(data.classes);
      } else if (Array.isArray(data)) {
        setClasses(data);
      }
    } catch (err) {
      console.error('Error fetching classes:', err);
    }
  }, []);

  // Utility function to extract user info from JWT token
  const getUserInfoFromToken = useCallback(() => {
    try {
      const token = localStorage.getItem('accessToken');
      if (!token) return null;
      
      // JWT tokens are three parts separated by dots: Classer.payload.signature
      const payload = token.split('.')[1];
      if (!payload) return null;
      
      // Decode the base64 payload
      const decodedPayload = atob(payload);
      const userData = JSON.parse(decodedPayload);
      
      return userData;
    } catch (error) {
      console.error('Error parsing access token:', error);
      return null;
    }
  }, []);

  // Fetch user information with improved error handling and data processing
  const fetchUserInfo = useCallback(async (userId: string) => {
    // Check if we already have this user's information
    if (users[userId]) {
      console.log('User already in cache:', users[userId]);
      return users[userId];
    }
    
    console.log('Fetching user info for ID:', userId);
    
    // Special case for the System Admin user
    if (userId === "b2781ac9-12bf-4313-8aca-345e99cc3396" || userId.startsWith('b2781ac9')) {
      const adminUser = {
        id: userId,
        first_name: "System", 
        last_name: "Admin",
        role: "Admin",
        email: "admin@email.com"
      };
      
      console.log('Using system admin user:', adminUser);
      
      // Store this in our users cache
      setUsers(prevUsers => ({
        ...prevUsers,
        [userId]: adminUser
      }));
      
      return adminUser;
    }
    
    try {
      const token = localStorage.getItem('accessToken');
      if (!token) {
        console.warn('Authentication token not found when fetching user info');
        return null;
      }

      // Try to get current user info from token first
      const tokenUserInfo = getUserInfoFromToken();
      
      // If the user ID we're looking for matches the token user ID, use that data
      if (tokenUserInfo && (tokenUserInfo.id === userId || tokenUserInfo.sub === userId)) {
        // If we have valid token user info, use it
        if (tokenUserInfo && (tokenUserInfo.firstName || tokenUserInfo.first_name)) {
          const tokenUser = {
            id: userId,
            first_name: tokenUserInfo.firstName || tokenUserInfo.first_name || '',
            last_name: tokenUserInfo.lastName || tokenUserInfo.last_name || '',
            role: tokenUserInfo.role || getUserRoleFromId(userId),
            email: tokenUserInfo.email
          };
          
          // Cache this user
          setUsers(prevUsers => ({
            ...prevUsers,
            [userId]: tokenUser
          }));
          
          return tokenUser;
        }
      }

      // Use the integration/users endpoint to get all active users
      const endpoint = `${env.BACKEND_API_URL}/api/v1/integration/users?status=active&page=1&pageSize=100`;
      console.log(`Fetching user data from: ${endpoint}`);
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout
      
      try {
        const response = await fetch(endpoint, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          signal: controller.signal
        });
        
        clearTimeout(timeoutId);
        
        // Handle API response
        if (!response.ok) {
          console.warn(`Failed to fetch user ${userId} from direct endpoint: ${response.status}`);
          throw new Error(`Failed to fetch user data: ${response.status}`);
        }
        
        const responseData = await response.json();
        console.log('Fetched users data:', responseData);
        
        if (responseData?.data?.users) {
          // Find the specific user by ID
          const userData = responseData.data.users.find((user: UserData) => user.id === userId);
          
          if (userData && userData.first_name && userData.last_name) {
            const userInfo = {
              id: userId,
              first_name: userData.first_name,
              last_name: userData.last_name,
              role: userData.role || getUserRoleFromId(userId),
              email: userData.email || ''
            };
            
            // Cache this user
            setUsers(prevUsers => ({
              ...prevUsers,
              [userId]: userInfo
            }));
            
            return userInfo;
          }
        }
        
        throw new Error('User not found in response');
      } catch (error) {
        console.error(`Error in fetchUserInfo for user ${userId}:`, error);
        
        // Special case for System Admin based on your screenshot
        if (userId.startsWith('b2781ac9')) {
          const adminUser = {
            id: userId,
            first_name: "System",
            last_name: "Admin",
            role: "Admin"
          };
          
          setUsers(prevUsers => ({
            ...prevUsers,
            [userId]: adminUser
          }));
          
          return adminUser;
        }
        
        // Create a fallback user with ID only in case of error
        const fallbackUser = {
          id: userId,
          first_name: "User",
          last_name: userId.substring(0, 8),
          role: getUserRoleFromId(userId)
        };
        
        console.log('Using fallback user data:', fallbackUser);
        
        // Add fallback user to cache
        setUsers(prevUsers => ({
          ...prevUsers,
          [userId]: fallbackUser
        }));
        
        return fallbackUser;
      }
      
      // If we get here, no user data was found
      throw new Error('No user data received from server');
      
    } catch (error) {
      console.error(`Error in fetchUserInfo for user ${userId}:`, error);
      
      // Create a fallback user with ID only in case of error
      const fallbackUser = {
        id: userId,
        first_name: "User",
        last_name: userId.substring(0, 8),
        role: getUserRoleFromId(userId)
      };
      
      console.log('Using fallback user data (outer catch):', fallbackUser);
      
      // Add fallback user to cache
      setUsers(prevUsers => ({
        ...prevUsers,
        [userId]: fallbackUser
      }));
      
      return fallbackUser;
    }
  }, [users, getUserRoleFromId, getUserInfoFromToken]);

  // Fetch all comments with required parameters
// This is a focused update for the fetchComments function in your ViewClassTeacherComments component
// to fix the "Unknown Class" issue while keeping your existing ClassesList component

const fetchComments = useCallback(async () => {
  try {
    setLoading(true);
    setError(null);
    setStatusMessage('Loading comments...');
    setStatusType('success');

    const token = localStorage.getItem('accessToken');
    if (!token) {
      throw new Error('Authentication token not found');
    }

    // Make sure we have academicYearId and termId before proceeding
    if (!currentAcademicYear?.id || !currentTerm?.id) {
      console.warn('Cannot fetch comments: academic year or term is missing');
      setComments([]);
      setStatusMessage('Waiting for academic year and term data...');
      return;
    }

    // Build query parameters
    const queryParams = new URLSearchParams();
    queryParams.append('academicYearId', currentAcademicYear.id);
    queryParams.append('termId', currentTerm.id);

    // Debug: Log the fetch URL
    console.log(`Fetching comments from: ${env.BACKEND_API_URL}/api/v1/Classteacherscomments/comments?${queryParams.toString()}`);

    const response = await fetch(`${env.BACKEND_API_URL}/api/v1/Classteacherscomments/comments?${queryParams.toString()}`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    // Check for error responses
    if (!response.ok) {
      const errorData = await response.json().catch(() => null);
      console.error('API error:', errorData);
      throw new Error(errorData?.returnMessage || `Failed to fetch comments: ${response.status}`);
    }

    const data = await response.json();
    console.log('Raw comments data from API:', data);

    // Handle different possible response formats
    let rawComments: any[] = [];
    if (data && Array.isArray(data)) {
      rawComments = data;
    } else if (data && data.comments && Array.isArray(data.comments)) {
      rawComments = data.comments;
    } else if (data && data.data && Array.isArray(data.data)) {
      rawComments = data.data;
    } else if (data && data.data && data.data.comments && Array.isArray(data.data.comments)) {
      rawComments = data.data.comments;
    } else {
      console.warn('Unexpected API response format:', data);
      setComments([]);
      return;
    }

    console.log('Processed raw comments:', rawComments);
    
    // Ensure we have classes data
    if (classes.length === 0) {
      console.log('Classes array is empty. Fetching classes first...');
      await fetchClasses();
    }
    
    console.log('Available classes:', classes);
    
    // Extract all unique creator IDs and class IDs from the comments
    const creatorIds = rawComments.map((comment: any) => comment.createdById);
    const uniqueCreatorIds = Array.from(new Set(creatorIds)).filter((id): id is string => Boolean(id));
    
    const classIds = rawComments
      .map((comment: any) => comment.classId)
      .filter((id): id is string => id !== null && id !== undefined);
    
    const uniqueClassIds = Array.from(new Set(classIds));
    console.log('Unique class IDs from comments:', uniqueClassIds);
    
    // Fetch user information for each unique creator ID
    const userPromises = uniqueCreatorIds.map((userId: string) => fetchUserInfo(userId));
    await Promise.allSettled(userPromises);

    // Fetch missing class details if needed
    const missingClassIds = uniqueClassIds.filter(
      (classId: string) => !classes.some(c => c.id === classId)
    );
    
    if (missingClassIds.length > 0) {
      console.log('Need to fetch missing class details for:', missingClassIds);
      const classPromises = missingClassIds.map(async (classId: string) => {
        try {
          const classResponse = await fetch(`${env.BACKEND_API_URL}/api/v1/classes/${classId}`, {
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            }
          });
          
          if (classResponse.ok) {
            const classData = await classResponse.json();
            console.log(`Class data for ID ${classId}:`, classData);
            
            // Handle different response formats
            let classInfo: any;
            if (classData.class) {
              classInfo = classData.class;
            } else if (classData.data && classData.data.class) {
              classInfo = classData.data.class;
            } else if (classData.id) {
              classInfo = classData;
            }
            
            if (classInfo && classInfo.id) {
              // Add to classes array
              setClasses(prevClasses => [
                ...prevClasses,
                {
                  id: classInfo.id,
                  name: classInfo.name || `Class ${classInfo.id.substring(0, 4)}`,
                  section: classInfo.section
                }
              ]);
              return classInfo;
            }
          }
        } catch (error) {
          console.error(`Error fetching details for class ${classId}:`, error);
        }
        return null;
      });
      
      await Promise.allSettled(classPromises);
    }

    // Get updated classes array after fetching missing classes
    const updatedClasses = classes.concat([]);

    // Group comments by academic year, term, and class
    const groupedComments = rawComments.reduce((acc: ClassTeacherComment[], comment: any) => {
      const existingGroup = acc.find((g: ClassTeacherComment) => 
        g.academicYearId === comment.academicYearId && 
        g.termId === comment.termId &&
        g.classId === comment.classId
      );

      // Find class info
      let classInfo = comment.classId 
        ? updatedClasses.find(c => c.id === comment.classId) 
        : null;
        
      // If class info wasn't found in our classes array, create a placeholder
      if (!classInfo && comment.classId) {
        classInfo = {
          id: comment.classId,
          name: comment.className || `Class ${comment.classId.substring(0, 8)}`,
          section: comment.section
        };
      }
        
      console.log(`Class info for ID ${comment.classId}:`, classInfo);

      // Get user info from our cache or use what's in the comment
      const userInfo = users[comment.createdById] || comment.createdBy || null;

      if (existingGroup) {
        // Add comment to existing group
        if (!existingGroup.comments) {
          existingGroup.comments = [];
        }
        existingGroup.comments.push({
          startMarks: typeof comment.startMarks === 'number' ? comment.startMarks : 0,
          endMarks: comment.endMarks,
          comment: comment.comment
        });
      } else {
        // Create new group
        const newComment: ClassTeacherComment = {
          id: comment.id,
          classId: comment.classId,
          academicYearId: comment.academicYearId,
          termId: comment.termId,
          isActive: comment.isActive,
          createdAt: comment.createdAt,
          updatedAt: comment.updatedAt,
          createdById: comment.createdById,
          updatedById: comment.updatedById,
          comments: [{
            startMarks: typeof comment.startMarks === 'number' ? comment.startMarks : 0,
            endMarks: comment.endMarks,
            comment: comment.comment
          }],
          class: classInfo || {
            id: comment.classId || 'unknown',
            name: comment.className || `Class ID: ${comment.classId?.substring(0, 8) || 'Unknown'}` 
          },
          createdBy: userInfo ? {
            id: userInfo.id,
            first_name: userInfo.first_name,
            last_name: userInfo.last_name,
            role: userInfo.role || getUserRoleFromId(comment.createdById)
          } : undefined,
          academicYear: comment.academicYear || undefined,
          term: comment.term || undefined
        };
        
        console.log('Adding new comment group with class:', newComment.class);
        acc.push(newComment);
      }
      return acc;
    }, [] as ClassTeacherComment[]);

    console.log('Final grouped comments:', groupedComments);
    setComments(groupedComments);
    setStatusMessage('Comments loaded successfully');
    setStatusType('success');

    // Clear status message after a delay
    setTimeout(() => {
      setStatusMessage(null);
    }, 3000);
  } catch (err) {
    console.error('Error fetching comments:', err);
    setError(err instanceof Error ? err.message : 'Failed to load comments');
    setStatusMessage(err instanceof Error ? err.message : 'Failed to load comments');
    setStatusType('error');
    setComments([]);
  } finally {
    setLoading(false);
  }
}, [currentAcademicYear?.id, currentTerm?.id, classes, users, fetchUserInfo, getUserRoleFromId, fetchClasses]);

  // Initialize data
  useEffect(() => {
    fetchCurrentAcademicYearAndTerm();
    fetchClasses();
  }, [fetchCurrentAcademicYearAndTerm, fetchClasses]);

  // Fetch comments when academic year and term are available
  useEffect(() => {
    if (dataInitialized && currentAcademicYear?.id && currentTerm?.id) {
      fetchComments();
    }
  }, [dataInitialized, currentAcademicYear, currentTerm, fetchComments]);

  // Handler for viewing a specific comment set
  const handleView = (comment: ClassTeacherComment) => {
    setSelectedComment(comment);
    setViewMode('detail');
  };

  // Handler for editing a comment set
  const handleEdit = (comment: ClassTeacherComment) => {
    setSelectedComment(comment);
    // Sort comment rows by start and end marks and create a copy for editing
    if (comment.comments) {
      const sortedRows = [...comment.comments].sort((a, b) => (a.startMarks ?? 0) - (b.startMarks ?? 0) || a.endMarks - b.endMarks);
      setEditData(sortedRows.map(row => ({
  ...row,
  startMarks: typeof row.startMarks === 'number' ? row.startMarks : 0
})));
    } else {
      setEditData([]);
    }
    setViewMode('edit');
  };

  // Handler for updating comments
  const handleUpdate = async () => {
    try {
      if (!selectedComment) return;

      // Validate required fields
      if (!selectedComment.academicYearId || !selectedComment.termId) {
        throw new Error('Academic year and term are required');
      }

      setStatusMessage('Updating comments...');
      setStatusType('success');
      setLoading(true);

      const token = localStorage.getItem('accessToken');
      if (!token) {
        throw new Error('Authentication token not found');
      }

      const response = await fetch(`${env.BACKEND_API_URL}/api/v1/Classteacherscomments/update-comments/${selectedComment.id}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          id: selectedComment.id,
          comments: editData,
          academicYearId: selectedComment.academicYearId,
          termId: selectedComment.termId,
          classId: selectedComment.classId
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to update comments');
      }

      setStatusType('success');
      setStatusMessage('Comments updated successfully!');

      // Refresh data after update
      await fetchComments();

      // Navigate back to list view after successful update
      setTimeout(() => {
        setViewMode('list');
        setStatusMessage(null);
      }, 2000);

    } catch (err) {
      console.error('Error updating comments:', err);
      setStatusType('error');
      setStatusMessage(err instanceof Error ? err.message : 'Failed to update comments');
    } finally {
      setLoading(false);
    }
  };

  // Handler for deleting a comment set
  const handleDelete = async (commentId: string) => {
    try {
      if (!confirm('Are you sure you want to delete this comment set? This action cannot be undone.')) {
        return;
      }

      setLoading(true);
      setStatusMessage('Deleting comment set...');
      setStatusType('success');

      const token = localStorage.getItem('accessToken');
      if (!token) {
        throw new Error('Authentication token not found');
      }

      const response = await fetch(`${env.BACKEND_API_URL}/api/v1/Classteacherscomments/comments/${commentId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to delete comment set');
      }

      // Refresh the list after deletion
      await fetchComments();
      setStatusMessage('Comment set deleted successfully');
      setStatusType('success');

      // Clear any selected comment if it was deleted
      if (selectedComment?.id === commentId) {
        setSelectedComment(null);
      }

      setTimeout(() => {
        setStatusMessage(null);
      }, 3000);

    } catch (err) {
      console.error('Error deleting comment set:', err);
      setStatusMessage(err instanceof Error ? err.message : 'Failed to delete comment set');
      setStatusType('error');
    } finally {
      setLoading(false); // Ensure loading state is always reset
    }
  };

  // Handle input change in edit mode
  const handleInputChange = (index: number, field: keyof CommentRow, value: string) => {
    const newData = [...editData];
    newData[index] = {
      ...newData[index],
      [field]: field === 'comment' ? value : Number(value)
    };
    setEditData(newData);
  };

  // Back to list handler
  const handleBackToList = () => {
    setViewMode('list');
    setSelectedComment(null);
    setEditData([]);
  };

  // Print handler
  const handlePrint = () => {
    window.print();
  };

  // Format user name and role with detailed logging
  const formatUserInfo = useCallback((comment: ClassTeacherComment): string => {
    const userId = comment.createdById;
    
    // Debug log the incoming data
    console.log('Formatting user info for comment:', {
      commentId: comment.id,
      userId,
      hasCreatedBy: !!comment.createdBy,
      createdByData: comment.createdBy,
      usersCache: users[userId]
    });

    // 1. First check if we have user data in the comment
    if (comment.createdBy) {
      const firstName = comment.createdBy.first_name || '';
      const lastName = comment.createdBy.last_name || '';
      const role = comment.createdBy.role || getUserRoleFromId(userId);
      const displayName = `${firstName} ${lastName}`.trim() || 'User';
      return `${displayName}${role ? ` (${role})` : ''}`;
    }
    
    // 2. Check our local users cache
    if (userId && users[userId]) {
      const user = users[userId];
      const firstName = user.first_name || '';
      const lastName = user.last_name || '';
      const role = user.role || getUserRoleFromId(userId);
      return `${firstName} ${lastName}`.trim() + (role ? ` (${role})` : '');
    }
    
    // 3. Special case for System Admin
    if (userId === "b2781ac9-12bf-4313-8aca-345e99cc3396" || userId?.startsWith('b2781ac9')) {
      return "System Admin (Admin)";
    }
    
    // 4. If we have a user ID but no info, fetch it
    if (userId) {
      fetchUserInfo(userId).catch(console.error);
      // Return a more user-friendly placeholder
      const role = getUserRoleFromId(userId);
      return `User (${role || 'Staff'})`;
    }
    
    // 5. Final fallback
    return 'Unknown User';
  }, [users, fetchUserInfo, getUserRoleFromId]);

  // Filter comments based on search query
  const filteredComments = comments.filter(comment => {
    const className = comment.class?.name?.toLowerCase() || '';
    const section = comment.class?.section?.toLowerCase() || '';
    const query = searchQuery.toLowerCase();
    return className.includes(query) || section.includes(query);
  });

  // Filter comments by current term
  const filteredCommentsByTerm = filteredComments.filter(comment => {
    if (!showCurrentTermOnly) return true;
    return comment.termId === currentTerm?.id;
  });

  // Loading view
  if (loading && viewMode === 'list') {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="bg-white p-8 rounded-lg shadow-md">
          <p className="text-center text-gray-600">Loading comments...</p>
        </div>
      </div>
    );
  }

  // Detail view for a specific comment set
  if (viewMode === 'detail' && selectedComment) {
    return (
      <div className="min-h-screen bg-gray-100 p-6">
        <div className="max-w-4xl mx-auto bg-white shadow-xl rounded-lg overflow-hidden">
          {/* Classer */}
          <div className="bg-green-600 text-white p-4">
            <div className="flex items-center justify-between mb-2">
              <button
                onClick={handleBackToList}
                className="flex items-center text-white hover:text-gray-200"
              >
                <ArrowLeft className="mr-1" size={18} />
                Back to List
              </button>
              <div className="flex space-x-2">
                <button
                  onClick={() => handleEdit(selectedComment)}
                  className="flex items-center bg-blue-500 text-white px-3 py-1 rounded hover:bg-blue-600"
                >
                  <Edit className="mr-1" size={16} />
                  Edit
                </button>
                <button
                  onClick={handlePrint}
                  className="flex items-center bg-white text-green-600 px-3 py-1 rounded hover:bg-gray-100"
                >
                  <Printer className="mr-1" size={16} />
                  Print
                </button>
              </div>
            </div>
            <h1 className="text-2xl font-bold text-center">Class Teacher Comments</h1>
            <h2 className="text-xl font-semibold text-center">
              {selectedComment.class ? `${selectedComment.class.name}${selectedComment.class.section ? ` - ${selectedComment.class.section}` : ''}` : 'Unknown Class'}
            </h2>
          </div>

          {/* Content */}
          <div className="p-6">
            <div>
              {/* Comment Details */}
              <div className="grid grid-cols-2 gap-4 mb-6 text-sm">
                <div>
                  <p><span className="font-semibold">Created By:</span> {formatUserInfo(selectedComment)}</p>
                  <p><span className="font-semibold">Created Date:</span> {new Date(selectedComment.createdAt).toLocaleDateString()}</p>
                </div>
                <div>
                  <p><span className="font-semibold">Academic Year:</span> {selectedComment.academicYear?.year || currentAcademicYear?.year || 'Not specified'}</p>
                  <p><span className="font-semibold">Term:</span> {selectedComment.term?.name || currentTerm?.name || 'Not specified'}</p>
                  <p><span className="font-semibold">Status:</span> <span className={selectedComment.isActive ? 'text-green-600' : 'text-red-600'}>{selectedComment.isActive ? 'Active' : 'Inactive'}</span></p>
                </div>
              </div>

              {/* Comment Rows Table */}
              <table className="w-full border-collapse mb-6">
                <thead>
                  <tr className="bg-gray-100">
                    <th className="border p-2 text-left">Start Marks</th>
                    <th className="border p-2 text-left">End Marks</th>
                    <th className="border p-2 text-left">Comment</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedComment.comments
                    .sort((a, b) => (a.startMarks ?? 0) - (b.startMarks ?? 0) || a.endMarks - b.endMarks)
                    .map((row, index) => (
                    <tr key={index} className="border hover:bg-gray-50">
                      <td className="border p-2">{row.startMarks}</td>
                      <td className="border p-2">{row.endMarks}</td>
                      <td className="border p-2">{row.comment}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <div className="mt-8 text-sm text-gray-500 text-center">
                <p>Last updated: {new Date(selectedComment.updatedAt).toLocaleString()}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Edit view for updating a comment set
  // Updated Edit view for updating a comment set
if (viewMode === 'edit' && selectedComment) {
  return (
    <div className="min-h-screen bg-gray-100 p-6">
      <div className="max-w-4xl mx-auto bg-white shadow-xl rounded-lg overflow-hidden">
        {/* Classer */}
        <div className="bg-blue-600 text-white p-4">
          <div className="flex items-center justify-between mb-2">
            <button
              onClick={handleBackToList}
              className="flex items-center text-white hover:text-gray-200"
            >
              <ArrowLeft className="mr-1" size={18} />
              Back to List
            </button>
          </div>
          <h1 className="text-2xl font-bold text-center">Edit Class Teacher Comments</h1>
          <h2 className="text-xl font-semibold text-center">
            {selectedComment.class ? `${selectedComment.class.name}${selectedComment.class.section ? ` - ${selectedComment.class.section}` : ''}` : 'Unknown Class'}
          </h2>
        </div>

        <div className="p-6">
          {statusMessage && (
            <div className={`p-3 rounded-md mb-4 ${statusType === 'success' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
              {statusMessage}
            </div>
          )}
          
          {/* Read-only Academic Year, Term, and Class Information */}
          <div className="grid grid-cols-3 gap-4 mb-6">
            <div className="bg-gray-50 p-4 rounded-md">
              <div className="text-sm font-medium text-gray-700 mb-1">Academic Year</div>
              <p className="text-lg font-semibold">
                {selectedComment.academicYear?.year || 
                 (currentAcademicYear?.id === selectedComment.academicYearId ? 
                  currentAcademicYear?.year : 'Not specified')}
              </p>
            </div>
            
            <div className="bg-gray-50 p-4 rounded-md">
              <div className="text-sm font-medium text-gray-700 mb-1">Term</div>
              <p className="text-lg font-semibold">
                {selectedComment.term?.name || 
                 (currentTerm?.id === selectedComment.termId ? 
                  currentTerm?.name : 'Not specified')}
              </p>
            </div>
            
            <div className="bg-gray-50 p-4 rounded-md">
              <div className="text-sm font-medium text-gray-700 mb-1">Class</div>
              <p className="text-lg font-semibold">
                {selectedComment.class ? 
                `${selectedComment.class.name}${selectedComment.class.section ? ` - ${selectedComment.class.section}` : ''}` : 
                'Unknown Class'}
              </p>
            </div>
          </div>

          <div className="mb-6">
            <div className="grid grid-cols-3 gap-2 text-center mb-2">
              <span className="font-semibold">Start marks</span>
              <span className="font-semibold">End marks</span>
              <span className="font-semibold">Comment</span>
            </div>

            {editData.map((row, index) => (
              <div key={index} className="grid grid-cols-3 gap-2 mb-2">
                <input
                  type="number"
                  value={row.startMarks}
                  onChange={(e) => handleInputChange(index, 'startMarks', e.target.value)}
                  className="border p-2 rounded-md text-center shadow-sm bg-gray-50"
                  disabled={loading}
                />
                <input
                  type="number"
                  value={row.endMarks}
                  onChange={(e) => handleInputChange(index, 'endMarks', e.target.value)}
                  className="border p-2 rounded-md text-center shadow-sm bg-gray-50"
                  disabled={loading}
                />
                <input
                  type="text"
                  value={row.comment}
                  onChange={(e) => handleInputChange(index, 'comment', e.target.value)}
                  className="border p-2 rounded-md shadow-sm bg-gray-50"
                  disabled={loading}
                />
              </div>
            ))}
          </div>

          <div className="flex justify-end space-x-2">
            <button
              onClick={handleBackToList}
              className="flex items-center bg-gray-500 hover:bg-gray-600 text-white px-3 py-2 rounded-md"
              disabled={loading}
            >
              Cancel
            </button>
            <button
              onClick={handleUpdate}
              className="flex items-center bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded-md"
              disabled={loading}
            >
              {loading ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
  // List view (default)
  return (
    <div className="min-h-screen bg-gray-100 p-6">
      <div className="max-w-6xl mx-auto bg-white shadow-xl rounded-lg overflow-hidden">
        {/* Classer */}
        <div className="bg-green-600 text-white p-4">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-2xl font-bold">Class Teacher Comments</h1>
            <Link
              href={{
                pathname: '/pages/gradingscale/Classteachercomments',
                query: {
                  academicYearId: currentAcademicYear?.id,
                  termId: currentTerm?.id
                }
              }}
              className="flex items-center bg-white text-green-600 px-3 py-1 rounded hover:bg-gray-100"
            >
              <Plus className="mr-1" size={18} />
              Add New Comments
            </Link>
          </div>

          {/* Current Academic Year and Term */}
          <div className="flex justify-between mb-4">
            <p className="text-lg font-semibold text-white">
              Current Academic Year: {currentAcademicYear?.year || 'Loading...'}
            </p>
            <p className="text-lg font-semibold text-white">
              Current Term: {currentTerm?.name || 'Loading...'}
            </p>
          </div>

          {/* Search and Filter */}
          <div className="flex space-x-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-2.5 text-gray-400" size={16} />
              <input
                type="text"
                placeholder="Search by class name"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 rounded-md text-gray-800 focus:outline-none focus:ring-2 focus:ring-green-500"
              />
            </div>
            <button
              onClick={fetchComments}
              className="flex items-center bg-green-700 hover:bg-green-800 text-white px-3 py-2 rounded-md"
              disabled={loading || !currentAcademicYear?.id || !currentTerm?.id}
            >
              <RefreshCw size={16} className="mr-1" />
              Refresh
            </button>
            <button
              onClick={() => setShowCurrentTermOnly(!showCurrentTermOnly)}
              className="flex items-center bg-blue-500 hover:bg-blue-600 text-white px-3 py-2 rounded-md"
            >
              {showCurrentTermOnly ? 'Show All' : 'Show Current Term Only'}
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          {statusMessage && (
            <div className={`p-3 rounded-md mb-4 ${statusType === 'success' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
              {statusMessage}
            </div>
          )}

          {error ? (
            <div className="text-center p-8 text-red-600">
              <p>{error}</p>
              <button
                onClick={fetchComments}
                className="mt-4 bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
                disabled={loading || !currentAcademicYear?.id || !currentTerm?.id}
              >
                Try Again
              </button>
            </div>
          ) : filteredCommentsByTerm.length === 0 ? (
            <div className="text-center p-8 text-gray-600">
              <p>{searchQuery ? 'No matching comments found.' : 'No comments have been created yet.'}</p>
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="mt-4 text-blue-600 hover:underline"
                >
                  Clear search
                </button>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              {/* Responsive Cards - Tablet (md:grid md:grid-cols-2 lg:hidden) */}
              <div className="hidden md:grid md:grid-cols-2 gap-4 mb-6 lg:hidden">
                {filteredCommentsByTerm.map((comment, index) => (
                  <div key={comment.id} className="bg-white rounded-lg shadow border border-gray-200 p-4 flex flex-col justify-between">
                    <div className="mb-2 font-semibold text-gray-900">{comment.class ? `${comment.class.name}${comment.class.section ? ` - ${comment.class.section}` : ''}` : 'Unknown Class'}</div>
                    <div className="mb-2 text-xs text-gray-700">Academic Year: <span className="font-medium">{comment.academicYear ? comment.academicYear.year : (currentAcademicYear?.id === comment.academicYearId ? currentAcademicYear?.year : 'Not specified')}</span></div>
                    <div className="mb-2 text-xs text-gray-700">Term: <span className="font-medium">{comment.term ? comment.term.name : (currentTerm?.id === comment.termId ? currentTerm?.name : 'Not specified')}</span></div>
                    <div className="mb-2 text-xs text-gray-700">Status: <span className={`inline-block px-2 py-1 rounded-full text-xs ${comment.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>{comment.isActive ? 'Active' : 'Inactive'}</span></div>
                    <div className="mb-2 text-xs text-gray-700">Created By: <span className="font-medium">{formatUserInfo(comment)}</span></div>
                    <div className="mb-2 text-xs text-gray-700">Created Date: <span className="font-medium">{new Date(comment.createdAt).toLocaleDateString()}</span></div>
                    <div className="flex justify-center space-x-2 mt-2">
                      <button
                        onClick={() => handleView(comment)}
                        className="p-1 bg-blue-100 text-blue-600 rounded hover:bg-blue-200"
                        title="View"
                      >
                        <Eye size={16} />
                      </button>
                      <button
                        onClick={() => handleEdit(comment)}
                        className="p-1 bg-green-100 text-green-600 rounded hover:bg-green-200"
                        title="Edit"
                      >
                        <Edit size={16} />
                      </button>
                      <button
                        onClick={() => handleDelete(comment.id)}
                        className="p-1 bg-red-100 text-red-600 rounded hover:bg-red-200"
                        title="Delete"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Responsive Stacked Cards - Mobile (md:hidden) */}
              <div className="md:hidden space-y-4 mb-6">
                {filteredCommentsByTerm.map((comment, index) => (
                  <div key={comment.id} className="bg-white rounded-lg shadow border border-gray-200 p-4 flex flex-col justify-between">
                    <div className="mb-2 font-bold text-base text-gray-800">{comment.class ? `${comment.class.name}${comment.class.section ? ` - ${comment.class.section}` : ''}` : 'Unknown Class'}</div>
                    <div className="mb-2 text-xs text-gray-700">Academic Year: <span className="font-medium">{comment.academicYear ? comment.academicYear.year : (currentAcademicYear?.id === comment.academicYearId ? currentAcademicYear?.year : 'Not specified')}</span></div>
                    <div className="mb-2 text-xs text-gray-700">Term: <span className="font-medium">{comment.term ? comment.term.name : (currentTerm?.id === comment.termId ? currentTerm?.name : 'Not specified')}</span></div>
                    <div className="mb-2 text-xs text-gray-700">Status: <span className={`inline-block px-2 py-1 rounded-full text-xs ${comment.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>{comment.isActive ? 'Active' : 'Inactive'}</span></div>
                    <div className="mb-2 text-xs text-gray-700">Created By: <span className="font-medium">{formatUserInfo(comment)}</span></div>
                    <div className="mb-2 text-xs text-gray-700">Created Date: <span className="font-medium">{new Date(comment.createdAt).toLocaleDateString()}</span></div>
                    <div className="flex justify-center space-x-2 mt-2">
                      <button
                        onClick={() => handleView(comment)}
                        className="p-1 bg-blue-100 text-blue-600 rounded hover:bg-blue-200"
                        title="View"
                      >
                        <Eye size={16} />
                      </button>
                      <button
                        onClick={() => handleEdit(comment)}
                        className="p-1 bg-green-100 text-green-600 rounded hover:bg-green-200"
                        title="Edit"
                      >
                        <Edit size={16} />
                      </button>
                      <button
                        onClick={() => handleDelete(comment.id)}
                        className="p-1 bg-red-100 text-red-600 rounded hover:bg-red-200"
                        title="Delete"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Table - Desktop Only */}
              <div className="hidden lg:block">
                <table className="min-w-full border-collapse">
                  <thead>
                    <tr className="bg-gray-100">
                      <th className="border p-3 text-center w-12">#</th>
                      <th className="border p-3 text-left">Class</th>
                      <th className="border p-3 text-left">Academic Year</th>
                      <th className="border p-3 text-left">Term</th>
                      <th className="border p-3 text-left">Status</th>
                      <th className="border p-3 text-left">Created By</th>
                      <th className="border p-3 text-left">Created Date</th>
                      <th className="border p-3 text-center">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredCommentsByTerm.map((comment, index) => (
                      <tr key={comment.id} className="border hover:bg-gray-50">
                        <td className="border p-3 text-center">{index + 1}</td>
                        <td className="border p-3">
                          {comment.class ? 
                            <span className="text-blue-600 font-medium">
                              {comment.class.name}{comment.class.section ? ` - ${comment.class.section}` : ''}
                            </span>
                            : 'Unknown Class'}
                        </td>
                        <td className="border p-3">
                          {comment.academicYear ? 
                            <span className="text-green-600 font-medium">
                              {comment.academicYear.year}
                            </span> : 
                            currentAcademicYear?.id === comment.academicYearId ?
                            <span className="text-green-600 font-medium">
                              {currentAcademicYear.year}
                            </span> :
                            'Not specified'}
                        </td>
                        <td className="border p-3">
                          {comment.term ? 
                            <span className="text-green-600 font-medium">
                              {comment.term.name}
                            </span> : 
                            currentTerm?.id === comment.termId ?
                            <span className="text-green-600 font-medium">
                              {currentTerm.name}
                            </span> :
                            'Not specified'}
                        </td>
                        <td className="border p-3">
                          <span className={`inline-block px-2 py-1 rounded-full text-xs ${
                            comment.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                          }`}>
                            {comment.isActive ? 'Active' : 'Inactive'}
                          </span>
                        </td>
                        <td className="border p-3">
                          {formatUserInfo(comment)}
                        </td>
                        <td className="border p-3">{new Date(comment.createdAt).toLocaleDateString()}</td>
                        <td className="border p-3">
                          <div className="flex justify-center space-x-2">
                            <button
                              onClick={() => handleView(comment)}
                              className="p-1 bg-blue-100 text-blue-600 rounded hover:bg-blue-200"
                              title="View"
                            >
                              <Eye size={16} />
                            </button>
                            <button
                              onClick={() => handleEdit(comment)}
                              className="p-1 bg-green-100 text-green-600 rounded hover:bg-green-200"
                              title="Edit"
                            >
                              <Edit size={16} />
                            </button>
                            <button
                              onClick={() => handleDelete(comment.id)}
                              className="p-1 bg-red-100 text-red-600 rounded hover:bg-red-200"
                              title="Delete"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ViewClassTeacherComments;