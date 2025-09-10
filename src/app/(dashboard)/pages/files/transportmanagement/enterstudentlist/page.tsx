"use client";
import React, { useState, useEffect, ChangeEvent, useCallback } from 'react';
import { env } from '@/env';
import { AlertCircle, CheckCircle, XCircle, Search } from 'lucide-react';
import { debounce } from 'lodash';

// Define the API base URL
const API_BASE_URL = `${env.BACKEND_API_URL}/api/v1`;

interface RouteInfo {
  id: string;
  routeCode: string;
  routeName: string;
  dayOfWeek: string;
  startTime: string;
  routeFare: string;
}

interface Student {
  id: string;
  name: string;
  className: string;
}

interface FormData {
  studentId: string;
  studentName: string;
  studentClass: string;
  homeArea: string;
  studentRoute: string;
  studentDiscount: string;
  amountPaid: string;
}

interface StudentRecord extends FormData {
  routeName: string;
  routeSchedule: string;
  routeFare: number;
  balance: number;
}

const StudentRouteRegistration: React.FC = () => {
  const [formData, setFormData] = useState<FormData>({
    studentId: '',
    studentName: '',
    studentClass: '',
    homeArea: '',
    studentRoute: '',
    studentDiscount: '',
    amountPaid: ''
  });
  
  const [routes, setRoutes] = useState<RouteInfo[]>([]);
  const [balance, setBalance] = useState<number>(0);
  const [students, setStudents] = useState<StudentRecord[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [showSuccess, setShowSuccess] = useState<boolean>(false);
  const [selectedRoute, setSelectedRoute] = useState<RouteInfo | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [allStudents, setAllStudents] = useState<Student[]>([]);

  const fetchWithAuth = useCallback(async (endpoint: string, options: RequestInit = {}): Promise<any> => {
    try {
      const token = localStorage.getItem('accessToken');
      if (!token) {
        throw new Error("Authentication required");
      }

      console.log(`Making request to: ${API_BASE_URL}${endpoint}`);

      const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        ...options,
        headers: {
          ...options.headers,
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText);
      }

      return await response.json();
    } catch (error) {
      console.error(`Fetch error for ${endpoint}:`, error);
      throw error;
    }
  }, []);

  // Fetch routes
  useEffect(() => {
    const fetchRoutes = async () => {
      try {
        setLoading(true);
        // Using the correct endpoint for routes
        const response = await fetchWithAuth('/transport/routes');
        
        if (response && response.status && response.status.returnCode === "00") {
          if (response.data && response.data.routes) {
            setRoutes(response.data.routes);
            console.log('Routes loaded:', response.data.routes.length);
          } else {
            console.warn('Routes data not in expected format:', response);
            setRoutes([]);
          }
        } else {
          console.warn('Failed to fetch routes:', response);
          setRoutes([]);
        }
      } catch (err) {
        console.error('Error fetching routes:', err);
        setError(err instanceof Error ? err.message : 'Failed to fetch routes');
      } finally {
        setLoading(false);
      }
    };

    fetchRoutes();
  }, [fetchWithAuth]);

  // Fetch students
  useEffect(() => {
    const fetchStudents = async () => {
      try {
        setLoading(true);
        // Using the correct endpoint for students
        const response = await fetchWithAuth('/students/filter?page=1&pageSize=10000&status=active');
        
        if (response && response.status && response.status.returnCode === "00") {
          // Handle the API response format you shared
          if (response.data && response.data.students) {
            const formattedStudents = response.data.students.map((student: any) => ({
              id: student.id,
              name: `${student.first_name} ${student.middle_name ? student.middle_name + ' ' : ''}${student.last_name}`,
              className: student.class_assigned
            }));
            
            setAllStudents(formattedStudents);
            console.log('Students loaded:', formattedStudents.length);
          } else {
            console.warn('Students data not in expected format:', response);
            setAllStudents([]);
          }
        } else {
          console.warn('Failed to fetch students:', response);
          setAllStudents([]);
        }
      } catch (err) {
        console.error('Error fetching students:', err);
        setError(err instanceof Error ? err.message : 'Failed to fetch students');
      } finally {
        setLoading(false);
      }
    };

    fetchStudents();
  }, [fetchWithAuth]);

  // Filter students based on search query
  const filteredStudents = searchQuery.length > 0
    ? allStudents.filter(student => 
        student.name.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : [];

  const handleInputChange = (e: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { id, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [id]: value
    }));
    
    if (id === 'studentRoute') {
      const route = routes.find(r => r.id === value);
      setSelectedRoute(route || null);
    }
    
    if (id === 'studentRoute' || id === 'studentDiscount' || id === 'amountPaid') {
      updateBalance(
        id === 'studentRoute' ? value : formData.studentRoute,
        id === 'studentDiscount' ? value : formData.studentDiscount,
        id === 'amountPaid' ? value : formData.amountPaid
      );
    }
  };

  const updateBalance = (routeId: string, discount: string, amountPaid: string) => {
    const route = routes.find(r => r.id === routeId);
    if (!route) return 0;

    const routeFare = parseFloat(route.routeFare);
    const discountAmount = parseFloat(discount) || 0;
    const amountPaidValue = parseFloat(amountPaid) || 0;

    // Calculate balance: route fare - discount - amount paid
    const balance = routeFare - discountAmount - amountPaidValue;
    
    setBalance(balance);
    return balance;
  };

  const addStudent = async () => {
    if (!formData.studentId || !formData.studentClass || !formData.homeArea || !formData.studentRoute || !formData.amountPaid) {
      setError("Please fill in all required fields before adding a student.");
      return;
    }

    try {
      setLoading(true);
      setError(null);
      
      // Get the selected route for studentRoute name
      const selectedRoute = routes.find(r => r.id === formData.studentRoute);
      if (!selectedRoute) {
        throw new Error("Selected route not found");
      }

      // Using the correct endpoint for student registration
      const response = await fetchWithAuth('/transport/student-registration', {
        method: 'POST',
        body: JSON.stringify({
          studentId: formData.studentId,
          routeId: formData.studentRoute,
          studentName: formData.studentName,
          studentClass: formData.studentClass,
          homeArea: formData.homeArea,
          studentRoute: formData.homeArea, // Using homeArea as studentRoute as requested
          studentDiscount: parseFloat(formData.studentDiscount) || 0,
          amountPaid: parseFloat(formData.amountPaid) || 0
        })
      });

      console.log('Registration response:', response);

      if (response && response.status && response.status.returnCode === "00") {
        const newStudent: StudentRecord = {
          ...formData,
          routeName: selectedRoute.routeName,
          routeSchedule: `${selectedRoute.dayOfWeek} - ${selectedRoute.startTime}`,
          routeFare: parseFloat(selectedRoute.routeFare),
          balance
        };
        
        setStudents(prev => [...prev, newStudent]);
        setFormData({
          studentId: '',
          studentName: '',
          studentClass: '',
          homeArea: '',
          studentRoute: '',
          studentDiscount: '',
          amountPaid: ''
        });
        setBalance(0);
        setSelectedRoute(null);
        setSearchQuery('');
        setShowSuccess(true);
        setTimeout(() => setShowSuccess(false), 3000);
      } else {
        throw new Error(response?.status?.returnMessage || 'Failed to add student');
      }
    } catch (err) {
      console.error('Error adding student:', err);
      setError(err instanceof Error ? err.message : 'Failed to add student');
    } finally {
      setLoading(false);
    }
  };

  // Function to handle form submission when pressing Enter
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addStudent();
    }
  };

  // Debug function to log information about loaded data
  // const debugInfo = () => {
  //   console.log('Current State:');
  //   console.log('Routes:', routes);
  //   console.log('Students:', allStudents);
  //   console.log('Form Data:', formData);
  // };

  return (
    <div className="max-w-4xl mx-auto p-6 bg-white rounded-lg shadow-lg">
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold text-gray-800">Student Route Registration Details</h2>
        {/* {process.env.NODE_ENV === 'development' && (
          <button 
            onClick={debugInfo} 
            className="text-xs text-gray-500 hover:text-gray-700 mt-2"
          >
            Debug Info
          </button>
        )} */}
      </div>

      {/* API Status */}
      {loading && (
        <div className="mb-4 p-2 bg-blue-50 text-blue-700 rounded flex items-center gap-2">
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-700"></div>
          <span>Loading data...</span>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="mb-4 p-4 bg-red-100 border border-red-400 text-red-700 rounded flex items-center gap-2">
          <AlertCircle className="h-5 w-5" />
          {error}
        </div>
      )}

      {/* Success Message */}
      {showSuccess && (
        <div className="mb-4 p-4 bg-green-100 border border-green-400 text-green-700 rounded flex items-center gap-2">
          <CheckCircle className="h-5 w-5" />
          Student registered successfully!
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
        <div className="flex flex-col">
          <label className="mb-1 text-sm font-medium text-gray-700" htmlFor="studentSearch">
            Student <span className="text-red-500">*</span>
          </label>
          <div className="relative">
            <input
              type="text"
              id="searchQuery"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              className="p-2 border rounded focus:ring-2 focus:ring-blue-500 pr-8 w-full"
              placeholder="Search student..."
            />
            <Search className="absolute right-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            
            {searchQuery.length > 0 && filteredStudents.length === 0 && (
              <div className="absolute z-10 w-64 mt-1 bg-white rounded shadow-md p-2 text-sm text-gray-500">
                No students found matching {searchQuery}
              </div>
            )}
            
            {filteredStudents.length > 0 && searchQuery.length > 0 && (
              <div className="absolute z-10 w-64 mt-1 bg-white rounded shadow-md max-h-48 overflow-auto">
                {filteredStudents.map((student) => (
                  <div
                    key={student.id}
                    className="p-2 hover:bg-gray-100 cursor-pointer border-b last:border-b-0"
                    onClick={() => {
                      setFormData(prev => ({
                        ...prev,
                        studentId: student.id,
                        studentName: student.name,
                        studentClass: student.className
                      }));
                      setSearchQuery('');
                    }}
                  >
                    <div className="text-sm">
                      <div className="font-medium">{student.name}</div>
                      <div className="text-xs text-gray-500">{student.className}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
          
          {formData.studentName && (
            <div className="mt-2 p-2 bg-blue-50 text-blue-700 rounded text-sm">
              Selected: {formData.studentName}
            </div>
          )}
        </div>
        
        <div className="flex flex-col">
          <label className="mb-1 text-sm font-medium text-gray-700" htmlFor="studentClass">
            Class <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            id="studentClass"
            value={formData.studentClass}
            className="p-2 border rounded focus:ring-2 focus:ring-blue-500 bg-gray-50"
            placeholder="Class"
            readOnly
          />
        </div>
        
        <div className="flex flex-col">
          <label className="mb-1 text-sm font-medium text-gray-700" htmlFor="homeArea">
            Home Area <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            id="homeArea"
            value={formData.homeArea}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            className="p-2 border rounded focus:ring-2 focus:ring-blue-500"
            placeholder="Home Area"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        <div className="flex flex-col">
          <label className="mb-1 text-sm font-medium text-gray-700" htmlFor="studentRoute">
            Select Route <span className="text-red-500">*</span>
          </label>
          <select
            id="studentRoute"
            value={formData.studentRoute}
            onChange={handleInputChange}
            className="p-2 border rounded focus:ring-2 focus:ring-blue-500"
          >
            <option value="">-- Select Route --</option>
            {routes.map(route => (
              <option key={route.id} value={route.id}>
                {route.routeCode} - {route.routeName}
              </option>
            ))}
          </select>
          {routes.length === 0 && (
            <div className="mt-1 text-xs text-yellow-600">
              No routes available. Please add routes first.
            </div>
          )}
        </div>
        
        <div className="flex flex-col">
          <label className="mb-1 text-sm font-medium text-gray-700" htmlFor="studentDiscount">
            Discount Amount (UGX)
          </label>
          <input
            type="number"
            id="studentDiscount"
            value={formData.studentDiscount}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            className="p-2 border rounded focus:ring-2 focus:ring-blue-500"
            placeholder="Discount"
            min="0"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        <div className="flex flex-col">
          <label className="mb-1 text-sm font-medium text-gray-700" htmlFor="amountPaid">
            Amount Paid <span className="text-red-500">*</span>
          </label>
          <input
            type="number"
            id="amountPaid"
            value={formData.amountPaid}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            className="p-2 border rounded focus:ring-2 focus:ring-blue-500"
            placeholder="Amount Paid"
          />
        </div>
        
        <div className="flex flex-col">
          <label className="mb-1 text-sm font-medium text-gray-700" htmlFor="balance">
            Balance
          </label>
          <input
            type="number"
            id="balance"
            value={balance}
            className="p-2 border rounded bg-gray-50"
            placeholder="Balance"
            readOnly
          />
        </div>
      </div>

      {selectedRoute && (
        <div className="bg-gray-50 p-4 rounded mb-4 border-l-4 border-blue-500">
          <h4 className="font-medium mb-2">Route Information:</h4>
          <div className="text-sm text-gray-600 grid grid-cols-2 gap-2">
            <p><strong>Code:</strong> {selectedRoute.routeCode}</p>
            <p><strong>Name:</strong> {selectedRoute.routeName}</p>
            <p><strong>Days:</strong> {selectedRoute.dayOfWeek}</p>
            <p><strong>Time:</strong> {selectedRoute.startTime}</p>
            <p><strong>Fare:</strong> UGX {selectedRoute.routeFare}</p>
          </div>
        </div>
      )}

      <button
        onClick={addStudent}
        disabled={loading}
        className="w-full bg-blue-600 text-white py-2 px-4 rounded hover:bg-blue-700 transition-colors mb-4 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {loading ? (
          <>
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2 inline-block"></div>
            Adding Student...
          </>
        ) : (
          'Add Student'
        )}
      </button>

      {students.length > 0 && (
        <div className="mt-6">
          <h4 className="font-medium mb-4">Registered Students:</h4>
          <div className="space-y-4">
            {students.map((student, index) => (
              <div key={index} className="bg-gray-50 p-4 rounded border border-gray-200">
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-sm">
                  <span><strong>Name:</strong> {student.studentName}</span>
                  <span><strong>Class:</strong> {student.studentClass}</span>
                  <span><strong>Area:</strong> {student.homeArea}</span>
                  <span><strong>Route:</strong> {student.routeName}</span>
                  <span><strong>Schedule:</strong> {student.routeSchedule}</span>
                  <span><strong>Fare:</strong> UGX {student.routeFare}</span>
                  <span><strong>Discount:</strong> {student.studentDiscount}</span>
                  <span><strong>Paid:</strong> UGX {student.amountPaid}</span>
                  <span><strong>Balance:</strong> UGX {student.balance}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default StudentRouteRegistration;