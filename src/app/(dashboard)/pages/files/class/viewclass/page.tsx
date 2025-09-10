"use client";
import React, { useState, useEffect } from "react";
import DialogBox from '@/components/Dailogbox';
import { env } from '@/env';

// Define interface for classes
interface Class {
  id: string;
  name: string;
  section: string;
  description: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  isEditing?: boolean;
}

interface Message {
  text: string;
  type: string;
}

interface ClassResponse {
  success: boolean;
  classes: Array<{
    id: string;
    name: string;
    section?: string;
    description?: string;
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
    returnsection: string;
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

const ViewClassesPreview = () => {
  const [classes, setClasses] = useState<Class[]>([]);
  const [message, setMessage] = useState<Message>({ text: "", type: "" });
  const [activeSubTab, setActiveSubTab] = useState("active");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>("");
  const [activeCount, setActiveCount] = useState(0);
  const [inactiveCount, setInactiveCount] = useState(0);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [selectedClassId, setSelectedClassId] = useState<string | null>(null);

  // Show notification message
  const showMessage = (text: string, type: string) => {
    setMessage({ text, type });
    setTimeout(() => {
      setMessage({ text: "", type: "" });
    }, 3000);
  };

  // Fetch classes from API
  const fetchClasses = async () => {
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

      // Make two separate API calls for active and inactive classes
      const [activeResponse, inactiveResponse] = await Promise.all([
        fetch(`${env.BACKEND_API_URL}/api/v1/classes/filter?isActive=true`, { headers }),
        fetch(`${env.BACKEND_API_URL}/api/v1/classes/filter?isActive=false`, { headers })
      ]);

      // Check if either response failed
      if (!activeResponse.ok || !inactiveResponse.ok) {
        throw new Error(`HTTP Error: ${activeResponse.ok ? inactiveResponse.status : activeResponse.status}`);
      }

      const [activeData, inactiveData] = await Promise.all([
        activeResponse.json() as Promise<ClassResponse>,
        inactiveResponse.json() as Promise<ClassResponse>
      ]);

      // Log responses for debugging
      console.log('Active classes response:', activeData);
      console.log('Inactive classes response:', inactiveData);

      if (activeData.success && inactiveData.success) {
        const mapClass = (cls: ClassResponse['classes'][0], isActive: boolean): Class => ({
            id: cls.id,
            name: cls.name,
          section: cls.section || '',
          description: cls.description || '',
          isActive,
            createdAt: cls.createdAt,
          updatedAt: cls.updatedAt,
          isEditing: false
        });

        const activeClasses = activeData.classes.map(cls => mapClass(cls, true));
        const inactiveClasses = inactiveData.classes.map(cls => mapClass(cls, false));

        // Log mapped classes for debugging
        console.log('Processed active classes:', activeClasses);
        console.log('Processed inactive classes:', inactiveClasses);

        const allClasses = [...activeClasses, ...inactiveClasses];
        setClasses(allClasses);

        // Update counts
        setActiveCount(activeClasses.length);
        setInactiveCount(inactiveClasses.length);
        } else {
        throw new Error(activeData.message || inactiveData.message || "Failed to fetch classes");
      }
    } catch (error) {
      console.error("Error fetching classes:", error);
      setError(error instanceof Error ? error.message : "An error occurred while fetching classes");
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
        
        await fetchClasses().catch(error => {
          console.error('Data fetch error:', error);
          if (isMounted) setError("Failed to fetch data");
        });
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

  // Toggle edit mode for a class
  const toggleEdit = (id: string) => {
    setClasses(prevClasses => prevClasses.map(cls => ({
      ...cls,
      isEditing: cls.id === id ? !cls.isEditing : false
    })));
  };

  // Update class with section selection
  const updateClass = async (id: string, newName: string, newSectionId: string) => {
    try {
      const token = localStorage.getItem('accessToken');
      if (!token) {
        showMessage("Authentication required", "error");
        return;
      }

      // Find current class data
      const currentClass = classes.find(cls => cls.id === id);
      if (!currentClass) {
        showMessage("Class not found", "error");
        return;
      }

      // Check if there are any changes
      if (currentClass.name.trim() === newName.trim() && 
          currentClass.section === newSectionId) {
        showMessage("No changes made", "error");
        setClasses(prevClasses =>
          prevClasses.map(cls =>
            cls.id === id ? { ...cls, isEditing: false } : cls
          )
        );
        return;
      }

      // Check if user is admin
      const userRole = localStorage.getItem('userRole');
      if (userRole?.toLowerCase() !== 'admin') {
        showMessage("Only administrators can update classes", "error");
        return;
      }

      const response = await fetch(`${env.BACKEND_API_URL}/api/v1/classes/${id}`, {
        method: "PUT",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          name: newName.trim(),
          sectionId: newSectionId,
          isActive: true
        })
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || `Server error: ${response.status}`);
      }

      if (data.success) {
        // Update the local state with the new data
        setClasses(prevClasses =>
          prevClasses.map(cls =>
            cls.id === id
              ? {
                  ...cls,
                  name: newName.trim(),
                  section: newSectionId,
                  isEditing: false,
                  updatedAt: new Date().toISOString()
                }
              : cls
          )
        );
        showMessage("Class updated successfully", "success");
      } else {
        throw new Error(data.message || "Failed to update class");
      }

    } catch (error: any) {
      console.error("Error updating class:", error);
      
      if (error.message.includes('Network')) {
        showMessage("Network error - Please check your connection", "error");
      } else if (error.message.includes('Authorization')) {
        showMessage("Authorization error - Please log in again", "error");
      } else {
        showMessage(error.message || "Failed to update class", "error");
      }

      // Reset editing state on error
      setClasses(prevClasses =>
        prevClasses.map(cls =>
          cls.id === id ? { ...cls, isEditing: false } : cls
        )
      );
    }
  };

  // Delete class
  const handleDeleteClick = (id: string) => {
    setSelectedClassId(id);
    setShowDeleteDialog(true);
  };

  const deleteClass = async (id: string) => {
    try {
      const token = localStorage.getItem('accessToken');
      if (!token) {
        setError("Authentication required");
        return;
      }

      const response = await fetch(`${env.BACKEND_API_URL}/api/v1/classes/${id}`, {
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
          `Failed to delete class (HTTP ${response.status})`
        );
      }

      const data: DeleteResponse = await response.json();
      console.log('Delete response:', data); // Debug log

      if (data.success) {
        // Update local state
        setClasses(prevClasses => {
          const updatedClasses = prevClasses.filter(cls => cls.id !== id);
          console.log('Updated classes after deletion:', updatedClasses); // Debug log
          return updatedClasses;
        });

        // Update counts if you're maintaining them
        setActiveCount(prev => prev - 1);

        // Show success message
        showMessage(
          data.message || 
          data.status?.returnMessage || 
          "Class deleted successfully", 
          "success"
        );
      } else {
        // Handle API-level errors
        throw new Error(
          data.message || 
          data.status?.returnMessage || 
          "Failed to delete class"
        );
      }
    } catch (error) {
      console.error('Error during class deletion:', error);
      setError(error instanceof Error ? error.message : "Failed to delete class");
      showMessage("Failed to delete class", "error");
    }
  };

  // Toggle activation of class
  const toggleActivation = async (id: string, currentStatus: boolean) => {
    try {
      const token = localStorage.getItem('accessToken');
      if (!token) {
        showMessage("Authentication required", "error");
        return;
      }

      const endpoint = `${env.BACKEND_API_URL}/api/v1/classes/${id}/${currentStatus ? 'deactivate' : 'activate'}`;

      console.log('Toggling activation for class ID:', id);

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
        // Update local state
        setClasses(prevClasses =>
          prevClasses.map(cls =>
            cls.id === id
              ? {
                  ...cls,
                  isActive: !currentStatus,
                  updatedAt: new Date().toISOString()
                }
              : cls
          )
        );
        
        // Automatically switch to the appropriate tab
        setActiveSubTab(currentStatus ? "inactive" : "active");

        // Refresh the data to ensure we have the latest state
        await fetchClasses();
        
        showMessage(
          `Class ${currentStatus ? 'deactivated' : 'activated'} successfully`,
          "success"
        );
      } else {
        throw new Error(data.message || `Failed to ${currentStatus ? 'deactivate' : 'activate'} class`);
      }

    } catch (error: any) {
      console.error("Error toggling activation:", error);
      
      if (error instanceof TypeError) {
        showMessage("Network error - Please check your connection", "error");
      } else {
        showMessage(error.message || `Failed to ${currentStatus ? 'deactivate' : 'activate'} class`, "error");
      }
    }
  };

