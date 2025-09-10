"use client";
import React, { useState, useEffect, FormEvent, ChangeEvent, useCallback, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { env } from '@/env';

interface Book {
  title: string;
  author: string;
  section: {
    name: string;
  };
  quantity: number;
  availableQuantity: number;
  id: string;
}

interface Person {
  id: string;
  name: string;
  type: 'student' | 'user';
  class?: string;
  section?: string;
}

interface FormData {
  borrower: Person | null;
  borrowerType: 'student' | 'teacher';
  selectedBook: string;
  dateTaken: string;
  notes?: string;
}

interface BookBorrowingFormProps {
  studentId?: string;
  userId?: string;
}

const BookBorrowingFormView = () => {
  const searchParams = useSearchParams();
  const studentId = searchParams?.get('studentId') || undefined;
  const userId = searchParams?.get('userId') || undefined;
  const [formData, setFormData] = useState<FormData>({
    borrower: null,
    borrowerType: 'student',
    selectedBook: '',
    dateTaken: '',
    notes: ''
  });
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [books, setBooks] = useState<Book[]>([]);
  const [showSuccess, setShowSuccess] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Person[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);

  const searchPersons = useCallback(async (query: string) => {
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }

    setSearchLoading(true);
    const token = localStorage.getItem('accessToken');
    if (!token) {
      setSearchResults([]);
      setSearchLoading(false);
      return;
    }

    try {
      let response;
      
      if (formData.borrowerType === 'student') {
        response = await fetch(`${env.BACKEND_API_URL}/api/v1/students/filter?page=1&pageSize=10000`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
      } else {
        response = await fetch(`${env.BACKEND_API_URL}/integration/users?page=1&pageSize=50`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
      }

      if (!response.ok) {
        throw new Error('Failed to fetch search results');
      }

      const data = await response.json();
      
      // Check if API response was successful
      if (data.status.returnCode !== '00') {
        throw new Error('API returned error');
      }

      const persons = formData.borrowerType === 'student'
        ? data.data.students
        : data.data.users;

      const filteredPersons = persons.filter((person: any) => 
        person.first_name.toLowerCase().includes(query.toLowerCase()) ||
        person.last_name.toLowerCase().includes(query.toLowerCase())
      ).map((person: any) => ({
        id: person.id,
        name: `${person.first_name} ${person.last_name}`,
        type: formData.borrowerType,
        class: formData.borrowerType === 'student' ? person.class_assigned : undefined,
        section: formData.borrowerType === 'teacher' ? person.section : undefined
      }));

      setSearchResults(filteredPersons);
    } catch (err) {
      console.error('Error searching persons:', err);
      setSearchResults([]);
    } finally {
      setSearchLoading(false);
    }
  }, [formData.borrowerType]);

  useEffect(() => {
    const fetchBooks = async () => {
      try {
        const token = localStorage.getItem('accessToken');
        if (!token) {
          throw new Error('No access token found');
        }

        const response = await fetch(`${env.BACKEND_API_URL}/api/v1/library/books`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });

        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`API Error: ${response.status} - ${errorText}`);
        }

        const data = await response.json();
        
        // Check if we have the expected data structure
        const books = data.books;
        if (!books || !Array.isArray(books)) {
          throw new Error('No books found in the response');
        }

        // Map the books data
        const mappedBooks = books.map((book: any) => ({
          title: book.title || 'Unknown Title',
          author: book.author || 'Unknown Author',
          section: {
            name: book.section?.name || 'Unknown Section'
          },
          quantity: book.quantity || 0,
          availableQuantity: book.availableQuantity || 0,
          id: book.id
        }));

        if (mappedBooks.length === 0) {
          throw new Error('No books found in the library');
        }

        setBooks(mappedBooks);
      } catch (err) {
        console.error('Error fetching books:', err);
        setError(err instanceof Error ? err.message : 'Failed to fetch books');
      } finally {
        setLoading(false);
      }
    };

    fetchBooks();
  }, []);

  useEffect(() => {
    if (searchQuery) {
      searchPersons(searchQuery);
    } else {
      setSearchResults([]);
    }
  }, [searchPersons, searchQuery]);

  const handleInputChange = (e: ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { id, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [id]: value
    }));
  };

  const handleBorrowerSelect = (person: Person) => {
    setFormData(prev => ({
      ...prev,
      borrower: person
    }));
    setSearchQuery('');
    setSearchResults([]);
  };

  const handleBorrowerTypeChange = (type: 'student' | 'teacher') => {
    setFormData(prev => ({
      ...prev,
      borrowerType: type,
      borrower: null // Reset selected borrower when type changes
    }));
    setSearchQuery('');
    setSearchResults([]);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!formData.borrower || !formData.selectedBook || !formData.dateTaken) {
      setError('Please fill in all required fields');
      return;
    }

    try {
      const token = localStorage.getItem('accessToken');
      if (!token) {
        throw new Error('No access token found');
      }

      // Parse the selected book data from the string
      const [bookId, title, section, author] = formData.selectedBook.split(', ');

      const response = await fetch(`${env.BACKEND_API_URL}/api/v1/library/books/borrow`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          borrowerName: formData.borrower.name,
          selectedBook: title,
          dateTaken: formData.dateTaken,
          bookId: bookId,
          borrowerId: formData.borrower.id,
          notes: formData.notes
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`API Error: ${response.status} - ${errorText}`);
      }

      // Don't check status.returnCode since it's not in the response
      // Just show success message and reset form
      setShowSuccess(true);
      
      // Reset form after 3 seconds
      setTimeout(() => {
        setShowSuccess(false);
        setFormData({
          borrower: null,
          borrowerType: 'student',
          selectedBook: '',
          dateTaken: '',
          notes: ''
        });
        setSearchQuery('');
        setSearchResults([]);
      }, 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to borrow book');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto p-6 bg-white rounded-lg shadow-lg">
      {error && (
        <div className="mb-4 p-4 bg-red-100 text-red-700 rounded-md text-center font-semibold">
          {error}
        </div>
      )}

      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold text-gray-800">Book Borrowing Entry</h2>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="flex items-center space-x-4">
          <label className="text-sm font-medium text-gray-700">
            Borrower Type:
          </label>
          <div className="flex items-center space-x-4">
            <label className="flex items-center space-x-2">
              <input
                type="radio"
                name="borrowerType"
                checked={formData.borrowerType === 'student'}
                onChange={() => handleBorrowerTypeChange('student')}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500"
              />
              <span className="text-sm font-medium text-gray-700">Student</span>
            </label>
            <label className="flex items-center space-x-2">
              <input
                type="radio"
                name="borrowerType"
                checked={formData.borrowerType === 'teacher'}
                onChange={() => handleBorrowerTypeChange('teacher')}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500"
              />
              <span className="text-sm font-medium text-gray-700">Teacher</span>
            </label>
          </div>
        </div>

        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-700">
            Borrower:
          </label>
          <div className="relative">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={`Search for a ${formData.borrowerType}`}
              className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
            {searchLoading && (
              <div className="absolute right-2 top-2 animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500"></div>
            )}
          </div>
          {searchResults.length > 0 && (
            <div className="mt-2 max-h-48 overflow-auto rounded-md border border-gray-200 bg-white">
              {searchResults.map((person) => (
                <div
                  key={person.id}
                  className={`p-2 hover:bg-gray-100 cursor-pointer ${
                    formData.borrower?.id === person.id ? 'bg-blue-50' : ''
                  }`}
                  onClick={() => handleBorrowerSelect(person)}
                >
                  <div className="flex items-center justify-between">
                    <span>{person.name}</span>
                    <span className="text-sm text-gray-500">{person.type}</span>
                    {person.class && <span className="text-sm text-gray-500">({person.class})</span>}
                    {person.section && <span className="text-sm text-gray-500">({person.section})</span>}
                  </div>
                </div>
              ))}
            </div>
          )}
          {formData.borrower && (
            <div className="mt-2 p-2 bg-blue-50 rounded-md">
              Selected: {formData.borrower.name} ({formData.borrower.type})
              {formData.borrower.class && <span className="text-sm text-gray-500">({formData.borrower.class})</span>}
              {formData.borrower.section && <span className="text-sm text-gray-500">({formData.borrower.section})</span>}
            </div>
          )}
        </div>

        <div className="space-y-2">
          <label 
            htmlFor="selectedBook"
            className="block text-sm font-medium text-gray-700"
          >
            Select a Book:
          </label>
          <select
            id="selectedBook"
            value={formData.selectedBook}
            onChange={handleInputChange}
            required
            className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="">Select a book</option>
            {books.map((book, index) => (
              <option 
                key={index} 
                value={`${book.id}, ${book.title}, ${book.section.name}, ${book.author}`}
              >
                {book.title} by {book.author} ({book.section.name})
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-2">
          <label 
            htmlFor="dateTaken"
            className="block text-sm font-medium text-gray-700"
          >
            Date Taken:
          </label>
          <input
            type="date"
            id="dateTaken"
            value={formData.dateTaken}
            onChange={handleInputChange}
            required
            className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>

        <div className="space-y-2">
          <label 
            htmlFor="notes"
            className="block text-sm font-medium text-gray-700"
          >
            Notes (optional):
          </label>
          <textarea
            id="notes"
            value={formData.notes || ''}
            onChange={handleInputChange}
            rows={2}
            className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>

        <button
          type="submit"
          className="w-full py-2 px-4 bg-blue-500 text-white rounded-md hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50"
        >
          Submit
        </button>
      </form>

      {showSuccess && (
        <div className="mt-4 p-4 bg-green-100 text-green-700 rounded-md text-center font-semibold">
          Book borrowing record has been successfully added!
        </div>
      )}
    </div>
  );
};

const BookBorrowingFormWrapper = () => {
  return (
    <Suspense fallback={<div className="p-4 w-full h-full flex justify-center items-center"><p>Loading form...</p></div>}>
      <BookBorrowingFormView />
    </Suspense>
  );
};

const BookBorrowingPage = () => {
  return <BookBorrowingFormWrapper />;
};

export default BookBorrowingPage;