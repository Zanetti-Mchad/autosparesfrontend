"use client";

import React, { useState, useEffect, useCallback, Suspense } from 'react';
// import Image from 'next/image'; // Not used in the provided snippet
import { useSearchParams } from 'next/navigation';
import { ExcelExport } from '@/components/ExcelExport';
import { env } from '@/env';
import DialogBox from '@/components/Dailogbox';
// import PrintableContent from '@/components/ui/print'; // Not used

interface Student {
  id?: string; // StudentFees Record ID (optional, string for CUID)
  studentId: string; // Actual Student ID (string for CUID)
  name: string;
  schoolPayCode: string;
  balancePrevTerm: number;
  feesPayable: number;
  stationery: number;
  totalExpected: number;
  feesPaid: number;
  balance: number;
  comments: string;
  bursary?: number; // 1 or 0 from DB
  half_bursary?: number; // 1 or 0 from DB
  bursaryStatus?: string; // "Yes", "Half", or "No" for display
}

interface Totals {
  prevTerm: number;
  feesPayable: number;
  stationery: number;
  expected: number;
  feesPaid: number;
  balance: number;
}

// Helper to parse term name like "Term 1" to 1
const parseTermName = (termName: string): number => {
  if (!termName) return 1;
  const match = termName.match(/Term (\d+)/i);
  return match ? parseInt(match[1], 10) : 1;
};



