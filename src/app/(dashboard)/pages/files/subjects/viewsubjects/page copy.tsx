"use client";
import React, { useState, useEffect } from "react";
import DialogBox from '@/components/Dailogbox';
import { env } from '@/env';

// Define activity types
const ACTIVITY_TYPES = {
  SUBJECT: 'subject',
  EXTRACURRICULAR: 'extracurricular'
};

// Define interfaces for both types of items
interface Subject {
  id: string;
  name: string;
  code: string;
  description: string;
  isActive: boolean;
  isCompulsory: boolean;
  createdAt: string;
  updatedAt: string;
  isEditing?: boolean;
}

interface ExtracurricularActivity {
  id: string;
  name: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  isEditing?: boolean;
}

interface Message {
  text: string;
  type: string;
}

interface SubjectResponse {
  success: boolean;
  subjects: Array<{
    id: string;
    name: string;
    code?: string;
    description?: string;
    createdAt: string;
    updatedAt: string;
    isActive: boolean;
    isCompulsory?: boolean;
  }>;
  message?: string;
}

interface ActivityResponse {
  success: boolean;
  activities: Array<{
    id: string;
    name: string;
    createdAt: string;
    updatedAt: string;
    isActive: boolean;
  }>;
  message?: string;
}

interface DeleteResponse {
  success: boolean;
  message: string;
  status?: {
    returnCode: string;
    returnMessage: string;
  };
}

interface DeleteActivityResponse {
  success: boolean;
  message: string;
  status?: {
    returnCode: string;
    returnMessage: string;
  };
}

// Helper function to determine if something is active
const isActiveValue = (value: unknown): boolean => {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'number') return value === 1;
  if (typeof value === 'string') return value === '1' || value.toLowerCase() === 'true';
  return false;
};

