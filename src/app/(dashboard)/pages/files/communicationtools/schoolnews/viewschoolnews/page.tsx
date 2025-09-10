'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { 
  Loader2, Search, Calendar, Tag, AlertCircle, 
  ChevronLeft, ChevronRight, Edit, Eye, Plus, Trash2, User, X, FileText
} from 'lucide-react';
import { ChangeEvent, FormEvent, KeyboardEvent } from 'react';
import { env } from '@/env';

interface News {
  id: string;
  title: string;
  content: string;
  date: string;
  author: string;
  tag: string;
  createdAt: string;
  updatedAt: string;
  academicYear: {
    id: string;
    year: string;
  };
  createdBy: {
    id: string;
    first_name: string;
    last_name: string;
  };
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
    news: News[];
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

const NewsListPage = () => {
  const router = useRouter();
  const [Newss, setNewss] = useState<News[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [authToken, setAuthToken] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedNews, setSelectedNews] = useState<News | null>(null);
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
  const [editingNews, setEditingNews] = useState<News | null>(null);
  const [formData, setFormData] = useState({
    title: '',
    content: '',
    date: '',
    author: '',
    tag: ''
  });
  const [tagInput, setTagInput] = useState('');
  const [isLoadingForm, setIsLoadingForm] = useState(false);
  const [errorForm, setErrorForm] = useState<string | null>(null);

  // States for academic settings
  const [currentTerm, setCurrentTerm] = useState<Term | null>(null);
  const [currentYear, setCurrentYear] = useState<AcademicYear | null>(null);
  const [isLoadingSettings, setIsLoadingSettings] = useState(true);
  const [userPhotos, setUserPhotos] = useState<{ [id: string]: string | null }>({});

  // Format date to readable format
  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  };

