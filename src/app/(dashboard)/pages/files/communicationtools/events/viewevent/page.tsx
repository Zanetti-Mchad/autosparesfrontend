'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { 
  Loader2, Search, Calendar, Tag, AlertCircle, 
  ChevronLeft, ChevronRight, Edit, Eye, Plus, Trash2, User, X, FileText, Info
} from 'lucide-react';
import DialogBox from '@/components/Dailogbox';
import { env } from '@/env';

interface Events {
  id: string;
  title: string;
  date: string;
  startTime: string;
  endTime?: string;
  targetClass: string;
  details: string;
  tags: string[];
  author: string;
  academicYearId: string;
  termId: string;
  classId: string;
  createdById: string;
  academicYear?: {
    id: string;
    year: string;
  };
  term?: {
    id: string;
    name: string;
  };
  createdAt?: string;
  updatedAt?: string;
}

interface PaginationInfo {
  page: number;
  pageSize: number;
  totalCount: number;
  totalPages: number;
  nextPage: number;
  prevPage: number;
}

interface ApiResponse {
  status: {
    returnCode: string;
    returnMessage: string;
  };
  data: {
    pagination: PaginationInfo;
    events: Events[];
  };
}

interface Term {
  id: string;
  name: string;
}

interface AcademicYear {
  id: string;
  year: string;
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
  term: Term | null;
}

