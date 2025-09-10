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

const BookCatalog = () => {
  const [books, setBooks] = useState<Book[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [nurseryBooks, setNurseryBooks] = useState<Book[]>([]);
  const [lowerPrimaryBooks, setLowerPrimaryBooks] = useState<Book[]>([]);
  const [upperPrimaryBooks, setUpperPrimaryBooks] = useState<Book[]>([]);

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
        setBooks(data.books);

        // Group books by section
        const groupedBooks = data.books.reduce((acc: { [key: string]: Book[] }, book) => {
          if (!acc[book.section.name]) {
            acc[book.section.name] = [];
          }
          acc[book.section.name].push(book);
          return acc;
        }, {});

        setNurseryBooks(groupedBooks['nursery'] || []);
        setLowerPrimaryBooks(groupedBooks['lower primary'] || []);
        setUpperPrimaryBooks(groupedBooks['upper primary'] || []);

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

    const container = document.getElementById('container');
    if (!container) {
      alert('Container element not found');
      return;
    }

    printWindow.document.write(`
      <html>
        <head>
          <title>Book Catalog</title>
          <style>
            body { font-family: Arial, sans-serif; }
            h2, h3 { text-align: center; color: #00796b; }
            table { width: 100%; border-collapse: collapse; margin-top: 1rem; }
            th, td { padding: 0.75rem; text-align: left; border: 1px solid #ddd; }
            th { background-color: #00796b; color: #fff; }
            tr:nth-child(even) { background-color: #f8f9fa; }
          </style>
        </head>
        <body>
          ${container.innerHTML}
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.print();
  };

  const downloadCatalog = () => {
    const nurseryTable = document.getElementById('nurseryTable');
    const lowerPrimaryTable = document.getElementById('lowerPrimaryTable');
    const upperPrimaryTable = document.getElementById('upperPrimaryTable');

    if (!nurseryTable || !lowerPrimaryTable || !upperPrimaryTable) {
      alert('Some table elements not found');
      return;
    }

    const data = `
      <html>
        <head><title>Book Catalog</title></head>
        <body>
          <h2>Nursery Section</h2>${nurseryTable.outerHTML}
          <h2>Lower Primary Section</h2>${lowerPrimaryTable.outerHTML}
          <h2>Upper Primary Section</h2>${upperPrimaryTable.outerHTML}
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
    <div className="flex justify-center items-start min-h-screen bg-teal-50 p-4">
      <div id="container" className="bg-white rounded-lg p-8 shadow-lg w-11/12 max-w-3xl">
        <h2 className="text-2xl text-teal-700 text-center mb-4">Book Catalog</h2>

        <div>
          <h3 className="text-xl text-teal-700 text-center border-b-2 border-teal-700 pb-1 mb-4">
            Nursery Section
          </h3>
          <table id="nurseryTable" className="w-full border-collapse mb-8">
            <thead>
              <tr>
                <th className="p-3 text-left bg-teal-700 text-white border border-gray-300">#</th>
                <th className="p-3 text-left bg-teal-700 text-white border border-gray-300">Book Name</th>
                <th className="p-3 text-left bg-teal-700 text-white border border-gray-300">Author</th>
                <th className="p-3 text-left bg-teal-700 text-white border border-gray-300">Quantity</th>
                <th className="p-3 text-left bg-teal-700 text-white border border-gray-300">Available</th>
              </tr>
            </thead>
            <tbody>
              {nurseryBooks.map((book, index) => (
                <tr key={book.id} className="even:bg-gray-50 hover:bg-cyan-50">
                  <td className="p-3 border border-gray-300">{index + 1}</td>
                  <td className="p-3 border border-gray-300">{book.title}</td>
                  <td className="p-3 border border-gray-300">{book.author}</td>
                  <td className="p-3 border border-gray-300">{book.quantity}</td>
                  <td className="p-3 border border-gray-300">{book.availableQuantity}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <h3 className="text-xl text-teal-700 text-center border-b-2 border-teal-700 pb-1 mb-4">
            Lower Primary Section
          </h3>
          <table id="lowerPrimaryTable" className="w-full border-collapse mb-8">
            <thead>
              <tr>
                <th className="p-3 text-left bg-teal-700 text-white border border-gray-300">#</th>
                <th className="p-3 text-left bg-teal-700 text-white border border-gray-300">Book Name</th>
                <th className="p-3 text-left bg-teal-700 text-white border border-gray-300">Author</th>
                <th className="p-3 text-left bg-teal-700 text-white border border-gray-300">Quantity</th>
                <th className="p-3 text-left bg-teal-700 text-white border border-gray-300">Available</th>
              </tr>
            </thead>
            <tbody>
              {lowerPrimaryBooks.map((book, index) => (
                <tr key={book.id} className="even:bg-gray-50 hover:bg-cyan-50">
                  <td className="p-3 border border-gray-300">{index + 1}</td>
                  <td className="p-3 border border-gray-300">{book.title}</td>
                  <td className="p-3 border border-gray-300">{book.author}</td>
                  <td className="p-3 border border-gray-300">{book.quantity}</td>
                  <td className="p-3 border border-gray-300">{book.availableQuantity}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <h3 className="text-xl text-teal-700 text-center border-b-2 border-teal-700 pb-1 mb-4">
            Upper Primary Section
          </h3>
          <table id="upperPrimaryTable" className="w-full border-collapse mb-8">
            <thead>
              <tr>
                <th className="p-3 text-left bg-teal-700 text-white border border-gray-300">#</th>
                <th className="p-3 text-left bg-teal-700 text-white border border-gray-300">Book Name</th>
                <th className="p-3 text-left bg-teal-700 text-white border border-gray-300">Author</th>
                <th className="p-3 text-left bg-teal-700 text-white border border-gray-300">Quantity</th>
                <th className="p-3 text-left bg-teal-700 text-white border border-gray-300">Available</th>
              </tr>
            </thead>
            <tbody>
              {upperPrimaryBooks.map((book, index) => (
                <tr key={book.id} className="even:bg-gray-50 hover:bg-cyan-50">
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

        <div className="flex justify-center gap-4">
          <button
            onClick={printCatalog}
            className="bg-teal-700 text-white py-3 px-6 rounded hover:bg-teal-800"
          >
            Print
          </button>
          <button
            onClick={downloadCatalog}
            className="bg-teal-700 text-white py-3 px-6 rounded hover:bg-teal-800"
          >
            Download
          </button>
        </div>
      </div>
    </div>
  );
};

export default BookCatalog;