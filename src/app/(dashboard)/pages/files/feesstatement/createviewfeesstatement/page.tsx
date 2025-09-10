"use client";

import React, { useState, useEffect, useRef, useCallback } from 'react';
// import { useSearchParams } from 'next/navigation'; // Not used in this version
import { ExcelExport } from '@/components/ExcelExport'; // Adjust path if necessary
import { useReactToPrint } from 'react-to-print';
import { env } from '@/env';

// Interfaces
interface FinancialSummary {
  className: string;
  balancePrevTerm: number;
  expectedFees: number; // Fees expected for the current selected term
  paidFees: number;     // Fees paid for the current selected term
  balanceCurrentTerm: number; // Balance for the current selected term
}

interface AcademicYear {
  id: string;
  year: string; // e.g., "2024", "2025"
}

interface Term {
  id: string;
  name: string; // e.g., "Term I", "Term II"
}

interface ApiResponse<T> {
  status?: string; // "SUCCESS" or "ERROR"
  message?: string;
  data: T;
  // For paginated results if any, like from /term/filter
  docs?: T;
  totalDocs?: number;
}

// Type for financial summary totals accumulator
type TotalAccumulator = {
  balancePrevTerm: number;
  expectedFees: number;
  paidFees: number;
  balanceCurrentTerm: number;
};

const API_BASE_URL = `${env.BACKEND_API_URL}/api/v1`; // Using environment variable for consistency

// Get auth token from localStorage
const getAuthToken = (): string | null => {
  if (typeof window !== "undefined") {
    return localStorage.getItem('accessToken');
  }
  return null;
};