const ViewSubjectsAndActivitiesPreview = () => {
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [extracurriculars, setExtracurriculars] = useState<ExtracurricularActivity[]>([]);
  const [message, setMessage] = useState<Message>({ text: "", type: "" });
  const [activeTab, setActiveTab] = useState(ACTIVITY_TYPES.SUBJECT);
  const [activeSubTab, setActiveSubTab] = useState("active");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>("");
  const [activeCount, setActiveCount] = useState(0);
  const [inactiveCount, setInactiveCount] = useState(0);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);

  // Show notification message
  const showMessage = (text: string, type: string) => {
    setMessage({ text, type });
    setTimeout(() => {
      setMessage({ text: "", type: "" });
    }, 3000);
  };

  // Fetch subjects from API
  const fetchSubjects = async () => {
    try {
      const token = localStorage.getItem('accessToken');
      if (!token) {
        setError("Authentication required");
        setLoading(false);
        return;
      }

      const headers = {
        "Authorization": `Bearer ${token}`,
        "Content-Type": "application/json"
      };

      // Make two separate API calls for active and inactive subjects
      const [activeResponse, inactiveResponse] = await Promise.all([
        fetch(`${env.BACKEND_API_URL}/api/v1/subjects/filter?isActive=true`, { headers }),
        fetch(`${env.BACKEND_API_URL}/api/v1/subjects/filter?isActive=false`, { headers })
      ]);

      // Check if either response failed
      if (!activeResponse.ok || !inactiveResponse.ok) {
        throw new Error(`HTTP Error: ${activeResponse.ok ? inactiveResponse.status : activeResponse.status}`);
      }

      const [activeData, inactiveData] = await Promise.all([
        activeResponse.json() as Promise<SubjectResponse>,
        inactiveResponse.json() as Promise<SubjectResponse>
      ]);

      // Log responses for debugging
      console.log('Active subjects response:', activeData);
      console.log('Inactive subjects response:', inactiveData);

      if (activeData.success && inactiveData.success) {
        const mapSubject = (subj: SubjectResponse['subjects'][0], isActive: boolean): Subject => ({
          id: subj.id,
          name: subj.name,
          code: subj.code || '',
          description: subj.description || '',
          isActive,
          createdAt: subj.createdAt,
          updatedAt: subj.updatedAt,
          isCompulsory: Boolean(subj.isCompulsory),
          isEditing: false
        });

        const activeSubjects = activeData.subjects.map(subj => mapSubject(subj, true));
        const inactiveSubjects = inactiveData.subjects.map(subj => mapSubject(subj, false));

        // Log mapped subjects for debugging
        console.log('Processed active subjects:', activeSubjects);
        console.log('Processed inactive subjects:', inactiveSubjects);

        const allSubjects = [...activeSubjects, ...inactiveSubjects];
        setSubjects(allSubjects);

        // Update counts
        setActiveCount(activeSubjects.length);
        setInactiveCount(inactiveSubjects.length);
      } else {
        throw new Error(activeData.message || inactiveData.message || "Failed to fetch subjects");
      }
    } catch (error) {
      console.error("Error fetching subjects:", error);
      setError(error instanceof Error ? error.message : "An error occurred while fetching subjects");
    } finally {
      setLoading(false);
    }
  };

  // Fetch extracurricular activities from API
  const fetchExtracurriculars = async () => {
    try {
      const token = localStorage.getItem('accessToken');
      if (!token) {
        setError("Authentication required");
        setLoading(false);
        return;
      }

      const headers = {
        "Authorization": `Bearer ${token}`,
        "Content-Type": "application/json"
      };

      // Make two separate API calls for active and inactive activities
      const [activeResponse, inactiveResponse] = await Promise.all([
        fetch(`${env.BACKEND_API_URL}/api/v1/activities/filter?isActive=true`, { headers }),
        fetch(`${env.BACKEND_API_URL}/api/v1/activities/filter?isActive=false`, { headers })
      ]);

      // Check if either response failed
      if (!activeResponse.ok || !inactiveResponse.ok) {
        throw new Error(`HTTP Error: ${activeResponse.ok ? inactiveResponse.status : activeResponse.status}`);
      }

      const [activeData, inactiveData] = await Promise.all([
        activeResponse.json() as Promise<ActivityResponse>,
        inactiveResponse.json() as Promise<ActivityResponse>
      ]);

      // Log responses for debugging
      console.log('Active activities response:', activeData);
      console.log('Inactive activities response:', inactiveData);

      if (activeData.success && inactiveData.success) {
        const mapActivity = (act: ActivityResponse['activities'][0], isActive: boolean): ExtracurricularActivity => ({
          id: act.id,
          name: act.name,
          isActive,
          createdAt: act.createdAt,
          updatedAt: act.updatedAt,
          isEditing: false
        });

        const activeActivities = activeData.activities.map(act => mapActivity(act, true));
        const inactiveActivities = inactiveData.activities.map(act => mapActivity(act, false));

        // Log mapped activities for debugging
        console.log('Processed active activities:', activeActivities);
        console.log('Processed inactive activities:', inactiveActivities);

        const allActivities = [...activeActivities, ...inactiveActivities];
        setExtracurriculars(allActivities);

        // Update counts if you have count state variables
        setActiveCount(activeActivities.length);
        setInactiveCount(inactiveActivities.length);
      } else {
        throw new Error(activeData.message || inactiveData.message || "Failed to fetch activities");
      }
    } catch (error) {
      console.error("Error fetching activities:", error);
      setError(error instanceof Error ? error.message : "An error occurred while fetching activities");
    } finally {
      setLoading(false);
    }
  };

  // Fetch data on component mount with better error handling
  useEffect(() => {
    let isMounted = true;

    const fetchData = async () => {
      try {
        setLoading(true);
        setError("");
        
        // Execute both fetches in parallel
        await Promise.all([
          fetchSubjects().catch(error => {
            console.error('Subject fetch error:', error);
            if (isMounted) setError("Failed to fetch subjects");
          }),
          fetchExtracurriculars().catch(error => {
            console.error('Activities fetch error:', error);
            if (isMounted) setError("Failed to fetch activities");
          })
        ]);
      } catch (error) {
        console.error('Fetch data error:', error);
        if (isMounted) setError("Failed to fetch data");
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchData();

    // Cleanup function to prevent state updates if component unmounts
    return () => {
      isMounted = false;
    };
  }, []);

  // Toggle edit mode for a subject or extracurricular
  const toggleEdit = (id: string) => {
    if (activeTab === ACTIVITY_TYPES.SUBJECT) {
      setSubjects(prevSubjects => prevSubjects.map(subj => ({
        ...subj,
        isEditing: subj.id === id ? !subj.isEditing : false
      })));
    } else {
      setExtracurriculars(prevActivities => prevActivities.map(activity => ({
        ...activity,
        isEditing: activity.id === id ? !activity.isEditing : false
      })));
    }
  };

  // Update subject
  const updateSubject = async (id: string, newName: string, newCode: string, isCompulsory: boolean) => {
    try {
      const token = localStorage.getItem('accessToken');
      if (!token) {
        showMessage("Authentication required", "error");
        return;
      }

      // Find current subject data
      const currentSubject = subjects.find(subject => subject.id === id);
      if (!currentSubject) {
        showMessage("Subject not found", "error");
        return;
      }

      // Check if there are any changes
      if (currentSubject.name.trim() === newName.trim() && 
          currentSubject.code.trim() === newCode.trim() &&
          currentSubject.isCompulsory === isCompulsory) {
        showMessage("No changes made", "error");
        // Reset editing state without making API call
        setSubjects(prevSubjects =>
          prevSubjects.map(subject =>
            subject.id === id ? { ...subject, isEditing: false } : subject
          )
        );
        return;
      }

      // Check if user is admin
      const userRole = localStorage.getItem('userRole');
      if (userRole?.toLowerCase() !== 'admin') {
        showMessage("Only administrators can update subjects", "error");
        return;
      }

      // Log the request for debugging
      console.log('Update Request:', {
        id,
        name: newName,
        code: newCode,
        isCompulsory: isCompulsory,
        token: token.substring(0, 20) + '...' // Log partial token for debugging
      });

      const response = await fetch(`${env.BACKEND_API_URL}/api/v1/subjects/${id}`, {
        method: "PUT",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          name: newName.trim(),
          code: newCode.trim(),
          isCompulsory: isCompulsory,
          isActive: true
        })
      });

      const data = await response.json();
      console.log('Update Response:', data);
      
      if (!response.ok) {
        throw new Error(data.message || `Server error: ${response.status}`);
      }

      if (data.success) {
        // Update the local state with the new data
        setSubjects(prevSubjects =>
          prevSubjects.map(subject =>
            subject.id === id
              ? {
                  ...subject,
                  name: newName.trim(),
                  code: newCode.trim(),
                  isCompulsory: isCompulsory,
                  isEditing: false,
                  updatedAt: new Date().toISOString()
                }
              : subject
          )
        );
        showMessage("Subject updated successfully", "success");
      } else {
        throw new Error(data.message || "Failed to update subject");
      }

    } catch (error: any) {
      console.error("Error updating subject:", error);
      
      // More detailed error messages based on error type
      if (error.message.includes('Network')) {
        showMessage("Network error - Please check your connection", "error");
      } else if (error.message.includes('Authorization')) {
        showMessage("Authorization error - Please log in again", "error");
      } else {
        showMessage(error.message || "Failed to update subject", "error");
      }

      // Reset editing state on error
      setSubjects(prevSubjects =>
        prevSubjects.map(subject =>
          subject.id === id ? { ...subject, isEditing: false } : subject
        )
      );
    }
  };

  // Update extracurricular activity
  const updateExtracurricular = async (id: string, newName: string) => {
    try {
      const token = localStorage.getItem('accessToken');
      if (!token) {
        showMessage("Authentication required", "error");
        return;
      }

      // Find current activity data
      const currentActivity = extracurriculars.find(activity => activity.id === id);
      if (!currentActivity) {
        showMessage("Activity not found", "error");
        return;
      }

      // Check if there are any changes
      if (currentActivity.name.trim() === newName.trim()) {
        showMessage("No changes made", "error");
        // Reset editing state without making API call
        setExtracurriculars(prevActivities =>
          prevActivities.map(activity =>
            activity.id === id ? { ...activity, isEditing: false } : activity
          )
        );
        return;
      }

      // Log request for debugging
      console.log('Update Activity Request:', { id, name: newName });

      const response = await fetch(`${env.BACKEND_API_URL}/api/v1/activities/${id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({ 
          name: newName.trim(),
          isActive: true
        })
      });

      const data = await response.json();
      console.log('Update Activity Response:', data);

      if (!response.ok) {
        throw new Error(data.message || `Server error: ${response.status}`);
      }

      if (data.success) {
        setExtracurriculars(prevActivities =>
          prevActivities.map(activity =>
            activity.id === id 
              ? { 
                  ...activity, 
                  name: newName.trim(), 
                  isEditing: false,
                  updatedAt: new Date().toISOString()
                } 
              : activity
          )
        );
        showMessage("Activity updated successfully", "success");
      } else {
        throw new Error(data.message || "Failed to update activity");
      }
    } catch (error: any) {
      console.error("Error updating activity:", error);
      showMessage(error.message || "Failed to update activity", "error");
      
      // Reset editing state on error
      setExtracurriculars(prevActivities =>
        prevActivities.map(activity =>
          activity.id === id ? { ...activity, isEditing: false } : activity
        )
      );
    }
  };

  // Handle delete click to show confirmation dialog
  const handleDeleteClick = (id: string) => {
    setSelectedItemId(id);
    setShowDeleteDialog(true);
  };

  // Delete subject
  const deleteSubject = async (id: string) => {
    try {
      const token = localStorage.getItem('accessToken');
      if (!token) {
        setError("Authentication required");
        return;
      }

      const response = await fetch(`${env.BACKEND_API_URL}/api/v1/subjects/${id}`, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        }
      });

      if (!response.ok) {
        // Handle HTTP errors
        const errorData = await response.json().catch(() => null);
        throw new Error(
          errorData?.message || 
          `Failed to delete subject (HTTP ${response.status})`
        );
      }

      const data: DeleteResponse = await response.json();
      console.log('Delete response:', data); // Debug log

      if (data.success) {
        // Update local state
        setSubjects(prevSubjects => {
          const updatedSubjects = prevSubjects.filter(subj => subj.id !== id);
          console.log('Updated subjects after deletion:', updatedSubjects); // Debug log
          return updatedSubjects;
        });

        // Update counts if you're maintaining them
        setActiveCount(prev => prev - 1);

        // Show success message
        showMessage(
          data.message || 
          data.status?.returnMessage || 
          "Subject deleted successfully", 
          "success"
        );
      } else {
        // Handle API-level errors
        throw new Error(
          data.message || 
          data.status?.returnMessage || 
          "Failed to delete subject"
        );
      }
    } catch (error) {
      console.error('Error during subject deletion:', error);
      setError(error instanceof Error ? error.message : "Failed to delete subject");
      showMessage("Failed to delete subject", "error");
    }
  };

  // Delete extracurricular activity
  const deleteExtracurricular = async (id: string) => {
    try {
      const token = localStorage.getItem('accessToken');
      if (!token) {
        showMessage("Authentication required", "error");
        setError("Authentication required");
        return;
      }

      // Set loading state if you have one
      setLoading(true);

      const response = await fetch(`${env.BACKEND_API_URL}/api/v1/activities/${id}`, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        }
      });

      // Log the response for debugging
      console.log('Delete activity response status:', response.status);

      if (!response.ok) {
        // Handle HTTP errors
        const errorData = await response.json().catch(() => null);
        throw new Error(
          errorData?.message || 
          `Failed to delete activity (HTTP ${response.status})`
        );
      }

      const data: DeleteActivityResponse = await response.json();
      console.log('Delete activity response:', data); // Debug log

      if (data.success) {
        // Update local state
        setExtracurriculars(prevActivities => {
          const updatedActivities = prevActivities.filter(activity => activity.id !== id);
          console.log('Updated activities after deletion:', updatedActivities); // Debug log
          return updatedActivities;
        });

        // Update counts if you're maintaining them
        const deletedActivity = extracurriculars.find(act => act.id === id);
        if (deletedActivity?.isActive) {
          setActiveCount(prev => prev - 1);
        } else {
          setInactiveCount(prev => prev - 1);
        }

        // Show success message
        showMessage(
          data.message || 
          data.status?.returnMessage || 
          "Activity deleted successfully", 
          "success"
        );
      } else {
        // Handle API-level errors
        throw new Error(
          data.message || 
          data.status?.returnMessage || 
          "Failed to delete activity"
        );
      }
    } catch (error) {
      console.error('Error during activity deletion:', error);
      const errorMessage = error instanceof Error ? 
        error.message : 
        "An error occurred while deleting activity";
      
      setError(errorMessage);
      showMessage(errorMessage, "error");
    } finally {
      // Reset loading state if you have one
      setLoading(false);
    }
  };

  // Toggle activation of subject or extracurricular
  const toggleActivation = async (id: string, currentStatus: boolean, type: string) => {
    try {
      const token = localStorage.getItem('accessToken');
      if (!token) {
        showMessage("Authentication required", "error");
        return;
      }

      const endpoint = type === ACTIVITY_TYPES.SUBJECT
        ? `${env.BACKEND_API_URL}/api/v1/subjects/${id}/${currentStatus ? 'deactivate' : 'activate'}`
        : `${env.BACKEND_API_URL}/api/v1/activities/${id}/${currentStatus ? 'deactivate' : 'activate'}`;

      console.log('Toggle Activation Request:', {
        id,
        type,
        currentStatus,
        action: currentStatus ? 'deactivate' : 'activate',
        endpoint
      });

      const response = await fetch(endpoint, {
        method: "PUT",
          headers: {
            "Authorization": `Bearer ${token}`,
            "Content-Type": "application/json"
          }
        });

      const data = await response.json();
      console.log('Toggle Activation Response:', data);
        
        if (!response.ok) {
        throw new Error(data.message || `Server error: ${response.status}`);
      }

      if (data.success) {
        // Update local state based on type
        if (type === ACTIVITY_TYPES.SUBJECT) {
          setSubjects(prevSubjects =>
            prevSubjects.map(subject =>
              subject.id === id
                ? {
                    ...subject,
                    isActive: !currentStatus,
                    updatedAt: new Date().toISOString()
                  }
                : subject
            )
          );
          
          // Automatically switch to the appropriate tab
          setActiveSubTab(currentStatus ? "inactive" : "active");
        } else {
          setExtracurriculars(prevActivities =>
            prevActivities.map(activity =>
              activity.id === id
                ? {
                    ...activity,
                    isActive: !currentStatus,
                    updatedAt: new Date().toISOString()
                  }
                : activity
            )
          );
          
          // Automatically switch to the appropriate tab
          setActiveSubTab(currentStatus ? "inactive" : "active");
        }

        // Refresh the data to ensure we have the latest state
        await fetchSubjects();
        
        showMessage(
          `${type === ACTIVITY_TYPES.SUBJECT ? 'Subject' : 'Activity'} ${currentStatus ? 'deactivated' : 'activated'} successfully`,
          "success"
        );
        } else {
        throw new Error(data.message || `Failed to ${currentStatus ? 'deactivate' : 'activate'} ${type}`);
      }

    } catch (error: any) {
      console.error("Error toggling activation:", error);
      
      if (error instanceof TypeError) {
        showMessage("Network error - Please check your connection", "error");
      } else {
        showMessage(error.message || `Failed to ${currentStatus ? 'deactivate' : 'activate'} ${type}`, "error");
      }
    }
  };

  // Determine which items to display based on current tabs
  const currentItems = activeTab === ACTIVITY_TYPES.SUBJECT 
    ? subjects 
    : extracurriculars;

  // Filter items based on active/inactive sub-tab
  const filteredItems = currentItems.filter((item: Subject | ExtracurricularActivity) => {
    const itemActiveState = isActiveValue(item.isActive);
    console.log('Filtering item:', {
      id: item.id,
      name: item.name,
      isActive: item.isActive,
      itemActiveState,
      activeSubTab,
      shouldShow: activeSubTab === "active" ? itemActiveState : !itemActiveState
    });
    return activeSubTab === "active" ? itemActiveState : !itemActiveState;
  });

  return (
    <div className="bg-gray-100 min-h-screen">
      <div className="container mx-auto py-10 px-4">
        <h1 className="text-2xl font-bold text-center mb-5">
          Manage Subjects & Activities
        </h1>
        
        {/* Error message */}
        {error && (
          <div className="mb-4 p-3 rounded text-white text-center mx-auto max-w-md bg-red-500">
            {error}
          </div>
        )}
        
        {/* Notification message */}
        {message.text && (
          <div 
            className={`mb-4 p-3 rounded text-white text-center mx-auto max-w-md ${
              message.type === "success" ? "bg-green-500" : "bg-red-500"
            }`}
          >
            {message.text}
          </div>
        )}
        
        <div className="bg-white p-5 rounded shadow max-w-4xl mx-auto">
          {/* Loading state */}
          {loading && (
            <div className="text-center py-10">
              <div className="animate-spin h-10 w-10 mx-auto border-4 border-purple-600 border-t-transparent rounded-full"></div>
              <p className="mt-3 text-gray-600">Loading data...</p>
            </div>
          )}

          {!loading && (
            <>
              {/* Main Type Tabs */}
              <div className="flex border-b border-gray-200 mb-6">
                <button
                  onClick={() => {
                    setActiveTab(ACTIVITY_TYPES.SUBJECT);
                    setActiveSubTab("active");
                  }}
                  className={`py-2 px-4 font-medium text-sm focus:outline-none ${
                    activeTab === ACTIVITY_TYPES.SUBJECT
                      ? "border-b-2 border-purple-500 text-purple-600"
                      : "text-gray-500 hover:text-gray-700"
                  }`}
                >
                  Subjects
                </button>
                <button
                  onClick={() => {
                    setActiveTab(ACTIVITY_TYPES.EXTRACURRICULAR);
                    setActiveSubTab("active");
                  }}
                  className={`py-2 px-4 font-medium text-sm focus:outline-none ${
                    activeTab === ACTIVITY_TYPES.EXTRACURRICULAR
                      ? "border-b-2 border-purple-500 text-purple-600"
                      : "text-gray-500 hover:text-gray-700"
                  }`}
                >
                  Extracurricular Activities
                </button>
              </div>

              {/* Header */}
          <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-semibold">
                  {activeTab === ACTIVITY_TYPES.SUBJECT ? "Subjects" : "Extracurricular Activities"}
                </h2>
          </div>
          
              {/* Sub Tabs for Active/Inactive */}
              <div className="flex border-b border-gray-200 mb-6">
                <button
                  onClick={() => setActiveSubTab("active")}
                  className={`py-2 px-4 font-medium text-sm focus:outline-none ${
                    activeSubTab === "active"
                      ? "border-b-2 border-purple-500 text-purple-600"
                      : "text-gray-500 hover:text-gray-700"
                  }`}
                >
                  Active {activeTab === ACTIVITY_TYPES.SUBJECT ? 'Subjects' : 'Activities'} ({activeCount})
                </button>
                <button
                  onClick={() => setActiveSubTab("inactive")}
                  className={`py-2 px-4 font-medium text-sm focus:outline-none ${
                    activeSubTab === "inactive"
                      ? "border-b-2 border-purple-500 text-purple-600"
                      : "text-gray-500 hover:text-gray-700"
                  }`}
                >
                  Inactive {activeTab === ACTIVITY_TYPES.SUBJECT ? 'Subjects' : 'Activities'} ({inactiveCount})
                </button>
            </div>

              {/* Subjects/Activities Table */}
              {filteredItems.length === 0 ? (
            <div className="text-center py-10 text-gray-500">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 mx-auto text-gray-400 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
                  <p>No {activeSubTab} {activeTab === ACTIVITY_TYPES.SUBJECT ? 'subjects' : 'activities'} found.</p>
            </div>
          ) : (
                <div>
                  {/* Table for medium and large screens */}
                  <div className="hidden md:block overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-2 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">#</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{activeTab === ACTIVITY_TYPES.SUBJECT ? 'Subject Name' : 'Activity Name'}</th>
                          {activeTab === ACTIVITY_TYPES.SUBJECT && <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Code</th>}
                          {activeTab === ACTIVITY_TYPES.SUBJECT && <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>}
                          <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {filteredItems.map((item, index) => (
                          <tr key={item.id} className="hover:bg-gray-50">
                            <td className="px-2 py-4 whitespace-nowrap text-sm text-gray-500 font-medium">{index + 1}</td>
                            {item.isEditing ? (
                              <>
                                <td className="px-4 py-4"><input type="text" defaultValue={item.name} id={`name-desk-${item.id}`} className="p-2 border border-gray-300 rounded-md w-full" /></td>
                                {activeTab === ACTIVITY_TYPES.SUBJECT && (
                                  <>
                                    <td className="px-4 py-4"><input type="text" defaultValue={(item as Subject).code} id={`code-desk-${item.id}`} className="p-2 border border-gray-300 rounded-md w-full" /></td>
                                    <td className="px-4 py-4"><input type="checkbox" defaultChecked={(item as Subject).isCompulsory} id={`compulsory-desk-${item.id}`} className="h-4 w-4 text-purple-600 focus:ring-purple-500 border-gray-300 rounded" /></td>
                                  </>
                                )}
                                <td className="px-4 py-4 text-right">
                                  <button onClick={() => {
                                    const nameInput = document.getElementById(`name-desk-${item.id}`) as HTMLInputElement;
                                    if (activeTab === ACTIVITY_TYPES.SUBJECT) {
                                      const codeInput = document.getElementById(`code-desk-${item.id}`) as HTMLInputElement;
                                      const compulsoryInput = document.getElementById(`compulsory-desk-${item.id}`) as HTMLInputElement;
                                      updateSubject(item.id, nameInput.value, codeInput.value, compulsoryInput.checked);
                                    } else {
                                      updateExtracurricular(item.id, nameInput.value);
                                    }
                                  }} className="text-green-600 hover:text-green-500 flex items-center ml-auto"><svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>Save</button>
                                </td>
                              </>
                            ) : (
                              <>
                                <td className="px-4 py-4 whitespace-nowrap font-medium text-gray-900">{item.name}</td>
                                {activeTab === ACTIVITY_TYPES.SUBJECT && <td className="px-4 py-4 whitespace-nowrap text-gray-500">{(item as Subject).code || 'N/A'}</td>}
                                {activeTab === ACTIVITY_TYPES.SUBJECT && <td className="px-4 py-4 whitespace-nowrap text-gray-500">{(item as Subject).isCompulsory ? 'Compulsory' : 'Optional'}</td>}
                                <td className="px-4 py-4 whitespace-nowrap text-right">
                                  <div className="flex space-x-2 justify-end">
                                    <button onClick={() => toggleEdit(item.id)} className="text-blue-600 hover:text-blue-500 flex items-center"><svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>Edit</button>
                                    <button onClick={() => toggleActivation(item.id, item.isActive, activeTab)} className={`flex items-center ${item.isActive ? "text-yellow-600 hover:text-yellow-500" : "text-green-600 hover:text-green-500"}`}>{item.isActive ? <><svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" /></svg>Deactivate</> : <><svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>Activate</>}</button>
                                    <button onClick={() => handleDeleteClick(item.id)} className="text-red-600 hover:text-red-500 flex items-center"><svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>Delete</button>
                                  </div>
                                </td>
                              </>
                            )}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Cards for small screens */}
                  <div className="md:hidden space-y-4">
                    {filteredItems.map((item, index) => (
                      <div key={item.id} className="bg-white p-4 rounded-lg shadow border border-gray-200">
                        {item.isEditing ? (
                          <div className="space-y-3">
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                              <input type="text" defaultValue={item.name} id={`name-mob-${item.id}`} className="p-2 border border-gray-300 rounded-md w-full" />
                            </div>
                            {activeTab === ACTIVITY_TYPES.SUBJECT && (
                              <>
                                <div>
                                  <label className="block text-sm font-medium text-gray-700 mb-1">Code</label>
                                  <input type="text" defaultValue={(item as Subject).code} id={`code-mob-${item.id}`} className="p-2 border border-gray-300 rounded-md w-full" />
                                </div>
                                <div className="flex items-center">
                                  <input type="checkbox" defaultChecked={(item as Subject).isCompulsory} id={`compulsory-mob-${item.id}`} className="h-4 w-4 text-purple-600 focus:ring-purple-500 border-gray-300 rounded" />
                                  <label htmlFor={`compulsory-mob-${item.id}`} className="ml-2 block text-sm text-gray-900">Is Compulsory</label>
                                </div>
                              </>
                            )}
                            <div className="flex justify-end">
                              <button onClick={() => {
                                const nameInput = document.getElementById(`name-mob-${item.id}`) as HTMLInputElement;
                                if (activeTab === ACTIVITY_TYPES.SUBJECT) {
                                  const codeInput = document.getElementById(`code-mob-${item.id}`) as HTMLInputElement;
                                  const compulsoryInput = document.getElementById(`compulsory-mob-${item.id}`) as HTMLInputElement;
                                  updateSubject(item.id, nameInput.value, codeInput.value, compulsoryInput.checked);
                                } else {
                                  updateExtracurricular(item.id, nameInput.value);
                                }
                              }} className="text-green-600 hover:text-green-500 flex items-center"><svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>Save</button>
                            </div>
                          </div>
                        ) : (
                          <div>
                            <div className="flex justify-between items-start mb-2">
                              <div>
                                <p className="font-bold text-lg text-gray-800">{item.name}</p>
                                {activeTab === ACTIVITY_TYPES.SUBJECT && <p className="text-sm text-gray-500">Code: {(item as Subject).code || 'N/A'}</p>}
                                {activeTab === ACTIVITY_TYPES.SUBJECT && <p className="text-sm text-gray-500">Type: {(item as Subject).isCompulsory ? 'Compulsory' : 'Optional'}</p>}
                              </div>
                              <span className="text-sm font-medium text-gray-400">#{index + 1}</span>
                            </div>
                            <div className="border-t border-gray-200 mt-3 pt-3 flex justify-end items-center flex-wrap gap-2">
                              <button onClick={() => toggleEdit(item.id)} className="text-xs text-blue-600 hover:text-blue-500 flex items-center"><svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>Edit</button>
                              <button onClick={() => toggleActivation(item.id, item.isActive, activeTab)} className={`text-xs flex items-center ${item.isActive ? "text-yellow-600 hover:text-yellow-500" : "text-green-600 hover:text-green-500"}`}>{item.isActive ? <><svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" /></svg>Deactivate</> : <><svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>Activate</>}</button>
                              <button onClick={() => handleDeleteClick(item.id)} className="text-xs text-red-600 hover:text-red-500 flex items-center"><svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>Delete</button>
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
      
      {/* Delete Confirmation Dialog */}
      <DialogBox
        isOpen={showDeleteDialog}
        title={`Confirm ${activeTab === ACTIVITY_TYPES.SUBJECT ? 'Subject' : 'Activity'} Deletion`}
        message={`Are you sure you want to delete this ${activeTab === ACTIVITY_TYPES.SUBJECT ? 'subject' : 'activity'}? This action cannot be undone.`}
        onConfirm={() => {
          if (selectedItemId) {
            if (activeTab === ACTIVITY_TYPES.SUBJECT) {
              deleteSubject(selectedItemId);
            } else {
              deleteExtracurricular(selectedItemId);
            }
            setShowDeleteDialog(false);
            setSelectedItemId(null);
          }
        }}
        onCancel={() => {
          setShowDeleteDialog(false);
          setSelectedItemId(null);
        }}
        confirmText="Delete"
        cancelText="Cancel"
        type="delete"
      />
    </div>
  );
};

export default ViewSubjectsAndActivitiesPreview;