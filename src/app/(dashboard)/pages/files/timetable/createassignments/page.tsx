"use client";
import React, { useState } from 'react';

const CreateAssignments: React.FC = () => {
  const [className, setClassName] = useState('');
  const [lessonName, setLessonName] = useState('');
  const [duration, setDuration] = useState(1); // Duration in hours
  const [assignments, setAssignments] = useState<{ className: string; lessonName: string; duration: number }[]>([]);

  const handleAddAssignment = () => {
    if (className && lessonName) {
      setAssignments(prev => [...prev, { className, lessonName, duration }]);
      setClassName('');
      setLessonName('');
      setDuration(1);
    }
  };

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold text-center mb-6">Create Class Assignments</h1>
      <div className="bg-white p-6 rounded-lg shadow-md">
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">Class Name</label>
          <input
            type="text"
            value={className}
            onChange={(e) => setClassName(e.target.value)}
            className="w-full p-2 border border-gray-300 rounded-md"
            placeholder="Enter class name"
          />
        </div>

        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">Lesson Name</label>
          <input
            type="text"
            value={lessonName}
            onChange={(e) => setLessonName(e.target.value)}
            className="w-full p-2 border border-gray-300 rounded-md"
            placeholder="Enter lesson name"
          />
        </div>

        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">Duration (in hours)</label>
          <input
            type="number"
            value={duration}
            onChange={(e) => setDuration(Number(e.target.value))}
            min="1"
            className="w-full p-2 border border-gray-300 rounded-md"
            placeholder="Enter duration"
          />
        </div>

        <button
          onClick={handleAddAssignment}
          className="w-full bg-blue-500 text-white py-2 rounded-md hover:bg-blue-600 transition-colors"
        >
          Add Assignment
        </button>
      </div>

      {/* Display Assignments */}
      <div className="mt-6">
        <h2 className="text-xl font-semibold mb-4">Current Assignments</h2>
        <div className="bg-gray-50 rounded-lg p-4">
          {assignments.length === 0 ? (
            <p className="text-gray-500">No assignments added yet.</p>
          ) : (
            <ul className="space-y-2">
              {assignments.map((assignment, index) => (
                <li key={index} className="bg-white p-2 rounded shadow">
                  <strong>Class:</strong> {assignment.className} | <strong>Lesson:</strong> {assignment.lessonName} | <strong>Duration:</strong> {assignment.duration} hour(s)
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
};

export default CreateAssignments; 