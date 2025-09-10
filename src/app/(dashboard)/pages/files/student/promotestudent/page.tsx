"use client";
import React from "react";
import Image from 'next/image';

const StudentClassPromotions = () => {
  // Promotion options data
  const promotionOptions = [
    {
      id: 1,
      title: "Batch Promotion",
      link: "/pages/student/batchpromotion",
    },
    {
      id: 2,
      title: "Selective Promotion",
      link: "/pages/student/selectivepromotion",
    },
  ];

  return (
    <div className="flex justify-center items-center min-h-screen bg-gray-200">
      <div className="bg-white p-4 rounded-lg shadow-lg w-full max-w-lg">
        

        {/* Title */}
        <h2 className="text-2xl font-semibold text-center text-gray-800 mb-8">
          Student Class Promotions
        </h2>

        {/* Table */}
        <table className="w-full table-auto text-left">
          <thead>
            <tr className="bg-gray-100">
              <th className="px-4 py-2 text-gray-600">#</th>
              <th className="px-4 py-2 text-gray-600">Option</th>
              <th className="px-4 py-2 text-gray-600">Action</th>
            </tr>
          </thead>
          <tbody>
            {promotionOptions.map((option) => (
              <tr key={option.id} className="border-b">
                <td className="px-4 py-2 text-gray-700">{option.id}</td>
                <td className="px-4 py-2 text-gray-700">{option.title}</td>
                <td className="px-4 py-2">
                  <a href={option.link}>
                    <button className="bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500">
                      Continue
                    </button>
                  </a>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default StudentClassPromotions;
