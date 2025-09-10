"use client";
import React, { useState } from 'react';

interface Assignment {
  section: string;
  classes: string[];
}

interface Teacher {
  id: number;
  name: string;
  assignment: Assignment;
}

const classes = {
  "Lower Primary": ["P1", "P2", "P3"],
  "Upper Primary": ["P4", "P5", "P6", "P7"],
  "Nursery": ["Baby", "Middle", "Top"]
};

const ViewAssignedTimeTable: React.FC = () => {
  // Sample data - replace with your actual data source
  const [teachers, setTeachers] = useState<Teacher[]>([
    {
      id: 1,
      name: "John Doe",
      assignment: {
        section: "Lower Primary",
        classes: ["P1", "P2"]
      }
    },
    {
      id: 2,
      name: "Jane Smith",
      assignment: {
        section: "Upper Primary",
        classes: ["P4", "P5", "P6"]
      }
    }
  ]);

  const [selectedSection, setSelectedSection] = useState<string>('all');
  const [editingTeacher, setEditingTeacher] = useState<Teacher | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<number | null>(null);

  const sections = ["all", "Lower Primary", "Upper Primary", "Nursery"];

  const filteredTeachers = selectedSection === 'all'
    ? teachers
    : teachers.filter(teacher => teacher.assignment.section === selectedSection);

  const handleEdit = (teacher: Teacher) => {
    setEditingTeacher(teacher);
    setShowEditModal(true);
  };

  const handleDelete = (teacherId: number) => {
    setTeachers(prev => prev.filter(teacher => teacher.id !== teacherId));
    setShowDeleteConfirm(null);
  };

  const handleUpdateAssignment = (updatedTeacher: Teacher) => {
    setTeachers(prev => prev.map(teacher => 
      teacher.id === updatedTeacher.id ? updatedTeacher : teacher
    ));
    setShowEditModal(false);
    setEditingTeacher(null);
  };

  return (
    <div className="container mx-auto p-4">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-2xl font-bold text-center mb-6">
          Assigned Teachers Timetable View
        </h1>

        {/* Section Filter */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Filter by Section
          </label>
          <select
            value={selectedSection}
            onChange={(e) => setSelectedSection(e.target.value)}
            className="w-full md:w-48 p-2 border border-gray-300 rounded-md"
          >
            {sections.map(section => (
              <option key={section} value={section}>
                {section === 'all' ? 'All Sections' : section}
              </option>
            ))}
          </select>
        </div>

        {/* Assignments Table */}
        <div className="overflow-x-auto">
          <table className="min-w-full bg-white rounded-lg shadow-md">
            <thead className="bg-gray-100">
              <tr>
                <th className="px-4 py-2 text-left">No.</th>
                <th className="px-4 py-2 text-left">Teacher Name</th>
                <th className="px-4 py-2 text-left">Section</th>
                <th className="px-4 py-2 text-left">Classes</th>
                <th className="px-4 py-2 text-left">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredTeachers.map((teacher, index) => (
                <tr key={teacher.id} className="border-t hover:bg-gray-50">
                  <td className="px-4 py-2">{index + 1}</td>
                  <td className="px-4 py-2">{teacher.name}</td>
                  <td className="px-4 py-2">
                    <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-sm">
                      {teacher.assignment.section}
                    </span>
                  </td>
                  <td className="px-4 py-2">
                    <div className="flex flex-wrap gap-1">
                      {teacher.assignment.classes.map(className => (
                        <span 
                          key={className}
                          className="px-2 py-1 bg-gray-100 text-gray-700 rounded-full text-sm"
                        >
                          {className}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="px-4 py-2">
                    <div className="flex gap-2">
                      <button 
                        onClick={() => handleEdit(teacher)}
                        className="px-3 py-1 text-sm bg-blue-500 text-white rounded hover:bg-blue-600"
                      >
                        Edit
                      </button>
                      <button 
                        onClick={() => setShowDeleteConfirm(teacher.id)}
                        className="px-3 py-1 text-sm bg-red-500 text-white rounded hover:bg-red-600"
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

        {filteredTeachers.length === 0 && (
          <div className="text-center py-8 bg-gray-50 rounded-lg">
            <p className="text-gray-500">
              No teachers assigned to {selectedSection === 'all' ? 'any section' : selectedSection}
            </p>
          </div>
        )}

        {/* Edit Modal */}
        {showEditModal && editingTeacher && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
            <div className="bg-white p-6 rounded-lg w-96">
              <h2 className="text-xl font-bold mb-4">Edit Assignment</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Section</label>
                  <select
                    value={editingTeacher.assignment.section}
                    onChange={(e) => setEditingTeacher({
                      ...editingTeacher,
                      assignment: { ...editingTeacher.assignment, section: e.target.value }
                    })}
                    className="w-full p-2 border rounded"
                  >
                    {sections.filter(s => s !== 'all').map(section => (
                      <option key={section} value={section}>{section}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Classes</label>
                  <div className="space-y-2">
                    {classes[editingTeacher.assignment.section as keyof typeof classes]?.map(classOption => (
                      <label key={classOption} className="flex items-center">
                        <input
                          type="checkbox"
                          checked={editingTeacher.assignment.classes.includes(classOption)}
                          onChange={(e) => {
                            const newClasses = e.target.checked
                              ? [...editingTeacher.assignment.classes, classOption]
                              : editingTeacher.assignment.classes.filter(c => c !== classOption);
                            setEditingTeacher({
                              ...editingTeacher,
                              assignment: { ...editingTeacher.assignment, classes: newClasses }
                            });
                          }}
                          className="mr-2"
                        />
                        {classOption}
                      </label>
                    ))}
                  </div>
                </div>
                <div className="flex justify-end gap-2 mt-4">
                  <button
                    onClick={() => setShowEditModal(false)}
                    className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => handleUpdateAssignment(editingTeacher)}
                    className="px-4 py-2 text-sm bg-blue-500 text-white rounded hover:bg-blue-600"
                  >
                    Save Changes
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Delete Confirmation Modal */}
        {showDeleteConfirm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
            <div className="bg-white p-6 rounded-lg">
              <h2 className="text-xl font-bold mb-4">Confirm Delete</h2>
              <p>Are you sure you want to delete this assignment?</p>
              <div className="flex justify-end gap-2 mt-4">
                <button
                  onClick={() => setShowDeleteConfirm(null)}
                  className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800"
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleDelete(showDeleteConfirm)}
                  className="px-4 py-2 text-sm bg-red-500 text-white rounded hover:bg-red-600"
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ViewAssignedTimeTable;
