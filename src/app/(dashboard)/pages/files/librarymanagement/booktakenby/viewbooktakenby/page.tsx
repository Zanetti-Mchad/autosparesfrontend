"use client";
import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import { env } from '@/env';

interface BookBorrowing {
  id: string;
  bookId: string;
  bookTitle: string;
  borrowerName: string;
  borrowerId: string;
  dateBorrowed: string;
  dateReturned: string | null;
  status: string;
  notes: string | null;
  section: string;
}

const BookCatalogComplete = () => {
  const [borrowings, setBorrowings] = useState<BookBorrowing[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [showSuccess, setShowSuccess] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editingBorrowing, setEditingBorrowing] = useState<BookBorrowing | null>(null);
  const [returnedDate, setReturnedDate] = useState<string>('');

  useEffect(() => {
    fetchBorrowings();
  }, []);

  const fetchBorrowings = async () => {
    try {
      const token = localStorage.getItem('accessToken');
      if (!token) {
        throw new Error('No access token found');
      }

      const response = await fetch(`${env.BACKEND_API_URL}/api/v1/library/borrowings?status=BORROWED&page=1&pageSize=100`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`API Error: ${response.status} - ${errorText}`);
      }

      const data = await response.json();
      
      // Map API response to our interface
      const mappedBorrowings = data.borrowings?.map((borrowing: any) => ({
        id: borrowing.id,
        bookId: borrowing.bookId,
        bookTitle: borrowing.book.title,
        borrowerName: borrowing.borrowerName,
        borrowerId: borrowing.studentId || borrowing.userId,
        dateBorrowed: borrowing.dateBorrowed,
        dateReturned: borrowing.dateReturned,
        status: borrowing.status,
        notes: borrowing.notes,
        section: borrowing.book.section?.name || 'Unknown Section'
      }));

      setBorrowings(mappedBorrowings || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch borrowings');
    } finally {
      setLoading(false);
    }
  };

  const filteredBorrowings = borrowings.filter(borrowing => 
    borrowing.bookTitle.toLowerCase().includes(searchTerm.toLowerCase()) ||
    borrowing.borrowerName.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const openEditDialog = (borrowingId: string) => {
    const borrowing = borrowings.find(b => b.id === borrowingId);
    if (borrowing) {
      setEditingBorrowing(borrowing);
      setReturnedDate(''); // Clear the date input
      setShowModal(true);
    }
  };

  const closeEditDialog = () => {
    setShowModal(false);
    setEditingBorrowing(null);
    setReturnedDate('');
  };

  const saveChanges = async () => {
    if (!editingBorrowing || !returnedDate) {
      alert('Please select a return date');
      return;
    }

    try {
      const token = localStorage.getItem('accessToken');
      if (!token) {
        throw new Error('No access token found');
      }

      const response = await fetch(`${env.BACKEND_API_URL}/api/v1/library/borrowings/${editingBorrowing.id}/return`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          dateReturned: returnedDate
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`API Error: ${response.status} - ${errorText}`);
      }

      // Refresh borrowings list
      await fetchBorrowings();
      closeEditDialog();
      showSuccessMessage();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to update borrowing');
    }
  };

  const deleteBorrowing = async (borrowingId: string) => {
    if (!window.confirm('Are you sure you want to delete this borrowing record?')) {
      return;
    }

    try {
      const token = localStorage.getItem('accessToken');
      if (!token) {
        throw new Error('No access token found');
      }

      const response = await fetch(`${env.BACKEND_API_URL}/api/v1/library/borrowings/${borrowingId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`API Error: ${response.status} - ${errorText}`);
      }

      // Refresh borrowings list
      await fetchBorrowings();
      showSuccessMessage();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to delete borrowing');
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
    const content = filteredBorrowings.map(borrowing => 
      `${borrowing.bookTitle},${borrowing.borrowerName},${borrowing.dateBorrowed},${borrowing.section}`
    ).join('\n');
    
    const blob = new Blob([content], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'book-borrowings.csv';
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
          <h2 className="text-center text-2xl font-bold text-[#00796b]">Book Borrowings</h2>
        </div>

        {/* Search and Actions */}
        <div className="flex flex-col md:flex-row justify-between items-center gap-4 mb-4">
          <input
            type="text"
            placeholder="Search for a Book or Borrower..."
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
                <th className="p-3 text-left bg-[#00796b] text-white border border-gray-300">Borrower Name</th>
                <th className="p-3 text-left bg-[#00796b] text-white border border-gray-300">Borrowed Date</th>
                <th className="p-3 text-left bg-[#00796b] text-white border border-gray-300">Section</th>
                <th className="p-3 text-left bg-[#00796b] text-white border border-gray-300">Status</th>
                <th className="p-3 text-left bg-[#00796b] text-white border border-gray-300">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredBorrowings.map((borrowing, index) => (
                <tr 
                  key={borrowing.id}
                  className="even:bg-[#f8f9fa] hover:bg-[#e0f2f1] transition-colors"
                >
                  <td className="p-3 border border-gray-300">{index + 1}</td>
                  <td className="p-3 border border-gray-300">{borrowing.bookTitle}</td>
                  <td className="p-3 border border-gray-300">{borrowing.borrowerName}</td>
                  <td className="p-3 border border-gray-300">{new Date(borrowing.dateBorrowed).toLocaleDateString()}</td>
                  <td className="p-3 border border-gray-300">{borrowing.section}</td>
                  <td className="p-3 border border-gray-300">
                    <span className={`px-2 py-1 rounded-full text-sm ${
                      borrowing.status === 'BORROWED' ? 'bg-blue-100 text-blue-800' :
                      borrowing.status === 'RETURNED' ? 'bg-green-100 text-green-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {borrowing.status}
                    </span>
                  </td>
                  <td className="p-3 border border-gray-300">
                    <div className="flex gap-2">
                      <button
                        onClick={() => openEditDialog(borrowing.id)}
                        className="px-3 py-1 bg-[#00796b] text-white rounded hover:bg-[#005f54] transition-colors"
                      >
                        Return
                      </button>
                      <button
                        onClick={() => deleteBorrowing(borrowing.id)}
                        className="px-3 py-1 bg-red-500 text-white rounded hover:bg-red-600 transition-colors"
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Responsive Cards - Tablet (md:grid md:grid-cols-2 lg:hidden) */}
        <div className="hidden md:grid md:grid-cols-2 gap-4 mb-6 lg:hidden">
          {filteredBorrowings.map((borrowing, index) => (
            <div key={borrowing.id} className="bg-white rounded-lg shadow border border-gray-200 p-4 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-lg font-semibold text-gray-800">{borrowing.bookTitle}</span>
                  <span className="text-xs text-gray-500">#{index + 1}</span>
                </div>
                <div className="mb-1">
                  <span className="font-medium text-gray-700">Borrower: </span>
                  <span className="text-gray-600 text-sm">{borrowing.borrowerName}</span>
                </div>
                <div className="mb-1">
                  <span className="font-medium text-gray-700">Borrowed: </span>
                  <span className="text-gray-600 text-sm">{new Date(borrowing.dateBorrowed).toLocaleDateString()}</span>
                </div>
                <div className="mb-1">
                  <span className="font-medium text-gray-700">Section: </span>
                  <span className="text-gray-600 text-sm">{borrowing.section}</span>
                </div>
                <div className="mb-2">
                  <span className="font-medium text-gray-700">Status: </span>
                  <span className={`px-2 py-1 rounded-full text-xs ${
                    borrowing.status === 'BORROWED' ? 'bg-blue-100 text-blue-800' :
                    borrowing.status === 'RETURNED' ? 'bg-green-100 text-green-800' :
                    'bg-gray-100 text-gray-800'
                  }`}>
                    {borrowing.status}
                  </span>
                </div>
              </div>
              <div className="flex gap-2 mt-2">
                <button
                  onClick={() => openEditDialog(borrowing.id)}
                  className="bg-[#00796b] text-white px-4 py-1 rounded hover:bg-[#005f54] w-full"
                >
                  Return
                </button>
                <button
                  onClick={() => deleteBorrowing(borrowing.id)}
                  className="bg-red-500 text-white px-4 py-1 rounded hover:bg-red-600 w-full"
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Responsive Cards - Mobile (md:hidden) */}
        <div className="md:hidden mb-6 flex flex-col gap-4">
          {filteredBorrowings.map((borrowing, index) => (
            <div key={borrowing.id} className="bg-white rounded-lg shadow border border-gray-200 p-4 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-base font-semibold text-gray-800">{borrowing.bookTitle}</span>
                  <span className="text-xs text-gray-500">#{index + 1}</span>
                </div>
                <div className="mb-1">
                  <span className="font-medium text-gray-700">Borrower: </span>
                  <span className="text-gray-600 text-sm">{borrowing.borrowerName}</span>
                </div>
                <div className="mb-1">
                  <span className="font-medium text-gray-700">Borrowed: </span>
                  <span className="text-gray-600 text-sm">{new Date(borrowing.dateBorrowed).toLocaleDateString()}</span>
                </div>
                <div className="mb-1">
                  <span className="font-medium text-gray-700">Section: </span>
                  <span className="text-gray-600 text-sm">{borrowing.section}</span>
                </div>
                <div className="mb-2">
                  <span className="font-medium text-gray-700">Status: </span>
                  <span className={`px-2 py-1 rounded-full text-xs ${
                    borrowing.status === 'BORROWED' ? 'bg-blue-100 text-blue-800' :
                    borrowing.status === 'RETURNED' ? 'bg-green-100 text-green-800' :
                    'bg-gray-100 text-gray-800'
                  }`}>
                    {borrowing.status}
                  </span>
                </div>
              </div>
              <div className="flex gap-2 mt-2">
                <button
                  onClick={() => openEditDialog(borrowing.id)}
                  className="bg-[#00796b] text-white px-4 py-1 rounded hover:bg-[#005f54] w-full"
                >
                  Return
                </button>
                <button
                  onClick={() => deleteBorrowing(borrowing.id)}
                  className="bg-red-500 text-white px-4 py-1 rounded hover:bg-red-600 w-full"
                >
                  Delete
                </button>
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
                <h3 className="text-lg font-semibold">Return Book</h3>
                <button
                  onClick={closeEditDialog}
                  className="text-gray-500 hover:text-gray-700 text-2xl font-bold"
                >
                  ×
                </button>
              </div>
              <form className="space-y-4">
                <div>
                  <label htmlFor="returnedDate" className="block text-sm font-medium text-gray-700 mb-1">
                    Return Date:
                  </label>
                  <input
                    type="date"
                    id="returnedDate"
                    value={returnedDate}
                    onChange={(e) => setReturnedDate(e.target.value)}
                    required
                    className="w-full p-2 border rounded-md focus:ring-2 focus:ring-[#00796b] focus:border-[#00796b]"
                  />
                </div>
                <button
                  type="button"
                  onClick={saveChanges}
                  className="w-full bg-[#00796b] text-white py-2 rounded-md hover:bg-[#005f54] transition-colors"
                >
                  Return Book
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