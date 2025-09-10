'use client';
import React from 'react';
import Image from 'next/image';

const StudentReport = () => {
  const studentData = {
    schoolInfo: {
      name: "RICH DAD JUNIOR SCHOOL",
      address: "P.O BOX 11276 -ENTEBBE ROAD",
      tel: "256781506926/ 256256756823110",
      email: "richdadjuniorschool2017@gmail.com",
      website: "www.richdadjuniorschool.com"
    },
    studentInfo: {
      fullName: "MAGANDAZI SHAMSDEEN",
      gender: "MALE",
      schoolId: "RDS/00266",
      term: "THREE",
      year: "2024",
      class: "PRIMARY 5 WEST"
    },
    continuousAssessment: [
      { subject: "English", cw: 18, hw: 16, org: 17, sp: 19, sm: 17, total: 87 },
      { subject: "Mathematics", cw: 19, hw: 18, org: 18, sp: 18, sm: 20, total: 93 },
      { subject: "Science", cw: 16, hw: 16, org: 15, sp: 18, sm: 15, total: 80 },
      { subject: "Social Studies with Religious Education", cw: 18, hw: 18, org: 16, sp: 18, sm: 18, total: 88 }
    ],
    finalAssessment: [
      { subject: "English", ca: 87, mid: 45, eot: 71, total: 203, average: 68, aggregate: 4, remarks: "Good", initials: "K.S" },
      { subject: "Mathematics", ca: 93, mid: 47, eot: 62, total: 202, average: 67, aggregate: 4, remarks: "Good", initials: "S.M" },
      { subject: "Science", ca: 80, mid: 47, eot: 62, total: 189, average: 63, aggregate: 4, remarks: "Good", initials: "T.E" },
      { subject: "Social Studies with Religious Education", ca: 88, mid: 74, eot: 73, total: 235, average: 78, aggregate: 3, remarks: "Very Good", initials: "M.H" }
    ],
    finalGrade: {
      aggs: 15,
      grade: "DIV II"
    },
    comments: {
      classTeacher: "Promising results",
      headTeacher: "Very Good."
    },
    dates: {
      termEnds: "2024-11-23",
      nextTermBegins: "2025-02-03"
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
                <p className="font-bold">{studentData.schoolInfo.address}</p>
                <p className="font-bold">TEL: {studentData.schoolInfo.tel}</p>
                <p className="font-bold">Email: {studentData.schoolInfo.email}</p>
                <p className="font-bold">Website: {studentData.schoolInfo.website}</p>
                <h2 className="text-base font-bold mt-2 text-red-700 tracking-wider">
                  INTEGRATED TERMLY ASSESSMENT REPORT
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

        {/* Student Info */}
        <div className="grid grid-cols-3 gap-4 p-2 border-b border-gray-400 text-xs">
          <div>
            <span className="font-bold text-[#000080]">FULL NAME: </span>
            {studentData.studentInfo.fullName}
          </div>
          <div>
            <span className="font-bold text-[#000080]">GENDER: </span>
            {studentData.studentInfo.gender}
          </div>
          <div>
            <span className="font-bold text-[#000080]">SCH ID: </span>
            {studentData.studentInfo.schoolId}
          </div>
          <div>
            <span className="font-bold text-[#000080]">TERM: </span>
            {studentData.studentInfo.term}
          </div>
          <div>
            <span className="font-bold text-[#000080]">YEAR: </span>
            {studentData.studentInfo.year}
          </div>
          <div>
            <span className="font-bold text-[#000080]">CLASS: </span>
            {studentData.studentInfo.class}
          </div>
        </div>

        {/* Continuous Assessment */}
        <div className="p-2">
          <table className="w-full border border-gray-400 text-xs">
            <thead>
              <tr>
                <th colSpan={6} className="border border-gray-400 bg-gray-100 px-2 py-1 text-left font-bold text-[#000080]">
                  CONTINUOUS ASSESSMENT (C.A) SCORES
                </th>
              </tr>
              <tr className="bg-gray-100">
                <th className="border border-gray-400 px-2 py-1">SUBJECT</th>
                <th className="border border-gray-400 px-2 py-1">C/W</th>
                <th className="border border-gray-400 px-2 py-1">H/W</th>
                <th className="border border-gray-400 px-2 py-1">ORG</th>
                <th className="border border-gray-400 px-2 py-1">S.PART</th>
                <th className="border border-gray-400 px-2 py-1">S.MGT</th>
                <th className="border border-gray-400 px-2 py-1">TOTAL</th>
              </tr>
            </thead>
            <tbody>
              {studentData.continuousAssessment.map((subject, index) => (
                <tr key={index}>
                  <td className="border border-gray-400 px-2 py-1 font-bold">{subject.subject}</td>
                  <td className="border border-gray-400 px-2 py-1 text-center">{subject.cw}</td>
                  <td className="border border-gray-400 px-2 py-1 text-center">{subject.hw}</td>
                  <td className="border border-gray-400 px-2 py-1 text-center">{subject.org}</td>
                  <td className="border border-gray-400 px-2 py-1 text-center">{subject.sp}</td>
                  <td className="border border-gray-400 px-2 py-1 text-center">{subject.sm}</td>
                  <td className="border border-gray-400 px-2 py-1 text-center">{subject.total}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Final Assessment */}
        <div className="p-2">
          <table className="w-full border border-gray-400 text-xs">
            <thead>
              <tr>
                <th colSpan={6} className="border border-gray-400 bg-gray-100 px-2 py-1 text-left font-bold text-[#000080]">
                  FINAL ASSESSMENT
                </th>
              </tr>
              <tr className="bg-gray-100">
                <th className="border border-gray-400 px-2 py-1">SUBJECT</th>
                <th className="border border-gray-400 px-2 py-1">C.A</th>
                <th className="border border-gray-400 px-2 py-1">MID</th>
                <th className="border border-gray-400 px-2 py-1">EOT</th>
                <th className="border border-gray-400 px-2 py-1">TOTAL</th>
                <th className="border border-gray-400 px-2 py-1">AVERAGE</th>
                <th className="border border-gray-400 px-2 py-1">AGGREGATE</th>
                <th className="border border-gray-400 px-2 py-1">REMARKS</th>
                <th className="border border-gray-400 px-2 py-1">INITIALS</th>
              </tr>
            </thead>
            <tbody>
              {studentData.finalAssessment.map((subject, index) => (
                <tr key={index}>
                  <td className="border border-gray-400 px-2 py-1 font-bold">{subject.subject}</td>
                  <td className="border border-gray-400 px-2 py-1 text-center">{subject.ca}</td>
                  <td className="border border-gray-400 px-2 py-1 text-center">{subject.mid}</td>
                  <td className="border border-gray-400 px-2 py-1 text-center">{subject.eot}</td>
                  <td className="border border-gray-400 px-2 py-1 text-center">{subject.total}</td>
                  <td className="border border-gray-400 px-2 py-1 text-center">{subject.average}</td>
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