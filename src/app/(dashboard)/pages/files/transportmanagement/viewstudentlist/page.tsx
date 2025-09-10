"use client";
import React, { useState, useEffect, ChangeEvent, useRef } from 'react';
import Image from 'next/image';
import { AlertCircle, CheckCircle, XCircle, Search } from 'lucide-react';
import DialogBox from '@/components/Dailogbox';
import { env } from '@/env';

// Define the API base URL
const API_BASE_URL = `${env.BACKEND_API_URL}/api/v1`;

interface StudentRegistration {
  id: string;
  studentId: string;
  routeId: string;
  studentName: string;
  studentClass: string;
  homeArea: string;
  studentRoute: string;
  studentDiscount: string;
  amountPaid: string;
  balance: string;
  routeName: string;
  routeSchedule: string;
  routeFare: string;
  createdAt: string;
  updatedAt: string;
  createdById: string;
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
    registrations: StudentRegistration[];
  };
}

interface Route {
  id: string;
  name: string;
  fare: string;
  schedule: string;
}

const StudentRoutesList = () => {
  const [students, setStudents] = useState<StudentRegistration[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [editData, setEditData] = useState<StudentRegistration | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [routes, setRoutes] = useState<Route[]>([]);
  const [loadingRoutes, setLoadingRoutes] = useState(true);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    const fetchStudents = async () => {
      try {
        setLoading(true);
        const token = localStorage.getItem('accessToken');
        if (!token) {
          throw new Error("Authentication required");
        }

        const response = await fetch(`${API_BASE_URL}/transport/student-registrations`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });

        if (!response.ok) {
          throw new Error('Failed to fetch students');
        }

        const data: ApiResponse = await response.json();
        
        if (data.status.returnCode === "00") {
          setStudents(data.data.registrations);
        } else {
          throw new Error(data.status.returnMessage);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load student data');
        console.error('Error fetching students:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchStudents();
  }, []);

  useEffect(() => {
    const fetchRoutes = async () => {
      try {
        setLoadingRoutes(true);
        const token = localStorage.getItem('accessToken');
        if (!token) {
          throw new Error("Authentication required");
        }

        const response = await fetch(`${API_BASE_URL}/transport/routes`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });

        if (!response.ok) {
          throw new Error('Failed to fetch routes');
        }

        const data = await response.json();
        if (data.status.returnCode === "00" && data.data.routes) {
          // Transform the routes to match the Route interface
          const formattedRoutes: Route[] = data.data.routes.map((route: any) => ({
            id: route.id,
            name: route.routeName,
            fare: route.routeFare,
            schedule: `${route.dayOfWeek} - ${route.startTime}`
          }));
          setRoutes(formattedRoutes);
        }
      } catch (err) {
        console.error('Error fetching routes:', err);
      } finally {
        setLoadingRoutes(false);
      }
    };

    fetchRoutes();
  }, []);

  const filteredStudents = students.filter(student =>
    student.studentName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    student.studentClass.toLowerCase().includes(searchQuery.toLowerCase()) ||
    student.homeArea.toLowerCase().includes(searchQuery.toLowerCase()) ||
    student.routeName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const formatFare = (fare: string): string => {
    const rawValue = fare.replace(/UGX\s?/g, "").replace(/,/g, "").trim();
    if (!isNaN(Number(rawValue))) {
      return Number(rawValue).toLocaleString();
    }
    return fare;
  };

  const handleSearch = (e: ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
  };

  const handleEdit = (student: StudentRegistration) => {
    setEditData(student);
    setIsEditDialogOpen(true);
    if (dialogRef.current) {
      dialogRef.current.showModal();
    }
  };

  const handleEditChange = (field: keyof StudentRegistration, value: string) => {
    if (editData) {
      // Create a new object with the updated field
      const updatedData = { ...editData, [field]: value };
      
      // When numeric fields change, recalculate balance
      if (field === 'routeFare' || field === 'studentDiscount' || field === 'amountPaid') {
        const fare = parseFloat(updatedData.routeFare);
        const discount = parseFloat(updatedData.studentDiscount) || 0;
        const amountPaid = parseFloat(updatedData.amountPaid) || 0;
        
        // Calculate balance: route fare - discount - amount paid
        const balance = Math.max(0, fare - discount - amountPaid).toString();
        
        // Update the entire editData state with new balance
        setEditData({
          ...updatedData,
          balance
        });
        return;
      }
      
      // For non-numeric fields, just update the state
      setEditData(updatedData);
    }
  };

  const handleRouteChange = (e: ChangeEvent<HTMLSelectElement>) => {
    const selectedRoute = routes.find(route => route.id === e.target.value);
    
    if (selectedRoute && editData) {
      const updatedData = {
        ...editData,
        routeId: e.target.value,
        routeName: selectedRoute.name,
        routeFare: selectedRoute.fare,
        routeSchedule: selectedRoute.schedule
      };
      
      // Calculate balance using the new simplified formula
      const fare = parseFloat(updatedData.routeFare);
      const discount = parseFloat(editData.studentDiscount) || 0;
      const amountPaid = parseFloat(editData.amountPaid) || 0;
      const balance = Math.max(0, fare - discount - amountPaid).toString();
      
      setEditData({
        ...updatedData,
        balance
      });
    }
  };

  const handleSave = async () => {
    if (!editData) return;

    try {
      const token = localStorage.getItem('accessToken');
      if (!token) {
        throw new Error("Authentication required");
      }

      const response = await fetch(`${API_BASE_URL}/transport/student-registration/${editData.id}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          ...editData,
          studentDiscount: parseFloat(editData.studentDiscount).toString(),
          amountPaid: parseFloat(editData.amountPaid).toString(),
          routeFare: parseFloat(editData.routeFare).toString()
        })
      });

      if (!response.ok) {
        throw new Error('Failed to update student');
      }

      const data = await response.json();
      if (data.status.returnCode === "00") {
        setStudents(prev => 
          prev.map(student => 
            student.id === editData.id ? { ...editData } : student
          )
        );
        setEditData(null);
        setIsEditDialogOpen(false);
        if (dialogRef.current) {
          dialogRef.current.close();
        }
        
        // Show success message
        setSuccessMessage("Student registration updated successfully");
        setTimeout(() => setSuccessMessage(null), 3000);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update student');
      console.error('Error updating student:', err);
    }
  };

  const handleDelete = async (id: string) => {
    setSelectedStudentId(id);
    setShowDeleteDialog(true);
  };

  const handleDeleteConfirm = async () => {
    if (!selectedStudentId) return;

    try {
      const token = localStorage.getItem('accessToken');
      if (!token) {
        throw new Error("Authentication required");
      }

      const response = await fetch(`${API_BASE_URL}/transport/student-registration/${selectedStudentId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error('Failed to delete student');
      }

      const data = await response.json();
      if (data.status.returnCode === "00") {
        setStudents(prev => prev.filter(student => student.id !== selectedStudentId));
        setSelectedStudentId(null);
        setShowDeleteDialog(false);
        
        // Show success message
        setSuccessMessage("Student registration deleted successfully");
        setTimeout(() => setSuccessMessage(null), 3000);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete student');
      console.error('Error deleting student:', err);
      setShowDeleteDialog(false);
      setSelectedStudentId(null);
    }
  };

  const handleDeleteCancel = () => {
    setShowDeleteDialog(false);
    setSelectedStudentId(null);
  };

  const handleCloseDialog = () => {
    setEditData(null);
    setIsEditDialogOpen(false);
    if (dialogRef.current) {
      dialogRef.current.close();
    }
  };

  return (
    <div className="max-w-6xl mx-auto bg-white shadow-md rounded-lg p-6">
      {/* Loading/Error State */}
      {loading && (
        <div className="text-center py-6">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p>Loading student data...</p>
        </div>
      )}

      {error && (
        <div className="bg-red-50 text-red-700 p-4 rounded mb-4 flex items-center gap-2">
          <XCircle className="h-5 w-5" />
          {error}
        </div>
      )}

      {/* Success Message */}
      {successMessage && (
        <div className="bg-green-50 text-green-700 p-4 rounded mb-4 flex items-center gap-2">
          <CheckCircle className="h-5 w-5" />
          {successMessage}
        </div>
      )}

      {/* Header Section */}
      <div className="text-center mb-6">
        <h1 className="text-xl font-semibold text-green-700">
          School Bus Registered Student Routes List
        </h1>
      </div>

      {/* Search Bar */}
      <div className="mb-4 relative">
        <input
          type="text"
          placeholder="Search for a student by Typing Student Name..."
          className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring focus:ring-green-300 pr-8"
          value={searchQuery}
          onChange={handleSearch}
        />
        <Search className="absolute right-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
      </div>

      {/* "No Data" Message */}
      {filteredStudents.length === 0 && !loading && (
        <div className="text-red-500 text-center mb-4">
          No matching students found.
        </div>
      )}

      {/* Table - Desktop Only */}
      <div className="overflow-x-auto hidden lg:block">
        <table className="w-full text-left border-collapse">
          <thead className="bg-green-100 text-green-700">
            <tr>
              <th className="p-3 border-b">No</th>
              <th className="p-3 border-b">Name</th>
              <th className="p-3 border-b">Class</th>
              <th className="p-3 border-b">Home Area</th>
              <th className="p-3 border-b">Route</th>
              <th className="p-3 border-b">Fare</th>
              <th className="p-3 border-b">Discount</th>
              <th className="p-3 border-b">Paid</th>
              <th className="p-3 border-b">Balance</th>
              <th className="p-3 border-b">Schedule</th>
              <th className="p-3 border-b">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredStudents.map((student, index) => (
              <tr key={student.id} className="odd:bg-white even:bg-gray-50">
                <td className="p-3 border-b">{index + 1}</td>
                <td className="p-3 border-b">{student.studentName}</td>
                <td className="p-3 border-b">{student.studentClass}</td>
                <td className="p-3 border-b">{student.homeArea}</td>
                <td className="p-3 border-b">{student.routeName}</td>
                <td className="p-3 border-b">{formatFare(student.routeFare)}</td>
                <td className="p-3 border-b">{formatFare(student.studentDiscount)}</td>
                <td className="p-3 border-b">{formatFare(student.amountPaid)}</td>
                <td className="p-3 border-b">{formatFare(student.balance)}</td>
                <td className="p-3 border-b">{student.routeSchedule}</td>
                <td className="p-3 border-b">
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleEdit(student)}
                      className="bg-yellow-500 text-white px-3 py-2 rounded-md hover:bg-yellow-600 flex items-center gap-2"
                    >
                      <Search className="h-4 w-4" />
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(student.id)}
                      className="bg-red-500 text-white px-3 py-2 rounded-md hover:bg-red-600 flex items-center gap-2"
                    >
                      <XCircle className="h-4 w-4" />
                      Delete
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Responsive Cards - Tablet (md:grid md:grid-cols-2 lg:hidden) */}
      <div className="hidden md:grid md:grid-cols-2 gap-4 mb-6 lg:hidden">
        {filteredStudents.map((student, index) => (
          <div key={student.id} className="bg-white rounded-lg shadow border border-gray-200 p-4 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-lg font-semibold text-gray-800">{student.studentName}</span>
                <span className="text-xs text-gray-500">#{index + 1}</span>
              </div>
              <div className="mb-1"><span className="font-medium text-gray-700">Class: </span><span className="text-gray-600 text-sm">{student.studentClass}</span></div>
              <div className="mb-1"><span className="font-medium text-gray-700">Home Area: </span><span className="text-gray-600 text-sm">{student.homeArea}</span></div>
              <div className="mb-1"><span className="font-medium text-gray-700">Route: </span><span className="text-gray-600 text-sm">{student.routeName}</span></div>
              <div className="mb-1"><span className="font-medium text-gray-700">Fare: </span><span className="text-gray-600 text-sm">{formatFare(student.routeFare)}</span></div>
              <div className="mb-1"><span className="font-medium text-gray-700">Discount: </span><span className="text-gray-600 text-sm">{formatFare(student.studentDiscount)}</span></div>
              <div className="mb-1"><span className="font-medium text-gray-700">Paid: </span><span className="text-gray-600 text-sm">{formatFare(student.amountPaid)}</span></div>
              <div className="mb-1"><span className="font-medium text-gray-700">Balance: </span><span className="text-gray-600 text-sm">{formatFare(student.balance)}</span></div>
              <div className="mb-2"><span className="font-medium text-gray-700">Schedule: </span><span className="text-gray-600 text-sm">{student.routeSchedule}</span></div>
            </div>
            <div className="flex gap-2 mt-2">
              <button
                onClick={() => handleEdit(student)}
                className="bg-yellow-500 text-white px-4 py-1 rounded-md hover:bg-yellow-600 w-full flex items-center gap-2"
              >
                <Search className="h-4 w-4" />
                Edit
              </button>
              <button
                onClick={() => handleDelete(student.id)}
                className="bg-red-500 text-white px-4 py-1 rounded-md hover:bg-red-600 w-full flex items-center gap-2"
              >
                <XCircle className="h-4 w-4" />
                Delete
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Responsive Cards - Mobile (md:hidden) */}
      <div className="md:hidden mb-6 flex flex-col gap-4">
        {filteredStudents.map((student, index) => (
          <div key={student.id} className="bg-white rounded-lg shadow border border-gray-200 p-4 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-base font-semibold text-gray-800">{student.studentName}</span>
                <span className="text-xs text-gray-500">#{index + 1}</span>
              </div>
              <div className="mb-1"><span className="font-medium text-gray-700">Class: </span><span className="text-gray-600 text-sm">{student.studentClass}</span></div>
              <div className="mb-1"><span className="font-medium text-gray-700">Home Area: </span><span className="text-gray-600 text-sm">{student.homeArea}</span></div>
              <div className="mb-1"><span className="font-medium text-gray-700">Route: </span><span className="text-gray-600 text-sm">{student.routeName}</span></div>
              <div className="mb-1"><span className="font-medium text-gray-700">Fare: </span><span className="text-gray-600 text-sm">{formatFare(student.routeFare)}</span></div>
              <div className="mb-1"><span className="font-medium text-gray-700">Discount: </span><span className="text-gray-600 text-sm">{formatFare(student.studentDiscount)}</span></div>
              <div className="mb-1"><span className="font-medium text-gray-700">Paid: </span><span className="text-gray-600 text-sm">{formatFare(student.amountPaid)}</span></div>
              <div className="mb-1"><span className="font-medium text-gray-700">Balance: </span><span className="text-gray-600 text-sm">{formatFare(student.balance)}</span></div>
              <div className="mb-2"><span className="font-medium text-gray-700">Schedule: </span><span className="text-gray-600 text-sm">{student.routeSchedule}</span></div>
            </div>
            <div className="flex gap-2 mt-2">
              <button
                onClick={() => handleEdit(student)}
                className="bg-yellow-500 text-white px-4 py-1 rounded-md hover:bg-yellow-600 w-full flex items-center gap-2"
              >
                <Search className="h-4 w-4" />
                Edit
              </button>
              <button
                onClick={() => handleDelete(student.id)}
                className="bg-red-500 text-white px-4 py-1 rounded-md hover:bg-red-600 w-full flex items-center gap-2"
              >
                <XCircle className="h-4 w-4" />
                Delete
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Delete Confirmation Dialog */}
      <DialogBox
        isOpen={showDeleteDialog}
        title="Delete Student Registration"
        message="Are you sure you want to delete this student's registration? This action cannot be undone."
        onConfirm={handleDeleteConfirm}
        onCancel={handleDeleteCancel}
        confirmText="Delete"
        cancelText="Cancel"
        type="delete"
      />

      {/* Edit Dialog */}
      <dialog 
        ref={dialogRef}
        className="modal"
        onClose={handleCloseDialog}
      >
        <div className="modal-box max-w-2xl w-full bg-white rounded-lg shadow-xl border border-gray-100 overflow-hidden">
          <div className="bg-gradient-to-r from-blue-500 to-green-500 text-white p-4 rounded-t-lg">
            <h3 className="text-xl font-semibold">Edit Student Registration</h3>
          </div>
          
          <div className="p-6 space-y-6">
            {editData && (
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Student Name</label>
                  <input
                    type="text"
                    value={editData.studentName}
                    readOnly
                    className="w-full p-3 border border-gray-300 rounded-lg bg-gray-50 cursor-not-allowed focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Class</label>
                  <input
                    type="text"
                    value={editData.studentClass}
                    readOnly
                    className="w-full p-3 border border-gray-300 rounded-lg bg-gray-50 cursor-not-allowed focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Home Area</label>
                  <input
                    type="text"
                    value={editData.homeArea}
                    onChange={(e) => handleEditChange('homeArea', e.target.value)}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                    placeholder="Enter home area"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Route</label>
                  <div className="relative">
                    <select
                      value={editData.routeId}
                      onChange={handleRouteChange}
                      disabled={loadingRoutes}
                      className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 bg-white"
                    >
                      <option value="">Select a route</option>
                      {routes.map(route => (
                        <option key={route.id} value={route.id}>
                          {route.name} - {route.fare} UGX
                        </option>
                      ))}
                    </select>
                    {loadingRoutes && (
                      <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500"></div>
                      </div>
                    )}
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Fare</label>
                  <input
                    type="number"
                    value={editData.routeFare}
                    readOnly
                    className="w-full p-3 border border-gray-300 rounded-lg bg-gray-50 cursor-not-allowed focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Discount Amount</label>
                  <input
                    type="number"
                    value={editData.studentDiscount}
                    onChange={(e) => handleEditChange('studentDiscount', e.target.value)}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                    placeholder="Enter discount amount"
                    min="0"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Amount Paid (UGX)</label>
                  <input
                    type="number"
                    value={editData.amountPaid}
                    onChange={(e) => handleEditChange('amountPaid', e.target.value)}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                    placeholder="Enter amount paid"
                    min="0"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Balance (UGX)</label>
                  <input
                    type="number"
                    value={editData.balance}
                    readOnly
                    className="w-full p-3 border border-gray-300 rounded-lg bg-gray-50 cursor-not-allowed focus:outline-none"
                  />
                </div>
              </div>
            )}

            <div className="flex justify-end gap-4 mt-6">
              <button 
                className="px-6 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-all duration-200"
                onClick={handleCloseDialog}
              >
                Cancel
              </button>
              <button 
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all duration-200 flex items-center gap-2"
                onClick={handleSave}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                Save Changes
              </button>
            </div>
          </div>
        </div>
      </dialog>
    </div>
  );
};

export default StudentRoutesList;