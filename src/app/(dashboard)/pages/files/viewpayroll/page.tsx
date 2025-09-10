"use client";
import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { env } from '@/env';

interface Staff {
  id: string;
  name: string;
  accountNumber: string;
  bankName: string;
  phone: string;
  mobilename: string; // mobile_money_number
  registeredName: string; // registered_name
  salary: number;
  utility: number;
  stationary: number;
  allowance: number;
  advance: number;
  paid: number;
  balance: number;
  comments?: string;
  paymentType: string;
}

interface StaffData {
  [key: string]: {
    category: string;
    staff: Staff[];
  }[];
}

interface User {
  id: string;
  email: string;
  phone: string;
  role: string;
  first_name: string;
  last_name: string;
  middle_name?: string;
  initials?: string;
  address?: string;
  salary: string; // Keep as string if it includes commas
  utility: string; // Keep as string if it includes commas
  gender: string;
  date_joined?: string;
  name_of_bank?: string;
  account_number?: string;
  mobile_money_number?: string;
  registered_name?: string;
  staff_photo?: string;
  section?: string;
  hasAccess: boolean;
  createdAt: string;
  updatedAt: string;
}

interface Payroll {
  id: string;
  month: string;
  year: number;
  // Add other relevant fields based on your API response
}

const months = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

interface PayrollData {
  id: number;
  name: string;
  salary: number;
  month: string;
  year: number;
  // ... other payroll fields
}