const ViewFeesStatement = () => {
  const [academicYears, setAcademicYears] = useState<AcademicYear[]>([]);
  const [terms, setTerms] = useState<Term[]>([]);

  const [selectedAcademicYearId, setSelectedAcademicYearId] = useState<string>('');
  const [selectedTermId, setSelectedTermId] = useState<string>('');

  const [reportTitleAcademicYear, setReportTitleAcademicYear] = useState<string>('');
  const [reportTitleTermName, setReportTitleTermName] = useState<string>('');
  
  const [summaryData, setSummaryData] = useState<FinancialSummary[]>([]);
  const [grandTotals, setGrandTotals] = useState({
    balancePrevTerm: 0,
    expectedFees: 0,
    paidFees: 0,
    balanceCurrentTerm: 0,
  });

  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>('');
  const printRef = useRef<HTMLDivElement>(null);
  // const searchParams = useSearchParams(); // Not actively used in this version

  const commonFetchHeaders = () => {
    const token = getAuthToken();
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    return headers;
  };

  // Format number as currency
  const formatNumber = (num: number | undefined) => {
    if (typeof num !== 'number' || isNaN(num)) return '0';
    return num.toLocaleString('en-US');
  };

  // Fetch Academic Years
  useEffect(() => {
    const fetchAcademicYears = async () => {
      try {
        setError('');
        console.log("Fetching academic years...");
        const response = await fetch(`${API_BASE_URL}/academic-years/filter`, { 
          headers: commonFetchHeaders(),
        });
        console.log("Academic years response status:", response.status);

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({ message: "Failed to parse error JSON" }));
          console.error("Academic years API error data:", errorData);
          throw new Error(errorData.message || `Failed to fetch academic years: ${response.statusText}`);
        }
        const result = await response.json(); // Get the full result first
        console.log("Academic years API result:", result);

        // ****** THIS IS THE KEY CHANGE ******
        // Check for 'years' array in the response
        if (result.success && result.years && Array.isArray(result.years) && result.years.length > 0) {
          console.log("Academic years found in 'years' property:", result.years);
          setAcademicYears(result.years as AcademicYear[]); // Cast to your frontend interface
          
          const currentYearStr = new Date().getFullYear().toString();
          // Find the default year, fallback to the first year in the list
          const defaultYear = 
            (result.years as AcademicYear[]).find(ay => ay.year === currentYearStr) || 
            result.years[0];
          
          console.log("Default academic year selected:", defaultYear);
          if (defaultYear) {
            setSelectedAcademicYearId(defaultYear.id);
          } else {
            console.warn("Could not determine a default academic year.");
            setSelectedAcademicYearId(''); // Clear if no default can be set
          }
          
        } else {
          console.warn("No academic years found in expected 'years' property or API call not successful. API Response:", result);
          setError(result.message || "No academic years found."); // Use API message if available
          setAcademicYears([]);
          setSelectedAcademicYearId('');
        }
      } catch (err: any) {
        console.error("Error in fetchAcademicYears catch block:", err);
        setError(err.message || 'Failed to fetch academic years');
        setAcademicYears([]);
        setSelectedAcademicYearId('');
      }
    };
    fetchAcademicYears();
  }, []); // Empty dependency array, runs once on mount

  // Fetch Terms when selectedAcademicYearId changes
  useEffect(() => {
    if (!selectedAcademicYearId) return;

    const fetchTerms = async () => {
      try {
        setLoading(true);
        setError('');
        console.log("Fetching terms for academic year:", selectedAcademicYearId);
        
        // Using the provided term filter URL structure with name=Term parameter
        const response = await fetch(
          `${API_BASE_URL}/term/filter?name=Term&academicYearId=${selectedAcademicYearId}&isActive=true&page=1&limit=10`,
          { headers: commonFetchHeaders() }
        );
        console.log("Terms response status:", response.status);
        
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({ message: "Failed to parse error JSON" }));
          console.error("Terms API error data:", errorData);
          throw new Error(errorData.message || `Failed to fetch terms: ${response.statusText}`);
        }
        
        const result = await response.json();
        console.log("Terms API result:", result);
        
        // Check different possible response structures
        if (result.docs && Array.isArray(result.docs) && result.docs.length > 0) {
          console.log("Terms found in 'docs' property:", result.docs);
          setTerms(result.docs);
          setSelectedTermId(result.docs[0].id); // Default to the first term
        } else if (result.data && Array.isArray(result.data) && result.data.length > 0) {
          console.log("Terms found in 'data' property:", result.data);
          setTerms(result.data);
          setSelectedTermId(result.data[0].id); // Default to the first term
        } else if (result.terms && Array.isArray(result.terms) && result.terms.length > 0) {
          console.log("Terms found in 'terms' property:", result.terms);
          setTerms(result.terms);
          setSelectedTermId(result.terms[0].id); // Default to the first term
        } else {
          console.warn("No terms found in API response:", result);
          setError("No terms found for the selected academic year.");
          setTerms([]);
          setSelectedTermId('');
        }
      } catch (err: any) {
        console.error("Error fetching terms:", err);
        setError(err.message || 'Failed to fetch terms');
        setTerms([]);
      } finally {
        // Loading will be set to false after financial summary fetches
      }
    };
    fetchTerms();
  }, [selectedAcademicYearId]);

  // Fetch Financial Summary Data
  const fetchFinancialSummary = useCallback(async () => {
    if (!selectedTermId || !selectedAcademicYearId) {
      setSummaryData([]);
      setGrandTotals({ balancePrevTerm: 0, expectedFees: 0, paidFees: 0, balanceCurrentTerm: 0 });
      return;
    }

    setLoading(true);
    setError('');
    try {
      console.log("Fetching financial summary for term:", selectedTermId, "and academic year:", selectedAcademicYearId);
      
      const response = await fetch(
        `${API_BASE_URL}/fees/financialsummary?termId=${selectedTermId}&academicYearId=${selectedAcademicYearId}`,
        { headers: commonFetchHeaders() }
      );
      console.log("Financial summary response status:", response.status);
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: "Failed to parse error JSON" }));
        console.error("Financial summary API error data:", errorData);
        throw new Error(errorData.message || `Failed to fetch financial summary: ${response.statusText}`);
      }
      
      const result = await response.json();
      console.log("Financial summary API result:", result);
      
      if (result.data && result.data.summary) {
        const summaryData = result.data.summary || [];
        setSummaryData(summaryData);
        setReportTitleTermName(result.data.termName || '');
        setReportTitleAcademicYear(result.data.academicYear || '');
        
        // If totals are provided by the API, use them; otherwise, calculate them
        if (result.data.totals && Object.keys(result.data.totals).length > 0) {
          console.log("Using totals from API:", result.data.totals);
          setGrandTotals(result.data.totals);
        } else {
          console.log("Calculating totals from summary data");
          // Calculate totals from summary data
          // Using the globally defined TotalAccumulator type
          
          const calculatedTotals = summaryData.reduce((acc: TotalAccumulator, row: FinancialSummary) => {
            return {
              balancePrevTerm: acc.balancePrevTerm + (row.balancePrevTerm || 0),
              expectedFees: acc.expectedFees + (row.expectedFees || 0),
              paidFees: acc.paidFees + (row.paidFees || 0),
              balanceCurrentTerm: acc.balanceCurrentTerm + (row.balanceCurrentTerm || 0)
            };
          }, { balancePrevTerm: 0, expectedFees: 0, paidFees: 0, balanceCurrentTerm: 0 });
          
          console.log("Calculated totals:", calculatedTotals);
          setGrandTotals(calculatedTotals);
        }
      } else if (result.summary) {
        // Alternative response format
        const summaryData = result.summary || [];
        setSummaryData(summaryData);
        setReportTitleTermName(result.termName || '');
        setReportTitleAcademicYear(result.academicYear || '');
        
        // If totals are provided by the API, use them; otherwise, calculate them
        if (result.totals && Object.keys(result.totals).length > 0) {
          console.log("Using totals from API (alternative format):", result.totals);
          setGrandTotals(result.totals);
        } else {
          console.log("Calculating totals from summary data (alternative format)");
          // Calculate totals from summary data
          // Using the TotalAccumulator type defined earlier
          const calculatedTotals = summaryData.reduce((acc: TotalAccumulator, row: FinancialSummary) => {
            return {
              balancePrevTerm: acc.balancePrevTerm + (row.balancePrevTerm || 0),
              expectedFees: acc.expectedFees + (row.expectedFees || 0),
              paidFees: acc.paidFees + (row.paidFees || 0),
              balanceCurrentTerm: acc.balanceCurrentTerm + (row.balanceCurrentTerm || 0)
            };
          }, { balancePrevTerm: 0, expectedFees: 0, paidFees: 0, balanceCurrentTerm: 0 });
          
          console.log("Calculated totals:", calculatedTotals);
          setGrandTotals(calculatedTotals);
        }
      } else {
        console.warn("No summary data found in API response:", result);
        setSummaryData([]);
        setGrandTotals({ balancePrevTerm: 0, expectedFees: 0, paidFees: 0, balanceCurrentTerm: 0 });
        setError(result.message || "No summary data returned.");
      }
    } catch (err: any) {
      console.error('Error fetching financial summary:', err);
      setError(err.message || 'Failed to fetch financial summary data');
      setSummaryData([]);
      setGrandTotals({ balancePrevTerm: 0, expectedFees: 0, paidFees: 0, balanceCurrentTerm: 0 });
    } finally {
      setLoading(false);
    }
  }, [selectedTermId, selectedAcademicYearId]);

  useEffect(() => {
    fetchFinancialSummary();
  }, [fetchFinancialSummary]);


  const handlePrint = useReactToPrint({
    documentTitle: `Financial Summary - ${reportTitleTermName} ${reportTitleAcademicYear}`,
    onAfterPrint: () => console.log('Printed successfully'),
    contentRef: printRef,
  });

  // Dynamic title for the page
  const pageTitle = `SUMMARY FOR FINANCIALS FOR ${reportTitleTermName.toUpperCase()} ${reportTitleAcademicYear}`;
  // The "BALANCE ARREARS TERM III 2024" part is tricky if it needs to be truly dynamic.
  // For now, it's hardcoded as per the image. You might need more sophisticated logic
  // or an API field to determine the "previous term" label.
  const subTitle = `& BALANCE ARREARS (PREVIOUS)`;


  const excelMappingFunction = (row: FinancialSummary, index: number) => {
    // Determine previous term label dynamically if possible, otherwise use a generic one.
    // This is a simplified example.
    const prevTermLabel = `Balance (Previous)`;
    const currentTermLabel = `${reportTitleTermName} ${reportTitleAcademicYear}`;

    return {
      'No.': index + 1,
      'Class': row.className,
      [prevTermLabel]: formatNumber(row.balancePrevTerm),
      [`Expected ${currentTermLabel}`]: formatNumber(row.expectedFees),
      [`Paid ${currentTermLabel}`]: formatNumber(row.paidFees),
      [`Balance ${currentTermLabel}`]: formatNumber(row.balanceCurrentTerm)
    };
  };


  return (
    <div className="p-8">
      <h1 className="text-center font-bold text-xl mb-2">RICH DAD JUNIOR SCHOOL</h1>
      <h2 className="text-center font-semibold mb-6">{pageTitle} {summaryData.length > 0 ? subTitle : ''}</h2>
      
      <div className="flex flex-wrap justify-between items-center mb-6 gap-4">
        <div className="flex gap-4">
          <div>
            <label htmlFor="academicYear" className="block text-sm font-medium text-gray-700">Academic Year</label>
            <select
              id="academicYear"
              value={selectedAcademicYearId}
              onChange={(e) => setSelectedAcademicYearId(e.target.value)}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
              disabled={academicYears.length === 0}
            >
              <option value="" disabled>Select Year</option>
              {academicYears.map(ay => (
                <option key={ay.id} value={ay.id}>{ay.year}</option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="term" className="block text-sm font-medium text-gray-700">Term</label>
            <select
              id="term"
              value={selectedTermId}
              onChange={(e) => setSelectedTermId(e.target.value)}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
              disabled={terms.length === 0 || !selectedAcademicYearId}
            >
              <option value="" disabled>Select Term</option>
              {terms.map(t => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
            </select>
          </div>
        </div>
        <div className="flex justify-end items-center gap-2 mt-4 md:mt-0">
          <button 
            onClick={() => handlePrint()}
            className="px-4 py-2 bg-teal-700 text-white rounded hover:bg-teal-800 flex items-center gap-2"
            disabled={loading || summaryData.length === 0}
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 6 2 18 2 18 9"></polyline><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path><rect x="6" y="14" width="12" height="8"></rect></svg>
            Print Summary
          </button>
          
          <ExcelExport
            data={summaryData}
            filename={`Financial_Summary_${reportTitleTermName?.replace(/\s+/g, '_')}_${reportTitleAcademicYear}`}
            sheetName="Financial Summary"
            buttonText="Export Excel"
            mappingFunction={excelMappingFunction}
            disabled={loading || summaryData.length === 0}
            buttonClassName="px-4 py-2 bg-green-700 text-white rounded hover:bg-green-800 flex items-center gap-2"
          />
        </div>
      </div>

      {error && <div className="text-center py-4 text-red-500 bg-red-100 border border-red-400 rounded mb-4">{error}</div>}

      {loading ? (
        <div className="text-center py-8">Loading financial summary data...</div>
      ) : !summaryData || summaryData.length === 0 && !error ? (
         <div className="text-center py-8 text-gray-500">No financial data available for the selected criteria.</div>
      ) : summaryData.length > 0 && (
        <div ref={printRef} className="overflow-x-auto">
          <style type="text/css" media="print">
            {`
              @media print {
                body * { font-size: 10pt; } /* Adjust as needed for print */
                .page-title-print { display: block !important; text-align: center; font-weight: bold; font-size: 14pt; margin-bottom: 5px; }
                .page-subtitle-print { display: block !important; text-align: center; font-weight: normal; font-size: 12pt; margin-bottom: 15px; }
                table { width: 100%; border-collapse: collapse; }
                th, td { border: 1px solid black; padding: 4px; text-align: left; }
                th { background-color: #f2f2f2 !important; color: black !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
                .text-right { text-align: right !important; }
                .text-center { text-align: center !important; }
                .no-print { display: none !important; }
                @page { 
                  margin: 0.75in; 
                  size: A4 landscape; /* Or portrait, adjust table content accordingly */
                } 
              }
            `}
          </style>
          {/* Print specific headers */}
          <div className="hidden print:block">
            <h1 className="page-title-print">RICH DAD JUNIOR SCHOOL</h1>
            <h2 className="page-subtitle-print">{pageTitle} {subTitle}</h2>
          </div>
          
          <table className="min-w-full bg-white border border-gray-400 shadow-md rounded-lg">
            <thead>
              <tr className="bg-gray-200 text-gray-700">
                <th className="px-4 py-2 border text-center">#</th>
                <th className="px-4 py-2 border text-left">CLASS</th>
                <th className="px-4 py-2 border text-right">BALANCE<br/>(PREVIOUS)</th>
                <th className="px-4 py-2 border text-right">EXPECTED<br/>{reportTitleTermName?.toUpperCase()} {reportTitleAcademicYear}</th>
                <th className="px-4 py-2 border text-right">PAID {reportTitleTermName?.toUpperCase()} {reportTitleAcademicYear}</th>
                <th className="px-4 py-2 border text-right">BALANCE<br/>{reportTitleTermName?.toUpperCase()} {reportTitleAcademicYear}</th>
              </tr>
            </thead>
            <tbody>
              {summaryData.map((row, index) => (
                <tr key={index} className={`${row.balanceCurrentTerm < 0 ? 'bg-green-100' : (index % 2 === 0 ? 'bg-white' : 'bg-gray-50') }`}>
                  <td className="px-4 py-2 border text-center">{index + 1}</td>
                  <td className="px-4 py-2 border text-left">{row.className}</td>
                  <td className="px-4 py-2 border text-right">{formatNumber(row.balancePrevTerm)}</td>
                  <td className="px-4 py-2 border text-right">{formatNumber(row.expectedFees)}</td>
                  <td className="px-4 py-2 border text-right">{formatNumber(row.paidFees)}</td>
                  <td className="px-4 py-2 border text-right">{formatNumber(row.balanceCurrentTerm)}</td>
                </tr>
              ))}
            </tbody>
            {summaryData.length > 0 && (
              <tfoot>
                <tr className="bg-gray-200 font-bold text-gray-800">
                  <td className="px-4 py-2 border text-center" colSpan={2}>GRAND TOTALS</td>
                  <td className="px-4 py-2 border text-right">{formatNumber(grandTotals.balancePrevTerm)}</td>
                  <td className="px-4 py-2 border text-right">{formatNumber(grandTotals.expectedFees)}</td>
                  <td className="px-4 py-2 border text-right">{formatNumber(grandTotals.paidFees)}</td>
                  <td className="px-4 py-2 border text-right">{formatNumber(grandTotals.balanceCurrentTerm)}</td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      )}
    </div>
  );
};

export default ViewFeesStatement;