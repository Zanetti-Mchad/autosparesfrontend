'use client';
import React from 'react';
import { ArrowRight } from 'lucide-react';

interface Subject {
  name: string;
  link: string;
}

interface AssignmentData {
  id: number;
  teacher: string;
  class: string;
  subjects: Subject[];
}

const TeacherSubjects = () => {
  // Example data - in a real app, this would likely come from props or an API
  const assignedSubjects: AssignmentData[] = [
    {
      id: 1,
      teacher: "Mr. John Doe",
      class: "Primary 6 East",
      subjects: [
        { name: "English", link: "/pages/reports/teacher/teacherlogin3" },
        { name: "History", link: "/pages/reports/teacher/teacherlogin3" }
      ]
    },
    {
      id: 2,
      teacher: "Mr. John Doe",
      class: "Primary 7 West",
      subjects: [
        { name: "Mathematics", link: "/pages/reports/teacher/teacherlogin3" }
      ]
    }
  ];

  const teacher = assignedSubjects[0]; // Using first teacher for the header

  return (
    <div className="bg-gray-50 min-h-screen flex flex-col items-center">
      {/* Logo and Header */}
      <div className="bg-white p-8 shadow-xl rounded-lg text-center w-full max-w-4xl mt-8">
 
        <h1 className="text-3xl font-semibold text-green-800">
          {`${teacher.teacher}'s Assigned Subjects`}
        </h1>
      </div>

      {/* Subjects Table */}
      <div className="bg-white mt-6 shadow-xl rounded-lg w-full max-w-4xl overflow-hidden">
        <table className="table-auto w-full text-left border-collapse border border-gray-200">
          <thead className="bg-green-800 text-white">
            <tr>
              <th className="px-6 py-3 border">#</th>
              <th className="px-6 py-3 border">Class</th>
              <th className="px-6 py-3 border">Subjects</th>
            </tr>
          </thead>
          <tbody className="bg-white">
            {assignedSubjects.map((assignment, index) => (
              <tr key={assignment.id} className="hover:bg-green-50">
                <td className="px-6 py-4 border text-center text-gray-700">
                  {index + 1}
                </td>
                <td className="px-6 py-4 border text-gray-700">
                  {assignment.class}
                </td>
                <td className="px-6 py-4 border">
                  {assignment.subjects.map((subject, subIndex) => (
                    <div key={`${assignment.id}-${subIndex}`} className="mb-2">
                      <a 
                        href={subject.link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-green-600 hover:underline flex items-center justify-center gap-2"
                      >
                        {subject.name}
                        <ArrowRight className="h-5 w-5" />
                      </a>
                    </div>
                  ))}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default TeacherSubjects;