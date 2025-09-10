"use client";
import React, { useState } from 'react';

interface CardProps {
  children: React.ReactNode;
  className?: string;
}

const Card: React.FC<CardProps> = ({ children, className = '' }) => (
  <div className={`rounded-lg border bg-card text-card-foreground shadow-sm ${className}`}>
    {children}
  </div>
);

const CardHeader: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="flex flex-col space-y-1.5 p-6">{children}</div>
);

const CardTitle: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className = '' }) => (
  <h3 className={`text-2xl font-semibold leading-none tracking-tight ${className}`}>{children}</h3>
);

const CardContent: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="p-6 pt-0">{children}</div>
);

// Define types for our state
interface CellPosition {
  day: string;
  timeSlot: string;
  className: string;
}

interface MergedCell {
  mergedInto?: string;
  colSpan?: number;
  rowSpan?: number;
}

const TimeTable = () => {
  const [timetableData, setTimetableData] = useState<{ [key: string]: string }>({});
  const [selectedCell, setSelectedCell] = useState<CellPosition | null>(null);
  const [mergedCells, setMergedCells] = useState<{ [key: string]: MergedCell }>({});
  const [selectedSection, setSelectedSection] = useState<string>('');
  const [selectedClasses, setSelectedClasses] = useState<string[]>([]);
  const [displayClasses, setDisplayClasses] = useState<string[]>([]);
  const [showSubjectSelector, setShowSubjectSelector] = useState<boolean>(false);
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

  // Define the type for section keys
  type SectionKey = 'nursery' | 'lowerPrimary' | 'middlePrimary' | 'upperPrimary';

  const sections: Record<SectionKey, string[]> = {
    nursery: ['Nursery A', 'Nursery B'],
    lowerPrimary: ['P.1', 'P.2'],
    middlePrimary: ['P.3.W', 'P.3.E', 'P.4.W', 'P.4.E'],
    upperPrimary: ['P.5', 'P.6']
  };

  const handleSectionChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const section = e.target.value as SectionKey;
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
      const newTimetableData = { ...timetableData };
      
      // If this cell is merged into another cell, just clear this one
      if (newMergedCells[currentCellKey]?.mergedInto) {
        const parentKey = newMergedCells[currentCellKey].mergedInto;
        delete newMergedCells[currentCellKey];
        delete newTimetableData[currentCellKey];
        
        // Adjust the parent's span
        if (parentKey) {
          const cells = Object.keys(newMergedCells).filter(key => 
            newMergedCells[key].mergedInto === parentKey
          );
          
          // Determine if this is a row or column merge
          if (cells.length > 0) {
            const parentDay = parentKey.split('-')[0];
            const parentTimeSlot = parentKey.split('-')[1];
            const parentClass = parentKey.split('-')[2];
            
            // Check if cells are in the same row (horizontal merge)
            const sameRow = cells.every(key => key.split('-')[2] === parentClass);
            
            if (sameRow) {
              // Adjust horizontal span
              newMergedCells[parentKey].colSpan = cells.length + 1;
            } else {
              // Adjust vertical span
              newMergedCells[parentKey].rowSpan = cells.length + 1;
            }
          } else {
            // No more merged cells, reset spans
            newMergedCells[parentKey].colSpan = 1;
            newMergedCells[parentKey].rowSpan = 1;
          }
        }
      } 
      // If this cell is a merge parent, clear all merged cells
      else if (isMergeParent(day, timeSlot, className)) {
        // Find all cells merged into this one
        const mergedKeys = Object.keys(newMergedCells).filter(
          key => newMergedCells[key].mergedInto === currentCellKey
        );
        
        // Clear the merged cells
        mergedKeys.forEach(key => {
          delete newMergedCells[key];
          delete newTimetableData[key];
        });
        
        // Clear the parent cell
        delete newMergedCells[currentCellKey];
        delete newTimetableData[currentCellKey];
      } 
      // Regular unmerged cell
      else {
        delete newMergedCells[currentCellKey];
        delete newTimetableData[currentCellKey];
      }
      
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
    let newMergedCells = { ...mergedCells };
    
    // Process horizontal merges (same class, adjacent time slots)
    let rowCells = [currentCellKey];
    for (let i = timeIndex + 1; i < initialTimeSlots.length; i++) {
      const key = `${day}-${initialTimeSlots[i]}-${className}`;
      // Skip cells that are already part of another merge
      if (timetableData[key] === subject && !newMergedCells[key]?.mergedInto) {
        rowCells.push(key);
      } else {
        break;
      }
    }
    for (let i = timeIndex - 1; i >= 0; i--) {
      const key = `${day}-${initialTimeSlots[i]}-${className}`;
      // Skip cells that are already part of another merge
      if (timetableData[key] === subject && !newMergedCells[key]?.mergedInto) {
        rowCells.unshift(key);
      } else {
        break;
      }
    }

    // Process vertical merges (same time slot, adjacent classes)
    let colCells = [currentCellKey];
    for (let i = classIndex + 1; i < displayClasses.length; i++) {
      const key = `${day}-${timeSlot}-${displayClasses[i]}`;
      // Skip cells that are already part of another merge
      if (timetableData[key] === subject && !newMergedCells[key]?.mergedInto) {
        colCells.push(key);
      } else {
        break;
      }
    }
    for (let i = classIndex - 1; i >= 0; i--) {
      const key = `${day}-${timeSlot}-${displayClasses[i]}`;
      // Skip cells that are already part of another merge
      if (timetableData[key] === subject && !newMergedCells[key]?.mergedInto) {
        colCells.unshift(key);
      } else {
        break;
      }
    }

    // Apply horizontal merges if applicable
    if (rowCells.length > 1) {
      const firstCell = rowCells[0];
      
      // Check if the first cell is already involved in a merge
      if (!newMergedCells[firstCell] || !newMergedCells[firstCell].mergedInto) {
        newMergedCells[firstCell] = {
          ...(newMergedCells[firstCell] || {}),
          colSpan: rowCells.length,
          rowSpan: newMergedCells[firstCell]?.rowSpan || 1
        };
        
        rowCells.slice(1).forEach(key => {
          newMergedCells[key] = { mergedInto: firstCell };
        });
      }
    }

    // Apply vertical merges if applicable
    if (colCells.length > 1) {
      const firstCell = colCells[0];
      
      // Check if the first cell is already involved in a merge
      if (!newMergedCells[firstCell] || !newMergedCells[firstCell].mergedInto) {
        newMergedCells[firstCell] = {
          ...(newMergedCells[firstCell] || {}),
          colSpan: newMergedCells[firstCell]?.colSpan || 1,
          rowSpan: colCells.length
        };
        
        colCells.slice(1).forEach(key => {
          newMergedCells[key] = { mergedInto: firstCell };
        });
      }
    }
    
    // Update merged cells state if any changes were made
    if (rowCells.length > 1 || colCells.length > 1) {
      setMergedCells(newMergedCells);
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

  const getCellContent = (
    day: string,
    timeSlot: string,
    className: string
  ): string => {
    return timetableData[`${day}-${timeSlot}-${className}`] || '';
  };

  const shouldRenderCell = (
    day: string,
    timeSlot: string,
    className: string
  ): boolean => {
    const cellKey = `${day}-${timeSlot}-${className}`;
    return !mergedCells[cellKey]?.mergedInto;
  };

  const getCellSpans = (
    day: string,
    timeSlot: string,
    className: string
  ): { colSpan: number; rowSpan: number } => {
    const cellKey = `${day}-${timeSlot}-${className}`;
    return {
      colSpan: mergedCells[cellKey]?.colSpan || 1,
      rowSpan: mergedCells[cellKey]?.rowSpan || 1,
    };
  };

  // Helper function to check if a cell is part of a merge
  const isMergeParent = (
    day: string,
    timeSlot: string,
    className: string
  ): boolean => {
    const cellKey = `${day}-${timeSlot}-${className}`;
    return (
      !!mergedCells[cellKey] &&
      (mergedCells[cellKey]?.colSpan ?? 1) > 1 || (mergedCells[cellKey]?.rowSpan ?? 1) > 1
    );
  };
  
  // Add a special function to set up the break time
  const setupBreakTime = (): void => {
    if (displayClasses.length === 0) return; // Return if no classes selected
    
    const breakTimeSlot = "10:30am-11:00am";
    const newTimetableData = { ...timetableData };
    const newMergedCells = { ...mergedCells };
    
    // For each class, we'll merge the break time across all days horizontally
    displayClasses.forEach((className: string) => {
      // Only set up the first day (Monday) as the merge parent
      const firstDayKey = `MON-${breakTimeSlot}-${className}`;
      
      // Set "BREAK TIME" for the first day
      newTimetableData[firstDayKey] = "BREAK TIME";
      
      // Set up the horizontal merge across all 7 days
      newMergedCells[firstDayKey] = {
        colSpan: days.length, // Span across all days
        rowSpan: 1
      };
      
      // Mark other days' cells as merged into Monday's cell
      for (let i = 1; i < days.length; i++) {
        const day = days[i];
        const cellKey = `${day}-${breakTimeSlot}-${className}`;
        newMergedCells[cellKey] = { mergedInto: firstDayKey };
        // We don't need to set timetable data for these as they're merged
      }
    });
    
    setTimetableData(newTimetableData);
    setMergedCells(newMergedCells);
  };

  const handleSave = () => {
    setSuccessMessage(`Timetable for classes: ${selectedClasses.join(', ')} has been successfully saved.`);
  };
  
  // Add a method to render a special row for BREAK TIME across all days
  const renderBreakTimeRow = () => {
    if (displayClasses.length === 0) return null;
    
    // Find the index of the break time slot
    const breakTimeIndex = initialTimeSlots.indexOf("10:30am-11:00am");
    if (breakTimeIndex === -1) return null;
    
    return (
      <tr className="break-time-row">
        <td colSpan={2} className="border-2 border-black p-2 font-bold bg-orange-200 text-center">
          BREAK
        </td>
        {initialTimeSlots.map((slot, index) => {
          if (index === breakTimeIndex) {
            return (
              <td 
                key={slot} 
                className="border-2 border-black p-2 text-center font-bold bg-orange-200"
              >
                BREAK TIME
              </td>
            );
          } else if (index < breakTimeIndex) {
            // Empty cell before the break time
            return <td key={slot} className="border-0"></td>;
          } else {
            // Empty cell after the break time
            return null;
          }
        })}
      </tr>
    );
  };

  return (
    <div className="container mx-auto p-4">
      <div className="mb-4 flex flex-wrap gap-4">
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
            {displayClasses.length > 0 ? (
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
                                  timeSlot === "10:30am-11:00am" ? 'bg-orange-200 font-bold' :
                                  isMergeParent(day, timeSlot, className) ? 'bg-blue-200' : 
                                  getCellContent(day, timeSlot, className) ? 'bg-blue-50' : ''
                                }`}
                                onClick={() => handleCellClick(day, timeSlot, className)}
                                colSpan={colSpan}
                                rowSpan={rowSpan}
                                style={{
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
            ) : (
              <div className="text-center py-8 text-gray-500">
                Please select a section and at least one class to display the timetable
              </div>
            )}
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