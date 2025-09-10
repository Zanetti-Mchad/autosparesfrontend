'use client';

import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';

type MergedCell = {
  colSpan?: number;
  rowSpan?: number;
  mergedInto?: string;
};

type Sections = {
  nursery: string[];
  lowerPrimary: string[];
  middlePrimary: string[];
  upperPrimary: string[];
};

type SectionKeys = keyof Sections;

const TimeTable = () => {
  const [timetableData, setTimetableData] = useState<{ [key: string]: string }>({});
  const [selectedCell, setSelectedCell] = useState<{ day: string; timeSlot: string; className: string } | null>(null);
  const [mergedCells, setMergedCells] = useState<{ [key: string]: MergedCell }>({});
  const [selectedSection, setSelectedSection] = useState<string>('');
  const [selectedClasses, setSelectedClasses] = useState<string[]>([]);
  const [displayClasses, setDisplayClasses] = useState<string[]>([]);
  const [showSubjectSelector, setShowSubjectSelector] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string>('');

  const initialTimeSlots = [
    "6:30am-7:30am", "7:30am-8:00am", "8:00am-9:00am",
    "9:00am-10:30am", "10:30am-11:00am", "11:00am-12:00pm",
    "12:00pm-1:00pm", "1:00pm-2:00pm", "2:00pm-3:00pm",
    "3:00pm-4:00pm", "4:00pm-5:00pm", "5:00pm-7:00pm"
  ];

  const days = ["MON", "TUE", "WED", "THUR", "FRI", "SAT", "SUN"];
  
  const subjects = [
    "THEO", "NUM", "ENG", "LIT A", "LIT B", "MTC", "SCE", "SST", "READ", "RE",
    "SWIMMING", "SPORTS", "DEBATE QUIZ", "GAMES & SPORTS",
    "THEOLOGY AND MORNING WORK", "MORNING TEA", "BREAK", "PRAYERS & LUNCH",
    "GUIDANCE & COUNSELING", "PRAYERS / PERSONAL ADMIN & SUPPER"
  ];

  const sections: Sections = {
    nursery: ['Nursery A', 'Nursery B'],
    lowerPrimary: ['P.1', 'P.2'],
    middlePrimary: ['P.3.W', 'P.3.E', 'P.4.W', 'P.4.E'],
    upperPrimary: ['P.5', 'P.6']
  };

  const handleSectionChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const section = e.target.value as SectionKeys;
    setSelectedSection(section);
    setDisplayClasses([]);
    setSelectedClasses(sections[section] || []);
  };

  const handleClassSelect = (className: string) => {
    setDisplayClasses(prev => 
      prev.includes(className) 
        ? prev.filter(c => c !== className)
        : [...prev, className]
    );
  };

  const handleCellClick = (day: string, timeSlot: string, className: string) => {
    setSelectedCell({ day, timeSlot, className });
    setShowSubjectSelector(true);
  };

  const handleClearCell = () => {
    if (selectedCell) {
      const { day, timeSlot, className } = selectedCell;
      const currentCellKey = `${day}-${timeSlot}-${className}`;

      const newMergedCells = { ...mergedCells };
      
      Object.keys(newMergedCells).forEach(key => {
        if (newMergedCells[key].mergedInto === currentCellKey || key === currentCellKey) {
          delete newMergedCells[key];
        }
      });

      const newTimetableData = { ...timetableData };
      delete newTimetableData[currentCellKey];

      setMergedCells(newMergedCells);
      setTimetableData(newTimetableData);
      setShowSubjectSelector(false);
      setSelectedCell(null);
      setSuccessMessage(`Cell cleared for ${className} on ${day} at ${timeSlot}`);
    }
  };

  const checkAndMergeCells = (day: string, timeSlot: string, className: string, subject: string) => {
    const timeIndex = initialTimeSlots.indexOf(timeSlot);
    const classIndex = displayClasses.indexOf(className);
    const currentCellKey = `${day}-${timeSlot}-${className}`;
    let newMergedCells: { [key: string]: MergedCell } = {};

    let rowCells = [currentCellKey];
    for (let i = timeIndex + 1; i < initialTimeSlots.length; i++) {
      const key = `${day}-${initialTimeSlots[i]}-${className}`;
      if (timetableData[key] === subject) {
        rowCells.push(key);
      } else {
        break;
      }
    }
    for (let i = timeIndex - 1; i >= 0; i--) {
      const key = `${day}-${initialTimeSlots[i]}-${className}`;
      if (timetableData[key] === subject) {
        rowCells.unshift(key);
      } else {
        break;
      }
    }

    let colCells = [currentCellKey];
    for (let i = classIndex + 1; i < displayClasses.length; i++) {
      const key = `${day}-${timeSlot}-${displayClasses[i]}`;
      if (timetableData[key] === subject) {
        colCells.push(key);
      } else {
        break;
      }
    }
    for (let i = classIndex - 1; i >= 0; i--) {
      const key = `${day}-${timeSlot}-${displayClasses[i]}`;
      if (timetableData[key] === subject) {
        colCells.unshift(key);
      } else {
        break;
      }
    }

    if (rowCells.length > 1 || colCells.length > 1) {
      if (rowCells.length >= colCells.length) {
        const firstCell = rowCells[0];
        newMergedCells[firstCell] = {
          colSpan: rowCells.length,
          rowSpan: 1
        };
        rowCells.slice(1).forEach(key => {
          newMergedCells[key] = { mergedInto: firstCell };
        });
      } else {
        const firstCell = colCells[0];
        newMergedCells[firstCell] = {
          colSpan: 1,
          rowSpan: colCells.length
        };
        colCells.slice(1).forEach(key => {
          newMergedCells[key] = { mergedInto: firstCell };
        });
      }
      setMergedCells(prev => ({
        ...prev,
        ...newMergedCells
      }));
    }
  };

  const handleSubjectSelect = (subject: string) => {
    if (selectedCell) {
      const { day, timeSlot, className } = selectedCell;
      const currentCellKey = `${day}-${timeSlot}-${className}`;

      setTimetableData(prev => ({
        ...prev,
        [currentCellKey]: subject
      }));

      checkAndMergeCells(day, timeSlot, className, subject);
      setShowSubjectSelector(false);
      setSelectedCell(null);
    }
  };

  const getCellContent = (day: string, timeSlot: string, className: string) => {
    return timetableData[`${day}-${timeSlot}-${className}`] || '';
  };

  const shouldRenderCell = (day: string, timeSlot: string, className: string) => {
    const cellKey = `${day}-${timeSlot}-${className}`;
    return !mergedCells[cellKey]?.mergedInto;
  };

  const getCellSpans = (day: string, timeSlot: string, className: string) => {
    const cellKey = `${day}-${timeSlot}-${className}`;
    return {
      colSpan: mergedCells[cellKey]?.colSpan || 1,
      rowSpan: mergedCells[cellKey]?.rowSpan || 1
    };
  };

  const handleSave = () => {
    setSuccessMessage(`Timetable for classes: ${selectedClasses.join(', ')} has been successfully saved.`);
  };

  return (
    <div className="container mx-auto p-4">
      <div className="mb-4 flex items-center space-x-4">
        <div>
          <label className="block text-gray-700 mb-2">Select Section:</label>
          <select
            className="border p-2 rounded"
            value={selectedSection}
            onChange={handleSectionChange}
          >
            <option value="">Select a section</option>
            <option value="nursery">Nursery</option>
            <option value="lowerPrimary">Lower Primary</option>
            <option value="middlePrimary">Middle Primary</option>
            <option value="upperPrimary">Upper Primary</option>
          </select>
        </div>

        <div>
          <label className="block text-gray-700 mb-2">Select Classes:</label>
          <div className="flex flex-wrap gap-4">
            {selectedClasses.map((className) => (
              <div key={className} className="flex items-center">
                <input
                  type="checkbox"
                  id={className}
                  checked={displayClasses.includes(className)}
                  onChange={() => handleClassSelect(className)}
                  className="mr-2"
                />
                <label htmlFor={className}>{className}</label>
              </div>
            ))}
          </div>
        </div>
      </div>

      <Card className="mb-4">
        <CardHeader>
          <CardTitle className="text-center">
            <div className="space-y-2">
              <h2 className="text-xl font-bold">RICH DAD JUNIOR SCHOOL - NAJJANANKUMBI</h2>
              <h3 className="text-lg">TIME TABLE 2025</h3>
              <p className="text-sm">Section: {selectedSection}</p>
              <p className="text-sm">Classes: {displayClasses.join(', ')}</p>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse border-2 border-black">
              <thead>
                <tr>
                  <th rowSpan={2} className="border-2 border-black p-2">Day</th>
                  <th rowSpan={2} className="border-2 border-black p-2">Class</th>
                  <th colSpan={initialTimeSlots.length} className="border-2 border-black p-2">Time Slots</th>
                </tr>
                <tr>
                  {initialTimeSlots.map((slot) => (
                    <th key={slot} className="border-2 border-black p-2 text-sm">{slot}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {days.map((day) => (
                  <React.Fragment key={day}>
                    {displayClasses.map((className, classIdx) => (
                      <tr key={`${day}-${className}`}>
                        {classIdx === 0 && (
                          <td rowSpan={displayClasses.length} className="border-2 border-black p-2 font-bold">
                            {day}
                          </td>
                        )}
                        <td className="border-2 border-black p-2">{className}</td>
                        {initialTimeSlots.map((timeSlot) => {
                          if (!shouldRenderCell(day, timeSlot, className)) {
                            return null;
                          }
                          const { colSpan, rowSpan } = getCellSpans(day, timeSlot, className);
                          return (
                            <td
                              key={`${day}-${timeSlot}-${className}`}
                              className={`border-2 border-black p-2 text-sm cursor-pointer hover:bg-gray-100 ${
                                getCellContent(day, timeSlot, className) ? 'bg-blue-50' : ''
                              }`}
                              onClick={() => handleCellClick(day, timeSlot, className)}
                              colSpan={colSpan}
                              rowSpan={rowSpan}
                              style={{
                                backgroundColor: getCellContent(day, timeSlot, className) ? '#EFF6FF' : '',
                                textAlign: 'center'
                              }}
                            >
                              {getCellContent(day, timeSlot, className)}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {showSubjectSelector && (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white p-6 rounded-lg shadow-xl max-w-2xl w-full">
            <h3 className="text-lg font-bold mb-4">Select a Subject</h3>
            <div className="grid grid-cols-3 gap-3">
              {subjects.map((subject) => (
                <button
                  key={subject}
                  className="p-2 text-sm bg-gray-100 hover:bg-gray-200 rounded transition-colors"
                  onClick={() => handleSubjectSelect(subject)}
                >
                  {subject}
                </button>
              ))}
            </div>
            <div className="mt-6 flex justify-between">
              <button
                className="bg-yellow-500 text-white px-4 py-2 rounded hover:bg-yellow-600 transition-colors"
                onClick={handleClearCell}
              >
                Clear/Unmerge Cell
              </button>
              <button
                className="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600 transition-colors"
                onClick={() => setShowSubjectSelector(false)}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="mt-4 flex space-x-4">
        <button
          onClick={handleSave}
          className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 transition-colors"
        >
          Save Timetable
        </button>
      </div>

      {successMessage && (
        <div className="mt-4 p-4 bg-green-100 text-green-700 rounded-md">
          {successMessage}
        </div>
      )}
    </div>
  );
};

export default TimeTable;