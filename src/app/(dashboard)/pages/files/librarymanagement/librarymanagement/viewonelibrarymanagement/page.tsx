"use client";

import Image from 'next/image';
import React, { useState, useEffect } from 'react';
import { env } from '@/env';

interface Book {
  id: string;
  title: string;
  author: string;
  quantity: number;
  availableQuantity: number;
  section: {
    id: string;
    name: string;
  };
}

interface BookCatalogResponse {
  books: Book[];
  pagination: {
    page: number;
    pageSize: number;
    totalCount: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
  };
}

const NurseryBookCatalog = () => {
  const [books, setBooks] = useState<Book[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedSection, setSelectedSection] = useState<string>('nursery');

  useEffect(() => {
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

        const data: BookCatalogResponse = await response.json();
        setBooks(data.books); // Store all books, filter later by section

      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch books');
      } finally {
        setLoading(false);
      }
    };

    fetchBooks();
  }, []);

  const printCatalog = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      alert('Failed to open print window');
      return;
    }

    const content = document.getElementById('print-content');
    if (!content) {
      alert('Print content not found');
      return;
    }

    const heading = document.querySelector('.print-heading h2');
    if (!heading) {
      alert('Heading not found');
      return;
    }

    printWindow.document.write(`
      <html>
        <head>
          <title>Nursery Book Catalog</title>
          <style>
            body { font-family: Arial, sans-serif; }
            h2 { 
              text-align: center;
              color: #00796b;
              margin-bottom: 1rem;
              font-size: 24px;
              font-weight: 600;
            }
            table { width: 100%; border-collapse: collapse; margin-top: 1rem; }
            th, td { padding: 0.75rem; text-align: left; border: 1px solid #ddd; }
            th { background-color: #00796b; color: #fff; }
            tr:nth-child(even) { background-color: #f8f9fa; }
          </style>
        </head>
        <body>
          <h2>${heading.textContent}</h2>
          ${content.innerHTML}
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.print();
  };

  const downloadCatalog = () => {
    const table = document.getElementById('nurseryTable');
    if (!table) {
      alert('Table element not found');
      return;
    }

    const data = `
      <html>
        <head><title>Nursery Book Catalog</title></head>
        <body>
          <h2>Nursery Section Book Catalog</h2>
          ${table.outerHTML}
        </body>
      </html>
    `;

    const blob = new Blob([data], { type: 'application/vnd.ms-excel' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'nursery_book_catalog.xls';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen bg-gray-50">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-teal-700"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex justify-center items-center min-h-screen bg-gray-50">
        <div className="text-red-500">{error}</div>
      </div>
    );
  }

  // Filter books by selected section
  const filteredBooks = books.filter(book => book.section.name === selectedSection);

  return (
    <div className="flex justify-center items-start bg-gray-50 min-h-screen p-8">
      <div className="w-full max-w-4xl">
        {/* Section Dropdown */}
        <div className="flex justify-between items-center mb-4">
          <div className="flex flex-col sm:flex-row sm:items-center gap-2">
            <div className="print-heading">
              <h2 className="text-teal-700 text-2xl font-semibold m-0">
                {selectedSection === 'nursery' && 'Nursery Section Book Catalog'}
                {selectedSection === 'lower primary' && 'Lower Primary Section Book Catalog'}
                {selectedSection === 'upper primary' && 'Upper Primary Section Book Catalog'}
              </h2>
            </div>
            <select
              value={selectedSection}
              onChange={e => setSelectedSection(e.target.value)}
              className="border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-600"
              style={{ minWidth: 180 }}
            >
              <option value="nursery">Nursery</option>
              <option value="lower primary">Lower Primary</option>
              <option value="upper primary">Upper primary</option>
            </select>
          </div>
          <div className="space-x-2">
            <button 
              onClick={printCatalog}
              className="bg-teal-700 text-white px-4 py-2 rounded hover:bg-teal-800 text-sm"
            >
              Print
            </button>
            <button 
              onClick={downloadCatalog}
              className="bg-teal-700 text-white px-4 py-2 rounded hover:bg-teal-800 text-sm"
            >
              Download
            </button>
          </div>
        </div>

        <div id="print-content" className="mt-4">
          <table id="nurseryTable" className="w-full border-collapse">
            <thead>
              <tr>
                <th className="p-3 text-left bg-teal-700 text-white border border-gray-300">No.</th>
                <th className="p-3 text-left bg-teal-700 text-white border border-gray-300">Book Name</th>
                <th className="p-3 text-left bg-teal-700 text-white border border-gray-300">Author</th>
                <th className="p-3 text-left bg-teal-700 text-white border border-gray-300">Quantity</th>
                <th className="p-3 text-left bg-teal-700 text-white border border-gray-300">Available</th>
              </tr>
            </thead>
            <tbody>
              {filteredBooks.map((book, index) => (
                <tr 
                  key={book.id} 
                  className="even:bg-gray-50 hover:bg-cyan-50"
                >
                  <td className="p-3 border border-gray-300">{index + 1}</td>
                  <td className="p-3 border border-gray-300">{book.title}</td>
                  <td className="p-3 border border-gray-300">{book.author}</td>
                  <td className="p-3 border border-gray-300">{book.quantity}</td>
                  <td className="p-3 border border-gray-300">{book.availableQuantity}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default NurseryBookCatalog;