"use client";
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Search, Printer, RotateCw } from 'lucide-react';
import Image from 'next/image';
import { ExcelExport } from '@/components/ExcelExport';
import { useRouter } from 'next/navigation';
import DialogBox from '@/components/Dailogbox';
import { useReactToPrint } from 'react-to-print';
import { env } from '@/env';
import { supabase } from '../../../../../lib/supabaseClient';

interface Teacher {
  id: string; 
  email: string;
  phone: string;
  role: string;
  first_name: string;
  last_name: string;
  middle_name?: string;
  initials?: string;
  address?: string;
  salary?: string;
  utility?: string;
  gender: string;
  name_of_bank?: string;
  account_number?: string;
  mobile_money_number?: string;
  registered_name?: string;
  staff_photo?: string;
  section?: string;
  hasAccess: boolean;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
  date_joined?: string;
  password?: string;
  
  // These fields don't come from API but are needed for UI
  classesAssigned?: string[];
  subjectsAssigned?: string[];
}

interface ApiResponse {
  status: {
    returnCode: string;
    returnMessage: string;
  };
  data: {
    pagination: {
      page: number;
      pageSize: number;
      totalCount: number;
      totalPages: number;
      nextPage: number;
      prevPage: number;
    };
    users: Teacher[];
  };
}

