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
      { subject: "English", cw: 18, hw: 16, org: 17, sPart: 19, sMgt: 17, total: 87 },
      { subject: "Mathematics", cw: 19, hw: 18, org: 18, sPart: 18, sMgt: 20, total: 93 },
      { subject: "Science", cw: 16, hw: 16, org: 15, sPart: 18, sMgt: 15, total: 80 },
      { subject: "Social Studies with Religious Education", cw: 18, hw: 18, org: 16, sPart: 18, sMgt: 18, total: 88 }
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
      headTeacher: "Very Good"
    },
    dates: {
      termEnds: "2024-11-23",
      nextTermBegins: "2025-02-03"
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-2">
      <div className="max-w-5xl mx-auto bg-white border border-gray-800 text-sm">
        {/* Header with Logo and Photo */}
        <div className="p-3 border-b border-gray-800">
          <div className="flex justify-between items-start gap-2">
            {/* School Logo */}
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
            
            {/* School Info */}
            <div className="text-center flex-grow">
              <h1 className="text-xl font-bold text-blue-900 mb-1">{studentData.schoolInfo.name}</h1>
              <div className="text-xs">
                <p>{studentData.schoolInfo.address}</p>
                <p>Tel: {studentData.schoolInfo.tel}</p>
                <p>Email: {studentData.schoolInfo.email}</p>
                <p>Website: {studentData.schoolInfo.website}</p>
                <h2 className="text-base font-bold mt-2 text-red-700 underline">INTEGRATED TERMLY ASSESSMENT REPORT</h2>
              </div>
            </div>

            {/* Student Photo */}
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
        <div className="p-2 border-b border-gray-800 bg-gray-50 text-xs">
          <div className="grid grid-cols-3 gap-2">
            <div className="flex">
              <span className="font-bold mr-1">FULL NAME:</span>
              <span>{studentData.studentInfo.fullName}</span>
            </div>
            <div className="flex">
              <span className="font-bold mr-1">GENDER:</span>
              <span>{studentData.studentInfo.gender}</span>
            </div>
            <div className="flex">
              <span className="font-bold mr-1">SCH ID:</span>
              <span>{studentData.studentInfo.schoolId}</span>
            </div>
            <div className="flex">
              <span className="font-bold mr-1">TERM:</span>
              <span>{studentData.studentInfo.term}</span>
            </div>
            <div className="flex">
              <span className="font-bold mr-1">YEAR:</span>
              <span>{studentData.studentInfo.year}</span>
            </div>
            <div className="flex">
              <span className="font-bold mr-1">CLASS:</span>
              <span>{studentData.studentInfo.class}</span>
            </div>
          </div>
        </div>

        {/* Continuous Assessment */}
        <div className="p-2 border-b border-gray-800">
          <h3 className="text-sm font-bold">CONTINUOUS ASSESSMENT (C.A) SCORES</h3>
          <p className="text-xs font-bold mb-1">ASPECTS ASSESSED TERMLY OUT OF 100 FOR 10 WEEKS</p>
          <table className="w-full border border-gray-800 text-xs">
            <thead>
              <tr className="bg-blue-900 text-white">
                <th className="border border-gray-800 px-2 py-1 text-left">SUBJECT</th>
                <th className="border border-gray-800 px-2 py-1 text-center w-12">C/W</th>
                <th className="border border-gray-800 px-2 py-1 text-center w-12">H/W</th>
                <th className="border border-gray-800 px-2 py-1 text-center w-12">ORG</th>
                <th className="border border-gray-800 px-2 py-1 text-center w-12">S.PART</th>
                <th className="border border-gray-800 px-2 py-1 text-center w-12">S.MGT</th>
                <th className="border border-gray-800 px-2 py-1 text-center w-12">TOTAL</th>
              </tr>
            </thead>
            <tbody>
              {studentData.continuousAssessment.map((subject, index) => (
                <tr key={index} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                  <td className="border border-gray-800 px-2 py-1 font-bold">{subject.subject}</td>
                  <td className="border border-gray-800 px-2 py-1 text-center">{subject.cw}</td>
                  <td className="border border-gray-800 px-2 py-1 text-center">{subject.hw}</td>
                  <td className="border border-gray-800 px-2 py-1 text-center">{subject.org}</td>
                  <td className="border border-gray-800 px-2 py-1 text-center">{subject.sPart}</td>
                  <td className="border border-gray-800 px-2 py-1 text-center">{subject.sMgt}</td>
                  <td className="border border-gray-800 px-2 py-1 text-center font-bold">{subject.total}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Final Assessment */}
        <div className="p-2 border-b border-gray-800">
          <h3 className="text-sm font-bold mb-1">FINAL ASSESSMENT</h3>
          <div className="text-xs font-bold mb-1">SCORES OUT OF 100</div>
          <table className="w-full border border-gray-800 text-xs">
            <thead>
              <tr className="bg-blue-900 text-white">
                <th className="border border-gray-800 px-2 py-1 text-left">SUBJECT</th>
                <th className="border border-gray-800 px-2 py-1 text-center w-12">C.A</th>
                <th className="border border-gray-800 px-2 py-1 text-center w-12">MID</th>
                <th className="border border-gray-800 px-2 py-1 text-center w-12">EOT</th>
                <th className="border border-gray-800 px-2 py-1 text-center w-12">TOTAL</th>
                <th className="border border-gray-800 px-2 py-1 text-center w-14">AVERAGE</th>
                <th className="border border-gray-800 px-2 py-1 text-center w-16">AGGREGATE</th>
                <th className="border border-gray-800 px-2 py-1 text-center">REMARKS</th>
                <th className="border border-gray-800 px-2 py-1 text-center w-14">INITIALS</th>
              </tr>
            </thead>
            <tbody>
              {studentData.finalAssessment.map((subject, index) => (
                <tr key={index} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                  <td className="border border-gray-800 px-2 py-1 font-bold">{subject.subject}</td>
                  <td className="border border-gray-800 px-2 py-1 text-center">{subject.ca}</td>
                  <td className="border border-gray-800 px-2 py-1 text-center">{subject.mid}</td>
                  <td className="border border-gray-800 px-2 py-1 text-center">{subject.eot}</td>
                  <td className="border border-gray-800 px-2 py-1 text-center">{subject.total}</td>
                  <td className="border border-gray-800 px-2 py-1 text-center">{subject.average}</td>
                  <td className="border border-gray-800 px-2 py-1 text-center">{subject.aggregate}</td>
                  <td className="border border-gray-800 px-2 py-1 text-center">{subject.remarks}</td>
                  <td className="border border-gray-800 px-2 py-1 text-center">{subject.initials}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="mt-1 text-right text-xs font-bold">
            <p>AGGS: {studentData.finalGrade.aggs} | GRADE: {studentData.finalGrade.grade}</p>
          </div>
        </div>

        {/* Key */}
        <div className="px-2 py-1 border-b border-gray-800 text-xs italic">
          <p>KEY: C/W Class work, H/W Home work, Org Work Organisation, S.PART Subject Participation, S.MGT Self Management, MOT Mid of Term Examinations, EOT End of Term Examinations</p>
        </div>

        {/* Promotion Note */}
        <div className="px-2 py-1 border-b border-gray-800 text-center text-xs font-bold">
          <p>You can do better! Promoted to Primary Six</p>
        </div>

        {/* Comments */}
        <div className="grid grid-cols-2 border-b border-gray-800 text-xs">
          <div className="p-2 border-r border-gray-800">
            <h4 className="font-bold mb-1">CLASS TEACHERS COMMENT</h4>
            <p>{studentData.comments.classTeacher}</p>
            <p className="mt-2 font-bold">SIGNATURE</p>
            <div className="h-8 border-b border-gray-400 mt-1"></div>
          </div>
          <div className="p-2">
            <h4 className="font-bold mb-1">HEAD TEACHERS COMMENT</h4>
            <p>{studentData.comments.headTeacher}</p>
            <p className="mt-2 font-bold">SIGNATURE</p>
            <div className="h-8 border-b border-gray-400 mt-1"></div>
          </div>
        </div>

        {/* Dates and Grading */}
        <div className="grid grid-cols-8 border-b border-gray-800 text-xs">
          {/* Left side: Term End Date and Stamp Notice */}
          <div className="col-span-3 flex flex-col">
            <div className="p-2 border-b border-gray-800">
              <p><span className="font-bold">Term Ends On:</span> {studentData.dates.termEnds}</p>
            </div>
            <div className="p-2 flex-grow">
              <p>Invalid Without a school stamp and a Signature</p>
            </div>
          </div>
          
          {/* Right side: Next Term and Grading Scale */}
          <div className="col-span-5 border-l border-gray-800">
            <div className="p-2 border-b border-gray-800">
              <p><span className="font-bold">Next Term Begins On:</span> {studentData.dates.nextTermBegins}</p>
            </div>
            <div className="p-2">
              <p className="font-bold mb-1">Grading Scale</p>
              <p>92 - 100 = 1 | 80 - 91 = 2 | 70-79 = 3 | 60-69 = 4 | 55 - 59 = 5</p>
              <p>50 - 54 = 6 | 45 - 49 =7 | 40 - 44 =8 | 00-39 =9</p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-1 text-center text-xs font-bold italic">
          <p>****** WE READ AND LEAD ******</p>
        </div>
      </div>
    </div>
  );
};

export default StudentReport;