const EventsListPage = () => {
  const router = useRouter();
  const [Eventss, setEventss] = useState<Events[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [authToken, setAuthToken] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedEvents, setSelectedEvents] = useState<Events | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [pagination, setPagination] = useState<PaginationInfo>({
    page: 1,
    pageSize: 10,
    totalCount: 0,
    totalPages: 0,
    nextPage: 0,
    prevPage: 0
  });
  
  // State for edit dialog
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingEvents, setEditingEvents] = useState<Events | null>(null);
  const [formData, setFormData] = useState({
    title: '',
    date: '',
    startTime: '',
    endTime: '',
    targetClass: '',
    details: '',
    tags: [] as string[],
    author: ''
  });
  const [tagInput, setTagInput] = useState('');
  const [isLoadingForm, setIsLoadingForm] = useState(false);
  const [errorForm, setErrorForm] = useState<string | null>(null);

  // States for academic settings
  const [currentTerm, setCurrentTerm] = useState<Term | null>(null);
  const [currentYear, setCurrentYear] = useState<AcademicYear | null>(null);
  const [isLoadingSettings, setIsLoadingSettings] = useState(true);

  // Format date to readable format
  const formatDate = (dateStr: string) => {
    // Handle database date format (YYYY-MM-DD HH:MM:SS.SSS)
    const date = new Date(dateStr.replace(/\s/, 'T'));
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  // Format time to 12-hour format
  const formatTime = (timeStr: string) => {
    if (!timeStr) return '';
    
    // Handle 24-hour format (HH:MM)
    const [hours, minutes] = timeStr.split(':');
    const hour = parseInt(hours);
    
    // Convert to 12-hour format
    const period = hour >= 12 ? 'PM' : 'AM';
    const hour12 = hour % 12 || 12;
    
    return `${hour12}:${minutes} ${period}`;
  };

  // Fetch Events items
  const fetchEventss = useCallback(async (page = 1, search = '') => {
    if (!authToken) {
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      
      // Build query string
      let queryParams = `page=${page}&pageSize=10&eventType=Events`;
      if (search) {
        queryParams += `&search=${encodeURIComponent(search)}`;
      }
      
      const response = await fetch(`${env.BACKEND_API_URL}/api/v1/Events?${queryParams}`, {
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json'
        }
      });
      
      const data = await response.json() as ApiResponse;
      console.log('API Response:', data); // Debug log
      
      if (response.ok && data.status?.returnCode === '00') {
        // Update to correctly access the nested data structure
        if (data.data && Array.isArray(data.data.events)) {
          const EventsItems = data.data.events;
          setEventss(EventsItems);
          
          // Select the first Events if there are any and none is currently selected
          if (EventsItems.length > 0 && !selectedEvents) {
            setSelectedEvents(EventsItems[0]);
          }
          
          // Set pagination info if available
          if (data.data.pagination) {
            setPagination(data.data.pagination);
          }
          
          setError(null);
        } else {
          console.error('Unexpected data structure:', data);
          setError('Unexpected response format from server');
        }
      } else {
        const errorMessage = data.status?.returnMessage || 'Failed to fetch Events items';
        setError(errorMessage);
      }
    } catch (err) {
      console.error('Error fetching Eventss:', err);
      setError('An error occurred while fetching Events items. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }, [authToken, selectedEvents]);

  // Initialize on component mount
  useEffect(() => {
    const token = localStorage.getItem('accessToken');
    setAuthToken(token);
    
    if (token) {
      fetchEventss(1, searchTerm);
    }
  }, [fetchEventss, searchTerm]);

  // Fetch current academic settings
  useEffect(() => {
    const fetchCurrentSettings = async () => {
      try {
        setIsLoadingSettings(true);
        const token = localStorage.getItem('accessToken');
        if (!token) {
          throw new Error("Authentication required");
        }

        // Fetch current academic year
        const yearResponse = await fetch(`${env.BACKEND_API_URL}/api/v1/academic-years/filter`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });

        const yearData: AcademicYearResponse = await yearResponse.json();
        if (yearData.success) {
          const activeYear = yearData.years.find((year: AcademicYear) => year.isActive);
          setCurrentYear(activeYear || null);
        }

        // Fetch current term
        const termResponse = await fetch(`${env.BACKEND_API_URL}/api/v1/term/active`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });

        const termData: TermResponse = await termResponse.json();
        if (termData.success && termData.term) {
          setCurrentTerm(termData.term);
        }
      } catch (error) {
        console.error("Error fetching academic settings:", error);
      } finally {
        setIsLoadingSettings(false);
      }
    };

    fetchCurrentSettings();
  }, []);

  // Handle search input
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
  };

  // Handle search submit
  const handleSearch = () => {
    fetchEventss(1, searchTerm);
  };

  // Handle page navigation
  const handlePageChange = (newPage: number) => {
    if (newPage > 0 && newPage <= pagination.totalPages) {
      fetchEventss(newPage, searchTerm);
    }
  };

  // Navigate to create Events page
  const createEvents = () => {
    router.push('/Events/create');
  };

  // Handle selecting an Events
  const handleEventsClick = (eventItem: Events) => {
    if (selectedEvents?.id === eventItem.id) {
      setSelectedEvents(null);
    } else {
      setSelectedEvents(eventItem);
    }
  };

  // Edit the selected Events
  const editSelectedEvents = () => {
    if (selectedEvents) {
      setEditingEvents(selectedEvents);
      setIsEditDialogOpen(true);
      
      // Format the date to YYYY-MM-DD format for HTML date input
      const dateObj = new Date(selectedEvents.date);
      const formattedDate = dateObj.toISOString().split('T')[0];
      
      setFormData({
        title: selectedEvents.title,
        date: formattedDate,
        startTime: selectedEvents.startTime,
        endTime: selectedEvents.endTime || '',
        targetClass: selectedEvents.targetClass,
        details: selectedEvents.details,
        tags: Array.isArray(selectedEvents.tags) ? selectedEvents.tags : [selectedEvents.tags],
        author: selectedEvents.author
      });
    }
  };

  // Handle edit save success
  const handleEditSuccess = () => {
    // Refresh the Events list
    fetchEventss(pagination.page, searchTerm);
  };

  // Show delete confirmation
  const confirmDelete = (id: string) => {
    setShowDeleteConfirm(id);
    setDeleteError(null);
  };

  // Cancel delete
  const cancelDelete = () => {
    setShowDeleteConfirm(null);
    setDeleteError(null);
  };

  // Delete Events
  const deleteEvents = async (id: string) => {
    if (!authToken) return;
    
    setIsDeleting(true);
    setDeleteError(null);
    
    try {
      const response = await fetch(`${env.BACKEND_API_URL}/api/v1/Events/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json'
        }
      });
      
      const data = await response.json();
      
      if (response.ok && data.status?.returnCode === '00') {
        // Remove the deleted Events from state
        setEventss(prev => prev.filter(Events => Events.id !== id));
        
        // If the deleted Events was selected, select another one
        if (selectedEvents && selectedEvents.id === id) {
          const remainingEventss = Eventss.filter(Events => Events.id !== id);
          setSelectedEvents(remainingEventss.length > 0 ? remainingEventss[0] : null);
        }
        
        setShowDeleteConfirm(null);
      } else {
        const errorMessage = data.status?.returnMessage || 'Failed to delete Events';
        setDeleteError(errorMessage);
      }
    } catch (err) {
      console.error('Error deleting Events:', err);
      setDeleteError('An error occurred while deleting. Please try again.');
    } finally {
      setIsDeleting(false);
    }
  };

  // Component for displaying the detailed view of an event item
  const EventDetailView = ({ event }: { event: Events }) => (
    <div className="bg-white shadow-lg rounded-lg p-6">
      <div className="flex justify-between items-start mb-4">
        <h2 className="font-semibold text-xl">{event.title}</h2>
        <div className="flex space-x-2">
          <button
            onClick={editSelectedEvents}
            className="text-green-600 hover:text-green-900 focus:outline-none p-1"
            title="Edit"
          >
            <Edit className="w-5 h-5" />
          </button>
          <button
            onClick={() => confirmDelete(event.id)}
            className="text-red-600 hover:text-red-900 focus:outline-none p-1"
            title="Delete"
          >
            <Trash2 className="w-5 h-5" />
          </button>
          <DialogBox
            isOpen={showDeleteConfirm === event.id}
            title="Delete Event?"
            message="Are you sure you want to delete this event? This action cannot be undone."
            onConfirm={() => deleteEvents(event.id)}
            onCancel={cancelDelete}
            confirmText={isDeleting ? 'Deleting...' : 'Delete'}
            cancelText="Cancel"
            type="delete"
          />
          <DialogBox
            isOpen={!!deleteError && showDeleteConfirm === event.id}
            title="Delete Error"
            message={deleteError || ''}
            onConfirm={cancelDelete}
            onCancel={cancelDelete}
            confirmText="OK"
            cancelText="Cancel"
            type="warning"
          />
        </div>
      </div>
      {deleteError && showDeleteConfirm === event.id && (
        <div className="mb-4 p-2 bg-red-100 text-red-700 rounded-md text-sm">{deleteError}</div>
      )}
      <div className="flex items-center mb-3 text-sm text-gray-600">
        <User className="w-4 h-4 mr-1" />
        <span>By {event.author}</span>
      </div>
      <div className="flex items-center mb-3 text-sm text-gray-600">
        <Calendar className="w-4 h-4 mr-1" />
        <span>
          {formatDate(event.date)} at {formatTime(event.startTime)}
          {event.endTime && ` - ${formatTime(event.endTime)}`}
        </span>
      </div>
      <div className="mb-3 text-sm text-gray-600">
        <span className="font-medium">Class:</span> {event.targetClass}
      </div>
      {event.academicYear && (
        <div className="mb-3 text-sm text-gray-600">
          <span className="font-medium">Academic Year:</span> {event.academicYear.year}
        </div>
      )}
      {event.term && (
        <div className="mb-3 text-sm text-gray-600">
          <span className="font-medium">Term:</span> {event.term.name}
        </div>
      )}
      <div className="border-t border-gray-200 pt-4 mt-4">
        <h3 className="font-medium mb-2">Details</h3>
        <p className="text-gray-700 text-sm whitespace-pre-wrap">{event.details}</p>
      </div>
      {event.tags && (
        <div className="flex flex-wrap gap-2 mt-4">
          {renderTags(event.tags)}
        </div>
      )}
    </div>
  );

  // Redirect to login if not authenticated
  const redirectToLogin = () => {
    window.location.href = '/login';
  };

  // Display tags
  const renderTags = (tags: string | string[]) => {
    if (!tags) return null;
    
    const tagArray = typeof tags === 'string' ? [tags] : tags;
    
    return tagArray.map((tag, index) => (
      tag && (
        <span
          key={index}
          className="bg-blue-100 text-blue-500 text-xs font-semibold px-2 py-1 rounded-full"
        >
          {tag}
        </span>
      )
    ));
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoadingForm(true);
    setErrorForm(null);

    try {
      // Prepare the data in the format expected by the API
      const payload = {
        title: formData.title,
        date: formData.date + ' 00:00:00.000', // Format date to match database format
        time: formData.startTime,
        endTime: formData.endTime || null,
        classId: editingEvents?.classId,
        targetClass: formData.targetClass,
        details: formData.details,
        author: formData.author,
        tags: formData.tags.join(','),    // Convert tags array to comma-separated string
        eventType: 'Events',
        academicYearId: editingEvents?.academicYearId || currentYear?.id,
        termId: editingEvents?.termId || currentTerm?.id,
        createdById: editingEvents?.createdById,
        updatedById: localStorage.getItem('userId') // Add updatedById
      };

      console.log("Sending update payload:", payload); // Debug log

      const response = await fetch(`${env.BACKEND_API_URL}/api/v1/Events/${editingEvents?.id}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      const data = await response.json();
      console.log("Update response:", data); // Debug log

      if (response.ok && data.status?.returnCode === '00') {
        handleEditSuccess();
        setIsEditDialogOpen(false);
        // Refresh the Events list to show the updated item
        fetchEventss();
      } else {
        const errorMessage = data.status?.returnMessage || 'Failed to update Events';
        setErrorForm(errorMessage);
      }
    } catch (err) {
      console.error('Error updating Events:', err);
      setErrorForm('An error occurred while updating. Please try again.');
    } finally {
      setIsLoadingForm(false);
    }
  };

  // Handle tag input change
  const handleTagChange = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      const newTag = tagInput.trim();
      if (newTag) {
        setFormData(prev => ({ ...prev, tags: [...prev.tags, newTag] }));
        setTagInput('');
      }
    }
  };

  // Remove tag
  const removeTag = (tag: string) => {
    setFormData(prev => ({ ...prev, tags: prev.tags.filter(t => t !== tag) }));
  };

  if (!authToken) {
    return (
      <div className="bg-gray-100 min-h-screen flex items-center justify-center p-6">
        <div className="w-full max-w-2xl bg-white rounded-lg shadow-lg p-6 text-center">
          <h2 className="text-2xl font-bold mb-4">Authentication Required</h2>
          <p className="mb-4">You need to be logged in to view Events items.</p>
          <button 
            onClick={redirectToLogin}
            className="bg-blue-500 text-white px-4 py-2 rounded-md hover:bg-blue-600 focus:outline-none"
          >
            Go to Login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gray-100 p-8 min-h-screen">
      <div className="container mx-auto max-w-6xl">
        
        {/* Header Section */}
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold">Events Board</h1>
          <div className="relative">
            <input
              type="text"
              placeholder="Search by Title or Author"
              value={searchTerm}
              onChange={handleSearchChange}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              className="border rounded-full px-4 py-2 text-sm w-60 focus:outline-none focus:border-gray-400"
            />
            <Search 
              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" 
              onClick={handleSearch}
            />
          </div>
        </div>

        {/* Responsive Tip */}
        <div className="block lg:hidden mb-4 p-3 bg-blue-50 border border-blue-200 text-blue-700 rounded-md text-sm">
          <p className="flex items-center">
            <Info className="w-5 h-5 mr-2 flex-shrink-0" />
            <span>Click on an event to view its details below.</span>
          </p>
        </div>

        {isLoading ? (
          <div className="flex justify-center items-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
            <span className="ml-2">Loading Events items...</span>
          </div>
        ) : error ? (
          <div className="bg-white rounded-lg shadow-lg p-8 text-center">
            <div className="flex justify-center mb-4">
              <AlertCircle className="w-12 h-12 text-red-500" />
            </div>
            <h2 className="text-xl font-semibold text-red-600 mb-2">Error</h2>
            <p className="text-gray-700">{error}</p>
          </div>
        ) : Eventss.length === 0 ? (
          <div className="bg-white rounded-lg shadow-lg p-8 text-center">
            <p className="text-gray-600 mb-4">No Events items found.</p>
          </div>
        ) : (
          <>
            {/* Main Content Section */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Left Column: Events Cards */}
              <div className="lg:col-span-2 space-y-4">
                {Eventss.map((eventItem, index) => (
                  <div key={eventItem.id}>
                    <div
                      className={`bg-white shadow-lg rounded-lg p-4 flex hover:bg-gray-100 cursor-pointer transition ${
                        selectedEvents?.id === eventItem.id ? 'border-2 border-blue-500' : ''
                      }`}
                      onClick={() => handleEventsClick(eventItem)}
                    >
                      <div className="flex-shrink-0 flex items-center justify-center bg-blue-100 h-16 w-16 rounded-lg mr-4">
                        <Calendar className="h-8 w-8 text-blue-500" />
                      </div>
                      <div className="flex-grow">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-blue-500 font-semibold">#{index + 1}</span>
                          <span className="text-sm text-gray-500">{formatDate(eventItem.date)}</span>
                        </div>
                        <h2 className="font-semibold text-lg">{eventItem.title}</h2>
                        <p className="text-sm text-gray-600">
                          By {eventItem.author} - {formatTime(eventItem.startTime)}
                        </p>
                        <p className="text-gray-700 mt-2 text-sm line-clamp-2">{eventItem.details}</p>
                        <div className="mt-2 flex flex-wrap gap-1">
                          {renderTags(eventItem.tags)}
                        </div>
                      </div>
                    </div>
                    {/* Inline Expanded Detail View for Mobile */}
                    {selectedEvents?.id === eventItem.id && (
                      <div className="block lg:hidden mt-1">
                        <EventDetailView event={selectedEvents} />
                      </div>
                    )}
                  </div>
                ))}
                
                {/* Pagination */}
                {pagination.totalPages > 1 && (
                  <div className="flex justify-between items-center mt-4 p-4 bg-white rounded-lg shadow">
                    <button
                      onClick={() => handlePageChange(pagination.prevPage)}
                      disabled={pagination.prevPage === 0}
                      className={`p-2 rounded-md focus:outline-none ${
                        pagination.prevPage === 0 
                          ? 'text-gray-400 cursor-not-allowed' 
                          : 'text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      <ChevronLeft className="w-5 h-5" />
                    </button>
                    
                    <div className="text-sm">
                      Page {pagination.page} of {pagination.totalPages}
                    </div>
                    
                    <button
                      onClick={() => handlePageChange(pagination.nextPage)}
                      disabled={pagination.nextPage === 0}
                      className={`p-2 rounded-md focus:outline-none ${
                        pagination.nextPage === 0
                          ? 'text-gray-400 cursor-not-allowed'
                          : 'text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      <ChevronRight className="w-5 h-5" />
                    </button>
                  </div>
                )}
              </div>

              {/* Right Column: Detailed Events View */}
              <div className="hidden lg:block">
                {selectedEvents ? (
                  <EventDetailView event={selectedEvents} />
                ) : (
                  <div className="bg-white shadow-lg rounded-lg p-6 flex items-center justify-center">
                    <p className="text-gray-500">Select an Events to view details</p>
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </div>
      
      {/* Edit Dialog */}
      {authToken && isEditDialogOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center">
          <div className="bg-white rounded-lg shadow-lg w-full max-w-2xl p-4 relative max-h-[80vh] overflow-y-auto">
            <button
              type="button"
              className="absolute top-2 right-2 text-gray-400 hover:text-gray-600 focus:outline-none"
              onClick={() => setIsEditDialogOpen(false)}
              aria-label="Close edit dialog"
            >
              <X className="w-6 h-6" />
            </button>
            <h2 className="text-lg font-bold mb-2">Edit Events</h2>
            <form onSubmit={handleSubmit} className="space-y-4 mt-2">
            
              {errorForm && (
                <div className="bg-red-50 border border-red-200 text-red-600 rounded-md p-3">
                  {errorForm}
                </div>
              )}

              {/* Academic Settings Section */}
              <div className="grid grid-cols-2 gap-6 mb-6">
                <div className="bg-gray-50 p-4 rounded-lg">
                  <div className="flex items-center space-x-2 mb-2">
                    <Calendar className="w-5 h-5 text-blue-500" />
                    <span className="font-medium">Academic Year</span>
                  </div>
                  <div className="text-lg font-semibold">
                    {isLoadingSettings ? 'Loading...' : currentYear?.year || 'Not set'}
                  </div>
                </div>

                <div className="bg-gray-50 p-4 rounded-lg">
                  <div className="flex items-center space-x-2 mb-2">
                    <FileText className="w-5 h-5 text-blue-500" />
                    <span className="font-medium">Current Term</span>
                  </div>
                  <div className="text-lg font-semibold">
                    {isLoadingSettings ? 'Loading...' : currentTerm?.name || 'Not set'}
                  </div>
                </div>
              </div>

              <div>
                <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-1">
                  Title
                </label>
                <input
                  type="text"
                  id="title"
                  value={formData.title}
                  onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor="date" className="block text-sm font-medium text-gray-700 mb-1">
                    Date
                  </label>
                  <input
                    type="date"
                    id="date"
                    value={formData.date}
                    onChange={(e) => setFormData(prev => ({ ...prev, date: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                    required
                  />
                </div>

                <div>
                  <label htmlFor="startTime" className="block text-sm font-medium text-gray-700 mb-1">
                    Start Time
                  </label>
                  <input
                    type="time"
                    id="startTime"
                    value={formData.startTime}
                    onChange={(e) => setFormData(prev => ({ ...prev, startTime: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                    required
                  />
                </div>
              </div>

              {/* <div>
                <label htmlFor="endTime" className="block text-sm font-medium text-gray-700 mb-1">
                  End Time (Optional)
                </label>
                <input
                  type="time"
                  id="endTime"
                  value={formData.endTime}
                  onChange={(e) => setFormData(prev => ({ ...prev, endTime: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                />
              </div> */}

              <div>
                <label htmlFor="targetClass" className="block text-sm font-medium text-gray-700 mb-1">
                  Target Class
                </label>
                <input
                  type="text"
                  id="targetClass"
                  value={formData.targetClass}
                  onChange={(e) => setFormData(prev => ({ ...prev, targetClass: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                  required
                />
              </div>

              <div>
                <label htmlFor="details" className="block text-sm font-medium text-gray-700 mb-1">
                  Details
                </label>
                <textarea
                  id="details"
                  value={formData.details}
                  onChange={(e) => setFormData(prev => ({ ...prev, details: e.target.value }))}
                  rows={4}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 resize-none"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Tags
                </label>
                <div className="flex flex-wrap gap-2 mb-2">
                  {formData.tags.map((tag, index) => (
                    <div
                      key={index}
                      className="bg-blue-100 text-blue-800 text-sm font-medium px-2.5 py-0.5 rounded-full flex items-center"
                    >
                      {tag}
                      <button
                        type="button"
                        onClick={() => removeTag(tag)}
                        className="ml-2 text-blue-400 hover:text-blue-900"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    placeholder="Add tag..."
                    value={tagInput}
                    onChange={(e) => setTagInput(e.target.value)}
                    onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>) => {
                      if (e.key === 'Enter') {
                        const newTag = tagInput.trim();
                        if (newTag) {
                          setFormData(prev => ({ ...prev, tags: [...prev.tags, newTag] }));
                          setTagInput('');
                        }
                      }
                    }}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      const newTag = tagInput.trim();
                      if (newTag) {
                        setFormData(prev => ({ ...prev, tags: [...prev.tags, newTag] }));
                        setTagInput('');
                      }
                    }}
                    className="bg-blue-500 text-white px-4 py-2 rounded-md hover:bg-blue-600 focus:outline-none"
                  >
                    Add
                  </button>
                </div>
              </div>

              <div>
                <label htmlFor="author" className="block text-sm font-medium text-gray-700 mb-1">
                  Author
                </label>
                <input
                  type="text"
                  id="author"
                  value={formData.author}
                  onChange={(e) => setFormData(prev => ({ ...prev, author: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                  required
                />
              </div>

              <div className="flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setIsEditDialogOpen(false)}
                  className="px-4 py-2 text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isLoadingForm}
                  className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isLoadingForm ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default EventsListPage;