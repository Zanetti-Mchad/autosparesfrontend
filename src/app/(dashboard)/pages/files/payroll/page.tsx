'use client';

import { env } from '@/env';
import * as XLSX from 'xlsx';

// Utility functions
const parseNumber = (value: string | number | null | undefined): number => {
  if (value === null || value === undefined || value === '') return 0;
  if (typeof value === 'number') return value;
  // Remove commas and convert to number
  return parseFloat(String(value).replace(/,/g, '')) || 0;
};

const safeNumber = (value: number | string | null | undefined): number => {
  if (value === null || value === undefined || value === '') return 0;
  if (typeof value === 'string') return parseNumber(value);
  return value;
};

const formatNumber = (num: number | string | null | undefined): string => {
  // Handle null, undefined, or empty values
  if (num === null || num === undefined || num === '') return '0';
  
  // Convert to number if it's a string
  const numericValue = typeof num === 'string' ? parseFloat(num.replace(/,/g, '')) : num;
  
  // Handle NaN
  if (isNaN(numericValue)) return '0';
  
  // Format the number
  return new Intl.NumberFormat('en-US').format(numericValue);
};

import React, { useState, useEffect, useCallback } from 'react';
import { Search } from 'lucide-react';

// Define types for StaffMember
type StaffMember = {
  id: string;
  first_name: string;
  last_name: string;
  middle_name?: string;
  email?: string;
  account_number?: string;
  name_of_bank?: string;
  phone?: string;
  mobile_money_number?: string;
  registered_name?: string;
  salary: string;
  utility: string;
  section?: string;
  role?: string;
  stationary?: number;
  allowance?: number;
  advance?: number;
  paid?: number;
  comments?: string;
  _originalIndex?: number; // Added to track original index
};

interface Category {
  category: string;
  staff: StaffMember[];
}

interface Totals {
  salary: number;
  utility: number;
  stationary: number;
  allowance: number;
  advance: number;
  paid: number;
  balance: number;
}

interface AcademicYear {
  id: string;
  year: string;
  isActive: boolean;
}

interface Term {
  id: string;
  name: string;
}

// New interface for saved payroll data
interface SavedPayroll {
  month: string;
  year: number;
  data: Category[];
  academicYearId: string | null;
  termId: string | null;
}

interface AvailablePayroll {
  id: string;
  month: string;
  year: number;
  academicYearId: string | null;
  termId: string | null;
  academicYear?: {
    year: string;
  };
  term?: {
    name: string;
  };
}

interface User {
  id: string;
  first_name: string;
  last_name: string;
  middle_name?: string;
  email: string;
  account_number: string;
  name_of_bank: string;
  phone: string;
  mobile_money_number: string;
  registered_name: string;
  salary: string;
  utility: string;
  section?: string;
  role: string;
}

declare global {
  interface Window {
    XLSX: any;
  }
}

const months = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

