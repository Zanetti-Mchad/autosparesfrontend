'use client';
import React, { useState } from 'react';

interface Student {
  id: number;
  name: string;
  marks?: number;
}

const MarksInputForm = () => {
  const [students, setStudents] = useState<Student[]>([
    { id: 1, name: "MWANJE FAHEEM LUBOWA" },
    { id: 2, name: "AMAL MUHAMMAD" },
    { id: 3, name: "NASSANGA HASHMAT" },
    { id: 4, name: "NAKUBULWA RAHMAH" },
    { id: 5, name: "KHAIRAH ALI" },
    { id: 6, name: "BAHEELAH TONDO" },
    { id: 7, name: "SSEKITTO HYRAM HASSAN" },
    { id: 8, name: "NAVIL MUYINGO ELUNAZI" }
  ]);

  const [showSuccess, setShowSuccess] = useState(false);
  const [validationErrors, setValidationErrors] = useState<Set<number>>(new Set());

  const handleMarksChange = (studentId: number, value: string) => {
    const numValue = value === '' ? undefined : Number(value);
    
    setStudents(prevStudents =>
      prevStudents.map(student =>
        student.id === studentId
          ? { ...student, marks: numValue }
          : student
      )
    );

    // Clear validation error for this student if value is valid
    if (numValue !== undefined && numValue >= 0 && numValue <= 100) {
      setValidationErrors(prev => {
        const next = new Set(prev);
        next.delete(studentId);
        return next;
      });
    }
  };

  const handleSubmit = () => {
    const errors = new Set<number>();
    
    students.forEach(student => {
      if (student.marks === undefined || student.marks < 0 || student.marks > 100) {
        errors.add(student.id);
      }
    });

    setValidationErrors(errors);

    if (errors.size === 0) {
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 3000);
      // Here you would typically send the data to your backend
    } else {
      alert('Please ensure all fields are filled with marks between 0 and 100.');
    }
  };

  return (
    <div className="bg-gray-100 p-2 flex items-center justify-center min-h-screen">
      <div className="w-full max-w-4xl bg-white shadow-md rounded-md">
        <div className="bg-white p-4 shadow-xl rounded-lg text-center">
    
        </div>
        
        <div className="bg-green-800 text-white text-center py-4 rounded-t-md">
          <h1 className="text-xl font-bold">
            Add Marks Primary 6 East MID 2024
          </h1>
        </div>

        <table className="table-auto w-full border-collapse">
          <thead className="bg-gray-200">
            <tr>
              <th className="border px-4 py-2">#</th>
              <th className="border px-4 py-2">Student Name</th>
              <th className="border px-4 py-2">English</th>
            </tr>
          </thead>
          <tbody className="bg-white">
            {students.map((student, index) => (
              <tr 
                key={student.id}
                className={`${index % 2 === 0 ? 'shadow-md' : ''} hover:bg-gray-50`}
              >
                <td className="border-2 border-gray-300 px-4 py-2 text-center">
                  {student.id}
                </td>
                <td className="border-2 border-gray-300 px-4 py-2">
                  {student.name}
                </td>
                <td className="border-2 border-gray-300 px-4 py-2 text-center">
                  <input
                    type="number"
                    value={student.marks || ''}
                    onChange={(e) => handleMarksChange(student.id, e.target.value)}
                    className={`w-16 p-1 border-2 border-gray-300 rounded ${
                      validationErrors.has(student.id) ? 'border-red-600' : ''
                    }`}
                    max={100}
                    min={0}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="p-4 text-center">
          <button
            onClick={handleSubmit}
            className="bg-green-800 text-white px-6 py-2 rounded hover:bg-green-700"
          >
            Submit
          </button>
          
          {showSuccess && (
            <p className="text-green-600 mt-4">
              Marks submitted successfully!
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

export default MarksInputForm;