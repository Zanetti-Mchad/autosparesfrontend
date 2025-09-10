"use client";
import React, { useState, useEffect, useRef, Suspense, FormEvent } from 'react';
import { env } from '@/env';
import { Card, CardHeader, CardTitle, CardContent } from '../../../../../components/ui/card';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import StudentForm, { initialFormState } from '../../../../../components/forms/StudentForm';
import ExcelImport from '../../../../../components/ExcelImport';

const StudentRegistrationView = () => {
  const router = useRouter();
  const errorRef = useRef<HTMLDivElement | null>(null);
  
  // State for classes
  const [classes, setClasses] = useState<{ id: string; name: string }[]>([]);
  const [showSuccess, setShowSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const [apiError, setApiError] = useState('');
  const [activeTab, setActiveTab] = useState<'individual' | 'bulk'>('individual');
  const [importResponseMessage, setImportResponseMessage] = useState('');
  const [userId, setUserId] = useState<string | null>(null);

  // Add auth check and retrieve userId on mount
  useEffect(() => {
    const token = localStorage.getItem('accessToken');
    if (!token) {
      router.push('/sign-in'); // Update path to match your login route
    } else {
      // Retrieve userId from local storage
      const userString = localStorage.getItem('user');
      if (userString) {
        try {
          const user = JSON.parse(userString);
          setUserId(user.id); // Ensure that 'user' has an 'id' property
        } catch (error) {
          console.error('Failed to parse user from localStorage', error);
          // Handle error, e.g., redirect to login or show an error message
        }
      }
    }
  }, [router]);

  // Fetch classes from API
  useEffect(() => {
    const fetchClasses = async () => {
      const token = localStorage.getItem('accessToken');
      if (!token) return;

      try {
        const response = await fetch(`${env.BACKEND_API_URL}/api/v1/classes/filter`, {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        });

        if (!response.ok) {
          throw new Error('Failed to fetch classes');
        }

        const data = await response.json();
        setClasses(data.classes); // Assuming the API returns an array of classes in data.classes
      } catch (error) {
        console.error('Error fetching classes:', error);
      }
    };

    fetchClasses();
  }, []);

  const uploadPhoto = async (file: File, fileName: string): Promise<Response> => {
    try {
      const formData = new FormData();
      // Create a new File object with the generated filename
      const renamedFile = new File([file], fileName, { type: file.type });
      formData.append('file', renamedFile);
      
      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        // Use the original filename from the frontend
        const errorText = await response.text();
        console.error('Photo upload error:', errorText);
        throw new Error(`Failed to upload photo: ${response.status} ${response.statusText}`);
      }

      return response;
    } catch (error) {
      console.error('Error in uploadPhoto:', error);
      throw error;
    }
  };

  // Utility to normalize boolean-like values
function normalizeBoolean(val: any): boolean {
  if (typeof val === 'boolean') return val;
  if (typeof val === 'number') return val === 1;
  if (typeof val === 'string') {
    const v = val.trim().toLowerCase();
    return v === 'true' || v === '1';
  }
  return false;
}

const handleSubmit = async (formData: typeof initialFormState, photoFile: File | null) => {
  setLoading(true);
  setApiError('');

  try {
    const accessToken = localStorage.getItem('accessToken');
    if (!accessToken) {
      throw new Error('No access token found');
    }

    // Find the selected class name from the class ID
    const selectedClass = classes.find(cls => cls.id === formData.class_assigned);
    const className = selectedClass ? selectedClass.name : '';

    // Check if student already exists using filter API
    try {
      const checkResponse = await fetch(`${env.BACKEND_API_URL}/api/v1/students/filter?page=1&pageSize=1000`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
        }
      });
      
      const result = await checkResponse.json();
      const existingStudent = result.data.students.find((student: {
        first_name: string;
        middle_name: string;
        last_name: string;
        class_assigned: string;
      }) => 
        student.first_name === formData.first_name.toUpperCase() &&
        student.middle_name === formData.middle_name.toUpperCase() &&
        student.last_name === formData.last_name.toUpperCase() &&
        student.class_assigned === className
      );
      
      if (existingStudent) {
        setApiError('Child\'s name already exists in the system for this class');
        setLoading(false);
        errorRef.current?.scrollIntoView({ behavior: 'smooth' });
        return;
      }
    } catch (error) {
      console.warn('Error checking student existence:', error);
    }

    // Upload photo first if there is one
    if (photoFile && formData.student_photo) {
      try {
        const photoResponse = await uploadPhoto(photoFile, formData.student_photo);
        const photoData = await photoResponse.json();
        
        if (photoData.fileName) {
          formData.student_photo = photoData.fileName;
        } else {
          throw new Error('Failed to get uploaded file name');
        }
      } catch (photoError) {
        console.error("Error uploading photo:", photoError);
        setApiError(photoError instanceof Error ? photoError.message : 'Failed to upload photo');
        setLoading(false);
        return;
      }
    }

    // Normalize bursary booleans
    const bursary = normalizeBoolean(formData.bursary);
    const half_bursary = normalizeBoolean(formData.half_bursary);

    console.log("Submitting form with photo:", photoFile ? photoFile.name : "No photo");
    console.log("Submitting with class name:", className);

    // Send the student data to the API
    const response = await fetch(`${env.BACKEND_API_URL}/api/v1/students/add-student`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        ...formData,
        class_assigned: className, // Use the class name, not the ID
        classId: formData.class_assigned,// Use the class ID
        bursary,
        half_bursary,
        student_photo: formData.student_photo || '',
        createdby: userId,
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("API Error Response:", errorText);
      
      let errorMessage;
      try {
        const errorData = JSON.parse(errorText);
        errorMessage = errorData.message || 'Failed to add student';
      } catch {
        errorMessage = `Failed to add student: ${response.status} ${response.statusText}`;
      }
      
      throw new Error(errorMessage);
    }

    const result = await response.json();
    console.log("API Success Response:", result);
    
    if (result.status?.returnCode === "00") {
      setShowSuccess(true);
      
      // Navigate after a short delay to allow user to see success message
      setTimeout(() => {
        router.push('/pages/student/viewstudent');
      }, 1500);
    } else {
      throw new Error(result.status?.returnMessage || 'Failed to add student');
    }
  } catch (err) {
    console.error('Error adding student:', err);
    setApiError(err instanceof Error ? err.message : 'An error occurred');
  } finally {
    setLoading(false);
  }
};

  // Handle Excel import completion
  const handleImportComplete = (results: any) => {
    const { successful, failed, total } = results;
    setImportResponseMessage(
      `Import completed! ${successful.length} students created successfully, ${failed.length} failed out of ${total} total rows.`
    );
  };

  return (
    <div className="p-4 h-full w-full">
      <div className="w-full">
        <Card>
          <CardHeader>
            <div className="flex items-center">
              <Link href="/pages/student/viewstudent" className="mr-4">
                <ArrowLeft className="h-5 w-5" />
              </Link>
              <CardTitle className="text-2xl font-bold text-center flex-grow">
                Student Registration
              </CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            {/* Tab Navigation */}
            <div className="flex mb-6 border-b">
              <button
                onClick={() => setActiveTab('individual')}
                className={`px-6 py-3 font-medium ${
                  activeTab === 'individual'
                    ? 'border-b-2 border-blue-500 text-blue-600'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                👨‍🎓 Add Individual Student
              </button>
              <button
                onClick={() => setActiveTab('bulk')}
                className={`px-6 py-3 font-medium ${
                  activeTab === 'bulk'
                    ? 'border-b-2 border-blue-500 text-blue-600'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                📊 Bulk Import from Excel
              </button>
            </div>

            {/* Tab Content */}
            {activeTab === 'individual' ? (
              <div>
                <h3 className="text-xl font-semibold mb-4">Register New Student</h3>
                <StudentForm 
                  onSubmit={handleSubmit}
                  classes={classes}
                  loading={loading}
                  apiError={apiError}
                  showSuccess={showSuccess}
                  submitButtonText="Register Student"
                />
              </div>
            ) : (
              <div>
                <h3 className="text-xl font-semibold mb-4">Import Students from Excel</h3>
                <ExcelImport 
                  onImportComplete={handleImportComplete}
                  apiEndpoint={`${env.BACKEND_API_URL}/api/v1/students/import-students-excel`}
                  importType="students"
                />
                {importResponseMessage && (
                  <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-md">
                    <p className="text-blue-800">{importResponseMessage}</p>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

const AddStudentPageWrapper = () => {
  return (
    <Suspense fallback={<div className="p-4 w-full h-full flex justify-center items-center"><p>Loading student registration...</p></div>}>
      <StudentRegistrationView />
    </Suspense>
  );
};

export default AddStudentPageWrapper;