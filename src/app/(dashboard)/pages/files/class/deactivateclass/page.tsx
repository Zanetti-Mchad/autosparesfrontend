"use client";

import React, { useState } from "react";

// Define types for class data
interface ClassData {
  id: string;
  name: string;
  section: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  isEditing?: boolean;
}

// Mock data for the preview
const mockClasses: ClassData[] = [
  {
    id: "1",
    name: "Primary 1",
    section: "Lower Primary",
    isActive: true,
    createdAt: "2023-01-15T08:30:00Z",
    updatedAt: "2023-01-15T08:30:00Z"
  },
  {
    id: "2",
    name: "Primary 2",
    section: "Lower Primary",
    isActive: true,
    createdAt: "2023-01-15T09:00:00Z",
    updatedAt: "2023-01-15T09:00:00Z"
  },
  {
    id: "3",
    name: "Primary 3", 
    section: "Lower Primary",
    isActive: false,
    createdAt: "2023-01-15T09:30:00Z",
    updatedAt: "2023-06-20T14:15:00Z"
  },
  {
    id: "4",
    name: "Primary 4",
    section: "Upper Primary",
    isActive: true,
    createdAt: "2023-01-15T10:00:00Z",
    updatedAt: "2023-01-15T10:00:00Z"
  },
  {
    id: "5",
    name: "Nursery 1",
    section: "Nursery",
    isActive: true,
    createdAt: "2023-01-15T10:30:00Z",
    updatedAt: "2023-01-15T10:30:00Z"
  },
  {
    id: "6",
    name: "Nursery 2",
    section: "Nursery",
    isActive: false,
    createdAt: "2023-01-15T11:00:00Z",
    updatedAt: "2023-07-05T09:45:00Z"
  }
];

// Available sections for the dropdown
const availableSections = [
  "Nursery",
  "Lower Primary",
  "Upper Primary",
  "Junior Secondary",
  "Senior Secondary"
];

