"use client";
import React, { useMemo } from 'react';

type Subject = 'eng' | 'mtc' | 'sci' | 'sst';
type Division = 'I' | 'II' | 'III' | 'IV' | 'U' | 'X';

const AnalysisSheet = () => {
  const students = useMemo(() => [
    {
      id: 1,
      name: "NAMUTAAWE HIKMAT MUTAAWE",
      scores: {
        eng: { score: 95, grade: 1 },
        mtc: { score: 95, grade: 1 },
        sci: { score: 85, grade: 2 },
        sst: { score: 86, grade: 2 }
      }
    },
    {
      id: 2,
      name: "KUTEESA LYNETTE NAMUGENYI",
      scores: {
        eng: { score: 94, grade: 1 },
        mtc: { score: 71, grade: 3 },
        sci: { score: 84, grade: 2 },
        sst: { score: 81, grade: 2 }
      }
    },
    {
      id: 3,
      name: "KAGORO HANNAH. K",
      scores: {
        eng: { score: 93, grade: 1 },
        mtc: { score: 63, grade: 4 },
        sci: { score: 81, grade: 2 },
        sst: { score: 83, grade: 2 }
      }
    },
    {
      id: 4,
      name: "WABULE HANISAH HUSSEIN",
      scores: {
        eng: { score: 92, grade: 1 },
        mtc: { score: 71, grade: 3 },
        sci: { score: 80, grade: 2 },
        sst: { score: 75, grade: 3 }
      }
    },
    {
      id: 5,
      name: "NAKATE AMINAH",
      scores: {
        eng: { score: 86, grade: 2 },
        mtc: { score: 67, grade: 4 },
        sci: { score: 80, grade: 2 },
        sst: { score: 74, grade: 3 }
      }
    }
  ], []);

  const studentsWithTotals = useMemo(() => {
    return students.map(student => {
      const totalAggregate =
        student.scores.eng.grade +
        student.scores.mtc.grade +
        student.scores.sci.grade +
        student.scores.sst.grade;

      let division;
      if (totalAggregate <= 12) division = "I";
      else if (totalAggregate <= 24) division = "II";
      else if (totalAggregate <= 36) division = "III";
      else division = "IV";

      return {
        ...student,
        totalAggregate,
        division
      };
    });
  }, [students]);

  const aggregateAnalysis = useMemo(() => {
    const analysis: Record<number, number> = {};
    for (let i = 4; i <= 36; i++) {
      analysis[i] = 0;
    }

    studentsWithTotals.forEach(student => {
      analysis[student.totalAggregate] = (analysis[student.totalAggregate] || 0) + 1;
    });

    return analysis;
  }, [studentsWithTotals]);

  const subjectAnalysis = useMemo(() => {
    const subjects: Subject[] = ['eng', 'mtc', 'sci', 'sst'];
    const analysis: Record<Subject, any> = {
      eng: {},
      mtc: {},
      sci: {},
      sst: {}
    };

    subjects.forEach(subject => {
      const grades = {
        D1: 0, D2: 0, C3: 0, C4: 0, C5: 0, C6: 0, P7: 0, P8: 0, F9: 0
      };

      students.forEach(student => {
        const grade = student.scores[subject].grade;
        if (grade === 1) grades.D1++;
        else if (grade === 2) grades.D2++;
        else if (grade === 3) grades.C3++;
        else if (grade === 4) grades.C4++;
        else if (grade === 5) grades.C5++;
        else if (grade === 6) grades.C6++;
        else if (grade === 7) grades.P7++;
        else if (grade === 8) grades.P8++;
        else if (grade === 9) grades.F9++;
      });

      const total = Object.values(grades).reduce((sum, count) => sum + count, 0);
      const div1Percent = (grades.D1 / total * 100).toFixed(1);

      analysis[subject] = {
        ...grades,
        total,
        div1Percent,
        teacher: {
          eng: "OGAL",
          mtc: "MAGANDA",
          sci: "ALINGA",
          sst: "KALIRE"
        }[subject]
      };
    });

    return analysis;
  }, [students]);

  const divisionAnalysis = useMemo(() => {
    const divisions: Record<Division, number> = { I: 0, II: 0, III: 0, IV: 0, U: 0, X: 0 };

    studentsWithTotals.forEach(student => {
      divisions[student.division as Division]++;
    });

    const total = Object.values(divisions).reduce((sum, count) => sum + count, 0);
    const div1Percent = (divisions.I / total * 100).toFixed(1);

    return { divisions, total, div1Percent };
  }, [studentsWithTotals]);

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="text-center mb-8">
        <h1 className="text-2xl font-bold mb-2">RICH DAD JUNIOR SCHOOL-ENTEBBE ROAD NAJJANANKUMBI</h1>
        <h2 className="text-xl font-bold mb-4">ANALYSIS SHEET</h2>
        <h3 className="text-lg font-bold">EXAM/TEST: PRE MOCK SET II CLASS P.7 WEST TERM II YEAR: 2024</h3>
      </div>

      <div className="mb-8">
        <h3 className="text-lg font-bold mb-4 border-gray-500">SUBJECT ANALYSIS</h3>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse border-gray-500">
            <thead>
              <tr className="bg-gray-100">
                <th className="border p-2 border-gray-400">SUBJECT</th>
                <th className="border p-2 border-gray-500">TARGET</th>
                <th className="border p-2 border-gray-500">D1</th>
                <th className="border p-2 border-gray-500">D2</th>
                <th className="border p-2 border-gray-500">C3</th>
                <th className="border p-2 border-gray-500">C4</th>
                <th className="border p-2 border-gray-500">C5</th>
                <th className="border p-2 border-gray-500">C6</th>
                <th className="border p-2 border-gray-500">P7</th>
                <th className="border p-2 border-gray-500">P8</th>
                <th className="border p-2 border-gray-500">F9</th>
                <th className="border p-2 border-gray-500">TOT.</th>
                <th className="border p-2 border-gray-500">NAME OF TR.</th>
                <th className="border p-2 border-gray-500">DIV 1%</th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(subjectAnalysis).map(([subject, analysis]) => (
                <tr key={subject}>
                  <td className="border p-2 font-bold border-gray-500">{subject.toUpperCase()}</td>
                  <td className="border p-2 border-gray-500">100%</td>
                  <td className="border p-2 border-gray-500">{analysis.D1}</td>
                  <td className="border p-2 border-gray-500">{analysis.D2}</td>
                  <td className="border p-2 border-gray-500">{analysis.C3}</td>
                  <td className="border p-2 border-gray-500">{analysis.C4}</td>
                  <td className="border p-2 border-gray-500">{analysis.C5}</td>
                  <td className="border p-2 border-gray-500">{analysis.C6}</td>
                  <td className="border p-2 border-gray-500">{analysis.P7}</td>
                  <td className="border p-2 border-gray-500">{analysis.P8}</td>
                  <td className="border p-2 border-gray-500">{analysis.F9}</td>
                  <td className="border p-2 border-gray-500">{analysis.total}</td>
                  <td className="border p-2 border-gray-500">{analysis.teacher}</td>
                  <td className="border p-2 border-gray-500">{analysis.div1Percent}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="mb-8">
        <h3 className="text-lg font-bold mb-4">AGGREGATE ANALYSIS</h3>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse border mb-4 border-gray-500">
            <thead>
              <tr className="bg-gray-100">
                <th className="border p-2 border-gray-500">AGG.</th>
                {Array.from({ length: 16 }, (_, i) => i + 4).map(num => (
                  <th key={num} className="border p-2 border-gray-500">{num}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="border p-2 font-bold border-gray-500">NO.</td>
                {Array.from({ length: 16 }, (_, i) => i + 4).map(num => (
                  <td key={num} className="border p-2 border-gray-500">{aggregateAnalysis[num] || '-'}</td>
                ))}
              </tr>
            </tbody>
          </table>

          <table className="w-full border-collapse border">
            <thead>
              <tr className="bg-gray-100 border-gray-500">
                {Array.from({ length: 17 }, (_, i) => i + 20).map(num => (
                  <th key={num} className="border p-2 border-gray-500">{num}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              <tr>
                {Array.from({ length: 17 }, (_, i) => i + 20).map(num => (
                  <td key={num} className="border p-2 border-gray-500">{aggregateAnalysis[num] || '-'}</td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <div className="mb-8">
        <h3 className="text-lg font-bold mb-4">DIVISION ANALYSIS</h3>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse border">
            <thead>
              <tr className="bg-gray-100 border-gray-500">
                <th className="border p-2 border-gray-500">DIVISION</th>
                <th className="border p-2 border-gray-500">I</th>
                <th className="border p-2 border-gray-500">II</th>
                <th className="border p-2 border-gray-500">III</th>
                <th className="border p-2 border-gray-500">IV</th>
                <th className="border p-2 border-gray-500">U</th>
                <th className="border p-2 border-gray-500">X</th>
                <th className="border p-2 border-gray-500">TOTAL</th>
                <th className="border p-2 border-gray-500">DIV.1 %</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="border p-2 font-bold border-gray-500">NO.</td>
                <td className="border p-2 border-gray-500">{divisionAnalysis.divisions.I}</td>
                <td className="border p-2 border-gray-500">{divisionAnalysis.divisions.II}</td>
                <td className="border p-2 border-gray-500">{divisionAnalysis.divisions.III}</td>
                <td className="border p-2 border-gray-500">{divisionAnalysis.divisions.IV}</td>
                <td className="border p-2 border-gray-500">{divisionAnalysis.divisions.U}</td>
                <td className="border p-2 border-gray-500">{divisionAnalysis.divisions.X}</td>
                <td className="border p-2 border-gray-500">{divisionAnalysis.total}</td>
                <td className="border p-2 border-gray-500">{divisionAnalysis.div1Percent}%</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <div className="mb-8">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse border border-gray-500">
            <thead>
              <tr className="bg-gray-100 border-gray-500">
                <th className="border p-2 border-gray-500">NO</th>
                <th className="border p-2 border-gray-500">NAME</th>
                <th className="border p-2 border-gray-500">ENG</th>
                <th className="border p-2 border-gray-500">AG</th>
                <th className="border p-2 border-gray-500">MTC</th>
                <th className="border p-2 border-gray-500">AG</th>
                <th className="border p-2 border-gray-500">SCI</th>
                <th className="border p-2 border-gray-500">AG</th>
                <th className="border p-2 border-gray-500">SST</th>
                <th className="border p-2 border-gray-500">AG</th>
                <th className="border p-2 border-gray-500">TOT</th>
                <th className="border p-2 border-gray-500">DIV</th>
              </tr>
            </thead>
            <tbody>
              {studentsWithTotals.map((student) => (
                <tr key={student.id} className={student.id % 2 === 0 ? 'bg-gray-50' : 'bg-white'}>
                  <td className="border p-2 border-gray-500">{student.id}</td>
                  <td className="border p-2 border-gray-500">{student.name}</td>
                  <td className="border p-2 font-bold border-gray-500">{student.scores.eng.score}</td>
                  <td className="border p-2 border-gray-500">{student.scores.eng.grade}</td>
                  <td className="border p-2 font-bold border-gray-500">{student.scores.mtc.score}</td>
                  <td className="border p-2 border-gray-500">{student.scores.mtc.grade}</td>
                  <td className="border p-2 font-bold border-gray-500">{student.scores.sci.score}</td>
                  <td className="border p-2 border-gray-500">{student.scores.sci.grade}</td>
                  <td className="border p-2 font-bold border-gray-500">{student.scores.sst.score}</td>
                  <td className="border p-2 border-gray-500">{student.scores.sst.grade}</td>
                  <td className="border p-2 font-bold border-gray-500">{student.totalAggregate}</td>
                  <td className="border p-2 font-bold border-gray-500">{student.division}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="mt-8">
        <div className="border-t pt-6 space-y-6">
          {/* Teacher's Comment Section */}
          <div className="space-y-3">
            <p className="font-bold text-lg">CLASS TEACHER&apos;S COMMENT:</p>
            <div className="border p-4 bg-gray-50 rounded">
              <p>There is still much needed to hit our target of 100% Division one.</p>
            </div>
          </div>

          {/* Name, Signature, and Date on one row */}
          <div className="flex items-center gap-4 font-bold">
            <span>NAME: KALIRE CHARLES</span>
            <span>SIGNATURE: ...................................</span>
            <span>DATE: 24.06.2024</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AnalysisSheet;