  // Fetch News items
  const fetchNewss = useCallback(async (page = 1, search = '') => {
    if (!authToken) {
      setError('Authentication required');
      return;
    }

    try {
      const response = await fetch(`${env.BACKEND_API_URL}/api/v1/News`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`
        },
      });

      const data = await response.json();
      console.log('API Response:', data); // Debug log
      
      if (response.ok && data.status?.returnCode === '00' && data.data) {
        setNewss(data.data.news);
        setPagination(data.data.pagination);
        setError(null);
      } else {
        const errorMessage = data.status?.returnMessage || 'Failed to fetch News';
        setError(errorMessage);
      }
    } catch (error) {
      console.error('Error fetching News:', error);
      setError('Failed to fetch News');
    } finally {
      setIsLoading(false);
    }
  }, [authToken]);

  // Initialize on component mount
  useEffect(() => {
    const token = localStorage.getItem('accessToken');
    setAuthToken(token);
    
    if (token) {
      fetchNewss(1, searchTerm);
    }
  }, [fetchNewss, searchTerm]);

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

  // Fetch user photo
  const fetchUserPhoto = async (id: string) => {
    if (id) {
      try {
        const response = await fetch(`/api/staffuploads/${id}/photo`);
        if (response.ok) {
          const data = await response.json();
          if (data.path) {
            setUserPhotos(prev => ({ ...prev, [id]: data.path }));
          }
        } else {
          // If photo doesn't exist, just don't set the photo
          setUserPhotos(prev => ({ ...prev, [id]: null }));
        }
      } catch (error) {
        console.error('Error fetching user photo:', error);
        setUserPhotos(prev => ({ ...prev, [id]: null }));
      }
    }
  };

  // Handle search input
  const handleSearchChange = (e: ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
  };

  // Handle search submit
  const handleSearch = () => {
    fetchNewss(1, searchTerm);
  };

  // Handle page navigation
  const handlePageChange = (newPage: number) => {
    if (newPage > 0 && newPage <= pagination.totalPages) {
      fetchNewss(newPage, searchTerm);
    }
  };

  // Navigate to create News page
  const createNews = () => {
    router.push('/News/create');
  };

  // Handle selecting an News
  const handleNewsClick = (newsItem: News) => {
    // Toggle selection: if the same item is clicked, deselect it. Otherwise, select the new one.
    if (selectedNews?.id === newsItem.id) {
      setSelectedNews(null);
    } else {
      setSelectedNews(newsItem);
      fetchUserPhoto(newsItem.createdBy.id);
    }
  };

  // Edit the selected News
  const editSelectedNews = () => {
    if (selectedNews) {
      setEditingNews(selectedNews);
      setIsEditDialogOpen(true);
      
      // Format the date to YYYY-MM-DD format for HTML date input
      const formattedDate = new Date(selectedNews.date).toISOString().split('T')[0];
      
      setFormData({
        title: selectedNews.title,
        content: selectedNews.content,
        date: formattedDate,
        author: selectedNews.author,
        tag: selectedNews.tag
      });
    }
  };

  // Handle edit save success
  const handleEditSuccess = () => {
    // Refresh the News list
    fetchNewss(pagination.page, searchTerm);
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

  // Delete News
  const deleteNews = async (id: string) => {
    if (!authToken) return;
    
    setIsDeleting(true);
    setDeleteError(null);
    
    try {
      const response = await fetch(`${env.BACKEND_API_URL}/api/v1/News/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json'
        }
      });
      
      const data = await response.json();
      
      if (response.ok && data.status?.returnCode === '00') {
        // Remove the deleted News from state
        setNewss(prev => prev.filter(News => News.id !== id));
        
        // If the deleted News was selected, select another one
        if (selectedNews && selectedNews.id === id) {
          const remainingNewss = Newss.filter(News => News.id !== id);
          setSelectedNews(remainingNewss.length > 0 ? remainingNewss[0] : null);
        }
        
        setShowDeleteConfirm(null);
      } else {
        const errorMessage = data.status?.returnMessage || 'Failed to delete News';
        setDeleteError(errorMessage);
      }
    } catch (err) {
      console.error('Error deleting News:', err);
      setDeleteError('An error occurred while deleting. Please try again.');
    } finally {
      setIsDeleting(false);
    }
  };

  // Component for displaying the detailed view of a news item
  const NewsDetailView = ({ news }: { news: News }) => (
    <div className="bg-white shadow-lg rounded-lg p-6">
      <div className="flex justify-between items-start mb-4">
        <h2 className="font-semibold text-xl">{news.title}</h2>
        <div className="flex space-x-2">
          <button
            onClick={editSelectedNews}
            className="text-green-600 hover:text-green-900 focus:outline-none p-1"
            title="Edit"
          >
            <Edit className="w-5 h-5" />
          </button>
          {showDeleteConfirm === news.id ? (
            <div className="flex items-center space-x-1">
              <button
                onClick={() => deleteNews(news.id)}
                disabled={isDeleting}
                className={`bg-red-500 text-white p-1 rounded hover:bg-red-600 focus:outline-none ${
                  isDeleting ? 'opacity-50 cursor-not-allowed' : ''
                }`}
              >
                {isDeleting ? <Loader2 className="w-5 h-5 animate-spin" /> : <Trash2 className="w-5 h-5" />}
              </button>
              <button
                onClick={cancelDelete}
                className="bg-gray-200 p-1 rounded hover:bg-gray-300 focus:outline-none"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          ) : (
            <button
              onClick={() => confirmDelete(news.id)}
              className="text-red-600 hover:text-red-900 focus:outline-none p-1"
              title="Delete"
            >
              <Trash2 className="w-5 h-5" />
            </button>
          )}
        </div>
      </div>
      {deleteError && showDeleteConfirm === news.id && (
        <div className="mb-4 p-2 bg-red-100 text-red-700 rounded-md text-sm">{deleteError}</div>
      )}
      <div className="flex items-center mb-3 text-sm text-gray-600">
        {userPhotos[news.createdBy.id] ? (
          <Image
            src={userPhotos[news.createdBy.id]!}
            alt="User photo"
            width={24}
            height={24}
            className="rounded-full mr-2"
          />
        ) : (
          <div className="relative w-6 h-6 mr-2 rounded-full flex items-center justify-center bg-blue-100 text-blue-800 font-medium text-lg">
            {news.createdBy?.first_name?.[0] || ''}
            {news.createdBy?.last_name?.[0] || ''}
          </div>
        )}
        <span>{news.createdBy?.first_name} {news.createdBy?.last_name}</span>
      </div>
      <div className="flex items-center mb-3 text-sm text-gray-600">
        <Calendar className="w-4 h-4 mr-1" />
        <span>{formatDate(news.date)}</span>
      </div>
      <div className="mb-3 text-sm text-gray-600">
        <span className="font-medium">Class:</span>
      </div>
      {news.academicYear && (
        <div className="mb-3 text-sm text-gray-600">
          <span className="font-medium">Academic Year:</span> {news.academicYear.year}
        </div>
      )}
      <div className="border-t border-gray-200 pt-4 mt-4">
        <h3 className="font-medium mb-2">Details</h3>
        <p className="text-gray-700 text-sm whitespace-pre-wrap">{news.content}</p>
      </div>
      {news.tag && (
        <div className="flex flex-wrap gap-2 mt-4">
          {renderTags(news.tag.split(',').filter(tag => tag.trim() !== ''))}
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
  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoadingForm(true);
    setErrorForm(null);

    try {
      // Prepare the data in the format expected by the API
      const payload = {
        title: formData.title,
        content: formData.content,
        date: formData.date + ' 00:00:00.000', // Format date to match database format
        author: formData.author,
        tag: formData.tag
      };

      console.log("Sending update payload:", payload); // Debug log

      const response = await fetch(`${env.BACKEND_API_URL}/api/v1/News/${editingNews?.id}`, {
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
        // Refresh the News list to show the updated item
        fetchNewss();
      } else {
        const errorMessage = data.status?.returnMessage || 'Failed to update News';
        setErrorForm(errorMessage);
      }
    } catch (err) {
      console.error('Error updating News:', err);
      setErrorForm('An error occurred while updating. Please try again.');
    } finally {
      setIsLoadingForm(false);
    }
  };

  // Handle tag input change
  const handleTagChange = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      const newTag = tagInput.trim();
      if (newTag) {
        setFormData(prev => ({ ...prev, tag: prev.tag + ',' + newTag }));
        setTagInput('');
      }
    }
  };

  // Remove tag
  const removeTag = (tag: string) => {
    const tags = formData.tag.split(',').filter(t => t !== tag);
    setFormData(prev => ({ ...prev, tag: tags.join(',') }));
  };

  if (!authToken) {
    return (
      <div className="bg-gray-100 min-h-screen flex items-center justify-center p-6">
        <div className="w-full max-w-2xl bg-white rounded-lg shadow-lg p-6 text-center">
          <h2 className="text-2xl font-bold mb-4">Authentication Required</h2>
          <p className="mb-4">You need to be logged in to view News items.</p>
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
          <h1 className="text-2xl font-bold">News Board</h1>
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

        {isLoading ? (
          <div className="flex justify-center items-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
            <span className="ml-2">Loading News items...</span>
          </div>
        ) : error ? (
          <div className="bg-white rounded-lg shadow-lg p-8 text-center">
            <div className="flex justify-center mb-4">
              <AlertCircle className="w-12 h-12 text-red-500" />
            </div>
            <h2 className="text-xl font-semibold text-red-600 mb-2">Error</h2>
            <p className="text-gray-700">{error}</p>
          </div>
        ) : !Newss ? (
          <div className="bg-white rounded-lg shadow-lg p-8 text-center">
            <p className="text-gray-600 mb-4">Loading...</p>
          </div>
        ) : Newss.length === 0 ? (
          <div className="bg-white rounded-lg shadow-lg p-8 text-center">
            <p className="text-gray-600 mb-4">No News items found.</p>
          </div>
        ) : (
          <>
            {/* Main Content Section */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* News Cards */}
              <div className="lg:col-span-2 space-y-4">
                {Newss.map((newsItem, index) => (
                  <div key={newsItem.id}>
                    <div
                      className={`bg-white shadow-lg rounded-lg p-4 flex hover:bg-gray-100 cursor-pointer transition w-full min-w-0 ${
                        selectedNews?.id === newsItem.id ? 'border-2 border-blue-500' : ''
                      }`}
                      onClick={() => handleNewsClick(newsItem)}
                    >
                      <div className="flex-shrink-0 flex items-center justify-center bg-blue-100 h-16 w-16 rounded-lg mr-4">
                        <Calendar className="h-8 w-8 text-blue-500" />
                      </div>
                      <div className="flex-grow">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-blue-500 font-semibold">#{index + 1}</span>
                          <span className="text-sm text-gray-500">{formatDate(newsItem.date)}</span>
                        </div>
                        <h2 className="font-semibold text-lg">{newsItem.title}</h2>
                        <p className="text-gray-700 mt-2 text-sm line-clamp-2">{newsItem.content}</p>
                        <div className="flex items-center mb-3 text-sm text-gray-600">
                          {userPhotos[newsItem.createdBy.id] ? (
                            <Image
                              src={userPhotos[newsItem.createdBy.id]!}
                              alt="User photo"
                              width={24}
                              height={24}
                              className="rounded-full mr-2"
                            />
                          ) : (
                            <div className="relative w-6 h-6 mr-2 rounded-full flex items-center justify-center bg-blue-100 text-blue-800 font-medium text-lg">
                              {newsItem.createdBy?.first_name?.[0] || ''}
                              {newsItem.createdBy?.last_name?.[0] || ''}
                            </div>
                          )}
                          <span>{newsItem.createdBy?.first_name} {newsItem.createdBy?.last_name}</span>
                        </div>
                        <div className="mt-2 flex flex-wrap gap-1">
                          {renderTags(newsItem.tag.split(',').filter(tag => tag.trim() !== ''))}
                        </div>
                      </div>
                    </div>
                    
                    {/* Inline Expanded Detail View for Mobile */}
                    {selectedNews?.id === newsItem.id && (
                      <div className="block lg:hidden mt-1">
                        <NewsDetailView news={selectedNews} />
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

              {/* Right Column: Detailed News View for Desktop */}
              <div className="hidden lg:block">
                {selectedNews ? (
                  <NewsDetailView news={selectedNews} />
                ) : (
                  <div className="bg-white shadow-lg rounded-lg p-6 flex items-center justify-center">
                    <p className="text-gray-500">Select an News to view details</p>
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
          <div className="bg-white rounded-lg shadow-lg w-full max-w-2xl p-6 relative">
            <button
              onClick={() => setIsEditDialogOpen(false)}
              className="absolute top-4 right-4 text-gray-500 hover:text-gray-700"
            >
              <X className="w-6 h-6" />
            </button>

            <h2 className="text-xl font-bold mb-4">Edit News</h2>

            <form onSubmit={handleSubmit} className="space-y-6">
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

              <div>
                <label htmlFor="content" className="block text-sm font-medium text-gray-700 mb-1">
                  Content
                </label>
                <textarea
                  id="content"
                  value={formData.content}
                  onChange={(e) => setFormData(prev => ({ ...prev, content: e.target.value }))}
                  rows={4}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 resize-none"
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
              </div>

              <div>
                <label htmlFor="tag" className="block text-sm font-medium text-gray-700 mb-1">
                  Tags
                </label>
                <input
                  type="text"
                  id="tag"
                  value={formData.tag}
                  onChange={(e) => setFormData(prev => ({ ...prev, tag: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Comma-separated tags (e.g., exam,schedule)"
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

export default NewsListPage;