const ViewClassesPreview = () => {
  const [classes, setClasses] = useState(mockClasses);
  const [message, setMessage] = useState({ text: "", type: "" });
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("active"); // "active" or "inactive"

  // Show notification message
  const showMessage = (text: string, type: string) => {
    setMessage({ text, type });
    setTimeout(() => {
      setMessage({ text: "", type: "" });
    }, 3000);
  };

  // Toggle edit mode for a class
  const toggleEdit = (id: string) => {
    setClasses((prevClasses) =>
      prevClasses.map((cls) =>
        cls.id === id ? { ...cls, isEditing: !cls.isEditing } : cls
      )
    );
  };

  // Update class name (mock)
  const updateClassName = (id: string, newName: string, section: string) => {
    setClasses((prevClasses) =>
      prevClasses.map((cls) =>
        cls.id === id ? { ...cls, name: newName, section, isEditing: false } : cls
      )
    );
    showMessage("Class updated successfully", "success");
  };

  // Delete class (mock)
  const deleteClass = (id: string) => {
    if (window.confirm("Are you sure you want to delete this class?")) {
      setClasses((prevClasses) => prevClasses.filter((cls) => cls.id !== id));
      showMessage("Class deleted successfully", "success");
    }
  };

  // Toggle activation status (mock)
  const toggleActivation = (id: string, currentStatus: boolean) => {
    setClasses(prevClasses =>
      prevClasses.map(cls =>
        cls.id === id ? { ...cls, isActive: !currentStatus } : cls
      )
    );
    
    // Automatically switch to the other tab when a class is activated/deactivated
    setActiveTab(currentStatus ? "inactive" : "active");
    
    showMessage(`Class ${currentStatus ? 'deactivated' : 'activated'} successfully`, "success");
  };

  // Filter classes based on active tab
  const filteredClasses = classes.filter(cls => 
    activeTab === "active" ? cls.isActive : !cls.isActive
  );

  // Count active and inactive classes
  const activeCount = classes.filter(cls => cls.isActive).length;
  const inactiveCount = classes.filter(cls => !cls.isActive).length;

  return (
    <div className="bg-gray-100 min-h-screen">
      <div className="container mx-auto py-10 px-4">
 
        <h1 className="text-2xl font-bold text-center mb-5">
          Manage Classes
        </h1>
        
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
          {/* Tabs */}
          <div className="flex border-b border-gray-200 mb-6">
            <button
              onClick={() => setActiveTab("active")}
              className={`py-2 px-4 font-medium text-sm focus:outline-none ${
                activeTab === "active"
                  ? "border-b-2 border-purple-500 text-purple-600"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              Active Classes ({activeCount})
            </button>
            <button
              onClick={() => setActiveTab("inactive")}
              className={`py-2 px-4 font-medium text-sm focus:outline-none ${
                activeTab === "inactive"
                  ? "border-b-2 border-purple-500 text-purple-600"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              Inactive Classes ({inactiveCount})
            </button>
          </div>
          
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-semibold">
              {activeTab === "active" ? "Active Classes" : "Inactive Classes"}
            </h2>
          </div>
          
          {loading ? (
            <div className="text-center py-10">
              <div className="animate-spin h-10 w-10 mx-auto border-4 border-purple-600 border-t-transparent rounded-full"></div>
              <p className="mt-3 text-gray-600">Loading classes...</p>
            </div>
          ) : filteredClasses.length === 0 ? (
            <div className="text-center py-10 text-gray-500">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 mx-auto text-gray-400 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
              <p>No {activeTab === "active" ? "active" : "inactive"} classes found.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-2 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      #
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Class Name
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Section
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredClasses.map((cls, index) => (
                    <tr key={cls.id} className="hover:bg-gray-50">
                      <td className="px-2 py-4 whitespace-nowrap text-sm text-gray-500 font-medium">
                        {index + 1}
                      </td>
                      {cls.isEditing ? (
                        <>
                          <td className="px-4 py-4">
                            <input
                              type="text"
                              defaultValue={cls.name}
                              className="p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 w-full"
                              placeholder="Class name"
                              id={`name-${cls.id}`}
                            />
                          </td>
                          <td className="px-4 py-4">
                            <select
                              defaultValue={cls.section}
                              className="p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 w-full"
                              id={`section-${cls.id}`}
                            >
                              <option value="">Select a section</option>
                              {availableSections.map((section) => (
                                <option key={`${cls.id}-${section}`} value={section}>
                                  {section}
                                </option>
                              ))}
                            </select>
                          </td>
                          <td className="px-4 py-4 text-right">
                            <button
                              onClick={(e) => updateClassName(cls.id, (e.target as HTMLInputElement).value, (document.getElementById(`section-${cls.id}`) as HTMLSelectElement).value)}
                              className="text-green-600 hover:text-green-500 flex items-center ml-auto"
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                              </svg>
                              Save
                            </button>
                          </td>
                        </>
                      ) : (
                        <>
                          <td className="px-4 py-4 whitespace-nowrap">
                            <div className="font-medium text-gray-900">{cls.name}</div>
                          </td>
                          <td className="px-4 py-4 whitespace-nowrap">
                            <div className="text-gray-500">{cls.section || 'Default'}</div>
                          </td>
                          <td className="px-4 py-4 whitespace-nowrap text-right">
                            <div className="flex space-x-2 justify-end">
                              <button
                                onClick={() => toggleEdit(cls.id)}
                                className="text-blue-600 hover:text-blue-500 flex items-center"
                              >
                                <svg
                                  xmlns="http://www.w3.org/2000/svg"
                                  className="h-5 w-5 mr-1"
                                  fill="none"
                                  viewBox="0 0 24 24"
                                  stroke="currentColor"
                                >
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"
                                  />
                                </svg>
                                Edit
                              </button>

                              <button
                                onClick={() => toggleActivation(cls.id, cls.isActive)}
                                className={`${
                                  cls.isActive
                                    ? "text-yellow-600 hover:text-yellow-500"
                                    : "text-green-600 hover:text-green-500"
                                } flex items-center`}
                              >
                                {cls.isActive ? (
                                  <>
                                    <svg
                                      xmlns="http://www.w3.org/2000/svg"
                                      className="h-5 w-5 mr-1"
                                      fill="none"
                                      viewBox="0 0 24 24"
                                      stroke="currentColor"
                                    >
                                      <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth={2}
                                        d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636"
                                      />
                                    </svg>
                                    Deactivate
                                  </>
                                ) : (
                                  <>
                                    <svg
                                      xmlns="http://www.w3.org/2000/svg"
                                      className="h-5 w-5 mr-1"
                                      fill="none"
                                      viewBox="0 0 24 24"
                                      stroke="currentColor"
                                    >
                                      <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth={2}
                                        d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                                      />
                                    </svg>
                                    Activate
                                  </>
                                )}
                              </button>

                              <button
                                onClick={() => deleteClass(cls.id)}
                                className="text-red-600 hover:text-red-500 flex items-center"
                              >
                                <svg
                                  xmlns="http://www.w3.org/2000/svg"
                                  className="h-5 w-5 mr-1"
                                  fill="none"
                                  viewBox="0 0 24 24"
                                  stroke="currentColor"
                                >
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                                  />
                                </svg>
                                Delete
                              </button>
                            </div>
                          </td>
                        </>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ViewClassesPreview;