const PayrollViewer = () => {
  // Add print styles
  useEffect(() => {
    const style = document.createElement('style');
    style.innerHTML = `
      @media print {
        .no-print {
          display: none !important;
        }
        body * {
          visibility: hidden;
        }
        #printable, #printable * {
          visibility: visible;
        }
        #printable {
          position: absolute;
          left: 0;
          top: 0;
          width: 100%;
        }
      }
    `;
    document.head.appendChild(style);
    return () => {
      document.head.removeChild(style);
    };
  }, []);
  const [viewMode, setViewMode] = useState<'full' | 'simple' | 'namePhoneMobile' | 'summary'>('full');
  const [selectedMonth, setSelectedMonth] = useState<string>(new Date().toLocaleString('default', { month: 'long' }));
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  const [staffData, setStaffData] = useState<Staff[]>([]);
  const [error, setError] = useState<string | null>(null);
  
  const fetchPayrollData = useCallback(async () => {
    const accessToken = localStorage.getItem('accessToken');

    if (!accessToken) {
      setError('Authentication token is missing. Please log in.');
      return;
    }

    try {
      // 1. Fetch payroll summary for the selected month/year
      const response = await fetch(`${env.BACKEND_API_URL}/api/v1/payrolls/filter?month=${selectedMonth.toUpperCase()}&year=${selectedYear}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
      });

      const result = await response.json();
      console.log('API Response:', result);

      if (response.ok) {
        if (result.status.returnCode === "00" && result.data && result.data.payrolls) {
          const payroll = result.data.payrolls.find((p: Payroll) => 
            p.month === selectedMonth.toUpperCase() && p.year === selectedYear
          );
          
          if (payroll) {
            // 2. Fetch payroll details for the specific payroll
            const payrollResponse = await fetch(`${env.BACKEND_API_URL}/api/v1/payrolls/filter/${payroll.id}`, {
              headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json'
              }
            });
            
            const payrollDetails = await payrollResponse.json();
            console.log("Payroll details:", payrollDetails);

            // 3. Fetch all users from integration/users for merging
            const usersResponse = await fetch(`${env.BACKEND_API_URL}/api/v1/integration/users?page=1&pageSize=500`, {
              headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json'
              }
            });
            const usersData = await usersResponse.json();
            
            // Filter out the system admin account from users list
            const usersList: User[] = (usersData.data && usersData.data.users) 
              ? usersData.data.users.filter((user: User) => user.id !== "a1f8faec-06ef-4234-b802-8c76bf6141e7")
              : [];
              
            // Debug: Log the usersList
            console.log('integration/users API usersList:', usersList);
            
            // Build a userId -> user map for quick lookup
            const userMap = new Map<string, User>();
            usersList.forEach((u: User) => userMap.set(u.id, u));
            
            // Debug: Log the userMap keys
            console.log('UserMap keys:', Array.from(userMap.keys()));

            if (payrollDetails.status.returnCode === "00" && payrollDetails.data) {
              // Map to keep only one entry per userId, preferring 'bank' over 'mobile'
              const staffMap = new Map<string, Staff>();
              
              // Filter out the system admin account from payroll entries
              const filteredEntries = payrollDetails.data.payroll.payrollEntries.filter(
                (entry: any) => entry.userId !== "a1f8faec-06ef-4234-b802-8c76bf6141e7"
              );
              
              filteredEntries.forEach((entry: any) => {
                const entryUser: User = entry.user || {};
                const apiUser = userMap.get(entry.userId) as User | undefined;

                // Check if apiUser is undefined and handle accordingly
                if (!apiUser) {
                    console.warn(`User with ID ${entry.userId} not found in userMap.`);
                    return; // Skip this entry if the user is not found
                }

                const paymentType = (entryUser.account_number || apiUser.account_number) && (entryUser.name_of_bank || apiUser.name_of_bank)
                  ? 'bank'
                  : (entryUser.mobile_money_number || apiUser.mobile_money_number)
                  ? 'mobile'
                  : 'none';
                const staffObj: Staff = {
                  id: entry.userId,
                  name: `${entryUser.first_name || apiUser.first_name || ''} ${entryUser.last_name || apiUser.last_name || ''}`.trim(),
                  accountNumber: entryUser.account_number || apiUser.account_number || '',
                  bankName: entryUser.name_of_bank || apiUser.name_of_bank || '',
                  phone: entryUser.phone || apiUser.phone || '',
                  mobilename: entryUser.mobile_money_number || apiUser.mobile_money_number || '',
                  registeredName: entryUser.registered_name || apiUser.registered_name || '',
                  salary: parseFloat(entry.salary?.replace(/,/g, '') || '0'),
                  utility: parseFloat(entry.utility?.replace(/,/g, '') || '0'),
                  stationary: parseFloat(entry.stationary?.replace(/,/g, '') || '0'),
                  allowance: parseFloat(entry.allowance?.replace(/,/g, '') || '0'),
                  advance: parseFloat(entry.advance?.replace(/,/g, '') || '0'),
                  paid: parseFloat(entry.paid?.replace(/,/g, '') || '0'),
                  balance: parseFloat(entry.balance?.replace(/,/g, '') || '0'),
                  comments: entry.comments || '',
                  paymentType,
                };
                // Prefer 'bank' if both exist, otherwise take first found
                if (!staffMap.has(entry.userId)) {
                  staffMap.set(entry.userId, staffObj);
                } else {
                  const existing = staffMap.get(entry.userId);
                  if (existing && existing.paymentType !== 'bank' && staffObj.paymentType === 'bank') {
                    staffMap.set(entry.userId, staffObj);
                  }
                }
              });
              const formattedData: Staff[] = Array.from(staffMap.values());
              // Debug: Log the merged/filled formattedData
              console.log('Merged formattedData for payroll table:', formattedData);
              setStaffData(formattedData);
              setError(null);
            } else {
              setStaffData([]);
              setError(`Could not fetch details for ${selectedMonth} ${selectedYear}.`);
            }
          } else {
            setStaffData([]);
            setError(`No payroll found for ${selectedMonth} ${selectedYear}.`);
          }
        } else {
          setStaffData([]);
          setError(`No data available for ${selectedMonth} ${selectedYear}.`);
        }
      } else {
        setError(result.status?.returnMessage || 'Error fetching data');
      }
    } catch (err) {
      console.error('Error fetching payroll data:', err);
      setError('Failed to load payroll data. Please try again later.');
    }
  }, [selectedMonth, selectedYear]);

  const handleLoadData = () => {
    setError(null); // Clear any previous errors
    fetchPayrollData(); // Call the fetch function
  };

  useEffect(() => {
    fetchPayrollData();
  }, [fetchPayrollData]);

  const calculateBalance = (staff: Staff): number => {
    return staff.salary + staff.allowance - staff.utility - staff.advance - staff.stationary;
  };

  const calculateTotals = () => {
    const bankTotal = staffData
      .filter(staff => staff.paymentType === 'bank')
      .reduce((total, staff) => total + staff.balance, 0);

    const mobileTotal = staffData
      .filter(staff => staff.paymentType === 'mobile')
      .reduce((total, staff) => total + staff.balance, 0);

    const grandTotal = bankTotal + mobileTotal;

    return { bankTotal, mobileTotal, grandTotal };
  };

  const totals = useMemo(calculateTotals, [staffData]);

  const formatAmount = (amount: number): string => {
    return amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  const renderTableHeader = () => {
    const baseHeaders = [<th key="index" className="border border-gray-300 p-2">#</th>];
    switch (viewMode) {
      case 'simple':
        return [...baseHeaders,
          <th key="name" className="border border-gray-300 p-2">Names</th>,
          <th key="account" className="border border-gray-300 p-2">Account Number</th>,
          <th key="bank" className="border border-gray-300 p-2">Banks Name</th>,
          <th key="balance" className="border border-gray-300 p-2">Balance</th>
        ];
      case 'namePhoneMobile':
        return [...baseHeaders,
          <th key="name" className="border border-gray-300 p-2">Names</th>,
          <th key="phone" className="border border-gray-300 p-2">Mobile money number</th>,
          <th key="mobile" className="border border-gray-300 p-2">Registered Name</th>,
          <th key="balance" className="border border-gray-300 p-2">Balance</th>
        ];
      case 'summary':
        return [
          <th key="description" className="border border-gray-300 p-2">Description</th>,
          <th key="amount" className="border border-gray-300 p-2">Amount</th>
        ];
      default:
        return [...baseHeaders,
          <th key="name" className="border border-gray-300 p-2">Names</th>,
          <th key="account" className="border border-gray-300 p-2">Account Number</th>,
          <th key="bank" className="border border-gray-300 p-2">Bank Name</th>,
          <th key="phone" className="border border-gray-300 p-2">Mobile money number</th>,
          <th key="mobile" className="border border-gray-300 p-2">Registered Name</th>,
          <th key="balance" className="border border-gray-300 p-2">Balance</th>
        ];
    }
  };

  const renderTableRow = (staff: Staff) => {
    switch (viewMode) {
      case 'simple':
        return (
          <>
            <td className="border border-gray-300 p-2">{staff.name}</td>
            <td className="border border-gray-300 p-2">{staff.accountNumber}</td>
            <td className="border border-gray-300 p-2">{staff.bankName}</td>
            <td className="border border-gray-300 p-2 text-right">{formatAmount(staff.balance)}</td>
          </>
        );
      case 'namePhoneMobile':
        return (
          <>
            <td className="border border-gray-300 p-2">{staff.name}</td>
            <td className="border border-gray-300 p-2">{staff.mobilename}</td>
            <td className="border border-gray-300 p-2">{staff.registeredName}</td>
            <td className="border border-gray-300 p-2 text-right">{formatAmount(staff.balance)}</td>
          </>
        );
      default:
        return (
          <>
            <td className="border border-gray-300 p-2">{staff.name}</td>
            <td className="border border-gray-300 p-2">{staff.accountNumber}</td>
            <td className="border border-gray-300 p-2">{staff.bankName}</td>
            <td className="border border-gray-300 p-2">{staff.mobilename}</td>
            <td className="border border-gray-300 p-2">{staff.registeredName}</td>
            <td className="border border-gray-300 p-2 text-right">{formatAmount(staff.balance)}</td>
          </>
        );
    }
  };

  const renderTableContent = () => {
    if (staffData.length === 0) {
        return (
            <tr>
                <td colSpan={viewMode === 'full' ? 7 : 5} className="text-center py-4 border border-gray-300">
                    {error || `No data available for ${selectedMonth} ${selectedYear}.`}
                </td>
            </tr>
        );
    }

    if (viewMode === 'summary') {
        return (
            <>
                <tr>
                    <td className="border border-gray-300 p-2">Bank Accounts Total</td>
                    <td className="border border-gray-300 p-2 text-right">{formatAmount(totals.bankTotal)}</td>
                </tr>
                <tr>
                    <td className="border border-gray-300 p-2">Mobile Staff Total</td>
                    <td className="border border-gray-300 p-2 text-right">{formatAmount(totals.mobileTotal)}</td>
                </tr>
                <tr className="bg-gray-100 font-bold">
                    <td className="border border-gray-300 p-2">Grand Total</td>
                    <td className="border border-gray-300 p-2 text-right">{formatAmount(totals.grandTotal)}</td>
                </tr>
            </>
        );
    }

    // Existing logic for rendering staff entries
    let filteredStaff: Staff[] = staffData;
    if (viewMode === 'simple') {
        filteredStaff = staffData.filter(staff => staff.accountNumber && staff.bankName);
    } else if (viewMode === 'namePhoneMobile') {
        filteredStaff = staffData.filter(staff => staff.mobilename && staff.registeredName);
    }

    let index = 1;
    const totalBalance = filteredStaff.reduce((total, staff) => total + staff.balance, 0); // Calculate total balance

    return (
        <>
            {filteredStaff.map((staff, staffIndex) => (
                <tr key={`${staffIndex}`}>
                    <td className="border border-gray-300 p-2">{index++}</td>
                    {renderTableRow(staff)}
                </tr>
            ))}
            <tr className="bg-gray-100 font-bold">
                <td className="border border-gray-300 p-2 text-right" colSpan={4}>Total</td>
                <td className="border border-gray-300 p-2 text-right">{formatAmount(totalBalance)}</td>
            </tr>
        </>
    );
  };

  const handlePrint = () => {
    window.print();
  };

  const handleExport = () => {
    const element = document.createElement("a");
    const file = new Blob([JSON.stringify(staffData, null, 2)], {type: 'text/plain'});
    element.href = URL.createObjectURL(file);
    element.download = "payroll_data.json";
    document.body.appendChild(element);
    element.click();
  };

  // Generate array of recent years
  const years = Array.from({ length: 5 }, (_, i) => selectedYear - i);

  return (
    <div id="printable">
      <div className="mb-4 flex gap-4 no-print">
        <select
          value={selectedMonth}
          onChange={(e) => setSelectedMonth(e.target.value)}
          className="w-full md:w-48 p-2 border border-gray-300 rounded-md"
        >
          {months.map((month) => (
            <option key={month} value={month}>
              {month}
            </option>
          ))}
        </select>

        <select
          value={selectedYear}
          onChange={(e) => setSelectedYear(Number(e.target.value))}
          className="w-full md:w-32 p-2 border border-gray-300 rounded-md"
        >
          {years.map((year) => (
            <option key={year} value={year}>
              {year}
            </option>
          ))}
        </select>

        <button
          className="px-4 py-2 rounded bg-blue-500 text-white"
          onClick={handleLoadData}
        >
          Load
        </button>
      </div>
      <div className="p-4">
        <h1 className="text-2xl font-bold mb-4">Payroll Data Viewer</h1>
        <div className="mb-4 no-print">
          <button
            className={`px-4 py-2 rounded mr-2 ${viewMode === 'full' ? 'bg-blue-500 text-white' : 'bg-gray-300'}`}
            onClick={() => setViewMode('full')}
          >
            Full View
          </button>
          <button
            className={`px-4 py-2 rounded mr-2 ${viewMode === 'simple' ? 'bg-blue-500 text-white' : 'bg-gray-300'}`}
            onClick={() => setViewMode('simple')}
          >
            Bank Accounts
          </button>
          <button
            className={`px-4 py-2 rounded mr-2 ${viewMode === 'namePhoneMobile' ? 'bg-blue-500 text-white' : 'bg-gray-300'}`}
            onClick={() => setViewMode('namePhoneMobile')}
          >
            Mobile Staff
          </button>
          <button
            className={`px-4 py-2 rounded mr-2 ${viewMode === 'summary' ? 'bg-blue-500 text-white' : 'bg-gray-300'}`}
            onClick={() => setViewMode('summary')}
          >
            Total Summary
          </button>
          <button
            className="px-4 py-2 rounded mr-2 bg-green-500 text-white"
            onClick={handlePrint}
          >
            Print
          </button>
          <button
            className="px-4 py-2 rounded bg-yellow-500 text-white"
            onClick={handleExport}
          >
            Export
          </button>
        </div>
        
        <table className="w-full border-collapse border border-gray-300">
          <thead>
            <tr className="bg-gray-100">
              {renderTableHeader()}
            </tr>
          </thead>
          <tbody>
            {staffData.length > 0 ? renderTableContent() : (
              <tr>
                <td colSpan={viewMode === 'full' ? 7 : 5} className="text-center py-4 border border-gray-300">
                  {error || `No data available for ${selectedMonth} ${selectedYear}.`}
                </td>
              </tr>
            )}
          </tbody>
        </table>
        {error && (
          <div className="text-center py-8 bg-red-50 rounded-lg">
            <p className="text-red-500">
              {error}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default PayrollViewer;