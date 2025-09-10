import React, { useState, useRef } from 'react';
import * as XLSX from 'xlsx';
import { env } from '@/env';
  
interface ImportResult {
  successful: Array<{
    row: number;
    email: string;
    name: string;
  }>;
  failed: Array<{
    row: number;
    data: any;
    error: string;
  }>;
  total: number;
}

interface ExcelImportProps {
  onImportComplete?: (results: ImportResult) => void;
  apiEndpoint?: string; // Allow custom API endpoint
  importType?: 'users' | 'students'; // What type of data is being imported
}

const ExcelImport: React.FC<ExcelImportProps> = ({ 
  onImportComplete, 
  apiEndpoint = `${env.BACKEND_API_URL}/api/v1/integration/import-users-excel`,
  importType = 'users'
}) => {
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [results, setResults] = useState<ImportResult | null>(null);
  const [previewData, setPreviewData] = useState<any[]>([]);
  const [showPreview, setShowPreview] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      setResults(null);
      previewFile(selectedFile);
    }
  };

  const previewFile = async (file: File) => {
  try {
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const workbook = XLSX.read(buffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const jsonData = XLSX.utils.sheet_to_json(worksheet);

    // Normalize bursary fields for students
    if (importType === 'students') {
      jsonData.forEach((row: any) => {
        row.bursary = normalizeBoolean(row.bursary);
        row.half_bursary = normalizeBoolean(row.half_bursary);
      });
    }
    // Show only first 5 rows for preview
    setPreviewData(jsonData.slice(0, 5));
    setShowPreview(true);

    // Update the total rows count
    const totalRows = jsonData.length;
    const previewElement = document.querySelector('.text-xs.text-gray-600.mt-2');
    if (previewElement) {
      previewElement.textContent = `Total rows in file: ${totalRows}`;
    }
  } catch (error) {
    console.error('Error previewing file:', error);
    alert('Error reading Excel file. Please make sure it\'s a valid Excel file.');
  }
};

// Utility to normalize boolean-like values
function normalizeBoolean(val: any): boolean {
  if (typeof val === 'boolean') return val;
  if (typeof val === 'number') return val === 1;
  if (typeof val === 'string') {
    const v = val.trim().toLowerCase();
    return v === 'true' || v === '1';
  }
  return false;
}

  const handleImport = async () => {
    if (!file) {
      alert('Please select a file first');
      return;
    }

    setIsUploading(true);
    setResults(null);

    try {
      const formData = new FormData();
      // IMPORTANT: Make sure the field name matches what the server expects
      // The server is looking for a field named 'file'
      formData.append('file', file);
      
      console.log('Uploading file:', file.name, 'size:', file.size, 'type:', file.type);

      // Get access token if available
      const accessToken = localStorage.getItem('accessToken');
      
      // Don't set Content-Type header when sending FormData
      // The browser will set it automatically with the correct boundary
      const headers: HeadersInit = {
        'Authorization': `Bearer ${accessToken}`
      };

      const response = await fetch(apiEndpoint, {
        method: 'POST',
        headers,
        body: formData,
      });

      const responseText = await response.text();
      let data;
      try {
        data = JSON.parse(responseText);
      } catch (e) {
        console.error('Failed to parse response:', responseText);
        throw new Error('Invalid server response');
      }

      if (!response.ok) {
        throw new Error(data.error || 'Import failed');
      }

      setResults(data.results);
      
      if (onImportComplete) {
        onImportComplete(data.results);
      }
    } catch (error) {
      console.error('Import error:', error);
      // Show error in a more user-friendly way
      const errorMessage = error instanceof Error ? error.message : 'Import failed';
      setResults({
        successful: [],
        failed: [{
          row: 0,
          data: {},
          error: errorMessage
        }],
        total: 0
      });
    } finally {
      setIsUploading(false);
    }
  };

  const downloadTemplate = () => {
    if (importType === 'users') {
      // Create a comprehensive Excel template with all user fields
      const templateData = [
        {
          email: 'john.doe@example.com',
          phone: '+1234567890',
          role: 'teacher',
          password: 'password123',
          first_name: 'John',
          last_name: 'Doe',
          middle_name: 'William',
          initials: 'J.W.D',
          address: '123 Main St, City, Country',
          salary: '50000',
          utility: '5000',
          gender: 'Male',
          date_joined: '2024-01-15',
          name_of_bank: 'ABC Bank',
          account_number: '1234567890',
          mobile_money_number: '+1234567890',
          registered_name: 'John William Doe',
          staff_photo: '',
          section: 'Primary',
          hasAccess: true
        },
        {
          email: 'jane.smith@example.com',
          phone: '+0987654321',
          role: 'staff',
          password: 'password456',
          first_name: 'Jane',
          last_name: 'Smith',
          middle_name: 'Marie',
          initials: 'J.M.S',
          address: '456 Oak Ave, Town, Country',
          salary: '45000',
          utility: '4500',
          gender: 'Female',
          date_joined: '2024-02-01',
          name_of_bank: 'XYZ Bank',
          account_number: '0987654321',
          mobile_money_number: '+0987654321',
          registered_name: 'Jane Marie Smith',
          staff_photo: '',
          section: 'Secondary',
          hasAccess: true
        }
      ];

      const ws = XLSX.utils.json_to_sheet(templateData);
      
      // Set column widths for better readability
      const colWidths = [
        { wch: 25 }, // email
        { wch: 15 }, // phone
        { wch: 10 }, // role
        { wch: 12 }, // password
        { wch: 15 }, // first_name
        { wch: 15 }, // last_name
        { wch: 15 }, // middle_name
        { wch: 10 }, // initials
        { wch: 30 }, // address
        { wch: 10 }, // salary
        { wch: 10 }, // utility
        { wch: 10 }, // gender
        { wch: 12 }, // date_joined
        { wch: 15 }, // name_of_bank
        { wch: 15 }, // account_number
        { wch: 15 }, // mobile_money_number
        { wch: 20 }, // registered_name
        { wch: 15 }, // staff_photo
        { wch: 12 }, // section
        { wch: 10 }  // hasAccess
      ];
      
      ws['!cols'] = colWidths;

      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Users Template');
      XLSX.writeFile(wb, 'users_import_template.xlsx');
    } else {
      // Create a student template based on the Student model
      const templateData = [
        {
          first_name: 'JOHN',
          middle_name: 'MICHAEL',
          last_name: 'DOE',
          gender: 'male',
          dob: '2010-05-15',
          country: 'Uganda',
          class_assigned: 'P.1',
          classId: '1',  // Add classId (should match an existing class ID in your system)
          academicYearId: '1',  // Add academicYearId (should match an existing academic year ID in your system)
          lin_number: 'LIN12345',
          religion: 'Christianity',
          program: 'Day',
          bursary: 'FALSE',
          half_bursary: 'FALSE',
          fees_for_program: '500000',
          school_pay_code: 'SP12345',
          school_fees_Charged: '500000',
          discount_fees: '0',
          stationary_amount: '50000',
          fees_payable: '550000',
          address: '123 Main St, Kampala',
          student_photo: '',
          guardian1_name: 'Michael Doe',
          guardian1_relationship: 'Father',
          guardian1_phone1: '+256700123456',
          guardian2_name: 'Sarah Doe',
          guardian2_relationship: 'Mother',
          guardian2_phone1: '+256700654321'
        },
        {
          first_name: 'JANE',
          middle_name: 'ELIZABETH',
          last_name: 'SMITH',
          gender: 'female',
          dob: '2010-08-22',
          country: 'Uganda',
          class_assigned: 'P.1',
          classId: '1',  // Add classId (should match an existing class ID in your system)
          academicYearId: '1',  // Add academicYearId (should match an existing academic year ID in your system)
          lin_number: 'LIN67890',
          religion: 'Islam',
          program: 'Boarding',
          bursary: 'TRUE',
          half_bursary: 'FALSE',
          fees_for_program: '800000',
          school_pay_code: 'SP67890',
          school_fees_Charged: '800000',
          discount_fees: '400000',
          stationary_amount: '50000',
          fees_payable: '450000',
          address: '456 Oak St, Entebbe',
          student_photo: '',
          guardian1_name: 'Robert Smith',
          guardian1_relationship: 'Father',
          guardian1_phone1: '+256701234567',
          guardian2_name: 'Mary Smith',
          guardian2_relationship: 'Mother',
          guardian2_phone1: '+256707654321'
        }
      ];

      const ws = XLSX.utils.json_to_sheet(templateData);
      
      // Set column widths for better readability
      const colWidths = [
        { wch: 15 }, // first_name
        { wch: 15 }, // middle_name
        { wch: 15 }, // last_name
        { wch: 10 }, // gender
        { wch: 12 }, // dob
        { wch: 15 }, // country
        { wch: 15 }, // class_assigned
        { wch: 10 }, // classId
        { wch: 15 }, // academicYearId
        { wch: 12 }, // lin_number
        { wch: 15 }, // religion
        { wch: 12 }, // program
        { wch: 10 }, // bursary
        { wch: 10 }, // half_bursary
        { wch: 12 }, // fees_for_program
        { wch: 15 }, // school_pay_code
        { wch: 15 }, // school_fees_Charged
        { wch: 12 }, // discount_fees
        { wch: 15 }, // stationary_amount
        { wch: 12 }, // fees_payable
        { wch: 30 }, // address
        { wch: 15 }, // student_photo
        { wch: 20 }, // guardian1_name
        { wch: 15 }, // guardian1_relationship
        { wch: 15 }, // guardian1_phone1
        { wch: 20 }, // guardian2_name
        { wch: 15 }, // guardian2_relationship
        { wch: 15 }  // guardian2_phone1
      ];
      
      ws['!cols'] = colWidths;

      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Students Template');
      XLSX.writeFile(wb, 'students_import_template.xlsx');
    }
  };

  const resetImport = () => {
    setFile(null);
    setResults(null);
    setPreviewData([]);
    setShowPreview(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow-md">
      <div className="mb-6">
        <h3 className="text-lg font-semibold mb-4">
          {importType === 'users' ? 'Import Users from Excel' : 'Import Students from Excel'}
        </h3>
        
        {/* Instructions */}
        <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-md">
          <h4 className="font-medium text-blue-800 mb-2">📋 Instructions:</h4>
          <ul className="text-sm text-blue-700 space-y-1">
            <li>• Download the template to see the required format</li>
            <li>• Fill in your {importType === 'users' ? 'user' : 'student'} data following the template structure</li>
            {importType === 'users' ? (
              <>
                <li>• Required fields: <strong>email</strong> and <strong>phone</strong></li>
                <li>• Supported roles: teacher, staff, director, parent</li>
              </>
            ) : (
              <>
                <li>• Required fields: <strong>first_name</strong>, <strong>last_name</strong>, <strong>class_assigned</strong>, <strong>classId</strong>, and <strong>academicYearId</strong></li>
                <li>• Make sure phone numbers are entered as text (e.g., +256712345678)</li>
              </>
            )}
            <li>• Date format: YYYY-MM-DD (e.g., {importType === 'users' ? '2024-01-15' : '2010-05-15'})</li>
          </ul>
        </div>
        
        {/* Download Template Button */}
        <div className="mb-4">
          <button
            onClick={downloadTemplate}
            className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-md text-sm font-medium"
          >
            📥 Download Template
          </button>
          <p className="text-sm text-gray-600 mt-2">
            Download the Excel template with sample data to see the required format.
          </p>
        </div>

        {/* File Upload */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Select Excel File
          </label>
          <input
            ref={fileInputRef}
            type="file"
            accept=".xlsx,.xls"
            onChange={handleFileSelect}
            className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
          />
        </div>

        {/* File Preview */}
        {showPreview && previewData.length > 0 && (
          <div className="mb-4 p-4 bg-gray-50 rounded-md">
            <h4 className="font-medium mb-2">📊 Preview (First 5 rows):</h4>
            <div className="overflow-x-auto">
              <table className="min-w-full text-xs border border-gray-200">
                <thead>
                  <tr className="bg-gray-200">
                    {Object.keys(previewData[0]).map((key) => (
                      <th key={key} className="px-2 py-1 text-left border-r border-gray-300 font-medium">
                        {key}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {previewData.map((row, index) => (
                    <tr key={index} className="border-b border-gray-200">
                      {Object.values(row).map((value: any, cellIndex) => (
                        <td key={cellIndex} className="px-2 py-1 border-r border-gray-200">
                          {String(value).substring(0, 20)}
                          {String(value).length > 20 ? '...' : ''}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="text-xs text-gray-600 mt-2">
              Total rows in file: {previewData.length}
            </p>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-2">
          <button
            onClick={handleImport}
            disabled={!file || isUploading}
            className={`px-4 py-2 rounded-md text-white font-medium ${
              !file || isUploading
                ? 'bg-gray-400 cursor-not-allowed'
                : 'bg-green-500 hover:bg-green-600'
            }`}
          >
            {isUploading ? '⏳ Importing...' : `📤 Import ${importType === 'users' ? 'Users' : 'Students'}`}
          </button>
          
          {(file || results) && (
            <button
              onClick={resetImport}
              className="px-4 py-2 rounded-md text-gray-700 bg-gray-200 hover:bg-gray-300 font-medium"
            >
              🔄 Reset
            </button>
          )}
        </div>
      </div>

      {/* Results */}
      {results && (
        <div className="border-t pt-6">
          <h4 className="font-semibold mb-4">📈 Import Results</h4>
          
          {/* Summary Cards */}
          <div className="grid grid-cols-3 gap-4 mb-6">
            <div className="bg-blue-50 p-4 rounded-md text-center border border-blue-200">
              <div className="text-2xl font-bold text-blue-600">{results.total}</div>
              <div className="text-sm text-blue-800 font-medium">Total Rows</div>
            </div>
            <div className="bg-green-50 p-4 rounded-md text-center border border-green-200">
              <div className="text-2xl font-bold text-green-600">{results.successful.length}</div>
              <div className="text-sm text-green-800 font-medium">Successful</div>
            </div>
            <div className="bg-red-50 p-4 rounded-md text-center border border-red-200">
              <div className="text-2xl font-bold text-red-600">{results.failed.length}</div>
              <div className="text-sm text-red-800 font-medium">Failed</div>
            </div>
          </div>

          {/* Error Message */}
          {results.failed.length > 0 && results.failed[0].row === 0 && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-md">
              <p className="text-red-800">{results.failed[0].error}</p>
            </div>
          )}

          {/* Successful Imports */}
          {results.successful.length > 0 && (
            <div className="mb-6">
              <h5 className="font-medium text-green-700 mb-3 flex items-center">
                ✅ Successfully Imported {importType === 'users' ? 'Users' : 'Students'} ({results.successful.length}):
              </h5>
              <div className="bg-green-50 p-4 rounded-md max-h-48 overflow-y-auto border border-green-200">
                {results.successful.map((user, index) => (
                  <div key={index} className="text-sm text-green-800 py-1 border-b border-green-200 last:border-b-0">
                    <strong>Row {user.row}:</strong> {user.name} ({user.email})
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Failed Imports */}
          {results.failed.length > 0 && results.failed[0].row !== 0 && (
            <div>
              <h5 className="font-medium text-red-700 mb-3 flex items-center">
                ❌ Failed Imports ({results.failed.length}):
              </h5>
              <div className="bg-red-50 p-4 rounded-md max-h-48 overflow-y-auto border border-red-200">
                {results.failed.map((failure, index) => (
                  <div key={index} className="text-sm text-red-800 py-2 border-b border-red-200 last:border-b-0">
                    <div className="font-medium">Row {failure.row}:</div>
                    <div className="text-red-600 ml-2">{failure.error}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default ExcelImport; 