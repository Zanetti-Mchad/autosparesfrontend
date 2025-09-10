'use client';

import React, { useEffect, useState } from 'react';
import { env } from '@/env';
import { ArrowLeft, Edit, Trash2, Eye, Printer, Search, Plus, RefreshCw } from 'lucide-react';
import Link from 'next/link';

interface GradingRow {
  endMarks: number;
  grade: number;
  comment: string;
}

interface GradingScale {
  id: string;
  classId: string;
  academicYearId?: string;
  termId?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  createdById: string;
  gradingRows: GradingRow[];
  class?: {
    id: string;
    name: string;
    section?: string;
  };
  academicYear?: {
    id: string;
    year: string;
  };
  term?: {
    id: string;
    name: string;
  };
  createdBy?: {
    id: string;
    first_name: string;
    last_name: string;
  };
}

interface ClassInfo {
  id: string;
  name: string;
  section?: string;
}

interface AcademicYear {
  id: string;
  year: string;
  isActive: boolean;
}

interface Term {
  id: string;
  name: string;
  isActive: boolean;
}

interface AcademicYearResponse {
  success: boolean;
  years: AcademicYear[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    pages: number;
  };
}

interface TermResponse {
  success: boolean;
  term: {
    id: string;
    name: string;
    isActive: boolean;
  };
}

