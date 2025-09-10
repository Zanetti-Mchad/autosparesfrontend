'use client';
import React from 'react';
import Image from 'next/image';

const StudentReport = () => {
  const studentData = {
    schoolInfo: {
      name: "RICH DAD JUNIOR SCHOOL",
      address: "P.O BOX 11276 -KAWEMPE MBOGO",
      tel: "256788366080/ 256256704901055",
      email: "richdadjunior@gmail.com",
      website: "www.richdadjuniorschool.com"
    },
    studentInfo: {
      fullName: "NKUUTU ASLAM KIRUNDA",
      gender: "MALE",
      schoolId: "RDS/00345",
      term: "ONE",
      year: "2024",
      class: "PRIMARY 6"
    },
    midTermAssessment: [
      { subject: "MATHS", score: 53, aggregate: 6, remarks: "Fair", initials: "A.A" },
      { subject: "ENGLISH", score: 57, aggregate: 5, remarks: "Quite Good", initials: "K.R" },
      { subject: "SOCIAL STUDIES", score: 23, aggregate: 9, remarks: "Strive to Improve", initials: "O.R" },
      { subject: "SCIENCE", score: 52, aggregate: 6, remarks: "Fair", initials: "W.Z" }
    ],
    endTermAssessment: [
      { subject: "MATHS", score: 61, aggregate: 4, remarks: "Good", initials: "A.A" },
      { subject: "ENGLISH", score: 60, aggregate: 4, remarks: "Good", initials: "K.R" },
      { subject: "SOCIAL STUDIES", score: 29, aggregate: 9, remarks: "Strive to Improve", initials: "O.R" },
      { subject: "SCIENCE", score: 60, aggregate: 4, remarks: "Good", initials: "W.Z" }
    ],
    finalGrade: {
      aggs: 21,
      grade: "DIV II"
    },
    comments: {
      classTeacher: "Work harder to get good results.",
      headTeacher: "Promising Results"
    },
    dates: {
      termEnds: "2024-04-26",
      nextTermBegins: "2024-05-27"
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-2">
      <div className="max-w-5xl mx-auto bg-white border border-gray-400 text-sm">
        {/* Header with Logo and Photo */}
        <div className="p-3 border-b border-gray-400">
          <div className="flex justify-between items-start gap-2">
            <div className="w-16 h-16 relative">
              <Image
                src="/richdadjrschool-logo.png"
                alt="School Logo"
                fill
                className="object-contain"
                sizes="64px"
                priority
              />
            </div>
            
            <div className="text-center flex-grow">
              <h1 className="text-3xl font-bold text-[#000080] mb-1 font-serif">
                {studentData.schoolInfo.name}
              </h1>
              <div className="text-xs">
                <p>{studentData.schoolInfo.address}</p>
                <p>TEL: {studentData.schoolInfo.tel}</p>
                <p>Email: {studentData.schoolInfo.email}</p>
                <p>Website: {studentData.schoolInfo.website}</p>
                <h2 className="text-base font-bold mt-2 text-red-700 tracking-wider">
                  UPPER PRIMARY REPORT
                </h2>
              </div>
            </div>

            <div className="w-16 h-16 border border-gray-400 relative">
              <Image
                src="/images/student-placeholder.png"
                alt="Student"
                fill
                className="object-cover"
                sizes="64px"
              />
            </div>
          </div>
        </div>

        {/* Student Info in One Row */}
        <div className="flex justify-between p-2 border-b border-gray-400 text-xs">
          <span className="font-bold text-[#000080]">FULL NAME: {studentData.studentInfo.fullName}</span>
          <span className="font-bold text-[#000080]">GENDER: {studentData.studentInfo.gender}</span>
          <span className="font-bold text-[#000080]">SCH ID: {studentData.studentInfo.schoolId}</span>
          <span className="font-bold text-[#000080]">TERM: {studentData.studentInfo.term}</span>
          <span className="font-bold text-[#000080]">YEAR: {studentData.studentInfo.year}</span>
          <span className="font-bold text-[#000080]">CLASS: {studentData.studentInfo.class}</span>
        </div>

        {/* Mid Term Assessment */}
        <div className="p-2">
          <table className="w-full border border-gray-400 text-xs">
            <thead>
              <tr>
                <th colSpan={4} className="border border-gray-400 bg-gray-100 px-2 py-1 text-left font-bold text-[#000080]">
                  TYPE OF TEST: MID
                </th>
              </tr>
              <tr className="bg-gray-100">
                <th className="border border-gray-400 px-2 py-1">SUBJECT</th>
                <th className="border border-gray-400 px-2 py-1 w-20">Score</th>
                <th className="border border-gray-400 px-2 py-1 w-24">AGGREGATE</th>
                <th className="border border-gray-400 px-2 py-1">REMARKS</th>
                <th className="border border-gray-400 px-2 py-1 w-20">INITIALS</th>
              </tr>
            </thead>
            <tbody>
              {studentData.midTermAssessment.map((subject, index) => (
                <tr key={index}>
                  <td className="border border-gray-400 px-2 py-1 font-bold">{subject.subject}</td>
                  <td className="border border-gray-400 px-2 py-1 text-center">{subject.score}</td>
                  <td className="border border-gray-400 px-2 py-1 text-center">{subject.aggregate}</td>
                  <td className="border border-gray-400 px-2 py-1 text-blue-600">{subject.remarks}</td>
                  <td className="border border-gray-400 px-2 py-1 text-center">{subject.initials}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* EOT Assessment */}
        <div className="p-2">
          <table className="w-full border border-gray-400 text-xs">
            <thead>
              <tr>
                <th colSpan={4} className="border border-gray-400 bg-gray-100 px-2 py-1 text-left font-bold text-[#000080]">
                  TYPE OF TEST: EOT
                </th>
              </tr>
              <tr className="bg-gray-100">
                <th className="border border-gray-400 px-2 py-1">SUBJECT</th>
                <th className="border border-gray-400 px-2 py-1 w-20">Score</th>
                <th className="border border-gray-400 px-2 py-1 w-24">AGGREGATE</th>
                <th className="border border-gray-400 px-2 py-1">REMARKS</th>
                <th className="border border-gray-400 px-2 py-1 w-20">INITIALS</th>
              </tr>
            </thead>
            <tbody>
              {studentData.endTermAssessment.map((subject, index) => (
                <tr key={index}>
                  <td className="border border-gray-400 px-2 py-1 font-bold">{subject.subject}</td>
                  <td className="border border-gray-400 px-2 py-1 text-center">{subject.score}</td>
                  <td className="border border-gray-400 px-2 py-1 text-center">{subject.aggregate}</td>
                  <td className="border border-gray-400 px-2 py-1 text-blue-600">{subject.remarks}</td>
                  <td className="border border-gray-400 px-2 py-1 text-center">{subject.initials}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="text-right mt-1">
            <span className="font-bold">AGGS: {studentData.finalGrade.aggs}</span>
            <span className="ml-2 font-bold">GRADE: {studentData.finalGrade.grade}</span>
          </div>
        </div>

        {/* Comments Section */}
        <div className="grid grid-cols-2 border-t border-gray-400">
          <div className="p-2 border-r border-gray-400">
            <h4 className="font-bold text-[#000080]">CLASS TEACHERS COMMENT</h4>
            <p className="my-2 text-blue-600">{studentData.comments.classTeacher}</p>
            <p className="font-bold text-[#000080] mt-4">SIGNATURE</p>
            <div className="h-12 mt-1"></div>
          </div>
          <div className="p-2">
            <h4 className="font-bold text-[#000080]">HEAD TEACHERS COMMENT</h4>
            <p className="my-2 text-blue-600">{studentData.comments.headTeacher}</p>
            <p className="font-bold text-[#000080] mt-4">SIGNATURE</p>
            <div className="h-12 mt-1"></div>
          </div>
        </div>

        {/* Footer Section */}
        <div className="grid grid-cols-2 text-xs border-t border-gray-400">
          <div className="p-2 border-r border-gray-400">
            <p><span className="font-bold text-[#000080]">Term Ends On: </span>{studentData.dates.termEnds}</p>
            <p className="mt-4 italic">Invalid Without a school stamp and a Signature</p>
          </div>
          <div className="p-2">
            <p><span className="font-bold text-[#000080]">Next Term Begins On: </span>{studentData.dates.nextTermBegins}</p>
            <div className="mt-2">
              <p className="font-bold text-[#000080]">Grading Scale</p>
              <p>92 - 100 = 1 | 80 - 91 = 2 | 70-79 = 3 | 60-69 = 4 | 55 - 59 = 5</p>
              <p>50 - 54 = 6 | 45 - 49 = 7 | 40 - 44 = 8 | 00-39 = 9</p>
            </div>
          </div>
        </div>

        {/* School Motto */}
        <div className="p-2 text-center border-t border-gray-400 font-bold italic text-[#000080]">
          ****** WE READ AND LEAD ******
        </div>
      </div>
    </div>
  );
};

export default StudentReport;