const PayrollPage: React.FC = () => {
  // --- Auth check logic ---
  useEffect(() => {
    const accessToken = localStorage.getItem('accessToken');
    if (!accessToken) {
      window.location.href = '/sign-in'; // Redirect to sign-in if no token
      return;
    }
  }, []);
  // --- End auth check ---

  const [activeTab, setActiveTab] = useState<'bankAccounts' | 'mobileMoney'>('bankAccounts');
  const [selectedMonth, setSelectedMonth] = useState<string>(new Date().toLocaleString('default', { month: 'long' }));
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  
  // Generate array of recent years
  const years = Array.from({ length: 5 }, (_, i) => selectedYear - i);

  const [staffData, setStaffData] = useState<Category[]>([]);
  const [isEditing, setIsEditing] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [currentTerm, setCurrentTerm] = useState<Term | null>(null);
  const [currentAcademicYear, setCurrentAcademicYear] = useState<AcademicYear | null>(null);
  
  // New states for managing saved payrolls
  const [savedPayrolls, setSavedPayrolls] = useState<SavedPayroll[]>([]);
  const [currentPayrollExists, setCurrentPayrollExists] = useState<boolean>(false);
  const [availablePayrolls, setAvailablePayrolls] = useState<AvailablePayroll[]>([]);

  // Add a new state for notifications
  const [notification, setNotification] = useState<{ message: string; type: 'success' | 'error' | 'note' | null }>({ message: '', type: null });

  // Function to fetch available payrolls from the API
  const fetchAvailablePayrolls = useCallback(async () => {
    const accessToken = localStorage.getItem('accessToken');
    if (!accessToken) return;

    setLoading(true); // Start loading
    try {
      const response = await fetch(`${env.BACKEND_API_URL}/api/v1/payrolls/filter`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) throw new Error('Failed to fetch payrolls');

      const data = await response.json();
      console.log("Available payrolls:", data);

      if (data.status && data.status.returnCode === "00" && data.data && data.data.payrolls) {
        const payrollsList = data.data.payrolls.map((payroll: any) => ({
          id: payroll.id,
          month: payroll.month,
          year: payroll.year,
          academicYearId: payroll.academicYearId,
          termId: payroll.termId,
          academicYear: payroll.academicYear || null,
          term: payroll.term || null
        }));

        setAvailablePayrolls(payrollsList);
      }
    } catch (error) {
      console.error("Error fetching available payrolls:", error);
      setError("Failed to load available payrolls.");
    } finally {
      setLoading(false); // Stop loading
    }
  }, []);

  // Function to fetch staff data from API
  const fetchStaffData = useCallback(async () => {
    const accessToken = localStorage.getItem('accessToken');
    if (!accessToken) return;

    setLoading(true); // Start loading
    setError(null);
    try {
        const response = await fetch(`${env.BACKEND_API_URL}/api/v1/integration/users?status=active&page=1&pageSize=1000`, {
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            }
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const responseData = await response.json();
        console.log("Response Data:", responseData); // Log the response data

        let users: User[] = [];
        if (responseData.data && responseData.data.users) {
            // Filter out the system admin account
            users = responseData.data.users.filter((user: User) => user.id !== "a5da15ff-88b2-4b37-a14e-ec3d0e4cfd35");

            // Check if users array is empty
            if (users.length === 0) {
                setError('No staff members found. Please add staff members first.');
                setLoading(false);
                return; // Exit early if no users
            }
        } else {
            console.error('Unexpected API response structure:', JSON.stringify(responseData, null, 2));
            throw new Error('API response does not contain users data');
        }
        
        // Process and organize staff data by sections
        const sections = new Map<string, StaffMember[]>();
        
        users.forEach((user: any) => {
            const section = user.section || 'Uncategorized';
            if (!sections.has(section)) {
                sections.set(section, []);
            }
            
            const staffMember: StaffMember = {
                id: user.id,
                first_name: user.first_name || '',
                last_name: user.last_name || '',
                middle_name: user.middle_name || '',
                email: user.email,
                account_number: user.account_number || '',
                name_of_bank: user.name_of_bank || '',
                phone: user.phone || '',
                mobile_money_number: user.mobile_money_number || '',
                registered_name: user.registered_name || '',
                salary: user.salary || '0',
                utility: user.utility || '0',
                section: section,
                role: user.role || '',
                stationary: 0,
                allowance: 0,
                advance: 0,
                paid: 0,
                comments: ''
            };
            
            sections.get(section)!.push(staffMember);
        });
        
        const formattedData: Category[] = Array.from(sections.entries()).map(([category, staff]) => ({
            category,
            staff
        }));
        
        setStaffData(formattedData); // Set the processed staff data

        // Only fetch academic year and term info if they aren't already set for the current month/year
        const existingServerPayroll = availablePayrolls.find(
            payroll => payroll.month === selectedMonth.toUpperCase() && payroll.year === selectedYear
        );
        
        if (!existingServerPayroll) {
            // Fetch current academic year (only if not already set from server data)
            const yearResponse = await fetch(`${env.BACKEND_API_URL}/api/v1/academic-years/filter`, {
                headers: {
                    'Authorization': `Bearer ${accessToken}`,
                    'Content-Type': 'application/json'
                }
            });

            const yearData = await yearResponse.json();
            
            if (yearData.success) {
                const activeYear = yearData.years.find((year: AcademicYear) => year.isActive);
                setCurrentAcademicYear(activeYear ? activeYear : null);
            }

            // Fetch current term (only if not already set from server data)
            const termResponse = await fetch(`${env.BACKEND_API_URL}/api/v1/term/active`, {
                headers: {
                    'Authorization': `Bearer ${accessToken}`,
                    'Content-Type': 'application/json'
                }
            });

            const termData = await termResponse.json();
            
            if (termData.success && termData.term) {
                setCurrentTerm(termData.term);
            } else {
                setCurrentTerm(null);
            }
        }

        console.log("Formatted Staff Data:", formattedData);
    } catch (err) {
        console.error('Error fetching staff data:', err);
        setError('Failed to load staff data. Please try again later.');
    } finally {
        setLoading(false); // Stop loading
    }
}, [selectedMonth, selectedYear, availablePayrolls]);

  // Load saved payrolls from localStorage and fetch available payrolls from API
  useEffect(() => {
    const savedPayrollsData = localStorage.getItem("savedPayrolls");
    if (savedPayrollsData) {
      try {
        const parsedPayrolls = JSON.parse(savedPayrollsData) as SavedPayroll[];
        setSavedPayrolls(parsedPayrolls);
      } catch (err) {
        console.error("Error parsing saved payrolls", err);
      }
    }
    
    // Fetch available payrolls from the server
    fetchAvailablePayrolls();
  }, [fetchAvailablePayrolls]);
  
  // Add this helper function to handle server payroll loading
  const handleLoadServerPayroll = useCallback((payroll: AvailablePayroll) => {
    // Update academic year and term if they exist
    if (payroll.academicYearId) {
      setCurrentAcademicYear({
        id: payroll.academicYearId,
        year: payroll.academicYear?.year || '',
        isActive: true
      });
    }
    
    if (payroll.termId) {
      setCurrentTerm({
        id: payroll.termId,
        name: payroll.term?.name || ''
      });
    }
    
    // Fetch fresh staff data
    fetchStaffData();
  }, [fetchStaffData]); // Include fetchStaffData in the dependency array

  // This effect runs when month/year/payrolls change
  // Helper to merge saved payroll with latest users
  const mergeSavedPayrollWithLatestUsers = async (existingLocalPayroll: SavedPayroll) => {
    const accessToken = localStorage.getItem('accessToken');
    if (!accessToken) {
        setStaffData(existingLocalPayroll.data);
        setCurrentPayrollExists(true);
        setLoading(false);
        return;
    }
    try {
        // First, disable editing to ensure a clean state
        setIsEditing(false);
        const response = await fetch(`${env.BACKEND_API_URL}/api/v1/integration/users?page=1&pageSize=500`, {
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            }
        });
        const responseData = await response.json();
        let users: User[] = [];
        if (responseData.data && responseData.data.users) {
            // Filter out the system admin account
            users = responseData.data.users.filter((user: User) => user.id !== "a5da15ff-88b2-4b37-a14e-ec3d0e4cfd35");
        }
        console.log('[DEBUG] API users:', users.map((u: User) => u.id));

        // Flatten saved staff for lookup
        const savedStaffMap = new Map<string, StaffMember>();
        existingLocalPayroll.data.forEach(cat => {
            cat.staff.forEach(staff => {
                // Only add non-admin accounts to the saved staff map
                if (staff.id !== "a5da15ff-88b2-4b37-a14e-ec3d0e4cfd35") {
                    savedStaffMap.set(staff.id, staff);
                }
            });
        });
        console.log('[DEBUG] Saved payroll staff:', Array.from(savedStaffMap.keys()));

        // Organize merged staff by section
        const sections = new Map<string, StaffMember[]>();
        let newUserCount = 0;

        users.forEach((user: User) => { // Explicitly define user type
            const section = user.section || 'Uncategorized';
            if (!sections.has(section)) sections.set(section, []);
            let staff = savedStaffMap.get(user.id);
            if (!staff) {
                newUserCount++;
                staff = {
                    id: user.id,
                    first_name: user.first_name || '',
                    last_name: user.last_name || '',
                    middle_name: user.middle_name || '',
                    email: user.email,
                    account_number: user.account_number || '',
                    name_of_bank: user.name_of_bank || '',
                    phone: user.phone || '',
                    mobile_money_number: user.mobile_money_number || '',
                    registered_name: user.registered_name || '',
                    salary: user.salary || '0',
                    utility: user.utility || '0',
                    section: section,
                    role: user.role || '',
                    stationary: 0,
                    allowance: 0,
                    advance: 0,
                    paid: 0,
                    comments: ''
                };
            }
            sections.get(section)!.push(staff);
        });

        const mergedData = Array.from(sections.entries()).map(([category, staff]) => ({ category, staff }));
        console.log('[DEBUG] Merged staffData:', mergedData);
        
        // Important: First set the data
        setStaffData(mergedData);
        setCurrentPayrollExists(true);
        
        // Enable editing if we found new users
        if (newUserCount > 0) {
            setIsEditing(true);
        }
        
        setLoading(false);

        // Set notification based on new user count
        if (newUserCount > 0) {
            // Editing mode is now enabled earlier in the process
            
            setNotification({ message: `${newUserCount} new user(s) have been added to the payroll. Editing mode enabled.`, type: 'success' });
            
            // Clear success notification after 4 seconds
            setTimeout(() => {
                setNotification({ message: '', type: null });
            }, 4000);
        } else {
            setNotification({ message: 'No new users were found to add to the payroll.', type: 'note' });
            
            // Clear the notification after 4 seconds for consistency
            setTimeout(() => {
                setNotification({ message: '', type: null });
            }, 4000); // 4000 milliseconds = 4 seconds
        }
    } catch (err) {
        setStaffData(existingLocalPayroll.data);
        setCurrentPayrollExists(true);
        setLoading(false);
        setNotification({ message: 'Error merging staff: ' + (err instanceof Error ? err.message : String(err)), type: 'error' });
    }
};

// Ensure the Load button always calls this function
// (No code change needed if handleMonthYearChange calls mergeSavedPayrollWithLatestUsers)

  useEffect(() => {
    const existingLocalPayroll = savedPayrolls.find(
      payroll => payroll.month === selectedMonth && payroll.year === selectedYear
    );
    
    const existingServerPayroll = availablePayrolls.find(
      payroll => payroll.month === selectedMonth.toUpperCase() && payroll.year === selectedYear
    );
    
    if (existingLocalPayroll) {
      // Only load saved data instantly, do NOT merge yet
      setStaffData(existingLocalPayroll.data);
      setCurrentPayrollExists(true);
      // Update academic year and term if they exist in the saved data
      if (existingLocalPayroll.academicYearId) {
        fetchAcademicYearById(existingLocalPayroll.academicYearId);
      }
      
      if (existingLocalPayroll.termId) {
        fetchTermById(existingLocalPayroll.termId);
      }

      // Merge with latest users
      mergeSavedPayrollWithLatestUsers(existingLocalPayroll);
    } else if (existingServerPayroll) {
      // It exists on server but not locally - we'll use info from the server listing
      setCurrentPayrollExists(true);
      
      // Update academic year and term if they exist
      if (existingServerPayroll.academicYearId) {
        setCurrentAcademicYear({
          id: existingServerPayroll.academicYearId,
          year: existingServerPayroll.academicYear?.year || '',
          isActive: true
        });
      }
      
      if (existingServerPayroll.termId) {
        setCurrentTerm({
          id: existingServerPayroll.termId,
          name: existingServerPayroll.term?.name || ''
        });
      }
      
      // Fetch fresh staff data
      fetchStaffData();
    } else {
      // Fetch new data for this month/year
      setCurrentPayrollExists(false);
      fetchStaffData();
    }
  }, [selectedMonth, selectedYear, savedPayrolls, availablePayrolls, fetchStaffData]);

  // Fetch academic year by ID
  const fetchAcademicYearById = async (yearId: string) => {
    const accessToken = localStorage.getItem('accessToken');
    if (!accessToken) return;
    
    try {
      const response = await fetch(`${env.BACKEND_API_URL}/api/v1/academic-years/${yearId}`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) throw new Error('Failed to fetch academic year');
      
      const data = await response.json();
      
      if (data.status && data.status.returnCode === "00" && data.data) {
        setCurrentAcademicYear({
          id: data.data.id,
          year: data.data.year,
          isActive: data.data.isActive
        });
      }
    } catch (error) {
      console.error("Error fetching academic year:", error);
    }
  };
  
  // Fetch term by ID
  const fetchTermById = async (termId: string) => {
    const accessToken = localStorage.getItem('accessToken');
    if (!accessToken) return;
    
    try {
      const response = await fetch(`${env.BACKEND_API_URL}/api/v1/term/${termId}`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) throw new Error('Failed to fetch term');
      
      const data = await response.json();
      
      if (data.status && data.status.returnCode === "00" && data.data) {
        setCurrentTerm({
          id: data.data.id,
          name: data.data.name
        });
      }
    } catch (error) {
      console.error("Error fetching term:", error);
    }
  };

  const calculateBalance = (data: StaffMember): number => {
    const salary = parseNumber(data.salary);
    const allowance = data.allowance || 0;
    const utility = parseNumber(data.utility);
    const advance = data.advance || 0;
    const stationary = data.stationary || 0;
    const paid = data.paid || 0;
    
    return salary + allowance + advance - utility - stationary - paid;
  };

  const calculateSubtotals = (staff: StaffMember[]): Totals => {
    return staff.reduce((subtotal: Totals, member: StaffMember) => ({
      salary: subtotal.salary + parseNumber(member.salary),
      utility: subtotal.utility + parseNumber(member.utility),
      stationary: subtotal.stationary + safeNumber(member.stationary),
      allowance: subtotal.allowance + safeNumber(member.allowance),
      advance: subtotal.advance + safeNumber(member.advance),
      paid: subtotal.paid + safeNumber(member.paid),
      balance: subtotal.balance + calculateBalance(member)
    }), {
      salary: 0,
      utility: 0,
      stationary: 0,
      allowance: 0,
      advance: 0,
      paid: 0,
      balance: 0
    });
  };

  const calculateGrandTotal = (filteredData?: Category[]): Totals => {
    const dataToUse = filteredData || staffData;
    
    return dataToUse.reduce((total: Totals, category: Category) => {
      const subtotal = calculateSubtotals(category.staff);
      return {
        salary: total.salary + subtotal.salary,
        utility: total.utility + subtotal.utility,
        stationary: total.stationary + subtotal.stationary,
        allowance: total.allowance + subtotal.allowance,
        advance: total.advance + subtotal.advance,
        paid: total.paid + subtotal.paid,
        balance: total.balance + subtotal.balance
      };
    }, {
      salary: 0,
      utility: 0,
      stationary: 0,
      allowance: 0,
      advance: 0,
      paid: 0,
      balance: 0
    });
  };

  const handleInputChange = (
    categoryIndex: number,
    staffIndex: number,
    field: keyof StaffMember, 
    value: string | number | undefined
  ) => {
    // Double-check that this is a valid staff index
    if (categoryIndex >= 0 && 
        categoryIndex < staffData.length && 
        staffIndex >= 0 && 
        staffIndex < staffData[categoryIndex].staff.length) {
      setStaffData(prevData => {
        const newData = [...prevData];
        const staff = {...newData[categoryIndex].staff[staffIndex]};
        
        if (field === 'email' || field === 'account_number' || field === 'mobile_money_number' || field === 'registered_name' || field === 'comments' || field === 'salary' || field === 'utility') {
          (staff[field] as string) = value?.toString() || '';
        } else if (field === 'stationary' || field === 'allowance' || field === 'advance' || field === 'paid') {
          (staff[field] as number) = typeof value === 'string' ? parseNumber(value) : (value || 0);
        } else {
          (staff[field] as any) = typeof value === 'string' ? parseNumber(value) : (value || 0);
        }
        
        newData[categoryIndex].staff[staffIndex] = staff;
        return newData;
      });
    }
    else {
      console.error(`Invalid indices: category=${categoryIndex}, staff=${staffIndex}`);
    }
  };

  const handleSave = async () => {
    // First, save to the server
    const payrollData = {
      month: selectedMonth.toUpperCase(), // Convert month to uppercase
      year: selectedYear,
      name: `${selectedMonth} ${selectedYear} Payroll`,
      academicYearId: currentAcademicYear ? currentAcademicYear.id : null,
      termId: currentTerm ? currentTerm.id : null,
      entries: staffData.flatMap(category => 
        category.staff.map(staff => ({
          userId: staff.id,
          salary: parseNumber(staff.salary),
          utility: parseNumber(staff.utility),
          stationary: staff.stationary || 0,
          allowance: staff.allowance || 0,
          advance: staff.advance || 0,
          paid: staff.paid || 0,
          balance: calculateBalance(staff),
          comments: staff.comments
        }))
      )
    };

    try {
      const createResponse = await fetch(`${env.BACKEND_API_URL}/api/v1/payrolls/create`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`,
        },
        body: JSON.stringify(payrollData),
      });

      const createResult = await createResponse.json();

      if (createResponse.ok) {
        console.log('Payroll created successfully:', createResult);
      } else {
        console.error('Error creating payroll:', createResult);
        alert(createResult.returnMessage || 'Payroll creation failed. Please check your input and try again.');
        return; // Stop if server save fails
      }
    } catch (error) {
      console.error('Error during payroll operation:', error);
      alert('An error occurred while saving to the server.');
      return; // Stop on network/other errors
    }

    // Then, save to local storage for this specific month/year
    const newSavedPayroll: SavedPayroll = {
      month: selectedMonth,
      year: selectedYear,
      data: staffData,
      academicYearId: currentAcademicYear ? currentAcademicYear.id : null,
      termId: currentTerm ? currentTerm.id : null
    };
    
    // Update savedPayrolls state
    setSavedPayrolls(prevPayrolls => {
      // Replace existing payroll for this month/year if it exists
      const existingIndex = prevPayrolls.findIndex(
        p => p.month === selectedMonth && p.year === selectedYear
      );
      
      let newPayrolls;
      if (existingIndex >= 0) {
        newPayrolls = [...prevPayrolls];
        newPayrolls[existingIndex] = newSavedPayroll;
      } else {
        newPayrolls = [...prevPayrolls, newSavedPayroll];
      }
      
      // Save to localStorage
      localStorage.setItem("savedPayrolls", JSON.stringify(newPayrolls));
      
      return newPayrolls;
    });
    
    setCurrentPayrollExists(true);
    setIsEditing(false);
    setShowSuccess(true);
  };

  const handleMonthYearChange = () => {
    // Reset editing state when changing months/years
    setIsEditing(false);

    // Check if we have saved data for this month/year in localStorage
    const existingLocalPayroll = savedPayrolls.find(
        payroll => payroll.month === selectedMonth && payroll.year === selectedYear
    );

    // Check if it exists on the server
    const existingServerPayroll = availablePayrolls.find(
        payroll => payroll.month === selectedMonth.toUpperCase() && payroll.year === selectedYear
    );

    if (existingLocalPayroll) {
        // Load saved data instantly
        setStaffData(existingLocalPayroll.data);
        setCurrentPayrollExists(true);
        
        // Update academic year and term if they exist in the saved data
        if (existingLocalPayroll.academicYearId) {
            fetchAcademicYearById(existingLocalPayroll.academicYearId);
        }

        if (existingLocalPayroll.termId) {
            fetchTermById(existingLocalPayroll.termId);
        }

        // Merge with latest users
        mergeSavedPayrollWithLatestUsers(existingLocalPayroll);
    } else if (existingServerPayroll) {
        // It exists on server but not locally - we'll use info from the server listing
        setCurrentPayrollExists(true);
        
        // Update academic year and term if they exist
        if (existingServerPayroll.academicYearId) {
            setCurrentAcademicYear({
                id: existingServerPayroll.academicYearId,
                year: existingServerPayroll.academicYear?.year || '',
                isActive: true
            });
        }

        if (existingServerPayroll.termId) {
            setCurrentTerm({
                id: existingServerPayroll.termId,
                name: existingServerPayroll.term?.name || ''
            });
        }

        // Fetch fresh staff data
        fetchStaffData();
    } else {
        // Fetch new data for this month/year
        setCurrentPayrollExists(false);
        fetchStaffData();
    }
  };
  
  // Function to fetch a specific payroll by ID
  const fetchPayrollData = async (payrollId: string) => {
    setLoading(true);
    setError(null);
    const accessToken = localStorage.getItem('accessToken');
    
    if (!accessToken) {
        console.error('Access token is missing');
        setLoading(false);
        return;
    }
    
    try {
        // First, fetch the payroll entries using the filter endpoint
        const response = await fetch(`${env.BACKEND_API_URL}/api/v1/payrolls/entries?payrollId=${payrollId}`, {
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json'
            }
        });
        
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        
        const payrollData = await response.json();
        console.log("Fetched payroll entries:", payrollData);
        
        if (payrollData.status.returnCode !== "00" || !payrollData.data) {
            throw new Error("Failed to fetch payroll entries");
        }
        
        // Next, fetch all staff members to get their details
        const usersResponse = await fetch(`${env.BACKEND_API_URL}/api/v1/integration/users?page=1&pageSize=50`, {
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            }
        });
        
        if (!usersResponse.ok) throw new Error(`HTTP error! status: ${usersResponse.status}`);
        
        const usersData = await usersResponse.json();
        let users: User[] = [];
        
        if (usersData.data && usersData.data.users) {
            // Filter out the system admin account
            users = usersData.data.users.filter((user: User) => user.id !== "a5da15ff-88b2-4b37-a14e-ec3d0e4cfd35");
        } else {
            throw new Error('API response does not contain users data');
        }
        
        // Map users to sections
        const sections = new Map<string, StaffMember[]>();
        
        users.forEach((user: User) => { // Ensure user is of type User
            const section = user.section || 'Uncategorized';
            if (!sections.has(section)) {
                sections.set(section, []);
            }
            
            // Create a base staff member from user data
            const staffMember: StaffMember = {
                id: user.id,
                first_name: user.first_name || '',
                last_name: user.last_name || '',
                middle_name: user.middle_name || '',
                email: user.email,
                account_number: user.account_number || '',
                name_of_bank: user.name_of_bank || '',
                phone: user.phone || '',
                mobile_money_number: user.mobile_money_number || '',
                registered_name: user.registered_name || '',
                salary: user.salary || '0',
                utility: user.utility || '0',
                section: section,
                role: user.role || '',
                stationary: 0,
                allowance: 0,
                advance: 0,
                paid: 0,
                comments: ''
            };
            
            // Find the payroll entry for this user
            const payrollEntry = payrollData.data.entries.find((entry: any) => entry.userId === user.id);
            
            if (payrollEntry) {
                // Update values from payroll entry
                staffMember.salary = String(payrollEntry.salary || staffMember.salary);
                staffMember.utility = String(payrollEntry.utility || staffMember.utility);
                staffMember.stationary = payrollEntry.stationary || 0;
                staffMember.allowance = payrollEntry.allowance || 0;
                staffMember.advance = payrollEntry.advance || 0;
                staffMember.paid = payrollEntry.paid || 0;
                staffMember.comments = payrollEntry.comments || '';
            }
            
            sections.get(section)!.push(staffMember);
        });
        
        const formattedData: Category[] = Array.from(sections.entries()).map(([category, staff]) => ({
            category,
            staff
        }));
        
        setStaffData(formattedData);
        
        // Save to local storage for future access
        const newPayroll: SavedPayroll = {
            month: selectedMonth,
            year: selectedYear,
            data: formattedData,
            academicYearId: payrollData.data.academicYearId,
            termId: payrollData.data.termId
        };
        
        setSavedPayrolls(prevPayrolls => {
            const updatedPayrolls = [...prevPayrolls];
            const existingIndex = updatedPayrolls.findIndex(
                p => p.month === selectedMonth && p.year === selectedYear
            );
            
            if (existingIndex >= 0) {
                updatedPayrolls[existingIndex] = newPayroll;
            } else {
                updatedPayrolls.push(newPayroll);
            }
            
            localStorage.setItem("savedPayrolls", JSON.stringify(updatedPayrolls));
            return updatedPayrolls;
        });
        
        // Set academic year and term
        if (payrollData.data.academicYear) {
            setCurrentAcademicYear({
                id: payrollData.data.academicYearId,
                year: payrollData.data.academicYear.year,
                isActive: true
            });
        }
        
        if (payrollData.data.term) {
            setCurrentTerm({
                id: payrollData.data.termId,
                name: payrollData.data.term.name
            });
        }
        
    } catch (error) {
        console.error("Error fetching payroll data:", error);
        setError("Failed to load the selected payroll data. Please try again.");
    } finally {
        setLoading(false);
    }
};

  const handleExport = () => {
    const table = document.querySelector("table");
    if (!table) throw new Error('Table not found');
    
    const wb = XLSX.utils.table_to_book(table, { sheet: "Payroll" });
    XLSX.writeFile(wb, `payroll_sheet_${selectedMonth}_${selectedYear}.xlsx`);
  };

  const handlePrint = () => {
    // Set to the current active tab to ensure we print the current view
    const currentTab = activeTab;
    window.print();
  };

  if (loading) {
    return (
      <div className="container mx-auto p-4">
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
        </div>
      </div>
    );
  }

  if (error && staffData.length === 0) {
    return (
      <div className="container mx-auto p-4">
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative" role="alert">
          <strong className="font-bold">Error!</strong>
          <span className="block sm:inline"> {error}</span>
        </div>
      </div>
    );
  }

  // Calculate subtotals for bank accounts
  const bankAccountSubtotals = calculateGrandTotal(
    staffData.map(category => ({
      ...category,
      staff: category.staff.filter(staff => staff.account_number && staff.name_of_bank)
    }))
  );

  // Calculate subtotals for mobile staff
  const mobileStaffSubtotals = calculateGrandTotal(
    staffData.map(category => ({
      ...category,
      staff: category.staff.filter(staff => staff.mobile_money_number && staff.registered_name)
    }))
  );

  return (
    <div className="container mx-auto p-4">
      {/* Notification Section */}
      {notification.message && (
          <div className={`mb-4 p-4 rounded ${
            notification.type === 'success' 
              ? 'bg-green-100 text-green-800' 
              : notification.type === 'note'
                ? 'bg-blue-100 text-blue-800' 
                : 'bg-red-100 text-red-800'
          }`}>
              <strong>
                {notification.type === 'success' 
                  ? 'Success!' 
                  : notification.type === 'note' 
                    ? 'Note:' 
                    : 'Error!'}
              </strong> {notification.message}
          </div>
      )}
      <div className="mb-6">
        <div className="flex gap-4 mb-4">
          <select
            value={selectedMonth}
            onChange={(e) => {
              setSelectedMonth(e.target.value);
              // We'll apply the change after both month and year are selected
            }}
            className="w-full md:w-48 p-2 border border-gray-300 rounded"
          >
            {months.map((month) => (
              <option key={month} value={month}>
                {month}
              </option>
            ))}
          </select>

          <select
            value={selectedYear}
            onChange={(e) => {
              setSelectedYear(Number(e.target.value));
              // We'll apply the change after both month and year are selected
            }}
            className="w-full md:w-32 p-2 border border-gray-300 rounded"
          >
            {years.map((year) => (
              <option key={year} value={year}>
                {year}
              </option>
            ))}
          </select>
          
          <button
            onClick={handleMonthYearChange}
            className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
          >
            Load
          </button>
          
          {currentPayrollExists && (
            <div className="flex items-center text-green-600">
              <span>✓ Saved data loaded</span>
            </div>
          )}
        </div>
        
        <div className="border-b border-gray-200 mb-4">
          <nav className="-mb-px flex" aria-label="Tabs">
            <button
              onClick={() => setActiveTab('bankAccounts')}
              className={`py-2 px-4 text-center border-b-2 font-medium text-sm ${
                activeTab === 'bankAccounts'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Bank Accounts
            </button>
            <button
              onClick={() => setActiveTab('mobileMoney')}
              className={`py-2 px-4 text-center border-b-2 font-medium text-sm ${
                activeTab === 'mobileMoney'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Mobile Staff
            </button>
          </nav>
        </div>
      </div>

      <div className="bg-gray-100 text-gray-800 print:bg-white min-h-screen">
        <div className="p-4 space-y-4 print:p-0">
          {error && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative print:hidden" role="alert">
              <strong className="font-bold">Warning:</strong>
              <span className="block sm:inline"> {error} Using locally saved data.</span>
            </div>
          )}
          
          <div className="bg-white p-4 shadow-md rounded-lg print:shadow-none print:rounded-none">
            <div className="print:mb-8">
              <h1 className="text-3xl font-bold text-center print:text-2xl mb-2"></h1>
              <h2 className="text-2xl font-bold text-center print:text-2xl mb-2">
                {activeTab === 'bankAccounts' ? 'Bank Accounts Payroll Sheet' : 'Mobile Staff Payroll Sheet'}
              </h2>
              <h1 className="text-xl font-bold text-center mt-4">
                Academic Year: {currentAcademicYear ? currentAcademicYear.year : 'Not set'} | Term: {currentTerm ? currentTerm.name : 'Not set'}
              </h1>
              <p className="text-center text-gray-600">For The Month Of {selectedMonth} {selectedYear}</p>
            </div>
            
            <div className="print:hidden space-x-2 mb-4">
              <button 
                onClick={handlePrint}
                className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
              >
                Print {activeTab === 'bankAccounts' ? 'Bank Accounts' : 'Mobile Staff'}
              </button>
              <button 
                onClick={handleExport}
                className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600"
              >
                Export to Excel
              </button>
              <button 
                onClick={() => setIsEditing(!isEditing)}
                className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
              >
                {isEditing ? "Cancel Edit" : "Edit"}
              </button>
              {isEditing && (
                <button 
                  onClick={handleSave}
                  className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600"
                >
                  Save
                </button>
              )}
            </div>

            <div className="overflow-x-auto print:overflow-visible">
              {activeTab === 'bankAccounts' ? (
                <table className="min-w-full table-auto border-collapse border border-gray-400">
                  <thead className="bg-gray-200">
                    <tr>
                      <th className="border border-gray-400 p-2 text-left">#</th>
                      <th className="border border-gray-400 p-2 text-left">Names</th>
                      <th className="border border-gray-400 p-2 text-left">Account Number</th>
                      <th className="border border-gray-400 p-2 text-left">Bank Name</th>
                      
                      <th className="border border-gray-400 p-2 text-left">Salary</th>
                      <th className="border border-gray-400 p-2 text-left">Utility</th>
                      <th className="border border-gray-400 p-2 text-left">Stationary</th>
                      <th className="border border-gray-400 p-2 text-left">Allowance</th>
                      <th className="border border-gray-400 p-2 text-left">Advance</th>
                      <th className="border border-gray-400 p-2 text-left">Paid</th>
                      <th className="border border-gray-400 p-2 text-left">Balance</th>
                      <th className="border border-gray-400 p-2 text-left">Comments</th>
                    </tr>
                  </thead>
                  <tbody>
                    {staffData.length > 0 ? (
                      staffData.map((category, categoryIndex) => {
                        const bankStaff = category.staff.filter((staff, idx) => {
                          if (staff.account_number && staff.name_of_bank) {
                            // Store the original index in the staff object temporarily
                            staff._originalIndex = idx;
                            return true;
                          }
                          return false;
                        });
                        
                        return bankStaff.length > 0 ? (
                          <React.Fragment key={category.category}>
                            <tr>
                              <td colSpan={12} className="bg-gray-100 font-bold p-2">
                                {category.category}
                              </td>
                            </tr>
                            {bankStaff.map((staff, staffIndex) => (
                              <tr key={staff.id}>
                                <td className="border border-gray-400 p-2">
                                  {staffIndex + 1}
                                </td>
                                <td className="border border-gray-400 p-2">
                                  {`${staff.first_name} ${staff.middle_name || ''} ${staff.last_name}`}
                                </td>
                                <td className="border border-gray-400 p-2">{staff.account_number}</td>
                                <td className="border border-gray-400 p-2">{staff.name_of_bank}</td>
                                
                                <td className="border border-gray-400 p-2">
                                  <input
                                    type="text"
                                    value={staff.salary}
                                    className={`w-full border p-1 print:border-0 print:p-0 print:bg-transparent ${isEditing ? "bg-white" : "bg-gray-100"}`}
                                    readOnly={!isEditing}
                                    onChange={(e) => handleInputChange(categoryIndex, staff._originalIndex!, 'salary', e.target.value)}
                                  />
                                </td>
                                <td className="border border-gray-400 p-2">
                                  <input
                                    type="text"
                                    value={staff.utility}
                                    className={`w-full border p-1 print:border-0 print:p-0 print:bg-transparent ${isEditing ? "bg-white" : "bg-gray-100"}`}
                                    readOnly={!isEditing}
                                    onChange={(e) => handleInputChange(categoryIndex, staff._originalIndex!, 'utility', e.target.value)}
                                  />
                                </td>
                                <td className="border border-gray-400 p-2">
                                  <input
                                    type="number"
                                    value={safeNumber(staff.stationary)}
                                    className={`w-full border p-1 print:border-0 print:p-0 print:bg-transparent ${isEditing ? "bg-white" : "bg-gray-100"}`}
                                    readOnly={!isEditing}
                                    onChange={(e) => handleInputChange(categoryIndex, staff._originalIndex!, 'stationary', e.target.value ? parseFloat(e.target.value) : 0)}
                                  />
                                </td>
                                <td className="border border-gray-400 p-2">
                                  <input
                                    type="number"
                                    value={safeNumber(staff.allowance)}
                                    className={`w-full border p-1 print:border-0 print:p-0 print:bg-transparent ${isEditing ? "bg-white" : "bg-gray-100"}`}
                                    readOnly={!isEditing}
                                    onChange={(e) => handleInputChange(categoryIndex, staff._originalIndex!, 'allowance', e.target.value ? parseFloat(e.target.value) : 0)}
                                  />
                                </td>
                                <td className="border border-gray-400 p-2">
                                  <input
                                    type="number"
                                    value={safeNumber(staff.advance)}
                                    className={`w-full border p-1 print:border-0 print:p-0 print:bg-transparent ${isEditing ? "bg-white" : "bg-gray-100"}`}
                                    readOnly={!isEditing}
                                    onChange={(e) => handleInputChange(categoryIndex, staff._originalIndex!, 'advance', e.target.value ? parseFloat(e.target.value) : 0)}
                                  />
                                </td>
                                <td className="border border-gray-400 p-2">
                                  <input
                                    type="number"
                                    value={safeNumber(staff.paid)}
                                    className={`w-full border p-1 print:border-0 print:p-0 print:bg-transparent ${isEditing ? "bg-white" : "bg-gray-100"}`}
                                    readOnly={!isEditing}
                                    onChange={(e) => handleInputChange(categoryIndex, staff._originalIndex!, 'paid', e.target.value ? parseFloat(e.target.value) : 0)}
                                  />
                                </td>
                                <td className="border border-gray-400 p-2">
                                  <input
                                    type="text"
                                    value={formatNumber(calculateBalance(staff))}
                                    className="w-full border p-1 bg-gray-100 print:border-0 print:p-0 print:bg-transparent"
                                    readOnly
                                  />
                                </td>
                                <td className="border border-gray-400 p-2">
                                  <input
                                    type="text"
                                    value={staff.comments}
                                    className={`w-full border p-1 print:border-0 print:p-0 print:bg-transparent ${isEditing ? "bg-white" : "bg-gray-100"}`}
                                    readOnly={!isEditing}
                                    onChange={(e) => handleInputChange(categoryIndex, staff._originalIndex!, 'comments', e.target.value)}
                                  />
                                </td>
                              </tr>
                            ))}
                            <tr className="bg-gray-200">
                              <td colSpan={4} className="border border-gray-400 p-2 font-bold">
                                Subtotal
                              </td>
                              {Object.values(calculateSubtotals(bankStaff)).map((value, index) => (
                                <td key={index} className="border border-gray-400 p-2 font-bold">
                                  {formatNumber(value)}
                                </td>
                              ))}
                              <td className="border border-gray-400 p-2"></td>
                            </tr>
                          </React.Fragment>
                        ) : null;
                      })
                    ) : (
                      <tr>
                        <td colSpan={12} className="border border-gray-400 p-2 text-center">
                          No staff data available.
                        </td>
                      </tr>
                    )}
                  </tbody>
                  <tfoot>
                    <tr className="bg-gray-300 font-bold">
                      <td colSpan={4} className="border border-gray-400 p-2 text-center">
                        Grand Total
                      </td>
                      {Object.values(bankAccountSubtotals).map((value, index) => (
                        <td key={index} className="border border-gray-400 p-2">
                          {formatNumber(value)}
                        </td>
                      ))}
                      <td className="border border-gray-400 p-2"></td>
                    </tr>
                  </tfoot>
                </table>
              ) : (
                <table className="min-w-full table-auto border-collapse border border-gray-400">
                  <thead className="bg-gray-200">
                    <tr>
                      <th className="border border-gray-400 p-2 text-left">#</th>
                      <th className="border border-gray-400 p-2 text-left">Names</th>
                      <th className="border border-gray-400 p-2 text-left">Mobile Money Number</th>
                      <th className="border border-gray-400 p-2 text-left">Registered Name</th>
                      
                      <th className="border border-gray-400 p-2 text-left">Salary</th>
                      <th className="border border-gray-400 p-2 text-left">Utility</th>
                      <th className="border border-gray-400 p-2 text-left">Stationary</th>
                      <th className="border border-gray-400 p-2 text-left">Allowance</th>
                      <th className="border border-gray-400 p-2 text-left">Advance</th>
                      <th className="border border-gray-400 p-2 text-left">Paid</th>
                      <th className="border border-gray-400 p-2 text-left">Balance</th>
                      <th className="border border-gray-400 p-2 text-left">Comments</th>
                    </tr>
                  </thead>
                  <tbody>
                    {staffData.length > 0 ? (
                      staffData.map((category, categoryIndex) => {
                        const mobileStaff = category.staff.filter((staff, idx) => {
                          if (staff.mobile_money_number && staff.registered_name) {
                            // Store the original index in the staff object temporarily
                            staff._originalIndex = idx;
                            return true;
                          }
                          return false;
                        });
                        
                        return mobileStaff.length > 0 ? (
                          <React.Fragment key={category.category}>
                            <tr>
                              <td colSpan={12} className="bg-gray-100 font-bold p-2">
                                {category.category}
                              </td>
                            </tr>
                            {mobileStaff.map((staff, staffIndex) => (
                              <tr key={staff.id}>
                                <td className="border border-gray-400 p-2">
                                  {staffIndex + 1}
                                </td>
                                <td className="border border-gray-400 p-2">
                                  {`${staff.first_name} ${staff.middle_name || ''} ${staff.last_name}`}
                                </td>
                                <td className="border border-gray-400 p-2">{staff.mobile_money_number}</td>
                                <td className="border border-gray-400 p-2">{staff.registered_name}</td>
                                
                                <td className="border border-gray-400 p-2">
                                  <input
                                    type="text"
                                    value={staff.salary}
                                    className={`w-full border p-1 print:border-0 print:p-0 print:bg-transparent ${isEditing ? "bg-white" : "bg-gray-100"}`}
                                    readOnly={!isEditing}
                                    onChange={(e) => handleInputChange(categoryIndex, staff._originalIndex!, 'salary', e.target.value)}
                                  />
                                </td>
                                <td className="border border-gray-400 p-2">
                                  <input
                                    type="text"
                                    value={staff.utility}
                                    className={`w-full border p-1 print:border-0 print:p-0 print:bg-transparent ${isEditing ? "bg-white" : "bg-gray-100"}`}
                                    readOnly={!isEditing}
                                    onChange={(e) => handleInputChange(categoryIndex, staff._originalIndex!, 'utility', e.target.value)}
                                  />
                                </td>
                                <td className="border border-gray-400 p-2">
                                  <input
                                    type="number"
                                    value={safeNumber(staff.stationary)}
                                    className={`w-full border p-1 print:border-0 print:p-0 print:bg-transparent ${isEditing ? "bg-white" : "bg-gray-100"}`}
                                    readOnly={!isEditing}
                                    onChange={(e) => handleInputChange(categoryIndex, staff._originalIndex!, 'stationary', e.target.value ? parseFloat(e.target.value) : 0)}
                                  />
                                </td>
                                <td className="border border-gray-400 p-2">
                                  <input
                                    type="number"
                                    value={safeNumber(staff.allowance)}
                                    className={`w-full border p-1 print:border-0 print:p-0 print:bg-transparent ${isEditing ? "bg-white" : "bg-gray-100"}`}
                                    readOnly={!isEditing}
                                    onChange={(e) => handleInputChange(categoryIndex, staff._originalIndex!, 'allowance', e.target.value ? parseFloat(e.target.value) : 0)}
                                  />
                                </td>
                                <td className="border border-gray-400 p-2">
                                  <input
                                    type="number"
                                    value={safeNumber(staff.advance)}
                                    className={`w-full border p-1 print:border-0 print:p-0 print:bg-transparent ${isEditing ? "bg-white" : "bg-gray-100"}`}
                                    readOnly={!isEditing}
                                    onChange={(e) => handleInputChange(categoryIndex, staff._originalIndex!, 'advance', e.target.value ? parseFloat(e.target.value) : 0)}
                                  />
                                </td>
                                <td className="border border-gray-400 p-2">
                                  <input
                                    type="number"
                                    value={safeNumber(staff.paid)}
                                    className={`w-full border p-1 print:border-0 print:p-0 print:bg-transparent ${isEditing ? "bg-white" : "bg-gray-100"}`}
                                    readOnly={!isEditing}
                                    onChange={(e) => handleInputChange(categoryIndex, staff._originalIndex!, 'paid', e.target.value ? parseFloat(e.target.value) : 0)}
                                  />
                                </td>
                                <td className="border border-gray-400 p-2">
                                  <input
                                    type="text"
                                    value={formatNumber(calculateBalance(staff))}
                                    className="w-full border p-1 bg-gray-100 print:border-0 print:p-0 print:bg-transparent"
                                    readOnly
                                  />
                                </td>
                                <td className="border border-gray-400 p-2">
                                  <input
                                    type="text"
                                    value={staff.comments}
                                    className={`w-full border p-1 print:border-0 print:p-0 print:bg-transparent ${isEditing ? "bg-white" : "bg-gray-100"}`}
                                    readOnly={!isEditing}
                                    onChange={(e) => handleInputChange(categoryIndex, staff._originalIndex!, 'comments', e.target.value)}
                                  />
                                </td>
                              </tr>
                            ))}
                            <tr className="bg-gray-200">
                              <td colSpan={4} className="border border-gray-400 p-2 font-bold">
                                Subtotal
                              </td>
                              {Object.values(calculateSubtotals(mobileStaff)).map((value, index) => (
                                <td key={index} className="border border-gray-400 p-2 font-bold">
                                  {formatNumber(value)}
                                </td>
                              ))}
                              <td className="border border-gray-400 p-2"></td>
                            </tr>
                          </React.Fragment>
                        ) : null;
                      })
                    ) : (
                      <tr>
                        <td colSpan={12} className="border border-gray-400 p-2 text-center">
                          No staff data available.
                        </td>
                      </tr>
                    )}
                  </tbody>
                  <tfoot>
                    <tr className="bg-gray-300 font-bold">
                      <td colSpan={4} className="border border-gray-400 p-2 text-center">
                        Grand Total
                      </td>
                      {Object.values(mobileStaffSubtotals).map((value, index) => (
                        <td key={index} className="border border-gray-400 p-2">
                          {formatNumber(value)}
                        </td>
                      ))}
                      <td className="border border-gray-400 p-2"></td>
                    </tr>
                  </tfoot>
                </table>
              )}
            </div>
          </div>
        </div>
      </div>

      {showSuccess && (
        <div className="fixed inset-0 flex items-center justify-center bg-gray-800 bg-opacity-50 print:hidden">
          <div className="bg-white p-6 rounded-lg shadow-lg max-w-md w-full text-center">
            <h2 className="text-lg font-semibold">Payroll has been saved successfully</h2>
            <button 
              onClick={() => setShowSuccess(false)}
              className="mt-4 bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default PayrollPage;