const CreateFeesStatementView = () => {
  const [payments, setPayments] = useState<any[]>([]); // Payment history for selected student

  const searchParams = useSearchParams();

  const [classTitle, setClassTitle] = useState("Loading...");
  const [students, setStudents] = useState<Student[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [editedStudent, setEditedStudent] = useState<Student | null>(null);
  // const [paymentAmount, setPaymentAmount] = useState<number>(0); // Difference to log as payment - No longer directly used for UI input, calculated on save
  const [paymentFeesPaid, setPaymentFeesPaid] = useState<number>(0); // The value to set as new feesPaid in dialog
  const [prevFeesPaid, setPrevFeesPaid] = useState<number>(0); // The previous value of feesPaid for dialog
  const [nextReceiptNumber, setNextReceiptNumber] = useState<string>('REC00001');
  const [nextTransactionRef, setNextTransactionRef] = useState<string>('');
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear().toString());
  const [currentTerm, setCurrentTerm] = useState(1); // Term number (1, 2, or 3)

  // --- Dynamic IDs for API calls ---
  const [classId, setClassId] = useState<string>("");
  const [termId, setTermId] = useState<string>("");
  const [academicYearId, setAcademicYearId] = useState<string>("");
  // Dropdown data
  const [classes, setClasses] = useState<{ id: string; name: string; section?: string }[]>([]);
  const [terms, setTerms] = useState<{ id: string; name: string }[]>([]);
  const [academicYears, setAcademicYears] = useState<{ id: string; year: string; isActive?: boolean }[]>([]);
  const [dropdownLoading, setDropdownLoading] = useState(false);
  const [dropdownError, setDropdownError] = useState<string | null>(null);

  // State for in-place editing of payments
  const [editPaymentId, setEditPaymentId] = useState<string | null>(null);
  const [editAmount, setEditAmount] = useState<number>(0);
  const [editDate, setEditDate] = useState<string>('');
  const [editMethod, setEditMethod] = useState<string>('');
  const [editReceipt, setEditReceipt] = useState<string>('');
  const [editTxn, setEditTxn] = useState<string>('');
  const [editLoading, setEditLoading] = useState<boolean>(false);

  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const [dialogState, setDialogState] = useState({
    isOpen: false,
    title: '',
    message: '',
    type: 'info' as 'delete' | 'warning' | 'info',
    confirmText: 'OK',
    cancelText: 'Cancel',
    onConfirm: () => {},
    onCancel: () => {},
    showCancel: false,
  });

  useEffect(() => {
    const urlClassId = searchParams ? searchParams.get('classId') : null;
    if (urlClassId && urlClassId !== classId) {
      setClassId(urlClassId);
    }
  }, [searchParams, classId]);

  // This useEffect should only depend on IDs to avoid re-fetching on every apiFetch change
  useEffect(() => {
    if (classId && termId && academicYearId) {
      fetchClassFeesData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [classId, termId, academicYearId]); // Removed fetchClassFeesData from deps

  useEffect(() => {
    const fetchDropdowns = async () => {
      setDropdownLoading(true);
      setDropdownError(null);
      try {
        const token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null;
        const headers: Record<string, string> = {
          'Content-Type': 'application/json',
        };
        if (!token) throw new Error('Authentication required. Please log in again.');
        headers['Authorization'] = `Bearer ${token}`;
        const classesRes = await fetch(`${env.BACKEND_API_URL}/api/v1/classes/filter?limit=100`, { headers });
        const classesData = await classesRes.json();
        let classList = classesData?.classes || classesData?.data?.classes || classesData?.data || classesData;
        if (!Array.isArray(classList)) classList = [];
        setClasses(classList.map((c: any) => ({ id: c.id, name: c.name, section: c.section })));
        const yearsRes = await fetch(`${env.BACKEND_API_URL}/api/v1/academic-years/filter`, { headers });
        const yearsData = await yearsRes.json();
        let years = yearsData?.academicYears || yearsData?.academic_years || yearsData?.years || yearsData?.data || yearsData;
        if (!Array.isArray(years)) years = [];
        setAcademicYears(years.map((y: any) => ({ id: y.id, year: y.year, isActive: y.isActive })));
        const termsRes = await fetch(`${env.BACKEND_API_URL}/api/v1/term/filter`, { headers });
        const termsData = await termsRes.json();
        let termList = termsData?.terms || termsData?.data?.terms || termsData?.data || termsData;
        if (!Array.isArray(termList)) termList = [];
        setTerms(termList.map((t: any) => ({ id: t.id, name: t.name })));
        
        // Set default selections only if current selections are empty
        const urlClassId = searchParams ? searchParams.get('classId') : null;
        if (!classId && !urlClassId && classList.length > 0) setClassId(classList[0].id);
        else if (urlClassId && !classId) setClassId(urlClassId);


        const activeYear = years.find((y: any) => y.isActive) || (years.length > 0 ? years[0] : null);
        if (!academicYearId && activeYear) setAcademicYearId(activeYear.id);
        
        if (!termId && termList.length > 0) setTermId(termList[0].id);

      } catch (e: any) {
        setDropdownError(e.message || 'Failed to load dropdown data');
      } finally {
        setDropdownLoading(false);
      }
    };
    fetchDropdowns();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Removed searchParams from here as it's handled in another useEffect

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const apiFetch = useCallback(async (url: string, options: RequestInit = {}) => {
    // Use editLoading for payment edits, setIsLoading for general page/dialog loads
    const specificLoadingSetter = options.headers && (options.headers as any)['X-Is-Edit-Loading'] ? setEditLoading : setIsLoading;
    specificLoadingSetter(true);
    setError(null);
    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null;
      const headers = {
        'Content-Type': 'application/json',
        ...(token && { 'Authorization': `Bearer ${token}` }),
        ...options.headers,
      };
      delete (headers as any)['X-Is-Edit-Loading']; // Remove custom header before fetch

      const response = await fetch(url, { ...options, headers });

      let responseData;
      try {
        responseData = await response.json();
      } catch (e) {
        if (response.ok && (response.status === 204 || (response.status === 201 && response.headers.get('Content-Length') === '0'))) {
          return { message: `Operation successful with status ${response.status}` };
        }
        console.error("API Error: Failed to parse JSON response or non-JSON error", { status: response.status, statusText: response.statusText, url });
        throw new Error(response.statusText || `HTTP error! status: ${response.status} (Non-JSON response)`);
      }
      
      const topLevelMessageSuccess = responseData.message && typeof responseData.message === 'string' && responseData.message.toLowerCase().includes('success');
      const statusReturnMessageSuccess = responseData.status?.returnMessage && typeof responseData.status.returnMessage === 'string' && responseData.status.returnMessage.toLowerCase().includes('success');
      const hasOverallSuccessMessage = topLevelMessageSuccess || statusReturnMessageSuccess;

      if (response.ok) {
        if (hasOverallSuccessMessage) {
          // For operations like DELETE that might not return data
          // Just return an empty object if no data exists but the operation was successful
          return responseData.data || { success: true, message: responseData.status?.returnMessage || responseData.message };
        }
        if (
          responseData.status && (
            (typeof responseData.status === 'object' && (
              (responseData.status.returnCode && responseData.status.returnCode !== '00') ||
              (responseData.status.returnMessage && !statusReturnMessageSuccess) 
            )) ||
            (typeof responseData.status === 'string' &&
             !responseData.status.toUpperCase().includes('SUCCESS') &&
             responseData.status !== '200' && responseData.status !== '201') ||
            (typeof responseData.status === 'number' && responseData.status !== 200 && responseData.status !== 201)
          )
        ) {
          console.error("API Logic Error (payload indicates error despite HTTP OK):", responseData);
          throw new Error(
            responseData.status?.returnMessage || responseData.message || "API returned an error in status payload"
          );
        }
        return responseData.data || responseData;

      } else { 
        if (hasOverallSuccessMessage) {
          console.warn("API Warning: HTTP status is not OK, but message indicates success. Trusting message as per original logic.", responseData);
          return responseData.data || responseData;
        }
        console.error("API Error Response (HTTP not OK):", responseData);
        throw new Error(responseData.message || responseData.status?.returnMessage || `HTTP error! status: ${response.status}`);
      }

    } catch (err: any) {
      if (!(err.message && (err.message.includes("API Logic Error") || err.message.includes("API Error Response")))) {
           console.error("API Fetch Error (General):", err);
      }
      setError(err.message || "An unexpected error occurred.");
      throw err; 
    } finally {
      specificLoadingSetter(false);
    }
  }, [setError, setIsLoading, setEditLoading]);



  const fetchClassFeesData = useCallback(async () => {
    if (!classId || !termId || !academicYearId) {
      // setError("Class ID, Term ID, and Academic Year ID are required to fetch data.");
      // setStudents([]); // Keep existing students if only one ID is missing temporarily
      return;
    }
    // setIsLoading(true); // Handled by apiFetch
    try {
      const data = await apiFetch(`${env.BACKEND_API_URL}/api/v1/fees/class-fees?classId=${classId}&termId=${termId}&academicYearId=${academicYearId}`);
      
      const fetchedStudents: Student[] = (data.studentFees || []).map((s: any) => {
        let bursaryStatus = "No";
        if (s.bursary == 1) {
          bursaryStatus = "Yes";
        } else if (s.half_bursary == 1) {
          bursaryStatus = "Half";
        }
        return {
          id: s.id, 
          studentId: s.studentId,
          name: s.name,
          schoolPayCode: s.schoolPayCode || '',
          balancePrevTerm: parseFloat(s.balancePrevTerm) || 0,
          feesPayable: parseFloat(s.feesPayable) || 0,
          stationery: parseFloat(s.stationery) || 0,
          totalExpected: parseFloat(s.totalExpected) || 0,
          feesPaid: parseFloat(s.feesPaid) || 0,
          balance: parseFloat(s.balance) || 0,
          comments: s.comments || "No comments",
          bursary: s.bursary,
          half_bursary: s.half_bursary,
          bursaryStatus,
        };
      });
      setStudents(fetchedStudents);
      setClassTitle(data.className || "N/A");
      setCurrentTerm(parseTermName(data.termName));
      setCurrentYear(data.academicYear ? data.academicYear.toString() : new Date().getFullYear().toString());
      setError(null); // Clear previous errors on successful fetch
    } catch (err) {
      setStudents([]); // Clear students on error
      // Error is already set by apiFetch
    }
    // setIsLoading(false); // Handled by apiFetch
  }, [classId, termId, academicYearId, apiFetch]);


  const calculateTotals = (): Totals => {
    return students.reduce(
      (totals, student) => ({
        prevTerm: totals.prevTerm + (student.balancePrevTerm || 0),
        feesPayable: totals.feesPayable + (student.feesPayable || 0),
        stationery: totals.stationery + (student.stationery || 0),
        expected: totals.expected + (student.totalExpected || 0),
        feesPaid: totals.feesPaid + (student.feesPaid || 0),
        balance: totals.balance + (student.balance || 0),
      }),
      {
        prevTerm: 0,
        feesPayable: 0,
        stationery: 0,
        expected: 0,
        feesPaid: 0,
        balance: 0,
      }
    );
  };

  const handleSearch = (event: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(event.target.value.toLowerCase());
  };

  const filteredStudents = students.filter(student =>
    student.name.toLowerCase().includes(searchTerm)
  );

  const openDialog = async (student: Student) => {
    setSelectedStudent(student);
    setError(null); 
    setEditedStudent({ 
      ...student,
      balancePrevTerm: student.balancePrevTerm || 0,
      feesPayable: student.feesPayable || 0,
      stationery: student.stationery || 0,
      totalExpected: student.totalExpected || 0,
      feesPaid: student.feesPaid || 0,
      balance: student.balance || 0,
    });
    setIsDialogOpen(true);
    setShowEditDialog(true);
    setPrevFeesPaid(student.feesPaid || 0);
    setPaymentFeesPaid(student.feesPaid || 0);
    // setPaymentAmount(0); // Not needed for UI input
    setEditPaymentId(null); // Reset any in-place payment edit state

    if (student.id) {
      try {
        const paymentsData = await apiFetch(`${env.BACKEND_API_URL}/api/v1/fees/fees/${student.id}/payments`);
        let maxReceipt = 0;
        if (paymentsData?.payments?.length > 0) {
          paymentsData.payments.forEach((p: any) => {
            const match = p.receiptNumber && p.receiptNumber.match(/REC(\d+)/);
            if (match) {
              const num = parseInt(match[1], 10);
              if (num > maxReceipt) maxReceipt = num;
            }
          });
        }
        const nextReceipt = `REC${(maxReceipt + 1).toString().padStart(5, '0')}`;
        setNextReceiptNumber(nextReceipt);
        setPayments(paymentsData.payments || []); 
      } catch (e) {
        setNextReceiptNumber('REC00001');
        setPayments([]);
      }
    } else {
      setNextReceiptNumber('REC00001');
      setPayments([]);
    }
    setNextTransactionRef(`TXN-${Date.now()}-${Math.floor(Math.random() * 10000)}`);
  }


  const closeDialog = () => {
    setIsDialogOpen(false);
    setShowEditDialog(false);
    setSelectedStudent(null);
    setEditedStudent(null);
    // setPaymentAmount(0);
    setPaymentFeesPaid(0);
    setPrevFeesPaid(0);
    setNextReceiptNumber('REC00001');
    setNextTransactionRef('');
    setEditPaymentId(null); // Ensure in-place edit state is cleared
  };

  const handleFeesPaidChange = (value: string) => {
    if (!editedStudent) return;

    const newFeesPaid = parseFloat(value) || 0;
    setPaymentFeesPaid(newFeesPaid);
    // const balance = editedStudent.totalExpected - newFeesPaid; // Balance is derived from totalExpected and newFeesPaid

    // No need to update editedStudent.feesPaid or .balance here,
    // as paymentFeesPaid is the source of truth for the input,
    // and balance is displayed reactively.
    // The actual update to editedStudent will happen on save.
  };

  const formatNumber = (num: number | undefined | null) => {
    if (num === undefined || num === null || isNaN(num)) return '0';
    return num.toLocaleString();
  };

  const totals = calculateTotals();

  if (dropdownLoading && !classes.length && !terms.length && !academicYears.length) { 
    return <div className="container mx-auto p-6 text-center">Loading selection options...</div>;
  }

  // Show loading for student data only if selections are made and no students are currently loaded
  if (isLoading && !students.length && classId && termId && academicYearId) { 
    return <div className="container mx-auto p-6 text-center">Loading student fees data...</div>;
  }

  // Show error if no students loaded and an error occurred (and not a dropdown error)
  if (error && !students.length && !dropdownError) { 
    return (
      <div className="container mx-auto p-6 text-center text-red-500">
        Error loading data: {error}{' '}
        {classId && termId && academicYearId && ( // Show retry only if all IDs were selected
            <button onClick={fetchClassFeesData} className="ml-2 p-1 bg-blue-500 text-white rounded">Retry</button>
        )}
      </div>
    );
  }


  // Helper functions for showing dialogs
  const showDialog = (title: string, message: string, type: 'delete' | 'warning' | 'info' = 'info', onConfirm?: () => void, showCancel = false, confirmText = 'OK', cancelText = 'Cancel') => {
    setDialogState({
      isOpen: true,
      title,
      message,
      type,
      confirmText,
      cancelText,
      onConfirm: onConfirm || (() => setDialogState(prev => ({ ...prev, isOpen: false }))),
      onCancel: () => setDialogState(prev => ({ ...prev, isOpen: false })),
      showCancel,
    });
  };

  const showConfirmDialog = (title: string, message: string, onConfirm: () => void, type: 'delete' | 'warning' | 'info' = 'warning') => {
    showDialog(title, message, type, onConfirm, true, type === 'delete' ? 'Delete' : 'Confirm', 'Cancel');
  };

  return (
    <div className="container mx-auto p-6">
      <div className="flex flex-wrap gap-4 mb-4">
        <select value={classId} onChange={(e) => setClassId(e.target.value)} className="p-2 border rounded" disabled={dropdownLoading}>
           <option value="">Select Class</option>
           {classes.map(c => <option key={c.id} value={c.id}>{c.name} {c.section || ''}</option>)}
         </select>
         <select value={termId} onChange={(e) => setTermId(e.target.value)} className="p-2 border rounded" disabled={dropdownLoading}>
           <option value="">Select Term</option>
          {terms.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
        </select>
        <select value={academicYearId} onChange={(e) => setAcademicYearId(e.target.value)} className="p-2 border rounded" disabled={dropdownLoading}>
          <option value="">Select Academic Year</option>
          {academicYears.map(y => <option key={y.id} value={y.id}>{y.year} {y.isActive ? '(Active)' : ''}</option>)}
        </select>
        {dropdownLoading && <div className="text-blue-500 ml-2 self-center">Loading options...</div>}
        {dropdownError && <div className="text-red-500 ml-2 self-center">{dropdownError}</div>}
      </div>
      {isLoading && <div className="text-center text-blue-500 my-2">Updating...</div>}
      {error && !dropdownError && <div className="text-center text-red-500 my-2">Error: {error}</div>}


      <h1 className="text-3xl font-bold mb-2 text-center">Fees Statement Management</h1>
      <div className="bg-gray-100 p-2">
        <div className="text-center mb-4">
          <h1 className="text-2xl font-semibold">Enter Student Fees Paid and Comments</h1>
          <h2 className="text-xl">{classTitle}</h2>
          <h3 className="text-lg font-medium">Year: {currentYear}</h3>
          <h3 className="text-lg font-medium">Term: {currentTerm}</h3>
        </div>

        <div className="flex justify-between items-center mb-4 gap-2 flex-wrap">
          <input
            type="text"
            placeholder="Search by student name..."
            value={searchTerm}
            onChange={handleSearch}
            className="border border-gray-300 rounded-md p-2 w-full max-w-md"
          />
          <div className="flex items-center gap-2">
            <style>{`
              @media print {
                header, nav, footer, .no-print, .no-print * { display: none !important; }
                .print-title { display: block !important; text-align: center; margin-bottom: 20px; font-size: 18pt; font-weight: bold; }
                table { width: 100% !important; border-collapse: collapse; }
                th, td { border: 1px solid #ddd; padding: 8px; }
                th { background-color: #f2f2f2 !important; color: black !important; }
                @page { size: portrait; margin: 1.5cm; }
                body { font-family: Arial, sans-serif; font-size: 11pt; color: black; }
              }
              .print-only { display: none; }
              .print-title { display: none; }
            `}</style>
            <button 
              onClick={() => {
                const printWindow = window.open('', '_blank');
                if (!printWindow) {
                  showDialog('Print Error', 'Please allow pop-ups to print the table', 'warning');
                  return;
                }
                printWindow.document.write(`
                  <html>
                    <head>
                      <title>Fees Statement - ${classTitle} - Term ${currentTerm} - Year ${currentYear}</title>
                      <style>
                        body { font-family: Arial, sans-serif; margin: 0; padding: 20px; }
                        h1 { text-align: center; margin-bottom: 20px; font-size: 18pt; }
                        table { width: 100%; border-collapse: collapse; margin-bottom: 30px; }
                        th, td { border: 1px solid #ddd; padding: 8px; text-align: center; }
                        th { background-color: #f2f2f2; }
                        td.text-left { text-align: left; }
                        td.text-right { text-align: right; }
                        tfoot tr { background-color: #f2f2f2; font-weight: bold; }
                      </style>
                    </head>
                    <body>
                      <h1>Fees Statement - ${classTitle} - Term ${currentTerm} - Year ${currentYear}</h1>
                      <table>
                        <thead>
                          <tr>
                            <th>#</th>
                            <th>Student Name</th>
                            <th>School Pay Code</th>
                            <th>Bursary</th>
                            <th>Balance Prev. Term</th>
                            <th>Fees Payable</th>
                            <th>Stationery</th>
                            <th>Total Fees Expected</th>
                            <th>Fees Paid</th>
                            <th>Balance</th>
                            <th>Comments</th>
                          </tr>
                        </thead>
                        <tbody>
                          ${filteredStudents.map((student, index) => `
                            <tr>
                              <td>${index + 1}</td>
                              <td class="text-left">${student.name}</td>
                              <td>${student.schoolPayCode}</td>
                              <td>${student.bursaryStatus || 'No'}</td>
                              <td class="text-right">${formatNumber(student.balancePrevTerm)}</td>
                              <td class="text-right">${formatNumber(student.feesPayable)}</td>
                              <td class="text-right">${formatNumber(student.stationery)}</td>
                              <td class="text-right">${formatNumber(student.totalExpected)}</td>
                              <td class="text-right">${formatNumber(student.feesPaid)}</td>
                              <td class="text-right">${formatNumber(student.balance)}</td>
                              <td class="text-left">${student.comments || ''}</td>
                            </tr>
                          `).join('')}
                        </tbody>
                        <tfoot>
                          <tr>
                            <td colspan="4" class="text-right">Totals:</td>
                            <td class="text-right">${formatNumber(totals.prevTerm)}</td>
                            <td class="text-right">${formatNumber(totals.feesPayable)}</td>
                            <td class="text-right">${formatNumber(totals.stationery)}</td>
                            <td class="text-right">${formatNumber(totals.expected)}</td>
                            <td class="text-right">${formatNumber(totals.feesPaid)}</td>
                            <td class="text-right">${formatNumber(totals.balance)}</td>
                            <td></td>
                          </tr>
                        </tfoot>
                      </table>
                    </body>
                  </html>
                `);
                printWindow.document.close();
                printWindow.focus();
                printWindow.print();
                printWindow.onafterprint = () => printWindow.close();
              }}
              className="px-4 py-2 bg-teal-700 text-white rounded hover:bg-teal-800 flex items-center gap-2 no-print"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 6 2 18 2 18 9"></polyline><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path><rect x="6" y="14" width="12" height="8"></rect></svg>
              Print Table
            </button>
            <ExcelExport
              data={filteredStudents}
              filename={`Fees_Statement_${classTitle}_Term${currentTerm}_Year${currentYear}`}
              sheetName="Fees Statement"
              buttonText="Export Excel"
              mappingFunction={(student, index) => ({
                'No.': index + 1,
                'Student Name': student.name,
                'School Pay Code': student.schoolPayCode,
                'Bursary': student.bursaryStatus || 'No',
                'Balance Prev. Term': student.balancePrevTerm,
                'Fees Payable': student.feesPayable,
                'Stationery': student.stationery,
                'Total Fees Expected': student.totalExpected,
                'Fees Paid': student.feesPaid,
                'Balance': student.balance,
                'Comments': student.comments,
              })}
            />
          </div>
        </div>

        <div className="overflow-x-auto print-container">
          <h1 className="print-title">{`Fees Statement - ${classTitle} - Term ${currentTerm} - Year ${currentYear}`}</h1>
          <table className="min-w-full bg-white border border-gray-400 shadow-md rounded-lg">
            <thead>
              <tr className="bg-gray-200 text-gray-700">
                <th className="px-4 py-2 border">#</th>
                <th className="px-4 py-2 border">Student Name</th>
                <th className="px-4 py-2 border">School Pay Code</th>
                <th className="px-4 py-2 border">Bursary</th>
                <th className="px-4 py-2 border">Balance Prev. Term</th>
                <th className="px-4 py-2 border">Fees Payable</th>
                <th className="px-4 py-2 border">Stationery</th>
                <th className="px-4 py-2 border">Total Fees Expected</th>
                <th className="px-4 py-2 border">Fees Paid</th>
                <th className="px-4 py-2 border">Balance</th>
                <th className="px-4 py-2 border">Comments</th>
              </tr>
            </thead>
            <tbody>
              {filteredStudents.map((student, index) => (
                <tr
                  key={student.id || student.studentId}
                  onClick={() => openDialog(student)}
                  className="text-center cursor-pointer hover:bg-gray-50"
                >
                  <td className="px-4 py-2 border">{index + 1}</td>
                  <td className="px-4 py-2 border text-left">{student.name}</td>
                  <td className="px-4 py-2 border">{student.schoolPayCode}</td>
                  <td className="px-4 py-2 border">{student.bursaryStatus || 'No'}</td>
                  <td className="px-4 py-2 border text-right">{formatNumber(student.balancePrevTerm)}</td>
                  <td className="px-4 py-2 border text-right">{formatNumber(student.feesPayable)}</td>
                  <td className="px-4 py-2 border text-right">{formatNumber(student.stationery)}</td>
                  <td className="px-4 py-2 border text-right">{formatNumber(student.totalExpected)}</td>
                  <td className="px-4 py-2 border text-right">{formatNumber(student.feesPaid)}</td>
                  <td className="px-4 py-2 border text-right">{formatNumber(student.balance)}</td>
                  <td className="px-4 py-2 border text-left">{student.comments}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="bg-gray-200 font-bold">
                <td className="px-4 py-2 text-right" colSpan={4}>TOTALS:</td>
                <td className="px-4 py-2 border text-right">{formatNumber(totals.prevTerm)}</td>
                <td className="px-4 py-2 border text-right">{formatNumber(totals.feesPayable)}</td>
                <td className="px-4 py-2 border text-right">{formatNumber(totals.stationery)}</td>
                <td className="px-4 py-2 border text-right">{formatNumber(totals.expected)}</td>
                <td className="px-4 py-2 border text-right">{formatNumber(totals.feesPaid)}</td>
                <td className="px-4 py-2 border text-right">{formatNumber(totals.balance)}</td>
                <td className="px-4 py-2 border"></td>
              </tr>
            </tfoot>
          </table>
        </div>

        {showEditDialog && editedStudent && (
          <div className="fixed inset-0 bg-gray-800 bg-opacity-75 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-lg w-3/4 md:w-1/2 p-6 max-h-[90vh] overflow-y-auto">
              <h3 className="text-lg font-semibold mb-4">Edit Student Fees Details</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Student Name</label>
                  <input type="text" value={editedStudent.name} readOnly className="mt-1 block w-full rounded-md border border-gray-300 bg-gray-50 p-2" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">School Pay Code</label>
                  <input type="text" value={editedStudent.schoolPayCode} readOnly className="mt-1 block w-full rounded-md border border-gray-300 bg-gray-50 p-2" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Balance Prev. Term</label>
                  <input type="text" value={formatNumber(editedStudent.balancePrevTerm)} readOnly className="mt-1 block w-full rounded-md border border-gray-300 bg-gray-50 p-2" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Fees Payable</label>
                  <input type="text" value={formatNumber(editedStudent.feesPayable)} readOnly className="mt-1 block w-full rounded-md border border-gray-300 bg-gray-50 p-2" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Stationery</label>
                  <input type="text" value={formatNumber(editedStudent.stationery)} readOnly className="mt-1 block w-full rounded-md border border-gray-300 bg-gray-50 p-2" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Total Expected</label>
                  <input type="text" value={formatNumber(editedStudent.totalExpected)} readOnly className="mt-1 block w-full rounded-md border border-gray-300 bg-gray-50 p-2" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Fees Paid</label>
                  <input
                    type="number"
                    value={paymentFeesPaid.toString()} // Use paymentFeesPaid for controlled input
                    onChange={(e) => handleFeesPaidChange(e.target.value)}
                    className="mt-1 block w-full rounded-md border border-gray-300 p-2"
                    placeholder="Enter fees paid"
                    min="0"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Balance</label>
                  <input type="text" value={formatNumber(editedStudent.totalExpected - paymentFeesPaid)} readOnly className="mt-1 block w-full rounded-md border border-gray-300 bg-gray-50 p-2" />
                </div>
                <div className="col-span-1 md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700">Comments</label>
                  <textarea
                    value={editedStudent.comments}
                    onChange={(e) =>
                      setEditedStudent(prev => prev ? { ...prev, comments: e.target.value } : prev)
                    }
                    rows={3}
                    className="mt-1 block w-full rounded-md border border-gray-300 p-2"
                  />
                </div>
              </div>
              
              <div className="col-span-1 md:col-span-2 mt-4 border-t pt-4">
                <h4 className="font-semibold mb-2">Payment / Correction</h4>
                {!editedStudent?.id ? (
                  <div className="p-4 bg-yellow-100 border border-yellow-300 rounded text-yellow-800 mb-2">
                    <p className="text-sm">
                      This student does not have an existing fees record for this term/year. 
                      Saving will create a new record. The initial payment (if any, as entered in Fees Paid above) will be logged automatically by the backend if Fees Paid {'>'} 0.
                    </p>
                  </div>
                ) : null}
              </div>

              <div className="flex justify-end mt-6">
                <button
                  onClick={closeDialog}
                  className="bg-gray-300 text-gray-700 px-4 py-2 rounded-md mr-2 hover:bg-gray-400"
                  disabled={isLoading || editLoading}
                >
                  Cancel
                </button>
                <button
                  onClick={async () => {
                    if (!editedStudent) return;
                    if (paymentFeesPaid < 0) {
                      showDialog('Invalid Fees Paid', 'Fees paid cannot be negative. Please correct the value.', 'warning');
                      return;
                    }
                    if (paymentFeesPaid > editedStudent.totalExpected) {
                      showDialog('Invalid Fees Paid', 'Fees paid cannot be greater than total expected. Please check values.', 'warning');
                      return;
                    }
                    const finalBalance = editedStudent.totalExpected - paymentFeesPaid;
                    let saveOk = false;
                    try {
                      if (!editedStudent.id) { 
                        const createPayload = {
                          studentFees: [{
                            studentId: editedStudent.studentId,
                            name: editedStudent.name,
                            schoolPayCode: editedStudent.schoolPayCode,
                            balancePrevTerm: editedStudent.balancePrevTerm,
                            feesPayable: editedStudent.feesPayable,
                            stationery: editedStudent.stationery,
                            totalExpected: editedStudent.totalExpected,
                            feesPaid: paymentFeesPaid,
                            balance: finalBalance,
                            comments: editedStudent.comments,
                          }]
                        };
                        await apiFetch(`${env.BACKEND_API_URL}/api/v1/fees/class-fees?classId=${classId}&termId=${termId}&academicYearId=${academicYearId}`, {
                          method: 'POST',
                          body: JSON.stringify(createPayload),
                        });
                        saveOk = true;
                      } else { 
                        const updatePayload = {
                          feesPaid: paymentFeesPaid,
                          balance: finalBalance,
                          comments: editedStudent.comments,
                          totalExpected: editedStudent.totalExpected,
                        };
                        await apiFetch(`${env.BACKEND_API_URL}/api/v1/fees/fees/${editedStudent.id}`, {
                          method: 'PUT',
                          body: JSON.stringify(updatePayload),
                        });
                        // IMPORTANT: Based on the database records, we can see that the backend
                        // is ALREADY automatically creating payment records when we update the fees paid amount.
                        // Creating another explicit payment record here would cause duplicates.
                        // 
                        // If in the future you need to create explicit payment records with specific receipt numbers,
                        // you would need to modify the backend to NOT automatically create payment records
                        // when updating the main fees record.
                        //
                        // const paymentDifference = paymentFeesPaid - prevFeesPaid;
                        // if (paymentDifference !== 0) {
                        //     await apiFetch(`/api/v1/fees/fees/${editedStudent.id}/payments`, {
                        //         method: 'POST',
                        //         body: JSON.stringify({
                        //             amount: paymentDifference,
                        //             method: 'CASH',
                        //             receiptNumber: nextReceiptNumber,
                        //             transactionRef: nextTransactionRef,
                        //         }),
                        //     });
                        // }
                        saveOk = true;
                      }

                      if (saveOk) {
                        showDialog('Success', 'Data saved successfully!', 'info');
                        await fetchClassFeesData(); 
                        if (editedStudent.id) { 
                             try {
                                // Refresh payment history to reflect any changes made by the backend
                                const paymentsData = await apiFetch(`${env.BACKEND_API_URL}/api/v1/fees/fees/${editedStudent.id}/payments`);
                                setPayments(paymentsData.payments || []);
                                
                                // Since we're no longer explicitly creating payment records in this component,
                                // we don't need to update receipt numbers here
                                /* 
                                // Only uncomment this if you re-enable explicit payment creation above
                                if(paymentFeesPaid !== prevFeesPaid){
                                    const match = nextReceiptNumber.match(/REC(\d+)/);
                                    let nextNum = 1;
                                    if (match) nextNum = parseInt(match[1], 10) + 1;
                                    setNextReceiptNumber(`REC${nextNum.toString().padStart(5, '0')}`);
                                    setNextTransactionRef(`TXN-${Date.now()}-${Math.floor(Math.random() * 10000)}`);
                                }
                                */
                             } catch (e) { setPayments([]);}
                        }
                        setPrevFeesPaid(paymentFeesPaid);
                        // setEditedStudent(prev => prev ? { ...prev, feesPaid: paymentFeesPaid, balance: finalBalance } : prev); // Handled by refetch
                        closeDialog(); 
                      }
                    } catch (err: any) {
                      showDialog('Error', 'Failed to save data: ' + (err?.message || 'Unknown error'), 'warning');
                    }
                  }}
                  className="bg-blue-500 text-white px-4 py-2 rounded-md hover:bg-blue-600 disabled:bg-blue-300"
                  disabled={isLoading || editLoading}
                >
                  {isLoading ? 'Saving...' : 'Save'}
                </button>
              </div>
              
              {editedStudent?.id && (
                <div className="mt-8">
                  <h5 className="font-semibold mb-2">Payment History</h5>
                  {payments.length === 0 ? (
                    <div className="text-gray-500">No payments recorded yet.</div>
                  ) : (
                    <table className="min-w-full bg-white border border-gray-300 rounded mb-2 text-xs">
                      <thead>
                        <tr className="bg-gray-100">
                          <th className="px-2 py-1 border">#</th>
                          <th className="px-2 py-1 border">Amount</th>
                          <th className="px-2 py-1 border">Date</th>
                          <th className="px-2 py-1 border">Method</th>
                          <th className="px-2 py-1 border">Receipt No.</th>
                          <th className="px-2 py-1 border">Txn Ref</th>
                          <th className="px-2 py-1 border no-print">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {payments.map((p, idx) => (
                          <tr key={p.id} className="text-center">
                            <td className="border px-2 py-1">{idx + 1}</td>
                            <td className="border px-2 py-1 text-right">
                              {editPaymentId === p.id ? (
                                <input
                                  type="number"
                                  value={editAmount}
                                  onChange={e => setEditAmount(Number(e.target.value))}
                                  className="w-full border rounded px-1 text-xs"
                                />
                              ) : formatNumber(p.amount)}
                            </td>
                            <td className="border px-2 py-1">
                              {editPaymentId === p.id ? (
                                <input
                                  type="date"
                                  value={editDate}
                                  onChange={e => setEditDate(e.target.value)}
                                  className="w-full border rounded px-1 text-xs"
                                />
                              ) : (p.paymentDate ? new Date(p.paymentDate).toLocaleDateString() : '')}
                            </td>
                            <td className="border px-2 py-1">
                              {editPaymentId === p.id ? (
                                <select
                                  value={editMethod}
                                  onChange={e => setEditMethod(e.target.value)}
                                  className="w-full border rounded px-1 text-xs"
                                >
                                  <option value="">Select Method</option>
                                  <option value="CASH">Cash</option>
                                  <option value="BANK_TRANSFER">Bank Transfer</option>
                                  <option value="MOBILE_MONEY">Mobile Money</option>
                                  <option value="CHEQUE">Cheque</option>
                                  <option value="ONLINE_PAYMENT">Online Payment</option>
                                </select>
                              ) : (p.paymentMethod || '')}
                            </td>
                            <td className="border px-2 py-1">
                              {editPaymentId === p.id ? (
                                <div className="flex">
                                  <input
                                    type="text"
                                    value={editReceipt.match(/^(REC|INV)/) ? editReceipt.match(/^(REC|INV)/)![0] : 'REC'}
                                    onChange={e => {
                                      const prefix = e.target.value;
                                      const numMatch = editReceipt.match(/\d+$/);
                                      const numPart = numMatch ? numMatch[0] : '';
                                      setEditReceipt(prefix + numPart);
                                    }}
                                    className="w-1/3 border rounded-l px-1 text-xs"
                                  />
                                  <input
                                    type="text"
                                    value={editReceipt.replace(/^(REC|INV)/, '')}
                                    onChange={e => {
                                      const prefixMatch = editReceipt.match(/^(REC|INV)/);
                                      const prefix = prefixMatch ? prefixMatch[0] : '';
                                      setEditReceipt(prefix + e.target.value);
                                    }}
                                    className="w-2/3 border-t border-b border-r rounded-r px-1 text-xs"
                                  />
                                </div>
                              ) : (p.receiptNumber || '')}
                            </td>
                            <td className="border px-2 py-1">
                              {editPaymentId === p.id ? (
                                <input
                                  type="text"
                                  value={editTxn}
                                  onChange={e => setEditTxn(e.target.value)}
                                  className="w-full border rounded px-1 text-xs"
                                />
                              ) : (p.transactionRef || '')}
                            </td>
                            <td className="border px-2 py-1 no-print">
                              {editPaymentId === p.id ? (
                                <div className="flex gap-1">
                                  <button
                                    className="text-green-600 hover:underline text-xs px-1"
                                    disabled={editLoading}
                                    onClick={async () => {
                                      // setEditLoading(true); Handled by apiFetch
                                      try {
                                        const result = await apiFetch(`/api/v1/fees/payments/${p.id}`, {
                                          method: 'PUT',
                                          body: JSON.stringify({
                                            amount: editAmount,
                                            paymentDate: editDate ? new Date(editDate).toISOString() : null,
                                            paymentMethod: editMethod,
                                            receiptNumber: editReceipt,
                                            transactionRef: editTxn
                                          }),
                                          headers: { 'X-Is-Edit-Loading': 'true' } as any,
                                        });
                                        
                                        // If we get here, the request was successful
                                        setEditPaymentId(null);
                                        // setEditLoading(false); Handled by apiFetch
                                        const paymentsData = await apiFetch(`${env.BACKEND_API_URL}/api/v1/fees/fees/${editedStudent.id}/payments`);
                                        setPayments(paymentsData.payments || []);
                                        await fetchClassFeesData(); // Refresh student fees details
                                        showDialog('Payment Updated', 'Payment updated successfully.', 'info');
                                      } catch (err: any) {
                                        // Check if the error message actually indicates success
                                        if (err.message && (err.message.toLowerCase().includes('success') || 
                                            err.message.toLowerCase().includes('updated') || 
                                            err.message.toLowerCase().includes('edited'))) {
                                          // This is actually a success message
                                          setEditPaymentId(null);
                                          const paymentsData = await apiFetch(`${env.BACKEND_API_URL}/api/v1/fees/fees/${editedStudent.id}/payments`);
                                          setPayments(paymentsData.payments || []);
                                          await fetchClassFeesData(); // Refresh student fees details
                                          showDialog('Payment Updated', 'Payment updated successfully.', 'info');
                                        } else {
                                          // This is a genuine error
                                          showDialog('Error Updating Payment', 'Failed to edit payment: ' + (err.message || err), 'warning');
                                        }
                                        // setEditLoading(false); Handled by apiFetch
                                      }
                                    }}
                                  >Save</button>
                                  <button
                                    className="text-gray-500 hover:underline text-xs px-1"
                                    disabled={editLoading}
                                    onClick={() => setEditPaymentId(null)}
                                  >Cancel</button>
                                </div>
                              ) : (
                                <div className="flex gap-1">
                                  <button
                                    className="text-blue-600 hover:underline text-xs px-1"
                                    disabled={editLoading}
                                    onClick={() => {
                                      setEditPaymentId(p.id);
                                      setEditAmount(p.amount || 0);
                                      setEditDate(p.paymentDate ? p.paymentDate.split('T')[0] : '');
                                      setEditMethod(p.paymentMethod || '');
                                      setEditReceipt(p.receiptNumber || '');
                                      setEditTxn(p.transactionRef || '');
                                    }}
                                  >Edit</button>
                                  <button
                                    className="text-red-500 hover:underline text-xs px-1"
                                    disabled={editLoading}
                                    onClick={async () => {
                                      showConfirmDialog(
                                        'Delete Payment', 
                                        'Are you sure you want to delete this payment? This action might affect the student\'s overall fees paid and balance.',
                                        async () => {
                                          // setEditLoading(true); Handled by apiFetch
                                          try {
                                            const result = await apiFetch(`/api/v1/fees/payments/${p.id}`, { 
                                              method: 'DELETE',
                                              headers: { 'X-Is-Edit-Loading': 'true' } as any,
                                            });
                                            // setEditLoading(false); Handled by apiFetch
                                            const paymentsData = await apiFetch(`${env.BACKEND_API_URL}/api/v1/fees/fees/${editedStudent.id}/payments`);
                                            setPayments(paymentsData.payments || []);
                                            await fetchClassFeesData(); // Refresh student fees details
                                            showDialog('Payment Deleted', 'Payment deleted successfully.', 'info');
                                          } catch (err: any) {
                                            // Check if the error message actually indicates success
                                            if (err.message && (err.message.toLowerCase().includes('success') || 
                                                err.message.toLowerCase().includes('deleted') || 
                                                err.message.toLowerCase().includes('removed') || 
                                                err.message.toLowerCase().includes('updated'))) {
                                              // This is actually a success message
                                              const paymentsData = await apiFetch(`${env.BACKEND_API_URL}/api/v1/fees/fees/${editedStudent.id}/payments`);
                                              setPayments(paymentsData.payments || []);
                                              await fetchClassFeesData(); // Refresh student fees details
                                              showDialog('Payment Deleted', 'Payment deleted successfully.', 'info');
                                            } else {
                                              // This is a genuine error
                                              showDialog('Error Deleting Payment', 'Failed to delete payment: ' + (err.message || err), 'warning');
                                            }
                                            // setEditLoading(false); Handled by apiFetch
                                          }
                                        },
                                        'delete'
                                      );
                                    }}
                                  >Del</button>
                                </div>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot>
                        <tr className="font-bold bg-gray-100">
                          <td className="border px-2 py-1 text-right" colSpan={1}>Total Payments:</td>
                          <td className="border px-2 py-1 text-right">{formatNumber(payments.reduce((sum, p) => sum + (p.amount || 0), 0))}</td>
                          <td className="border px-2 py-1" colSpan={4}></td>
                          <td className="border px-2 py-1 no-print"></td>
                        </tr>
                      </tfoot>
                    </table>
                  )}
                  <div className="text-sm text-gray-700">
                    <span className="font-semibold">Current Fees Paid (as per main record): </span>{formatNumber(editedStudent.feesPaid)}
                    {payments.reduce((sum, p) => sum + (p.amount || 0), 0) !== editedStudent.feesPaid && (
                      <span className="ml-2 text-red-500 font-semibold">(Warning: Sum of payments in history does not match total Fees Paid on record!)</span>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
      <DialogBox
        isOpen={dialogState.isOpen}
        title={dialogState.title}
        message={dialogState.message}
        type={dialogState.type}
        confirmText={dialogState.confirmText}
        cancelText={dialogState.cancelText}
        onConfirm={dialogState.onConfirm}
        onCancel={dialogState.onCancel}
      />
    </div>
  );
};

const CreateFeesStatementPageWrapper = () => {
  return (
    <Suspense fallback={<div className="p-4 w-full h-full flex justify-center items-center"><p>Loading fees statement...</p></div>}>
      <CreateFeesStatementView />
    </Suspense>
  );
};

export default CreateFeesStatementPageWrapper;