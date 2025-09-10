"use client";
import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import { env } from '@/env';

interface Book {
  id: string;
  title: string;
  author: string;
  quantity: number;
  addedStock: number;
  availableQuantity: number;
  section: {
    id: string;
    name: string;
  };
  isEditing?: boolean;
}

const BookCatalog = () => {
  const [books, setBooks] = useState<Book[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const showSuccessMessage = (message: string) => {
    setSuccessMessage(message);
    setTimeout(() => setSuccessMessage(''), 3000);
  };

  const fetchBooks = async () => {
    try {
      const token = localStorage.getItem('accessToken');
      if (!token) {
        window.location.href = '/sign-in';
        return;
      }

      const response = await fetch(`${env.BACKEND_API_URL}/api/v1/library/books`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch books');
      }

      const data = await response.json();
      const booksWithAddedStock = data.books.map((book: Omit<Book, 'isEditing'>) => ({
        ...book,
        addedStock: book.addedStock || 0,
        isEditing: false
      }));
      setBooks(booksWithAddedStock);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch books');
    } finally {
      setLoading(false);
    }
  };

  const deleteBook = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this book?')) return;

    try {
      const token = localStorage.getItem('accessToken');
      if (!token) {
        window.location.href = '/sign-in';
        return;
      }

      const response = await fetch(`${env.BACKEND_API_URL}/api/v1/library/books/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to delete book');
      }

      setBooks(books.filter(book => book.id !== id));
      showSuccessMessage('Book deleted successfully!');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete book');
    }
  };

  const updateBook = async (book: Book & { isEditing: true }) => {
    try {
      const token = localStorage.getItem('accessToken');
      if (!token) {
        window.location.href = '/sign-in';
        return;
      }

      const response = await fetch(`${env.BACKEND_API_URL}/api/v1/library/books/${book.id}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          title: book.title,
          author: book.author,
          quantity: book.quantity,
          addedStock: book.addedStock,
          sectionId: book.section.id
        })
      });

      if (!response.ok) {
        throw new Error('Failed to update book');
      }

      // Update available quantity based on quantity and added stock
      const updatedBook = {
        ...book,
        availableQuantity: book.quantity + book.addedStock
      };
      setBooks(books.map(b => b.id === book.id ? updatedBook : b));
      showSuccessMessage('Book updated successfully!');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update book');
    }
  };

  const editBook = (id: string) => {
    setBooks(books.map(book => 
      book.id === id ? { ...book, isEditing: true } : book
    ));
  };

  const saveBook = (book: Book) => {
    updateBook(book as Book & { isEditing: true });
  };

  const handleInputChange = (id: string, field: 'title' | 'author' | 'quantity' | 'addedStock', value: string | number) => {
    setBooks(books.map(b =>
      b.id === id ? { ...b, [field]: field === 'quantity' || field === 'addedStock' ? parseInt(value as string) : value } : b
    ));
  };

  const printList = () => {
    window.print();
  };

  const downloadList = () => {
    const table = document.getElementById('bookTable');
    if (!table) {
      alert('Table element not found');
      return;
    }

    const data = `
      <html>
        <head><title>Book Catalog</title></head>
        <body>
          <h2>Book Catalog</h2>
          ${table.outerHTML}
        </body>
      </html>
    `;

    const blob = new Blob([data], { type: 'application/vnd.ms-excel' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'book_catalog.xls';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  useEffect(() => {
    fetchBooks();
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen bg-teal-50">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-teal-700"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex justify-center items-center min-h-screen bg-teal-50">
        <div className="text-red-500">{error}</div>
      </div>
    );
  }

  return (
    <div className="container p-4">
      <div className="flex justify-between items-center mb-4">
        <div className="flex items-center gap-4">
          <h2 className="text-2xl text-teal-700">Book Catalog</h2>
        </div>
        <div className="space-x-2">
          <button onClick={printList} className="bg-teal-700 text-white px-4 py-2 rounded hover:bg-teal-800">
            Print
          </button>
          <button onClick={downloadList} className="bg-teal-700 text-white px-4 py-2 rounded hover:bg-teal-800">
            Download
          </button>
        </div>
      </div>

      <div className="mb-4">
        <input
          type="text"
          className="p-2 border rounded w-full"
          placeholder="Search for a book by title..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      {successMessage && (
        <div className="bg-green-100 text-green-700 p-2 rounded mb-4">
          {successMessage}
        </div>
      )}

      {/* Table - Desktop Only */}
      <div className="overflow-x-auto hidden lg:block">
        <table id="bookTable" className="w-full border-collapse">
          <thead className="bg-gray-100">
            <tr>
              <th className="border p-2">No.</th>
              <th className="border p-2">Title</th>
              <th className="border p-2">Author</th>
              <th className="border p-2">Quantity</th>
              <th className="border p-2">Added Stock</th>
              <th className="border p-2">Available</th>
              <th className="border p-2">Section</th>
              <th className="border p-2">Actions</th>
            </tr>
          </thead>
          <tbody>
            {books
              .filter(book => 
                book.title.toLowerCase().includes(searchTerm.toLowerCase())
              )
              .map((book, index) => (
                <tr key={book.id} className="hover:bg-gray-50">
                  <td className="border p-2">{index + 1}</td>
                  <td className="border p-2">
                    {book.isEditing ? (
                      <input
                        type="text"
                        className="w-full p-1 border rounded"
                        value={book.title}
                        onChange={(e) => handleInputChange(book.id, 'title', e.target.value)}
                      />
                    ) : book.title}
                  </td>
                  <td className="border p-2">
                    {book.isEditing ? (
                      <input
                        type="text"
                        className="w-full p-1 border rounded"
                        value={book.author}
                        onChange={(e) => handleInputChange(book.id, 'author', e.target.value)}
                      />
                    ) : book.author}
                  </td>
                  <td className="border p-2">
                    {book.isEditing ? (
                      <input
                        type="number"
                        className="w-full p-1 border rounded"
                        value={book.quantity}
                        onChange={(e) => handleInputChange(book.id, 'quantity', parseInt(e.target.value))}
                      />
                    ) : book.quantity}
                  </td>
                  <td className="border p-2">
                    {book.isEditing ? (
                      <input
                        type="number"
                        className="w-full p-1 border rounded"
                        value={book.addedStock}
                        onChange={(e) => handleInputChange(book.id, 'addedStock', parseInt(e.target.value))}
                      />
                    ) : book.addedStock}
                  </td>
                  <td className="border p-2">{book.quantity + book.addedStock}</td>
                  <td className="border p-2">{book.section.name}</td>
                  <td className="border p-2">
                    {book.isEditing ? (
                      <button
                        onClick={() => saveBook(book)}
                        className="bg-teal-700 text-white px-4 py-1 rounded mr-2 hover:bg-teal-800"
                      >
                        Save
                      </button>
                    ) : (
                      <button
                        onClick={() => editBook(book.id)}
                        className="bg-teal-700 text-white px-4 py-1 rounded mr-2 hover:bg-teal-800"
                      >
                        Edit
                      </button>
                    )}
                    <button
                      onClick={() => deleteBook(book.id)}
                      className="bg-red-500 text-white px-4 py-1 rounded hover:bg-red-600"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>

      {/* Responsive Cards - Tablet (md:grid md:grid-cols-2 lg:hidden) */}
      <div className="hidden md:grid md:grid-cols-2 gap-4 mb-6 lg:hidden">
        {books
          .filter(book => book.title.toLowerCase().includes(searchTerm.toLowerCase()))
          .map((book, index) => (
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
                  <span className="font-medium text-gray-700">Quantity: </span>
                  <span className="text-gray-600 text-sm">{book.quantity}</span>
                </div>
                <div className="mb-1">
                  <span className="font-medium text-gray-700">Added Stock: </span>
                  <span className="text-gray-600 text-sm">{book.addedStock}</span>
                </div>
                <div className="mb-1">
                  <span className="font-medium text-gray-700">Available: </span>
                  <span className="text-gray-600 text-sm">{book.quantity + book.addedStock}</span>
                </div>
                <div className="mb-2">
                  <span className="font-medium text-gray-700">Section: </span>
                  <span className="text-gray-600 text-sm">{book.section.name}</span>
                </div>
              </div>
              <div className="flex gap-2 mt-2">
                {book.isEditing ? (
                  <button
                    onClick={() => saveBook(book)}
                    className="bg-teal-700 text-white px-4 py-1 rounded hover:bg-teal-800 w-full"
                  >
                    Save
                  </button>
                ) : (
                  <button
                    onClick={() => editBook(book.id)}
                    className="bg-teal-700 text-white px-4 py-1 rounded hover:bg-teal-800 w-full"
                  >
                    Edit
                  </button>
                )}
                <button
                  onClick={() => deleteBook(book.id)}
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
        {books
          .filter(book => book.title.toLowerCase().includes(searchTerm.toLowerCase()))
          .map((book, index) => (
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
                  <span className="font-medium text-gray-700">Quantity: </span>
                  <span className="text-gray-600 text-sm">{book.quantity}</span>
                </div>
                <div className="mb-1">
                  <span className="font-medium text-gray-700">Added Stock: </span>
                  <span className="text-gray-600 text-sm">{book.addedStock}</span>
                </div>
                <div className="mb-1">
                  <span className="font-medium text-gray-700">Available: </span>
                  <span className="text-gray-600 text-sm">{book.quantity + book.addedStock}</span>
                </div>
                <div className="mb-2">
                  <span className="font-medium text-gray-700">Section: </span>
                  <span className="text-gray-600 text-sm">{book.section.name}</span>
                </div>
              </div>
              <div className="flex gap-2 mt-2">
                {book.isEditing ? (
                  <button
                    onClick={() => saveBook(book)}
                    className="bg-teal-700 text-white px-4 py-1 rounded hover:bg-teal-800 w-full"
                  >
                    Save
                  </button>
                ) : (
                  <button
                    onClick={() => editBook(book.id)}
                    className="bg-teal-700 text-white px-4 py-1 rounded hover:bg-teal-800 w-full"
                  >
                    Edit
                  </button>
                )}
                <button
                  onClick={() => deleteBook(book.id)}
                  className="bg-red-500 text-white px-4 py-1 rounded hover:bg-red-600 w-full"
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
      </div>
    </div>
  );
};

export default BookCatalog;