  // Filter items based on active/inactive sub-tab
  const filteredClasses = classes.filter((item: Class) => {
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
          Manage Classes
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
              {/* Header */}
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-semibold">
                  Classes
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
                  Active Classes ({activeCount})
                </button>
                <button
                  onClick={() => setActiveSubTab("inactive")}
                  className={`py-2 px-4 font-medium text-sm focus:outline-none ${
                    activeSubTab === "inactive"
                      ? "border-b-2 border-purple-500 text-purple-600"
                      : "text-gray-500 hover:text-gray-700"
                  }`}
                >
                  Inactive Classes ({inactiveCount})
                </button>
              </div>

              {/* Classes Table */}
              {filteredClasses.length === 0 ? (
                <div className="text-center py-10 text-gray-500">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 mx-auto text-gray-400 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                  </svg>
                  <p>No {activeSubTab} classes found.</p>
                </div>
              ) : (
                <div>
                  {/* Table for medium and large screens */}
                  <div className="hidden md:block overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-2 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">#</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Class Name</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Class Section</th>
                          <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {filteredClasses.map((item, index) => (
                          <tr key={item.id} className="hover:bg-gray-50">
                            <td className="px-2 py-4 whitespace-nowrap text-sm text-gray-500 font-medium">{index + 1}</td>
                            {item.isEditing ? (
                              <>
                                <td className="px-4 py-4">
                                  <input type="text" defaultValue={item.name} className="p-2 border border-gray-300 rounded-md w-full" id={`name-desk-${item.id}`} />
                                </td>
                                <td className="px-4 py-4">
                                  <input type="text" defaultValue={item.section} className="p-2 border border-gray-300 rounded-md w-full" id={`section-desk-${item.id}`} />
                                </td>
                                <td className="px-4 py-4 text-right">
                                  <button onClick={() => updateClass(item.id, (document.getElementById(`name-desk-${item.id}`) as HTMLInputElement).value, (document.getElementById(`section-desk-${item.id}`) as HTMLInputElement).value)} className="text-green-600 hover:text-green-500 flex items-center ml-auto">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>Save
                                  </button>
                                </td>
                              </>
                            ) : (
                              <>
                                <td className="px-4 py-4 whitespace-nowrap font-medium text-gray-900">{item.name}</td>
                                <td className="px-4 py-4 whitespace-nowrap text-gray-500">{item.section || 'N/A'}</td>
                                <td className="px-4 py-4 whitespace-nowrap text-right">
                                  <div className="flex space-x-2 justify-end">
                                    <button onClick={() => toggleEdit(item.id)} className="text-blue-600 hover:text-blue-500 flex items-center"><svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>Edit</button>
                                    <button onClick={() => toggleActivation(item.id, item.isActive)} className={`${item.isActive ? "text-yellow-600 hover:text-yellow-500" : "text-green-600 hover:text-green-500"} flex items-center`}>{item.isActive ? (<><svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" /></svg>Deactivate</>) : (<><svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>Activate</>)}</button>
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
                    {filteredClasses.map((item, index) => (
                      <div key={item.id} className="bg-white p-4 rounded-lg shadow border border-gray-200">
                        {item.isEditing ? (
                          <div className="space-y-3">
                            <div>
                              <label htmlFor={`name-mob-${item.id}`} className="block text-sm font-medium text-gray-700 mb-1">Class Name</label>
                              <input type="text" defaultValue={item.name} id={`name-mob-${item.id}`} className="p-2 border border-gray-300 rounded-md w-full" />
                            </div>
                            <div>
                              <label htmlFor={`section-mob-${item.id}`} className="block text-sm font-medium text-gray-700 mb-1">Class Section</label>
                              <input type="text" defaultValue={item.section} id={`section-mob-${item.id}`} className="p-2 border border-gray-300 rounded-md w-full" />
                            </div>
                            <div className="flex justify-end">
                              <button onClick={() => updateClass(item.id, (document.getElementById(`name-mob-${item.id}`) as HTMLInputElement).value, (document.getElementById(`section-mob-${item.id}`) as HTMLInputElement).value)} className="text-green-600 hover:text-green-500 flex items-center">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>Save
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div>
                            <div className="flex justify-between items-start mb-2">
                              <div>
                                <p className="font-bold text-lg text-gray-800">{item.name}</p>
                                <p className="text-sm text-gray-500">Section: {item.section || 'N/A'}</p>
                              </div>
                              <span className="text-sm font-medium text-gray-400">#{index + 1}</span>
                            </div>
                            <div className="border-t border-gray-200 mt-3 pt-3 flex justify-end items-center flex-wrap gap-2">
                              <button onClick={() => toggleEdit(item.id)} className="text-xs text-blue-600 hover:text-blue-500 flex items-center"><svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>Edit</button>
                              <button onClick={() => toggleActivation(item.id, item.isActive)} className={`text-xs ${item.isActive ? "text-yellow-600 hover:text-yellow-500" : "text-green-600 hover:text-green-500"} flex items-center`}>{item.isActive ? (<><svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" /></svg>Deactivate</>) : (<><svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>Activate</>)}</button>
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
        title="Confirm Class Deletion"
        message="Are you sure you want to delete this class? This action cannot be undone."
        onConfirm={() => {
          if (selectedClassId) {
            deleteClass(selectedClassId);
            setShowDeleteDialog(false);
            setSelectedClassId(null);
          }
        }}
        onCancel={() => {
          setShowDeleteDialog(false);
          setSelectedClassId(null);
        }}
        confirmText="Delete"
        cancelText="Cancel"
        type="delete"
      />
    </div>
  );
};

export default ViewClassesPreview;