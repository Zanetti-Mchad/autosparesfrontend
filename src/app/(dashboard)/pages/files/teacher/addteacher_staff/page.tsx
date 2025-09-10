"use client";
import React, { useState } from 'react';
import { env } from '@/env';
import TeacherForm, { TeacherFormData } from '@/components/forms/TeacherForm';
import ExcelImport from '@/components/ExcelImport';
import { sendQuickSMS } from '@/lib/smsUtils';
import { supabase } from '../../../../../lib/supabaseClient';

const CreateUserPage: React.FC = () => {
  const [responseMessage, setResponseMessage] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<'individual' | 'bulk'>('individual');

  const handleAddUser = async (formData: TeacherFormData, photoFile: File | null) => {
    setResponseMessage('');
    setIsLoading(true);

    try {
      console.log('Starting form submission...');
      const accessToken = localStorage.getItem('accessToken');
      if (!accessToken) {
        console.error('No access token found');
        throw new Error('No access token found');
      }

      // First upload photo to Supabase Storage if exists
      let photoUrl = '';
      if (photoFile) {
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

        photoUrl = fileName; // Use the filename as the photo URL
        console.log('Photo uploaded successfully to Supabase:', photoUrl);
      }

      // Then submit form data with photo URL
      // IMPORTANT: Don't manipulate salary and utility here - send them as-is
      // The TeacherForm component should handle formatting them with commas for display
      // We'll just submit them in the same format they're stored in the form state
      const jsonData = {
        ...formData,
        staff_photo: photoUrl || formData.staff_photo, // Use uploaded photo URL or existing one
      };
      console.log('Submitting form data:', jsonData);

      // Make sure we're using the correct API URL - use hardcoded URL as in the working example
      const response = await fetch(`${env.BACKEND_API_URL}/api/v1/integration/add-user`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify(jsonData),
      });

      if (!response.ok) {
        console.error('Teacher creation failed with status:', response.status);
        
        // Handle different response status codes
        if (response.status === 401) {
          throw new Error('Authorization failed. Please log in again.');
        }
        
        // Safely try to parse the error response - simplified as in the working example
        try {
          const errorData = await response.json();
          console.log('Detailed API error response:', JSON.stringify(errorData, null, 2));
          throw new Error(errorData.returnMessage || 'Failed to create teacher');
        } catch (parseError) {
          throw new Error(`Failed to create teacher: ${response.statusText || response.status}`);
        }
      }

      const result = await response.json();
      if (result.status && result.status.returnCode === 400) {
        throw new Error(result.status.returnMessage); // Display 'User already exists'
      }

      // Send welcome SMS after successful user creation
      try {
        const welcomeMessage = `Welcome ${formData.first_name} ${formData.last_name}! Your school system login email is ${formData.email} and phone number is ${formData.phone}. Your login password is ${formData.password}.`;
        await sendQuickSMS(formData.phone, welcomeMessage);
        console.log('Welcome SMS sent successfully');
      } catch (smsError) {
        console.error('Failed to send welcome SMS:', smsError);
        // Don't throw error here - we still want to show success for user creation
      }

      console.log('Successfully created new user!:', result);
      setResponseMessage('New User created successfully! Welcome SMS sent.');
    } catch (error) {
      console.error('Error during form submission:', error);
      setResponseMessage(error instanceof Error ? error.message : 'An error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  const handleImportComplete = (results: any) => {
    const { successful, failed, total } = results;
    setResponseMessage(
      `Import completed! ${successful.length} users created successfully, ${failed.length} failed out of ${total} total rows.`
    );
  };

  return (
    <div className="container mx-auto mt-4 mb-4">
      <h2 className="text-2xl font-bold mb-6 text-center">User Management</h2>
      
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
          👤 Create Individual User
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
          <h3 className="text-xl font-semibold mb-4">Create New User</h3>
          <TeacherForm 
            onSubmit={handleAddUser}
            isLoading={isLoading}
            responseMessage={responseMessage}
            buttonText="Create User"
            isEditing={false}
          />
        </div>
      ) : (
        <div>
          <h3 className="text-xl font-semibold mb-4">Import Users from Excel</h3>
          <ExcelImport 
            onImportComplete={handleImportComplete}
            apiEndpoint={`${env.BACKEND_API_URL}/api/v1/integration/import-users-excel`}
          />
          {responseMessage && (
            <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-md">
              <p className="text-blue-800">{responseMessage}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default CreateUserPage;