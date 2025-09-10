"use client";
import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import { env } from '@/env';

interface Book {
  id: string;
  title: string;
  author: string;
  quantity: number;
  availableQuantity: number;
  sectionId: string;
  isActive: boolean;
  section: {
    id: string;
    name: string;
  };
}

const BookCatalogComplete = () => {
  const [books, setBooks] = useState<Book[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [showSuccess, setShowSuccess] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editingBook, setEditingBook] = useState<Book | null>(null);
  const [addedStock, setAddedStock] = useState<number>(0);
  const [userRole, setUserRole] = useState<string | null>(null);

  useEffect(() => {
    // Get user role from token first, then fallback to user object
    const token = localStorage.getItem('accessToken');
    if (token) {
      // Try to get role from token first
      try {
        const decodedToken = JSON.parse(atob(token.split('.')[1]));
        if (decodedToken.role) {
          setUserRole(decodedToken.role);
          return;
        }
      } catch (e) {
        console.error('Error decoding token:', e);
      }

      // If not found in token, try to get from user object
      const user = JSON.parse(localStorage.getItem('user') || '{}');
      if (user.role) {
        setUserRole(user.role);
      }
    }
    fetchBooks();
  }, []);

  const fetchBooks = async () => {
    try {
      const token = localStorage.getItem('accessToken');
      if (!token) {
        throw new Error('No access token found');
      }

      const response = await fetch(`${env.BACKEND_API_URL}/api/v1/library/books?page=1&pageSize=100`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`API Error: ${response.status} - ${errorText}`);
      }

      const data = await response.json();
      setBooks(data.books || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch books');
    } finally {
      setLoading(false);
    }
  };

  const filteredBooks = books.filter(book => 
    book.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    book.author.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const openEditDialog = (bookId: string) => {
    const book = books.find(b => b.id === bookId);
    if (book) {
      setEditingBook(book);
      setAddedStock(0); // Reset added stock
      setShowModal(true);
    }
  };

  const closeEditDialog = () => {
    setShowModal(false);
    setEditingBook(null);
    setAddedStock(0);
  };

  const saveChanges = async () => {
    if (!editingBook) return;

    try {
      const token = localStorage.getItem('accessToken');
      if (!token) {
        throw new Error('No access token found');
      }

      const response = await fetch(`${env.BACKEND_API_URL}/api/v1/library/books/${editingBook.id}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          addedStock
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`API Error: ${response.status} - ${errorText}`);
      }

      // Refresh book list
      await fetchBooks();
      closeEditDialog();
      showSuccessMessage();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to update book');
    }
  };

  const deleteBook = async (bookId: string) => {
    if (!window.confirm('Are you sure you want to delete this book?')) {
      return;
    }

    try {
      const token = localStorage.getItem('accessToken');
      if (!token) {
        throw new Error('No access token found');
      }

      const response = await fetch(`${env.BACKEND_API_URL}/api/v1/library/books/${bookId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`API Error: ${response.status} - ${errorText}`);
      }

      // Refresh book list
      await fetchBooks();
      showSuccessMessage();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to delete book');
    }
  };

  const showSuccessMessage = () => {
    setShowSuccess(true);
    setTimeout(() => {
      setShowSuccess(false);
    }, 2000);
  };

  const printList = () => {
    window.print();
  };

  const downloadList = () => {
    const content = filteredBooks.map(book => 
      `${book.title},${book.author},${book.quantity},${book.availableQuantity},${book.section.name}`
    ).join('\n');
    
    const blob = new Blob([content], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'book-catalog.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-red-600">{error}</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f0f8f7] flex justify-center items-center font-sans">
      <div className="bg-white rounded-lg p-8 shadow-lg w-full max-w-6xl m-4">
        {/* Logo and Header */}
        <div className="flex flex-col items-center mb-8">
          <Image 
            src="/richdadjrschool-logo.png" 
            alt="School Logo" 
            width={80}
            height={80}
            className="mb-4 object-contain"
            priority
          />
          <h2 className="text-center text-2xl font-bold text-[#00796b]">Book Catalog</h2>
        </div>

        {/* Search and Actions */}
        <div className="flex flex-col md:flex-row justify-between items-center gap-4 mb-4">
          <input
            type="text"
            placeholder="Search for a Book by Title or Author..."
            className="flex-grow p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#00796b]"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          <div className="flex gap-2">
            <button
              onClick={printList}
              className="px-4 py-2 bg-[#00796b] text-white rounded-md hover:bg-[#005f54] transition-colors"
            >
              Print
            </button>
            <button
              onClick={downloadList}
              className="px-4 py-2 bg-[#00796b] text-white rounded-md hover:bg-[#005f54] transition-colors"
            >
              Download
            </button>
          </div>
        </div>

        {/* Table - Desktop Only */}
        <div className="overflow-x-auto hidden lg:block">
          <table className="w-full border-collapse mt-4">
            <thead>
              <tr>
                <th className="p-3 text-left bg-[#00796b] text-white border border-gray-300">No</th>
                <th className="p-3 text-left bg-[#00796b] text-white border border-gray-300">Book Title</th>
                <th className="p-3 text-left bg-[#00796b] text-white border border-gray-300">Author</th>
                <th className="p-3 text-left bg-[#00796b] text-white border border-gray-300">Total Quantity</th>
                <th className="p-3 text-left bg-[#00796b] text-white border border-gray-300">Available Quantity</th>
                <th className="p-3 text-left bg-[#00796b] text-white border border-gray-300">Borrowed</th>
                <th className="p-3 text-left bg-[#00796b] text-white border border-gray-300">Section</th>
                <th className="p-3 text-left bg-[#00796b] text-white border border-gray-300">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredBooks.map((book, index) => (
                <tr 
                  key={book.id}
                  className="even:bg-[#f8f9fa] hover:bg-[#e0f2f1] transition-colors"
                >
                  <td className="p-3 border border-gray-300">{index + 1}</td>
                  <td className="p-3 border border-gray-300">{book.title}</td>
                  <td className="p-3 border border-gray-300">{book.author}</td>
                  <td className="p-3 border border-gray-300">{book.quantity}</td>
                  <td className="p-3 border border-gray-300">{book.availableQuantity}</td>
                  <td className="p-3 border border-gray-300">{book.quantity - book.availableQuantity}</td>
                  <td className="p-3 border border-gray-300">{book.section.name}</td>
                  <td className="p-3 border border-gray-300">
                    <div className="flex gap-2">
                      <button
                        onClick={() => openEditDialog(book.id)}
                        className="px-3 py-1 bg-[#00796b] text-white rounded hover:bg-[#005f54] transition-colors"
                      >
                        Add Stock
                      </button>
                      {userRole === 'admin' && (
                        <button
                          onClick={() => deleteBook(book.id)}
                          className="px-3 py-1 bg-red-500 text-white rounded hover:bg-red-600 transition-colors"
                        >
                          Delete
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Responsive Cards - Tablet (md:grid md:grid-cols-2 lg:hidden) */}
        <div className="hidden md:grid md:grid-cols-2 gap-4 mb-6 lg:hidden">
          {filteredBooks.map((book, index) => (
            <div key={book.id} className="bg-white rounded-lg shadow border border-gray-200 p-4 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-lg font-semibold text-gray-800">{book.title}</span>
                  <span className="text-xs text-gray-500">#{index + 1}</span>
                </div>
                <div className="mb-1">
                  <span className="font-medium text-gray-700">Author: </span>
                  <span className="text-gray-600 text-sm">{book.author}</span>
                </div>
                <div className="mb-1">
                  <span className="font-medium text-gray-700">Total: </span>
                  <span className="text-gray-600 text-sm">{book.quantity}</span>
                </div>
                <div className="mb-1">
                  <span className="font-medium text-gray-700">Available: </span>
                  <span className="text-gray-600 text-sm">{book.availableQuantity}</span>
                </div>
                <div className="mb-1">
                  <span className="font-medium text-gray-700">Borrowed: </span>
                  <span className="text-gray-600 text-sm">{book.quantity - book.availableQuantity}</span>
                </div>
                <div className="mb-2">
                  <span className="font-medium text-gray-700">Section: </span>
                  <span className="text-gray-600 text-sm">{book.section.name}</span>
                </div>
              </div>
              <div className="flex gap-2 mt-2">
                <button
                  onClick={() => openEditDialog(book.id)}
                  className="bg-[#00796b] text-white px-4 py-1 rounded hover:bg-[#005f54] w-full"
                >
                  Add Stock
                </button>
                {userRole === 'admin' && (
                  <button
                    onClick={() => deleteBook(book.id)}
                    className="bg-red-500 text-white px-4 py-1 rounded hover:bg-red-600 w-full"
                  >
                    Delete
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Responsive Cards - Mobile (md:hidden) */}
        <div className="md:hidden mb-6 flex flex-col gap-4">
          {filteredBooks.map((book, index) => (
            <div key={book.id} className="bg-white rounded-lg shadow border border-gray-200 p-4 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-base font-semibold text-gray-800">{book.title}</span>
                  <span className="text-xs text-gray-500">#{index + 1}</span>
                </div>
                <div className="mb-1">
                  <span className="font-medium text-gray-700">Author: </span>
                  <span className="text-gray-600 text-sm">{book.author}</span>
                </div>
                <div className="mb-1">
                  <span className="font-medium text-gray-700">Total: </span>
                  <span className="text-gray-600 text-sm">{book.quantity}</span>
                </div>
                <div className="mb-1">
                  <span className="font-medium text-gray-700">Available: </span>
                  <span className="text-gray-600 text-sm">{book.availableQuantity}</span>
                </div>
                <div className="mb-1">
                  <span className="font-medium text-gray-700">Borrowed: </span>
                  <span className="text-gray-600 text-sm">{book.quantity - book.availableQuantity}</span>
                </div>
                <div className="mb-2">
                  <span className="font-medium text-gray-700">Section: </span>
                  <span className="text-gray-600 text-sm">{book.section.name}</span>
                </div>
              </div>
              <div className="flex gap-2 mt-2">
                <button
                  onClick={() => openEditDialog(book.id)}
                  className="bg-[#00796b] text-white px-4 py-1 rounded hover:bg-[#005f54] w-full"
                >
                  Add Stock
                </button>
                {userRole === 'admin' && (
                  <button
                    onClick={() => deleteBook(book.id)}
                    className="bg-red-500 text-white px-4 py-1 rounded hover:bg-red-600 w-full"
                  >
                    Delete
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Success Message */}
        {showSuccess && (
          <div className="fixed bottom-4 right-4 bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded">
            Action performed successfully!
          </div>
        )}

        {/* Edit Modal */}
        {showModal && (
          <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-md m-4">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold">Add Book Stock</h3>
                <button
                  onClick={closeEditDialog}
                  className="text-gray-500 hover:text-gray-700 text-2xl font-bold"
                >
                  ×
                </button>
              </div>
              <form className="space-y-4">
                <div>
                  <p className="text-md mb-2">
                    <strong>Book:</strong> {editingBook?.title}
                  </p>
                  <p className="text-sm mb-4 text-gray-600">
                    Current stock: {editingBook?.quantity} (Available: {editingBook?.availableQuantity})
                  </p>
                  <label htmlFor="addedStock" className="block text-sm font-medium text-gray-700 mb-1">
                    Add Stock Quantity:
                  </label>
                  <input
                    type="number"
                    id="addedStock"
                    value={addedStock}
                    onChange={(e) => setAddedStock(Number(e.target.value))}
                    min="1"
                    required
                    className="w-full p-2 border rounded-md focus:ring-2 focus:ring-[#00796b] focus:border-[#00796b]"
                  />
                </div>
                <button
                  type="button"
                  onClick={saveChanges}
                  className="w-full bg-[#00796b] text-white py-2 rounded-md hover:bg-[#005f54] transition-colors"
                >
                  Add Stock
                </button>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default BookCatalogComplete;