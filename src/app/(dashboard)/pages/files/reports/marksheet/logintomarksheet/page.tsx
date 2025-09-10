"use client";
import React, { FormEvent } from 'react';

const MarksheetGenerator: React.FC = () => {
  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    // Handle form submission
  };

  return (
    <div className="bg-gray-100 flex justify-center items-center min-h-screen">
      <div className="bg-white shadow-md rounded-lg p-6 w-full max-w-md">
        <div className="flex justify-center mb-6">
          
        </div>
        
        <h2 className="text-xl font-semibold text-center text-gray-800 mb-4">
          Add Options to Generate Marksheet
        </h2>

        <div className="p-0">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="year" className="block text-sm font-medium text-gray-700 mb-1">
                  Year
                </label>
                <select 
                  id="year" 
                  defaultValue="2025"
                  className="w-full border border-gray-300 rounded-md p-2 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                >
                  <option value="2024">2024</option>
                  <option value="2025">2025</option>
                  <option value="2026">2026</option>
                </select>
              </div>

              <div>
                <label htmlFor="term" className="block text-sm font-medium text-gray-700 mb-1">
                  Term
                </label>
                <select 
                  id="term" 
                  defaultValue="TWO"
                  className="w-full border border-gray-300 rounded-md p-2 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                >
                  <option value="ONE">ONE</option>
                  <option value="TWO">TWO</option>
                  <option value="THREE">THREE</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="class" className="block text-sm font-medium text-gray-700 mb-1">
                  Class
                </label>
                <select 
                  id="class" 
                  defaultValue="Primary 1 East"
                  className="w-full border border-gray-300 rounded-md p-2 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                >
                  <option value="Primary 1 East">Primary 1 East</option>
                  <option value="Primary 2 East">Primary 2 East</option>
                  <option value="Primary 3 East">Primary 3 East</option>
                </select>
              </div>

              <div>
                <label htmlFor="subject" className="block text-sm font-medium text-gray-700 mb-1">
                  Subject
                </label>
                <select 
                  id="subject" 
                  defaultValue="English"
                  className="w-full border border-gray-300 rounded-md p-2 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                >
                  <option value="English">English</option>
                  <option value="Maths">Maths</option>
                  <option value="Science">Science</option>
                </select>
              </div>

              <div>
                <label htmlFor="exam" className="block text-sm font-medium text-gray-700 mb-1">
                  Exam
                </label>
                <select 
                  id="exam" 
                  defaultValue="MID"
                  className="w-full border border-gray-300 rounded-md p-2 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                >
                  <option value="MID">MID TERM</option>
                  <option value="END">END OF TERM</option>
                  <option value="CA">CA</option>
                </select>
              </div>
            </div>

            <div className="pt-4">
              <button 
                type="submit" 
                className="w-full bg-green-600 text-white py-2 rounded-md shadow hover:bg-green-700 focus:ring-2 focus:ring-green-500 focus:outline-none"
              >
                Proceed &raquo;
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default MarksheetGenerator;