const ViewGradingScales: React.FC = () => {
  const [gradingScales, setGradingScales] = useState<GradingScale[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedScale, setSelectedScale] = useState<GradingScale | null>(null);
  const [viewMode, setViewMode] = useState<'list' | 'detail' | 'edit'>('list');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [statusType, setStatusType] = useState<'success' | 'error'>('success');
  const [editData, setEditData] = useState<GradingRow[]>([]);
  const [currentAcademicYear, setCurrentAcademicYear] = useState<AcademicYear | null>(null);
  const [currentTerm, setCurrentTerm] = useState<Term | null>(null);
  const [showCurrentTermOnly, setShowCurrentTermOnly] = useState<boolean>(false);

  // Fetch all grading scales
  const fetchGradingScales = async () => {
    try {
      setLoading(true);
      setError(null);

      // Get token from localStorage for authentication
      const token = localStorage.getItem('accessToken');
      if (!token) {
        setError('Authentication token not found. Please log in again.');
        setLoading(false);
        return;
      }

      // Fetch all grading scales from API
      const response = await fetch(`${env.BACKEND_API_URL}/api/v1/grading-scales`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch grading scales: ${response.status}`);
      }

      const data = await response.json();
      console.log('Grading scales data:', data);

      // Handle different possible response formats
      if (data && Array.isArray(data)) {
        // If the API returns an array directly
        setGradingScales(data);
      } else if (data && data.gradingScales && Array.isArray(data.gradingScales)) {
        // If the API returns { gradingScales: [...] }
        setGradingScales(data.gradingScales);
      } else if (data && data.data && Array.isArray(data.data)) {
        // If the API returns { data: [...] }
        setGradingScales(data.data);
      } else if (data && data.data && data.data.gradingScales && Array.isArray(data.data.gradingScales)) {
        // If the API returns { data: { gradingScales: [...] } }
        setGradingScales(data.data.gradingScales);
      } else {
        // Fallback to empty array if the structure doesn't match any expected format
        console.warn('Unexpected API response format:', data);
        setGradingScales([]);
      }
    } catch (err) {
      console.error('Error fetching grading scales:', err);
      setError('Failed to load grading scales. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Fetch current academic year and term
  const fetchCurrentAcademicYearAndTerm = async () => {
    try {
      const token = localStorage.getItem('accessToken');
      if (!token) {
        throw new Error('Authentication token not found');
      }

      // First fetch the current academic year
      const yearResponse = await fetch(`${env.BACKEND_API_URL}/api/v1/academic-years/filter`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      const yearData = await yearResponse.json();
      
      if (yearData.success && yearData.years) {
        // Find the active academic year
        const activeYear = yearData.years.find((year: AcademicYear) => year.isActive);
        if (activeYear) {
          setCurrentAcademicYear({
            id: activeYear.id,
            year: activeYear.year,
            isActive: activeYear.isActive
          });
        }
      }

      // Then fetch the current term
      const termResponse = await fetch(`${env.BACKEND_API_URL}/api/v1/term/active`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      const termData = await termResponse.json();
      
      if (termData.success && termData.term) {
        setCurrentTerm({
          id: termData.term.id,
          name: termData.term.name,
          isActive: termData.term.isActive
        });
      }
    } catch (err) {
      console.error('Error fetching current settings:', err);
      setStatusMessage('Failed to load current academic year and term');
      setStatusType('error');
    }
  };

  useEffect(() => {
    fetchGradingScales();
    fetchCurrentAcademicYearAndTerm();
  }, []);

  // Handler for viewing a specific grading scale
  const handleView = (scale: GradingScale) => {
    setSelectedScale(scale);
    setViewMode('detail');
  };

  // Handler for editing a grading scale
  const handleEdit = (scale: GradingScale) => {
    setSelectedScale(scale);
    // Sort grading rows by end marks and create a copy for editing
    if (scale.gradingRows) {
      const sortedRows = [...scale.gradingRows].sort((a, b) => a.endMarks - b.endMarks);
      setEditData(sortedRows.map(row => ({ ...row })));
    } else {
      setEditData([]);
    }
    setViewMode('edit');
  };

  // Handler for updating grading scale
  const handleUpdate = async () => {
    try {
      if (!selectedScale) return;

      setStatusMessage('Updating grading scale...');
      setStatusType('success');

      const token = localStorage.getItem('accessToken');
      if (!token) {
        throw new Error('Authentication token not found');
      }

      const response = await fetch(`${env.BACKEND_API_URL}/api/v1/grading-scales/${selectedScale.id}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          gradingRows: editData
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to update grading scale');
      }

      setStatusType('success');
      setStatusMessage('Grading scale updated successfully!');

      // Refresh data after update
      await fetchGradingScales();

      // Find and set the updated scale
      setTimeout(() => {
        setViewMode('list');
        setStatusMessage(null);
      }, 2000);

    } catch (err) {
      console.error('Error updating grading scale:', err);
      setStatusType('error');
      setStatusMessage(err instanceof Error ? err.message : 'Failed to update grading scale');
    }
  };

  // Handler for deleting a grading scale
  const handleDelete = async (scaleId: string) => {
    try {
      if (!confirm('Are you sure you want to delete this grading scale? This action cannot be undone.')) {
        return;
      }

      setLoading(true);
      setStatusMessage('Deleting grading scale...');
      setStatusType('success');

      const token = localStorage.getItem('accessToken');
      if (!token) {
        throw new Error('Authentication token not found');
      }

      const response = await fetch(`${env.BACKEND_API_URL}/api/v1/grading-scales/${scaleId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to delete grading scale');
      }

      // Refresh the list after deletion
      await fetchGradingScales();
      setStatusMessage('Grading scale deleted successfully');
      setStatusType('success');

      // Clear any selected scale if it was deleted
      if (selectedScale?.id === scaleId) {
        setSelectedScale(null);
      }

      setTimeout(() => {
        setStatusMessage(null);
      }, 3000);

    } catch (err) {
      console.error('Error deleting grading scale:', err);
      setStatusMessage(err instanceof Error ? err.message : 'Failed to delete grading scale');
      setStatusType('error');
      setLoading(false);
    }
  };

  // Handle input change in edit mode
  const handleInputChange = (index: number, field: keyof GradingRow, value: string) => {
    const newData = [...editData];
    newData[index] = {
      ...newData[index],
      [field]: field === 'comment' ? value : Number(value)
    };
    setEditData(newData);
  };

  // Back to list handler
  const handleBackToList = () => {
    setViewMode('list');
    setSelectedScale(null);
    setEditData([]);
  };

  // Print handler
  const handlePrint = () => {
    window.print();
  };

  // Filter grading scales based on search query
  const filteredScales = gradingScales.filter(scale => {
    const className = scale.class?.name?.toLowerCase() || '';
    const section = scale.class?.section?.toLowerCase() || '';
    const query = searchQuery.toLowerCase();
    return className.includes(query) || section.includes(query);
  });

  // Filter grading scales by current term
  const filteredScalesByTerm = filteredScales.filter(scale => {
    if (!showCurrentTermOnly) return true;
    return scale.termId === currentTerm?.id;
  });

  // Loading view
  if (loading && viewMode === 'list') {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="bg-white p-8 rounded-lg shadow-md">
          <p className="text-center text-gray-600">Loading grading scales...</p>
        </div>
      </div>
    );
  }

  // Detail view for a specific grading scale
  if (viewMode === 'detail' && selectedScale) {
    return (
      <div className="min-h-screen bg-gray-100 p-6">
        <div className="max-w-4xl mx-auto bg-white shadow-xl rounded-lg overflow-hidden">
          {/* Header */}
          <div className="bg-green-600 text-white p-4">
            <div className="flex items-center justify-between mb-2">
              <button
                onClick={handleBackToList}
                className="flex items-center text-white hover:text-gray-200"
              >
                <ArrowLeft className="mr-1" size={18} />
                Back to List
              </button>
              <div className="flex space-x-2">
                <button
                  onClick={() => handleEdit(selectedScale)}
                  className="flex items-center bg-blue-500 text-white px-3 py-1 rounded hover:bg-blue-600"
                >
                  <Edit className="mr-1" size={16} />
                  Edit
                </button>
                <button
                  onClick={handlePrint}
                  className="flex items-center bg-white text-green-600 px-3 py-1 rounded hover:bg-gray-100"
                >
                  <Printer className="mr-1" size={16} />
                  Print
                </button>
              </div>
            </div>
            <h1 className="text-2xl font-bold text-center">Grading Scale</h1>
            <h2 className="text-xl font-semibold text-center">
              {selectedScale.class ? `${selectedScale.class.name}${selectedScale.class.section ? ` - ${selectedScale.class.section}` : ''}` : 'Unknown Class'}
            </h2>
          </div>

          {/* Content */}
          <div className="p-6">
            <div>
              {/* Grading Scale Details */}
              <div className="grid grid-cols-2 gap-4 mb-6 text-sm">
                <div>
                  <p><span className="font-semibold">Created By:</span> {selectedScale.createdBy ? `${selectedScale.createdBy.first_name} ${selectedScale.createdBy.last_name}` : 'Unknown'}</p>
                  <p><span className="font-semibold">Created Date:</span> {new Date(selectedScale.createdAt).toLocaleDateString()}</p>
                </div>
                <div>
                  <p><span className="font-semibold">Academic Year:</span> {selectedScale.academicYear?.year || 'Not specified'}</p>
                  <p><span className="font-semibold">Term:</span> {selectedScale.term?.name || 'Not specified'}</p>
                  <p><span className="font-semibold">Status:</span> <span className={selectedScale.isActive ? 'text-green-600' : 'text-red-600'}>{selectedScale.isActive ? 'Active' : 'Inactive'}</span></p>
                </div>
              </div>

              {/* Grading Rows Table */}
              <table className="w-full border-collapse mb-6">
                <thead>
                  <tr className="bg-gray-100">
                    <th className="border p-2 text-left">End Marks</th>
                    <th className="border p-2 text-left">Grade</th>
                    <th className="border p-2 text-left">Comment</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedScale.gradingRows.sort((a, b) => a.endMarks - b.endMarks).map((row, index) => (
                    <tr key={index} className="border hover:bg-gray-50">
                      <td className="border p-2">{row.endMarks}</td>
                      <td className="border p-2">{row.grade}</td>
                      <td className="border p-2">{row.comment}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <div className="mt-8 text-sm text-gray-500 text-center">
                <p>Last updated: {new Date(selectedScale.updatedAt).toLocaleString()}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Edit view for updating a grading scale
  if (viewMode === 'edit' && selectedScale) {
    return (
      <div className="min-h-screen bg-gray-100 p-6">
        <div className="max-w-4xl mx-auto bg-white shadow-xl rounded-lg overflow-hidden">
          {/* Header */}
          <div className="bg-blue-600 text-white p-4">
            <div className="flex items-center justify-between mb-2">
              <button
                onClick={handleBackToList}
                className="flex items-center text-white hover:text-gray-200"
              >
                <ArrowLeft className="mr-1" size={18} />
                Back to List
              </button>
            </div>
            <h1 className="text-2xl font-bold text-center">Edit Grading Scale</h1>
            <h2 className="text-xl font-semibold text-center">
              {selectedScale.class ? `${selectedScale.class.name}${selectedScale.class.section ? ` - ${selectedScale.class.section}` : ''}` : 'Unknown Class'}
            </h2>
          </div>

          {/* Content */}
          <div className="p-6">
            {statusMessage && (
              <div className={`p-3 rounded-md mb-4 ${statusType === 'success' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                {statusMessage}
              </div>
            )}

            <div className="mb-6">
              <div className="grid grid-cols-3 gap-2 text-center mb-2">
                <span className="font-semibold">End marks</span>
                <span className="font-semibold">Grade</span>
                <span className="font-semibold">Comment</span>
              </div>

              <div className="space-y-4">
                {editData.map((row, index) => (
                  <div key={index} className="grid grid-cols-3 gap-2">
                    <input
                      type="number"
                      value={row.endMarks}
                      onChange={(e) => handleInputChange(index, 'endMarks', e.target.value)}
                      className="border p-2 rounded-md text-center shadow-sm bg-gray-50"
                    />
                    <input
                      type="number"
                      value={row.grade}
                      onChange={(e) => handleInputChange(index, 'grade', e.target.value)}
                      className="border p-2 rounded-md text-center shadow-sm bg-gray-50"
                    />
                    <input
                      type="text"
                      value={row.comment}
                      onChange={(e) => handleInputChange(index, 'comment', e.target.value)}
                      className="border p-2 rounded-md text-center shadow-sm bg-gray-50"
                    />
                  </div>
                ))}
              </div>

              <div className="mt-6 flex justify-end space-x-3">
                <button
                  onClick={handleBackToList}
                  className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-100"
                >
                  Cancel
                </button>
                <button
                  onClick={handleUpdate}
                  className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 shadow-md"
                >
                  Save Changes
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // List view (default)
  return (
    <div className="min-h-screen bg-gray-100 p-6">
      <div className="max-w-6xl mx-auto bg-white shadow-xl rounded-lg overflow-hidden">
        {/* Header */}
        <div className="bg-green-600 text-white p-4">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-2xl font-bold">Grading Scales</h1>
            <Link
              href="/pages/gradingscale/addgradingscale"
              className="flex items-center bg-white text-green-600 px-3 py-1 rounded hover:bg-gray-100"
            >
              <Plus className="mr-1" size={18} />
              Add New Scale
            </Link>
          </div>

          {/* Current Academic Year and Term */}
          <div className="flex justify-between mb-4">
            <p className="text-lg font-semibold text-white">
              Current Academic Year: {currentAcademicYear?.year || 'Not specified'}
            </p>
            <p className="text-lg font-semibold text-white">
              Current Term: {currentTerm?.name || 'Not specified'}
            </p>
          </div>

          {/* Search and Filter */}
          <div className="flex space-x-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-2.5 text-gray-400" size={16} />
              <input
                type="text"
                placeholder="Search by class name"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 rounded-md text-gray-800 focus:outline-none focus:ring-2 focus:ring-green-500"
              />
            </div>
            <button
              onClick={fetchGradingScales}
              className="flex items-center bg-green-700 hover:bg-green-800 text-white px-3 py-2 rounded-md"
            >
              <RefreshCw size={16} className="mr-1" />
              Refresh
            </button>
            <button
              onClick={() => setShowCurrentTermOnly(!showCurrentTermOnly)}
              className="flex items-center bg-blue-500 hover:bg-blue-600 text-white px-3 py-2 rounded-md"
            >
              {showCurrentTermOnly ? 'Show All' : 'Show Current Term Only'}
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          {statusMessage && (
            <div className={`p-3 rounded-md mb-4 ${statusType === 'success' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
              {statusMessage}
            </div>
          )}

          {error ? (
            <div className="text-center p-8 text-red-600">
              <p>{error}</p>
              <button
                onClick={fetchGradingScales}
                className="mt-4 bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
              >
                Try Again
              </button>
            </div>
          ) : filteredScalesByTerm.length === 0 ? (
            <div className="text-center p-8 text-gray-600">
              <p>{searchQuery ? 'No matching grading scales found.' : 'No grading scales have been created yet.'}</p>
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="mt-4 text-blue-600 hover:underline"
                >
                  Clear search
                </button>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              {/* Responsive Cards - Tablet (md:grid md:grid-cols-2 lg:hidden) */}
              <div className="hidden md:grid md:grid-cols-2 gap-4 mb-6 lg:hidden">
                {filteredScalesByTerm.map((scale) => (
                  <div key={scale.id} className="bg-white rounded-lg shadow border border-gray-200 p-4 flex flex-col justify-between">
                    <div className="mb-2 font-semibold text-gray-900">{scale.class ? `${scale.class.name}${scale.class.section ? ` - ${scale.class.section}` : ''}` : 'Unknown Class'}</div>
                    <div className="mb-2 text-xs text-gray-700">Academic Year: <span className="font-medium">{scale.academicYearId ? (currentAcademicYear?.year || 'Not specified') : 'Not linked to current year'}</span></div>
                    <div className="mb-2 text-xs text-gray-700">Term: <span className="font-medium">{scale.termId ? (currentTerm?.name || 'Not specified') : 'Not linked to current term'}</span></div>
                    <div className="mb-2 text-xs text-gray-700">Status: <span className={`inline-block px-2 py-1 rounded-full text-xs ${scale.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>{scale.isActive ? 'Active' : 'Inactive'}</span></div>
                    <div className="mb-2 text-xs text-gray-700">Created By: <span className="font-medium">{scale.createdBy ? `${scale.createdBy.first_name} ${scale.createdBy.last_name}` : 'Unknown'}</span></div>
                    <div className="mb-2 text-xs text-gray-700">Created Date: <span className="font-medium">{new Date(scale.createdAt).toLocaleDateString()}</span></div>
                    <div className="flex justify-center space-x-2 mt-2">
                      <button
                        onClick={() => handleView(scale)}
                        className="p-1 bg-blue-100 text-blue-600 rounded hover:bg-blue-200"
                        title="View"
                      >
                        <Eye size={16} />
                      </button>
                      <button
                        onClick={() => handleEdit(scale)}
                        className="p-1 bg-green-100 text-green-600 rounded hover:bg-green-200"
                        title="Edit"
                      >
                        <Edit size={16} />
                      </button>
                      <button
                        onClick={() => handleDelete(scale.id)}
                        className="p-1 bg-red-100 text-red-600 rounded hover:bg-red-200"
                        title="Delete"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Responsive Stacked Cards - Mobile (md:hidden) */}
              <div className="md:hidden space-y-4 mb-6">
                {filteredScalesByTerm.map((scale) => (
                  <div key={scale.id} className="bg-white rounded-lg shadow border border-gray-200 p-4 flex flex-col justify-between">
                    <div className="mb-2 font-bold text-base text-gray-800">{scale.class ? `${scale.class.name}${scale.class.section ? ` - ${scale.class.section}` : ''}` : 'Unknown Class'}</div>
                    <div className="mb-2 text-xs text-gray-700">Academic Year: <span className="font-medium">{scale.academicYearId ? (currentAcademicYear?.year || 'Not specified') : 'Not linked to current year'}</span></div>
                    <div className="mb-2 text-xs text-gray-700">Term: <span className="font-medium">{scale.termId ? (currentTerm?.name || 'Not specified') : 'Not linked to current term'}</span></div>
                    <div className="mb-2 text-xs text-gray-700">Status: <span className={`inline-block px-2 py-1 rounded-full text-xs ${scale.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>{scale.isActive ? 'Active' : 'Inactive'}</span></div>
                    <div className="mb-2 text-xs text-gray-700">Created By: <span className="font-medium">{scale.createdBy ? `${scale.createdBy.first_name} ${scale.createdBy.last_name}` : 'Unknown'}</span></div>
                    <div className="mb-2 text-xs text-gray-700">Created Date: <span className="font-medium">{new Date(scale.createdAt).toLocaleDateString()}</span></div>
                    <div className="flex justify-center space-x-2 mt-2">
                      <button
                        onClick={() => handleView(scale)}
                        className="p-1 bg-blue-100 text-blue-600 rounded hover:bg-blue-200"
                        title="View"
                      >
                        <Eye size={16} />
                      </button>
                      <button
                        onClick={() => handleEdit(scale)}
                        className="p-1 bg-green-100 text-green-600 rounded hover:bg-green-200"
                        title="Edit"
                      >
                        <Edit size={16} />
                      </button>
                      <button
                        onClick={() => handleDelete(scale.id)}
                        className="p-1 bg-red-100 text-red-600 rounded hover:bg-red-200"
                        title="Delete"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Table - Desktop Only */}
              <div className="hidden lg:block">
                <table className="min-w-full border-collapse">
                  <thead>
                    <tr className="bg-gray-100">
                      <th className="border p-3 text-left">Class</th>
                      <th className="border p-3 text-left">Academic Year</th>
                      <th className="border p-3 text-left">Term</th>
                      <th className="border p-3 text-left">Status</th>
                      <th className="border p-3 text-left">Created By</th>
                      <th className="border p-3 text-left">Created Date</th>
                      <th className="border p-3 text-center">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredScalesByTerm.map((scale) => (
                      <tr key={scale.id} className="border hover:bg-gray-50">
                        <td className="border p-3">
                          {scale.class ? `${scale.class.name}${scale.class.section ? ` - ${scale.class.section}` : ''}` : 'Unknown Class'}
                        </td>
                        <td className="border p-3">
                          {scale.academicYearId ? 
                            <span className="text-green-600 font-medium">
                              {currentAcademicYear?.year || 'Not specified'}
                            </span>
                            : 'Not linked to current year'}
                        </td>
                        <td className="border p-3">
                          {scale.termId ? 
                            <span className="text-green-600 font-medium">
                              {currentTerm?.name || 'Not specified'}
                            </span>
                            : 'Not linked to current term'}
                        </td>
                        <td className="border p-3">
                          <span className={`inline-block px-2 py-1 rounded-full text-xs ${
                            scale.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                          }`}>
                            {scale.isActive ? 'Active' : 'Inactive'}
                          </span>
                        </td>
                        <td className="border p-3">
                          {scale.createdBy ? `${scale.createdBy.first_name} ${scale.createdBy.last_name}` : 'Unknown'}
                        </td>
                        <td className="border p-3">{new Date(scale.createdAt).toLocaleDateString()}</td>
                        <td className="border p-3">
                          <div className="flex justify-center space-x-2">
                            <button
                              onClick={() => handleView(scale)}
                              className="p-1 bg-blue-100 text-blue-600 rounded hover:bg-blue-200"
                              title="View"
                            >
                              <Eye size={16} />
                            </button>
                            <button
                              onClick={() => handleEdit(scale)}
                              className="p-1 bg-green-100 text-green-600 rounded hover:bg-green-200"
                              title="Edit"
                            >
                              <Edit size={16} />
                            </button>
                            <button
                              onClick={() => handleDelete(scale.id)}
                              className="p-1 bg-red-100 text-red-600 rounded hover:bg-red-200"
                              title="Delete"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ViewGradingScales;