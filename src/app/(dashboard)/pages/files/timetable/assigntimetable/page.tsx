"use client";
import React, { useState } from 'react';

interface Teacher {
  id: number;
  name: string;
  currentAssignment?: {
    section: string;
    class?: string;
  };
}

interface Assignment {
  section: string;
  classes: string[];
}

const sections = [
  "Lower Primary",
  "Upper Primary",
  "Nursery"
];

const classes = {
  "Lower Primary": ["P1", "P2", "P3"],
  "Upper Primary": ["P4", "P5", "P6", "P7"],
  "Nursery": ["Baby", "Middle", "Top"]
};

const AssignTimeTable: React.FC = () => {
  // Sample teachers data - replace with your actual data source
  const [teachers] = useState<Teacher[]>([
    { id: 1, name: "John Doe" },
    { id: 2, name: "Jane Smith" },
    { id: 3, name: "Alice Johnson" },
  ]);

  const [selectedTeacher, setSelectedTeacher] = useState<number | ''>('');
  const [selectedSection, setSelectedSection] = useState<string>('');
  const [selectedClasses, setSelectedClasses] = useState<string[]>([]);
  const [assignments, setAssignments] = useState<{[key: number]: Assignment}>({});
  const [showSuccess, setShowSuccess] = useState(false);

  const handleClassToggle = (classOption: string) => {
    setSelectedClasses(prev => 
      prev.includes(classOption)
        ? prev.filter(c => c !== classOption)
        : [...prev, classOption]
    );
  };

  const handleSelectAllClasses = (checked: boolean) => {
    if (checked) {
      setSelectedClasses(classes[selectedSection as keyof typeof classes]);
    } else {
      setSelectedClasses([]);
    }
  };

  const handleAssign = () => {
    if (!selectedTeacher || !selectedSection) {
      alert('Please select both teacher and section');
      return;
    }

    setAssignments(prev => ({
      ...prev,
      [selectedTeacher]: {
        section: selectedSection,
        classes: selectedClasses
      }
    }));

    // Show success message
    setShowSuccess(true);
    setTimeout(() => setShowSuccess(false), 3000);

    // Reset selections
    setSelectedTeacher('');
    setSelectedSection('');
    setSelectedClasses([]);
  };

  return (
    <div className="container mx-auto p-4">
      <div className="max-w-2xl mx-auto bg-white p-6 rounded-lg shadow-md">
        <h1 className="text-2xl font-bold text-center mb-6">Time Table Head of Department Assignment</h1>

        <div className="space-y-4">
          {/* Teacher Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Select Teacher
            </label>
            <select
              value={selectedTeacher}
              onChange={(e) => setSelectedTeacher(Number(e.target.value))}
              className="w-full p-2 border border-gray-300 rounded-md"
            >
              <option value="">Choose a teacher</option>
              {teachers.map(teacher => (
                <option key={teacher.id} value={teacher.id}>
                  {teacher.name}
                </option>
              ))}
            </select>
          </div>

          {/* Section Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Select Section
            </label>
            <select
              value={selectedSection}
              onChange={(e) => {
                setSelectedSection(e.target.value);
                setSelectedClasses([]); // Reset classes when section changes
              }}
              className="w-full p-2 border border-gray-300 rounded-md"
            >
              <option value="">Choose a section</option>
              {sections.map(section => (
                <option key={section} value={section}>
                  {section}
                </option>
              ))}
            </select>
          </div>

          {/* Class Selection with Checkboxes */}
          {selectedSection && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Select Classes
              </label>
              <div className="space-y-2">
                {/* Select All Checkbox */}
                <label className="flex items-center space-x-2 font-medium border-b pb-2 mb-2">
                  <input
                    type="checkbox"
                    checked={selectedClasses.length === classes[selectedSection as keyof typeof classes].length}
                    onChange={(e) => handleSelectAllClasses(e.target.checked)}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span>Select All Classes</span>
                </label>

                {/* Individual Class Checkboxes */}
                {classes[selectedSection as keyof typeof classes].map(classOption => (
                  <label key={classOption} className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={selectedClasses.includes(classOption)}
                      onChange={() => handleClassToggle(classOption)}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span>{classOption}</span>
                  </label>
                ))}
              </div>
            </div>
          )}

          {/* Assign Button */}
          <button
            onClick={handleAssign}
            className="w-full bg-blue-500 text-white py-2 px-4 rounded-md hover:bg-blue-600 transition-colors"
          >
            Assign
          </button>
        </div>

        {/* Current Assignments Display */}
        <div className="mt-8">
          <h2 className="text-xl font-semibold mb-4">Current Assignments</h2>
          <div className="bg-gray-50 rounded-lg p-4">
            {Object.entries(assignments).map(([teacherId, assignment]) => {
              const teacher = teachers.find(t => t.id === Number(teacherId));
              return (
                <div key={teacherId} className="mb-2 p-2 bg-white rounded shadow">
                  <p className="font-medium">{teacher?.name}</p>
                  <p className="text-sm text-gray-600">
                    Section: {assignment.section}
                  </p>
                  <p className="text-sm text-gray-600">
                    Classes: {assignment.classes.join(', ')}
                  </p>
                </div>
              );
            })}
          </div>
        </div>

        {/* Success Message */}
        {showSuccess && (
          <div className="fixed inset-0 flex items-center justify-center z-50">
            <div className="absolute inset-0 bg-black opacity-30"></div>
            <div className="relative bg-white px-6 py-4 rounded-lg shadow-lg">
              <div className="flex items-center space-x-2 text-green-600">
                <span className="text-lg">✓</span>
                <p className="font-medium">Assignment successful!</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AssignTimeTable;
