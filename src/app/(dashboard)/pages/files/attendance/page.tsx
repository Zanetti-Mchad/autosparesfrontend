'use client';

import React from 'react';
import Image from 'next/image';

interface Class {
  id: number;
  name: string;
}

const classes: Class[] = [
  { id: 1, name: "Primary 1 East" },
  { id: 2, name: "Primary 1 West" },
  { id: 3, name: "Primary 2 East" },
  { id: 4, name: "Primary 2 West" },
  { id: 5, name: "Primary 3 East" },
  { id: 6, name: "Primary 3 West" },
  { id: 7, name: "Primary 4 East" },
  { id: 8, name: "Primary 4 West" },
  { id: 9, name: "Primary 5 East" },
  { id: 10, name: "Primary 5 West" },
  { id: 11, name: "Primary 6 East" },
  { id: 12, name: "Primary 6 West" },
  { id: 13, name: "Primary 7 East" },
  { id: 14, name: "Primary 7 West" },
  { id: 15, name: "Left" }
];

export default function ClassSelection() {
  const handleClassSelect = (classId: number) => {
    // Handle class selection logic here
    console.log(`Selected class ID: ${classId}`);
  };

  return (
    <div className="bg-gray-100 h-screen flex items-center justify-center">
      <div className="container mx-auto bg-white shadow-lg rounded-lg p-6 max-w-lg">
        <div className="flex justify-center mb-4">
          <Image 
            src="/richdadjrschool-logo.png" 
            alt="School Logo" 
            width={80}
            height={80}
            priority
          />
        </div>
        
        <div className="bg-green-600 text-white text-center py-3 rounded-md shadow-md mb-6">
          <h2 className="text-lg font-semibold">Select Class to view attendance</h2>
        </div>

        <table className="w-full text-center">
          <thead>
            <tr className="bg-gray-200 text-gray-700">
              <th className="p-2">#</th>
              <th className="p-2">Class</th>
              <th className="p-2">Action</th>
            </tr>
          </thead>
          <tbody>
            {classes.map((classItem, index) => (
              <tr 
                key={classItem.id} 
                className={index % 2 === 0 ? 'bg-gray-100' : 'bg-white'}
              >
                <td className="p-2 border">{index + 1}</td>
                <td className="p-2 border">{classItem.name}</td>
                <td className="p-2 border">
                  <button
                    onClick={() => handleClassSelect(classItem.id)}
                    className="text-blue-600 hover:underline"
                  >
                    Select Class <span>🡪</span>
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}