const TeacherManagement: React.FC = () => {
  const router = useRouter();

  // Utility functions
  const handleBack = useCallback(() => {
    setShowForm(false);
    setIsEditing(false);
    setSelectedTeacher(null);
    setFormResponseMessage(''); // Reset form message when going back
  }, []);

  const handleAddTeacher = useCallback(() => {
    setShowForm(true);
    setIsEditing(false);
    setSelectedTeacher(null);
    setFormResponseMessage(''); // Reset form message when adding new teacher
  }, []);

  // Handle authentication error
  const handleAuthError = useCallback(() => {
    setError('Your session has expired. Please log in again.');
    localStorage.removeItem('accessToken');
    router.push('/sign-in'); // Redirect to login
  }, [router]);

  // State variables
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchInput, setSearchInput] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [selectedTeacher, setSelectedTeacher] = useState<Teacher | null>(null);
  const [classOptions, setClassOptions] = useState<string[]>([]);
  const [subjectOptions, setSubjectOptions] = useState<string[]>([]);
  const [formResponseMessage, setFormResponseMessage] = useState('');
  
  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10000);
  const [totalTeachers, setTotalTeachers] = useState(0);

  // Dialog states for the DialogBox component
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [dialogTitle, setDialogTitle] = useState('');
  const [dialogMessage, setDialogMessage] = useState('');
  const [dialogType, setDialogType] = useState<'delete' | 'warning' | 'info'>('delete');
  const [pendingAction, setPendingAction] = useState<(() => void) | null>(null);
  const [confirmText, setConfirmText] = useState('Confirm');
  const [cancelText, setCancelText] = useState('Cancel');

  const [isLandscape, setIsLandscape] = useState(false);
  const printRef = useRef<HTMLDivElement>(null);

  const handlePrint = useReactToPrint({
    contentRef: printRef,
    documentTitle: 'Teacher List',
    pageStyle: `
      @page {
        size: ${isLandscape ? 'A4 landscape' : 'A4'};
        margin: 1cm;
      }
      body {
        font-family: Arial, sans-serif;
      }
      .print-header {
        text-align: center;
        margin-bottom: 2rem;
      }
      .print-header h1 {
        color: #00796b;
        margin-bottom: 0.5rem;
      }
      .print-header p {
        color: #666;
      }
      table {
        width: 100%;
        border-collapse: collapse;
        margin: 1rem 0;
      }
      th, td {
        padding: 0.75rem;
        text-align: left;
        border: 1px solid #ddd;
      }
      th {
        background-color: #00796b;
        color: white;
      }
      tr:nth-child(even) {
        background-color: #f8f9fa;
      }
      @media print {
        .no-print {
          display: none !important;
        }
        .edit-column {
          display: none !important;
        }
        html, body {
          width: ${isLandscape ? '297mm' : '210mm'};
          height: ${isLandscape ? '210mm' : '297mm'};
        }
      }
    `
  });

  // Helper function to upload photo
  const uploadPhoto = async (photoFile: File, teacherId?: string): Promise<string | null> => {
    try {
      console.log('Attempting to upload photo to Supabase...');
      
      // Generate unique filename
      const fileExtension = photoFile.name.split('.').pop();
      const fileName = `staff_${Date.now()}.${fileExtension}`;
      
      const { data, error } = await supabase.storage
        .from('staff-photos')
        .upload(fileName, photoFile);

      if (error) {
        console.error('Supabase photo upload failed:', error);
        throw new Error(`Photo upload failed: ${error.message}`);
      }

      console.log('Photo uploaded successfully to Supabase:', fileName);
      return fileName; // Return the filename as the photo URL
    } catch (err) {
      console.error('Error uploading photo:', err);
      // Use showErrorDialog to inform the user
      showErrorDialog('Upload Error', `Failed to upload photo: ${err instanceof Error ? err.message : 'Unknown error'}`);
      return null; // Indicate failure
    }
  };

  // Dialog display helper functions - wrapped in useCallback to avoid dependency issues
  const showSuccessDialog = useCallback((title: string, message: string) => {
    setDialogTitle(title);
    setDialogMessage(message);
    setDialogType('info');
    setConfirmText('OK');
    setCancelText('Close');
    setIsDialogOpen(true);
    setPendingAction(null);
  }, []);

  const showErrorDialog = useCallback((title: string, message: string) => {
    setDialogTitle(title);
    setDialogMessage(message);
    setDialogType('warning');
    setConfirmText('OK');
    setCancelText('Close');
    setIsDialogOpen(true);
    setPendingAction(null);
  }, []);

  const showConfirmDialog = useCallback((title: string, message: string, onConfirm: () => void) => {
    setDialogTitle(title);
    setDialogMessage(message);
    setDialogType('delete');
    setConfirmText('Delete');
    setCancelText('Cancel');
    setIsDialogOpen(true);
    setPendingAction(() => onConfirm);
  }, []);
  
  const handleDialogCancel = useCallback(() => {
    setIsDialogOpen(false);
  }, []);

  // API Functions
  const fetchTeachers = useCallback(async () => {
    setLoading(true);
    setError('');
    
    try {
      const accessToken = localStorage.getItem('accessToken');
      if (!accessToken) {
        handleAuthError();
        return;
      }

      const url = `${env.BACKEND_API_URL}/api/v1/integration/users?status=active&page=${currentPage}&pageSize=${itemsPerPage}${searchQuery ? `&search=${searchQuery}` : ''}`;
      console.log('Fetching teachers with URL:', url);
      // Fetch only active teachers by default, matching the deactivateteacher page behavior
      const response = await fetch(url,
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          }
        }
      );

      if (!response.ok) {
        if (response.status === 401) {
          handleAuthError();
          return;
        }
        throw new Error(`Failed to fetch teachers: ${response.status}`);
      }

      const responseData = await response.json();
      
      if (responseData.status?.returnCode === "00") {
        // The backend now handles the filtering, so we can use the users directly
        const teachers = responseData.data.users || [];
        console.log('Fetched teachers data:', teachers); // Added console.log here
        setTeachers(teachers);
        setTotalTeachers(responseData.data.pagination?.total || teachers.length);
      } else if (responseData.status?.returnCode === "401") {
        handleAuthError();
        return;
      } else {
        throw new Error(responseData.status?.returnMessage || 'Failed to fetch teachers');
      }
    } catch (err) {
      console.error('Error fetching teachers:', err);
      setError(err instanceof Error ? err.message : 'An error occurred');
      setTeachers([]);
      setTotalTeachers(0);
    } finally {
      setLoading(false);
    }
  }, [currentPage, itemsPerPage, searchQuery, handleAuthError]);

  const fetchTeacherById = useCallback(async (id: string) => {
    setLoading(true);
    try {
      const accessToken = localStorage.getItem('accessToken');
      if (!accessToken) {
        handleAuthError();
        return;
      }

      const response = await fetch(`${env.BACKEND_API_URL}/api/v1/integration/users/${id}`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        if (response.status === 401) {
          handleAuthError();
          return;
        }
        throw new Error(`Failed to fetch teacher details: ${response.status}`);
      }

      const responseData = await response.json();
      console.log('Fetched teacher data:', responseData.data.user);
      
      // Ensure classesAssigned and subjectsAssigned are preserved
      const teacherData = responseData.data.user;
      
      // Make sure arrays are properly initialized if they're null or undefined
      if (!teacherData.classesAssigned) teacherData.classesAssigned = [];
      if (!teacherData.subjectsAssigned) teacherData.subjectsAssigned = [];
      
      // Ensure staff_photo path is fully qualified using the same logic as TeacherList
      let finalPhotoPath = "/avatar.png"; // Default path
      if (teacherData.staff_photo) {
        const originalPhoto = teacherData.staff_photo;
        console.log('PHOTO DEBUG (Edit) - Original:', originalPhoto);

        // Apply the robust logic from TeacherList to calculate the path
        const transformedPath = originalPhoto.startsWith('http')
          ? originalPhoto // Full URL
          : originalPhoto.startsWith('/')
            ? originalPhoto // Assume correct relative path if starts with /
            : `/images/staff/${originalPhoto}`; // Assume filename, add prefix
        
        finalPhotoPath = transformedPath || "/avatar.png"; // Use transformed or default

        console.log('PHOTO DEBUG (Edit) - Transformed:', finalPhotoPath);
      } else {
        console.log('No staff photo found for teacher, using default');
      }
      
      // *** Create a NEW object for the state update ***
      const teacherDataForState = {
        ...teacherData, // Copy existing data
        staff_photo: finalPhotoPath // Explicitly set the CORRECT path
      };
      
      console.log('PHOTO DEBUG (Edit) - Value BEFORE setSelectedTeacher:', teacherDataForState.staff_photo);
      
      setSelectedTeacher(teacherDataForState); // Set state with the new object
      setIsEditing(true);
      setShowForm(true);
    } catch (err) {
      console.error('Error fetching teacher details:', err);
      if (err instanceof Error && err.message.includes('401')) {
        handleAuthError();
        return;
      }
      showErrorDialog('Error', 'Error fetching teacher details. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [handleAuthError, showErrorDialog]);

  const createTeacher = useCallback(async (teacherData: Teacher) => {
    try {
      const accessToken = localStorage.getItem('accessToken');
      if (!accessToken) {
        handleAuthError();
        return;
      }

      const response = await fetch(`${env.BACKEND_API_URL}/api/v1/integration/users`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`
        },
        body: JSON.stringify(teacherData),
      });
      
      if (!response.ok) {
        if (response.status === 401) {
          handleAuthError();
          return;
        }
        throw new Error(`Failed to create teacher: ${response.status}`);
      }

      const responseData = await response.json();
      if (responseData.status?.returnCode === "00") {
        await fetchTeachers();
        setFormResponseMessage('Teacher created successfully!');
        showSuccessDialog('Success', 'Teacher created successfully!');
        handleBack();
      } else if (responseData.status?.returnCode === "401") {
        handleAuthError();
        return;
      } else {
        throw new Error(responseData.status?.returnMessage || 'Failed to create teacher');
      }
    } catch (err) {
      console.error('Error creating teacher:', err);
      if (err instanceof Error && err.message.includes('401')) {
        handleAuthError();
        return;
      }
      showErrorDialog('Error', 'Error creating teacher. Please try again.');
    }
  }, [fetchTeachers, handleAuthError, handleBack, showSuccessDialog, showErrorDialog]);

  const updateTeacherData = useCallback(async (teacherData: Teacher) => {
    try {
      const accessToken = localStorage.getItem('accessToken');
      if (!accessToken) {
        handleAuthError();
        return;
      }
      
      // Check if we have the original teacher data to compare against
      if (!selectedTeacher) {
        showErrorDialog('Error', 'Original teacher data not found.');
        return;
      }
      
      // Create an object containing only the changed fields
      const changedFields: Partial<Teacher> = {};
      
      // List of fields to check for changes
      const fieldsToCheck: (keyof Teacher)[] = [
        'first_name', 'middle_name', 'last_name', 'initials', 
        'email', 'phone', 'address', 'role', 'salary', 
        'utility', 'gender', 'date_joined', 'name_of_bank', 
        'account_number', 'mobile_money_number', 'registered_name',
        'staff_photo', 'section', 'hasAccess'
      ];
      
      // Check each field for changes
      for (const field of fieldsToCheck) {
        // Convert both values to the same type for proper comparison
        // Handle undefined/null values properly
        const oldValue = selectedTeacher[field] !== undefined ? selectedTeacher[field] : null;
        const newValue = teacherData[field] !== undefined ? teacherData[field] : null;
        
        // Compare string representations to handle different types (string vs number)
        if (String(oldValue) !== String(newValue)) {
          // Cast to any to avoid TypeScript errors with field access
          (changedFields as any)[field] = teacherData[field];
        }
      }
      
      // Add password only if provided (never send empty password)
      if (teacherData.password && teacherData.password.trim() !== '') {
        changedFields.password = teacherData.password;
      }
      
      // Always include the ID
      changedFields.id = teacherData.id;
      
      // If no changes were made, show a message and return
      if (Object.keys(changedFields).length <= 1) { // Only ID means no changes
        showSuccessDialog('No Changes', 'No changes were detected to update.');
        handleBack();
        return;
      }
      
      // Log the changed fields being sent to the API
      console.log('Sending updated fields to API:', changedFields);
      
      const response = await fetch(`${env.BACKEND_API_URL}/api/v1/integration/users/${teacherData.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`
        },
        body: JSON.stringify(changedFields),
      });
      
      // Get the response text first for better debugging
      const responseText = await response.text();
      console.log('API Response Text:', responseText);
      
      // Try to parse as JSON if possible
      let responseData;
      try {
        responseData = JSON.parse(responseText);
      } catch (e) {
        console.error('Failed to parse response as JSON:', e);
        throw new Error('Invalid response format from server');
      }
      
      if (!response.ok) {
        if (response.status === 401) {
          handleAuthError();
          return;
        }
        throw new Error(`Failed to update teacher: ${response.status} - ${responseData?.status?.returnMessage || responseText}`);
      }

      if (responseData.status?.returnCode === "00") {
        await fetchTeachers();
        setFormResponseMessage('Teacher updated successfully!');
        showSuccessDialog('Success', 'Teacher updated successfully!');
        handleBack();
      } else if (responseData.status?.returnCode === "401") {
        handleAuthError();
        return;
      } else {
        throw new Error(responseData.status?.returnMessage || 'Failed to update teacher');
      }
    } catch (err) {
      console.error('Error updating teacher:', err);
      if (err instanceof Error && err.message.includes('401')) {
        handleAuthError();
        return;
      }
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      showErrorDialog('Error', `Error updating teacher: ${errorMessage}`);
    }
  }, [fetchTeachers, handleAuthError, handleBack, selectedTeacher, showErrorDialog, showSuccessDialog]);

  const deleteTeacher = useCallback(async (id: string) => {
    showConfirmDialog(
      'Confirm Deletion',
      'Are you sure you want to delete this teacher? This action cannot be undone.',
      async () => {
        setIsDialogOpen(false); // Close dialog before performing the action
        try {
          const accessToken = localStorage.getItem('accessToken');
          if (!accessToken) {
            handleAuthError();
            return;
          }

          const response = await fetch(`${env.BACKEND_API_URL}/api/v1/integration/users/${id}`, {
            method: 'DELETE',
            headers: {
              'Authorization': `Bearer ${accessToken}`
            }
          });
          
          if (!response.ok) {
            if (response.status === 401) {
              handleAuthError();
              return;
            }
            const errorData = await response.json();
            if (errorData.message && errorData.message.includes('admin')) {
              showErrorDialog('Permission Denied', 'Only admin users can delete teacher accounts. Please contact an administrator.');
              return;
            }
            throw new Error(`Failed to delete teacher: ${response.status}`);
          }

          const responseData = await response.json();
          if (responseData.status?.returnCode === "00") {
            await fetchTeachers();
            showSuccessDialog('Success', 'Teacher deleted successfully!');
          } else if (responseData.status?.returnCode === "401") {
            handleAuthError();
            return;
          } else {
            throw new Error(responseData.status?.returnMessage || 'Failed to delete teacher');
          }
        } catch (err) {
          console.error('Error deleting teacher:', err);
          if (err instanceof Error && err.message.includes('401')) {
            handleAuthError();
            return;
          }
          // Check if the error is related to admin permissions
          if (err instanceof Error && err.message.includes('admin')) {
            showErrorDialog('Permission Denied', 'Only admin users can delete teacher accounts. Please contact an administrator.');
          } else {
            showErrorDialog('Error', 'Error deleting teacher. Please try again.');
          }
        }
      }
    );
  }, [fetchTeachers, handleAuthError, showConfirmDialog, showErrorDialog, showSuccessDialog]);

  // Fetch classes and subjects 
  const fetchClassesAndSubjects = useCallback(async () => {
    try {
      const accessToken = localStorage.getItem('accessToken');
      if (!accessToken) {
        handleAuthError();
        return;
      }

      // Fetch classes
      const classesResponse = await fetch(`${env.BACKEND_API_URL}/api/v1/classes/filter`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`
        }
      });
      if (!classesResponse.ok) {
        if (classesResponse.status === 401) {
          handleAuthError();
          return;
        }
        throw new Error(`Failed to fetch classes: ${classesResponse.status}`);
      }

      const classesData = await classesResponse.json();
      console.log('Classes response:', classesData);
      
      if (classesData && classesData.data && Array.isArray(classesData.data)) {
        setClassOptions(classesData.data.map((c: any) => c.name));
      } else {
        setClassOptions([]);
      }
      
      // Fetch subjects
      const subjectsResponse = await fetch(`${env.BACKEND_API_URL}/api/v1/subjects/filter`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`
        }
      });
      if (!subjectsResponse.ok) {
        if (subjectsResponse.status === 401) {
          handleAuthError();
          return;
        }
        throw new Error(`Failed to fetch subjects: ${subjectsResponse.status}`);
      }

      const subjectsData = await subjectsResponse.json();
      console.log('Subjects response:', subjectsData);
      
      if (subjectsData && subjectsData.data && Array.isArray(subjectsData.data)) {
        setSubjectOptions(subjectsData.data.map((s: any) => s.name));
      } else {
        setSubjectOptions([]);
      }
    } catch (err) {
      console.error('Error fetching classes or subjects:', err);
      if (err instanceof Error && err.message.includes('401')) {
        handleAuthError();
        return;
      }
      setClassOptions([]);
      setSubjectOptions([]);
    }
  }, [handleAuthError]);

  // Initialize data
  useEffect(() => {
    fetchTeachers();
    fetchClassesAndSubjects();
  }, [fetchTeachers, fetchClassesAndSubjects]);

  // Re-fetch when pagination or search changes
  useEffect(() => {
    fetchTeachers();
  }, [fetchTeachers]);

  // Reset to first page when search changes
  useEffect(() => {
    console.log('searchQuery changed:', searchQuery);
    setCurrentPage(1);
  }, [searchQuery]);
  
  // Clean up on unmount
  useEffect(() => {
    return () => {
      setTeachers([]);
      setTotalTeachers(0);
    };
  }, []);
  
  // Use teachers directly since we're filtering on the backend
  const activeTeachers = teachers;

  const handleSaveTeacher = (teacherData: Teacher) => {
    if (isEditing) {
      updateTeacherData(teacherData);
    } else {
      createTeacher(teacherData);
    }
  };

  const handleSelectTeacher = useCallback((teacher: Teacher) => {
    setSelectedTeacher(teacher);
    setIsEditing(true);
    setShowForm(true);
    setFormResponseMessage(''); // Reset form message when editing
  }, []);

  const handlePageChange = (pageNumber: number) => {
    setCurrentPage(pageNumber);
  };

  // Handle confirm action for DialogBox
  const handleDialogConfirm = useCallback(() => {
    if (pendingAction) {
      pendingAction();
    }
    setIsDialogOpen(false);
  }, [pendingAction]);

  // Move TeacherPhoto definition to TeacherManagement scope
  const TeacherPhoto = ({ teacher }: { teacher: Teacher }) => {
    const [imageUrl, setImageUrl] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
      const getSignedUrl = async () => {
        if (!teacher.staff_photo) {
          setIsLoading(false);
          return;
        }

        const { data, error } = await supabase.storage
          .from('staff-photos')
          .createSignedUrl(teacher.staff_photo, 3600);

        if (error) {
          console.error('Error getting signed URL:', error);
          setIsLoading(false);
          return;
        }

        setImageUrl(data.signedUrl);
        setIsLoading(false);
      };

      getSignedUrl();
    }, [teacher.staff_photo]);

    return (
      <div className="flex-shrink-0 h-10 w-10">
        {isLoading ? (
          // Loading state with shimmer effect
          <div className="h-10 w-10 rounded-full bg-gray-200 animate-pulse"></div>
        ) : imageUrl ? (
          // Show the actual photo from Supabase
          <Image 
            src={imageUrl}
            alt={`${teacher.first_name} ${teacher.last_name}`}
            width={40}
            height={40}
            className="rounded-full object-cover"
          />
        ) : (
          // Fallback to default avatar
          <Image 
            src="/avatar.png"
            alt={`${teacher.first_name} ${teacher.last_name}`}
            width={40}
            height={40}
            className="rounded-full object-cover"
          />
        )}
      </div>
    );
  };

  // Calculate pagination variables for use in the responsive rendering
  const totalPages = Math.ceil(teachers.length / itemsPerPage);
  const startItem = (currentPage - 1) * itemsPerPage + 1;
  const endItem = Math.min(currentPage * itemsPerPage, teachers.length);

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold text-center mb-6">
        {showForm ? (isEditing ? 'Edit Teacher' : 'Add New Teacher') : 'Teacher Management'}
      </h1>
      
      <DialogBox
        isOpen={isDialogOpen}
        title={dialogTitle}
        message={dialogMessage}
        type={dialogType}
        confirmText={confirmText}
        cancelText={cancelText}
        onConfirm={handleDialogConfirm}
        onCancel={handleDialogCancel}
      />
      
      {showForm ? (
        <div className="max-w-4xl mx-auto mt-8 bg-white rounded-lg shadow-md">
          <div className="p-4">
            <button 
              onClick={handleBack}
              className="mb-4 flex items-center text-blue-500 hover:text-blue-700"
            >
              <span>← Back to Teachers List</span>
            </button>
          </div>
          
          <TeacherForm 
            onSubmit={async (formData, photoFile) => {
              let finalPhotoPath = formData.staff_photo || selectedTeacher?.staff_photo || ''; // Start with existing or form path

              // Check if a new photo file was provided
              if (photoFile) {
                console.log('New photo file detected. Attempting upload...');
                // Attempt to upload the new photo
                const newPhotoPath = await uploadPhoto(photoFile, selectedTeacher?.id);
                
                // If upload was successful, update the path
                if (newPhotoPath !== null) {
                  console.log('Photo uploaded successfully. New path:', newPhotoPath);
                  finalPhotoPath = newPhotoPath;
                } else {
                  // Handle upload failure - maybe stop submission or proceed without new photo?
                  console.error('Photo upload failed. Proceeding without updating photo.');
                  // Optional: Show an error message to the user that photo upload failed but data might still save.
                  // showErrorDialog('Upload Warning', 'Could not upload the new photo. Other details might still be saved.');
                  // If you want to *prevent* saving if photo upload fails, return here:
                  // return; 
                }
              } else {
                  console.log('No new photo file provided.');
              }
              
              // Map the form data back to the Teacher interface, using the determined photo path
              const updatedTeacher: Teacher = {
                ...selectedTeacher, // Spread existing data first (especially for edit mode)
                ...formData,        // Spread form data to overwrite fields
                staff_photo: finalPhotoPath,  // Use the final determined path
                id: selectedTeacher?.id || '', // Preserve the ID for updates
                // Preserve these arrays that aren't in the form
                classesAssigned: selectedTeacher?.classesAssigned || [],
                subjectsAssigned: selectedTeacher?.subjectsAssigned || [],
                // Ensure role is set properly - API requires this
                role: formData.role || selectedTeacher?.role || 'teacher',
                // Make sure hasAccess is properly set as boolean
                hasAccess: Boolean(formData.hasAccess),
                // Don't send password if it's empty (to avoid overwriting existing password)
                password: formData.password || undefined
              }; 
              
              console.log('Submitting teacher data:', updatedTeacher);
              // Call the handleSaveTeacher function with the updated teacher data
              handleSaveTeacher(updatedTeacher);
            }}
            initialData={selectedTeacher ? {
              first_name: selectedTeacher.first_name,
              middle_name: selectedTeacher.middle_name || '',
              last_name: selectedTeacher.last_name,
              initials: selectedTeacher.initials || '',
              email: selectedTeacher.email,
              phone: selectedTeacher.phone,
              address: selectedTeacher.address || '',
              role: selectedTeacher.role,
              salary: selectedTeacher.salary || '',
              utility: selectedTeacher.utility || '',
              gender: selectedTeacher.gender,
              date_joined: selectedTeacher.date_joined || '',
              name_of_bank: selectedTeacher.name_of_bank || '',
              account_number: selectedTeacher.account_number || '',
              mobile_money_number: selectedTeacher.mobile_money_number || '',
              registered_name: selectedTeacher.registered_name || '',
              staff_photo: selectedTeacher.staff_photo || '',
              section: selectedTeacher.section || '',
              hasAccess: selectedTeacher.hasAccess,
              password: selectedTeacher.password || '',
            } : {}}
            isLoading={loading}
            responseMessage={formResponseMessage}
            buttonText={isEditing ? 'Update Teacher' : 'Create Teacher'}
            isEditing={isEditing}
          />
        </div>
      ) : (
        <>
          
          {loading && teachers.length === 0 ? (
            <div className="text-center py-10">Loading teachers...</div>
          ) : error ? (
            <div className="text-center py-10 text-red-500">{error}</div>
          ) : (
            <>
              {/* Search and Actions */}
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
                <div className="w-full md:w-auto flex-1">
                  <div className="flex max-w-md">
                    <input
                      type="text"
                      value={searchInput}
                      onChange={(e) => setSearchInput(e.target.value)}
                      placeholder="Search teachers..."
                      className="w-full px-4 py-2 border rounded-l focus:outline-none focus:ring-2 focus:ring-blue-500"
                      onKeyPress={(e) => {
                        if (e.key === 'Enter') setSearchQuery(searchInput);
                      }}
                    />
                    <button
                      className="p-2 bg-gray-100 border border-l-0 rounded-r hover:bg-gray-200"
                      onClick={() => setSearchQuery(searchInput)}
                    >
                      <Search className="h-5 w-5 text-gray-500" />
                    </button>
                  </div>
                  <div className="text-xs text-gray-500 mt-1 ml-1">
                    <span className="font-semibold text-red-600">A A</span> Please search NAME IN CAPITAL LETTERS
                  </div>
                </div>
                <div className="flex flex-wrap gap-2 w-full md:w-auto">
                  <button
                    type="button"
                    className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600 flex items-center gap-2 w-full md:w-auto justify-center"
                    onClick={() => setIsLandscape(!isLandscape)}
                    title={isLandscape ? "Switch to Portrait" : "Switch to Landscape"}
                  >
                    <RotateCw className="h-5 w-5" />
                    {isLandscape ? "Portrait" : "Landscape"}
                  </button>
                  <button
                    type="button"
                    className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 flex items-center gap-2 w-full md:w-auto justify-center"
                    onClick={handlePrint}
                  >
                    <Printer className="h-5 w-5" />
                    Print List
                  </button>
                </div>
              </div>
              
              {/* Responsive Grid for Tablet (md:grid md:grid-cols-2 lg:hidden) */}
              <div className="hidden md:grid md:grid-cols-2 gap-4 mb-6 lg:hidden">
                {teachers.map((teacher) => (
                  <div key={teacher.id} className="bg-white rounded-lg shadow border border-gray-200 p-4 hover:shadow-md transition-shadow">
                    <div className="flex items-start space-x-3">
                      <TeacherPhoto teacher={teacher} />
                      <div className="flex-1 min-w-0">
                        <div className="flex justify-between items-start">
                          <div>
                            <h3 className="font-medium text-gray-900 truncate">
                              {`${teacher.first_name} ${teacher.last_name}`}
                            </h3>
                            <p className="text-sm text-gray-500">{teacher.gender} • {teacher.role}</p>
                          </div>
                          <div className="flex space-x-1">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleSelectTeacher(teacher);
                              }}
                              className="text-blue-600 hover:text-blue-800 text-sm font-medium px-2 py-1"
                            >
                              Edit
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                deleteTeacher(teacher.id);
                              }}
                              className="text-red-600 hover:text-red-800 text-sm font-medium px-2 py-1"
                            >
                              Delete
                            </button>
                          </div>
                        </div>
                        <div className="mt-3 space-y-2 text-sm">
                          <div className="flex items-center">
                            <span className="text-gray-500 w-24">Email:</span>
                            <span className="truncate">{teacher.email || '-'}</span>
                          </div>
                          <div className="flex items-center">
                            <span className="text-gray-500 w-24">Phone:</span>
                            <span>{teacher.phone || '-'}</span>
                          </div>
                          <div className="flex items-start">
                            <span className="text-gray-500 w-24">Classes:</span>
                            <span className="flex-1">
                              {Array.isArray(teacher.classesAssigned) && teacher.classesAssigned.length > 0 
                                ? teacher.classesAssigned.join(', ')
                                : '-'}
                            </span>
                          </div>
                          <div className="flex items-start">
                            <span className="text-gray-500 w-24">Subjects:</span>
                            <span className="flex-1">
                              {Array.isArray(teacher.subjectsAssigned) && teacher.subjectsAssigned.length > 0 
                                ? teacher.subjectsAssigned.join(', ')
                                : '-'}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
                {teachers.length === 0 && !loading && (
                  <div className="col-span-2 text-center py-8 text-gray-500">
                    No teachers found.
                  </div>
                )}
              </div>

              {/* Responsive Stacked Cards for Mobile (md:hidden) */}
              <div className="md:hidden space-y-4 mb-6">
                {teachers.map((teacher) => (
                  <div key={teacher.id} className="bg-white rounded-lg shadow border border-gray-200 p-4 hover:shadow-md transition-shadow">
                    <div className="flex items-start space-x-3">
                      <TeacherPhoto teacher={teacher} />
                      <div className="flex-1 min-w-0">
                        <div className="flex justify-between items-start">
                          <div>
                            <h3 className="font-bold text-base text-gray-800 truncate">
                              {`${teacher.first_name} ${teacher.last_name}`}
                            </h3>
                            <p className="text-xs text-gray-500">{teacher.gender} • {teacher.role}</p>
                          </div>
                          <div className="flex space-x-1">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleSelectTeacher(teacher);
                              }}
                              className="text-blue-600 hover:text-blue-800 text-xs font-medium px-2 py-1"
                            >
                              Edit
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                deleteTeacher(teacher.id);
                              }}
                              className="text-red-600 hover:text-red-800 text-xs font-medium px-2 py-1"
                            >
                              Delete
                            </button>
                          </div>
                        </div>
                        <div className="mt-3 space-y-2 text-xs">
                          <div className="flex items-center">
                            <span className="text-gray-500 w-20">Email:</span>
                            <span className="truncate">{teacher.email || '-'}</span>
                          </div>
                          <div className="flex items-center">
                            <span className="text-gray-500 w-20">Phone:</span>
                            <span>{teacher.phone || '-'}</span>
                          </div>
                          <div className="flex items-start">
                            <span className="text-gray-500 w-20">Classes:</span>
                            <span className="flex-1">
                              {Array.isArray(teacher.classesAssigned) && teacher.classesAssigned.length > 0 
                                ? teacher.classesAssigned.join(', ')
                                : '-'}
                            </span>
                          </div>
                          <div className="flex items-start">
                            <span className="text-gray-500 w-20">Subjects:</span>
                            <span className="flex-1">
                              {Array.isArray(teacher.subjectsAssigned) && teacher.subjectsAssigned.length > 0 
                                ? teacher.subjectsAssigned.join(', ')
                                : '-'}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
                {teachers.length === 0 && !loading && (
                  <div className="text-center py-8 text-gray-500">
                    No teachers found.
                  </div>
                )}
              </div>

              {/* Desktop Table View */}
              <div ref={printRef} className="hidden lg:block">
                <div className="print-header hidden print:block">
                  <h1>Teacher List</h1>
                  <p>{new Date().toLocaleDateString()}</p>
                </div>
                <table className="min-w-full bg-white rounded-lg shadow-md">
                  <thead>
                    <tr className="bg-gray-100">
                      <th className="p-3 text-left">No.</th>
                      <th className="p-3 text-left">Photo</th>
                      <th className="p-3 text-left">Name</th>
                      <th className="p-3 text-left">Email</th>
                      <th className="p-3 text-left">Classes Assigned</th>
                      <th className="p-3 text-left">Subjects Assigned</th>
                      <th className="p-3 text-left">Role</th>
                      <th className="p-3 text-left edit-column">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {teachers.map((teacher, index) => (
                      <tr
                        key={teacher.id}
                        className="hover:bg-gray-50 border-t"
                      >
                        <td className="p-3">{(currentPage - 1) * itemsPerPage + index + 1}</td>
                        <td className="p-3">
                          <TeacherPhoto teacher={teacher} />
                        </td>
                        <td className="p-3 cursor-pointer" onClick={() => handleSelectTeacher(teacher)}>
                          <div>
                            <div className="font-medium">{`${teacher.first_name} ${teacher.last_name}`}</div>
                            <div className="text-xs text-gray-500">{teacher.gender}</div>
                          </div>
                        </td>
                        <td className="p-3">{teacher.email}</td>
                        <td className="p-3">
                          <div className="max-w-xs">
                            {Array.isArray(teacher.classesAssigned) ? teacher.classesAssigned.join(', ') : '-'}
                          </div>
                        </td>
                        <td className="p-3">
                          <div className="max-w-xs">
                            {Array.isArray(teacher.subjectsAssigned) ? teacher.subjectsAssigned.join(', ') : '-'}
                          </div>
                        </td>
                        <td className="p-3">{teacher.role}</td>
                        <td className="p-3 edit-column">
                          <div className="flex space-x-2">
                            <button 
                              onClick={() => handleSelectTeacher(teacher)}
                              className="px-2 py-1 text-xs bg-blue-500 text-white rounded hover:bg-blue-600"
                            >
                              Edit
                            </button>
                            <button 
                              onClick={() => deleteTeacher(teacher.id)}
                              className="px-2 py-1 text-xs bg-red-500 text-white rounded hover:bg-red-600"
                            >
                              Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination controls */}
              <div className="mt-6 flex flex-col sm:flex-row justify-between items-center gap-4 no-print">
                <div className="text-sm text-gray-700 text-center sm:text-left">
                  Showing {startItem} to {endItem} of {totalTeachers} results
                </div>
                <div className="flex space-x-2">
                  <button
                    onClick={() => handlePageChange(1)}
                    disabled={currentPage === 1}
                    className="px-3 py-1 rounded border disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    First
                  </button>
                  <button
                    onClick={() => handlePageChange(currentPage - 1)}
                    disabled={currentPage === 1}
                    className="px-3 py-1 rounded border disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Previous
                  </button>
                  <span className="px-3 py-1">
                    Page {currentPage} of {totalPages}
                  </span>
                  <button
                    onClick={() => handlePageChange(currentPage + 1)}
                    disabled={currentPage === totalPages}
                    className="px-3 py-1 rounded border disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Next
                  </button>
                  <button
                    onClick={() => handlePageChange(totalPages)}
                    disabled={currentPage === totalPages}
                    className="px-3 py-1 rounded border disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Last
                  </button>
                </div>
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
};

import TeacherForm, { TeacherFormData } from '@/components/forms/TeacherForm';

export default TeacherManagement;