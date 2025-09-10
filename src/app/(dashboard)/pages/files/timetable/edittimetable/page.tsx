'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { env } from '@/env';

// Utility function to inject Authorization header with accessToken from localStorage
const authFetch = async (input: RequestInfo, init: RequestInit = {}) => {
  const accessToken = typeof window !== "undefined" ? localStorage.getItem("accessToken") : null;
  const headers = {
    ...(init.headers || {}),
    ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
  };
  return fetch(input, { ...init, headers });
};

type MergedCell = {
  colSpan?: number;
  rowSpan?: number;
  mergedInto?: string;
};

type TimetableEntry = {
  id: string;
  day: string;
  timeSlot: string;
  className: string;
  subject: string;
  isShared: boolean;
  isSpecialActivity: boolean;
  rowSpan?: number;
  colSpan?: number;
};

type Sections = {
  nursery: string[];
  lowerPrimary: string[];
  middlePrimary: string[];
  upperPrimary: string[];
};

type SectionKeys = keyof Sections;

// Time slots and days
const initialTimeSlots = [
  "6:30am-7:30am", "7:30am-8:00am", "8:00am-9:00am",
  "9:00am-10:30am", "10:30am-11:00am", "11:00am-12:00pm",
  "12:00pm-1:00pm", "1:00pm-2:00pm", "2:00pm-3:00pm",
  "3:00pm-4:00pm", "4:00pm-5:00pm", "5:00pm-6:00pm", "6:00pm-7:00pm"
];

const days = ["MON", "TUE", "WED", "THUR", "FRI", "SAT", "SUN"];

// Subjects and activities
const subjects = [
  "THEO", "NUM", "ENG", "LIT A", "LIT B", "MTC", "SCE", "SST", "READ", "RE",
  "SWIMMING", "SPORTS", "DEBATE QUIZ", "GAMES & SPORTS",
  "THEOLOGY AND MORNING WORK", "MORNING TEA", "BREAK", "PRAYERS & LUNCH",
  "GUIDANCE & COUNSELING", "PRAYERS / PERSONAL ADMIN", "SUPPER"
];

// Class sections
const sections: Sections = {
  nursery: ['Nursery A', 'Nursery B'],
  lowerPrimary: ['P.1', 'P.2'],
  middlePrimary: ['P.3.W', 'P.3.E', 'P.4.W', 'P.4.E'],
  upperPrimary: ['P.5', 'P.6']
};

const EditTimeTable = () => {
  // State for timetable data
  const [timetableData, setTimetableData] = useState<{ [key: string]: string }>({});
  const [mergedCells, setMergedCells] = useState<{ [key: string]: MergedCell }>({});
  
  // State for UI
  const [selectedCell, setSelectedCell] = useState<{ day: string; timeSlot: string; className: string } | null>(null);
  const [selectedSection, setSelectedSection] = useState<string>('');
  const [selectedClasses, setSelectedClasses] = useState<string[]>([]);
  const [displayClasses, setDisplayClasses] = useState<string[]>([]);
  const [showSubjectSelector, setShowSubjectSelector] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);

  // Function to load timetable data
  const baseUrl = `${env.BACKEND_API_URL}/api/v1`;

  const loadTimetableData = useCallback(async (classes: string[]) => {
    if (classes.length === 0) {
      setTimetableData({});
      setMergedCells({});
      return;
    }

    setIsLoading(true);
    setErrorMessage('');
    
    try {
      // In a production environment, we would fetch real timetable data
      // For development, we're using mock data but with proper API URL structure
      // TODO: Replace with actual API call when endpoint is ready
      // const response = await authFetch(`${baseUrl}/timetable/get?classes=${classes.join(',')}`); 
      
      // Currently simulating with mock data
      setTimeout(() => {
        // Initialize timetable data with mock content
        const newTimetableData: { [key: string]: string } = {};
        const newMergedCells: { [key: string]: MergedCell } = {};
        
        // Get the section from the first class
        const sectionKey = Object.entries(sections).find(([_, classArray]) => 
          classArray.includes(classes[0])
        )?.[0] as SectionKeys | undefined;
        
        // Set common activities for all classes and days
        classes.forEach(className => {
          days.forEach(day => {
            // Common activities for all days
            newTimetableData[`${day}-6:30am-7:30am-${className}`] = 'THEOLOGY AND MORNING WORK';
            newTimetableData[`${day}-7:30am-8:00am-${className}`] = 'MORNING TEA';
            newTimetableData[`${day}-10:30am-11:00am-${className}`] = 'BREAK';
            newTimetableData[`${day}-1:00pm-2:00pm-${className}`] = 'PRAYERS & LUNCH';
            newTimetableData[`${day}-5:00pm-6:00pm-${className}`] = 'PRAYERS / PERSONAL ADMIN';
            newTimetableData[`${day}-6:00pm-7:00pm-${className}`] = 'SUPPER';
          });
        });
        
        // Set merged cells for common activities
        days.forEach(day => {
          if (classes.length > 1) {
            newMergedCells[`${day}-6:30am-7:30am-${classes[0]}`] = { rowSpan: classes.length, colSpan: 1 };
            newMergedCells[`${day}-7:30am-8:00am-${classes[0]}`] = { rowSpan: classes.length, colSpan: 1 };
            newMergedCells[`${day}-10:30am-11:00am-${classes[0]}`] = { rowSpan: classes.length, colSpan: 1 };
            newMergedCells[`${day}-1:00pm-2:00pm-${classes[0]}`] = { rowSpan: classes.length, colSpan: 1 };
            newMergedCells[`${day}-5:00pm-6:00pm-${classes[0]}`] = { rowSpan: classes.length, colSpan: 1 };
            newMergedCells[`${day}-6:00pm-7:00pm-${classes[0]}`] = { rowSpan: classes.length, colSpan: 1 };
            
            // Mark cells that are merged into others
            for (let i = 1; i < classes.length; i++) {
              newMergedCells[`${day}-6:30am-7:30am-${classes[i]}`] = { mergedInto: `${day}-6:30am-7:30am-${classes[0]}` };
              newMergedCells[`${day}-7:30am-8:00am-${classes[i]}`] = { mergedInto: `${day}-7:30am-8:00am-${classes[0]}` };
              newMergedCells[`${day}-10:30am-11:00am-${classes[i]}`] = { mergedInto: `${day}-10:30am-11:00am-${classes[0]}` };
              newMergedCells[`${day}-1:00pm-2:00pm-${classes[i]}`] = { mergedInto: `${day}-1:00pm-2:00pm-${classes[0]}` };
              newMergedCells[`${day}-5:00pm-6:00pm-${classes[i]}`] = { mergedInto: `${day}-5:00pm-6:00pm-${classes[0]}` };
              newMergedCells[`${day}-6:00pm-7:00pm-${classes[i]}`] = { mergedInto: `${day}-6:00pm-7:00pm-${classes[0]}` };
            }
          }
        });
        
        // Add section-specific subjects based on selected classes
        if (sectionKey === 'nursery') {
          // Nursery specific subjects
          classes.forEach(className => {
            // Monday
            newTimetableData[`MON-8:00am-9:00am-${className}`] = 'PLAY';
            newTimetableData[`MON-9:00am-10:30am-${className}`] = 'ASSEMBLY';
            newTimetableData[`MON-11:00am-12:00pm-${className}`] = 'NUMBERS';
            newTimetableData[`MON-12:00pm-1:00pm-${className}`] = 'DRAWING';
            newTimetableData[`MON-2:00pm-3:00pm-${className}`] = 'STORY TIME';
            newTimetableData[`MON-3:00pm-4:00pm-${className}`] = 'GAMES';
            newTimetableData[`MON-4:00pm-5:00pm-${className}`] = 'MUSIC';
            
            // Tuesday
            newTimetableData[`TUE-8:00am-9:00am-${className}`] = 'ALPHABET';
            newTimetableData[`TUE-9:00am-10:30am-${className}`] = 'COLORING';
            newTimetableData[`TUE-11:00am-12:00pm-${className}`] = 'SHAPES';
            newTimetableData[`TUE-12:00pm-1:00pm-${className}`] = 'OUTDOOR PLAY';
            newTimetableData[`TUE-2:00pm-3:00pm-${className}`] = 'RHYMES';
            newTimetableData[`TUE-3:00pm-4:00pm-${className}`] = 'DANCE';
            newTimetableData[`TUE-4:00pm-5:00pm-${className}`] = 'STORY TIME';
            
            // Wednesday
            newTimetableData[`WED-8:00am-9:00am-${className}`] = 'NUMBERS';
            newTimetableData[`WED-9:00am-10:30am-${className}`] = 'ASSEMBLY';
            newTimetableData[`WED-11:00am-12:00pm-${className}`] = 'ALPHABET';
            newTimetableData[`WED-12:00pm-1:00pm-${className}`] = 'DRAWING';
            newTimetableData[`WED-2:00pm-3:00pm-${className}`] = 'GAMES';
            newTimetableData[`WED-3:00pm-4:00pm-${className}`] = 'MUSIC';
            newTimetableData[`WED-4:00pm-5:00pm-${className}`] = 'PLAY';
          });
        } else if (sectionKey === 'lowerPrimary') {
          // Lower Primary specific subjects
          classes.forEach(className => {
            // Monday
            newTimetableData[`MON-8:00am-9:00am-${className}`] = 'ENG';
            newTimetableData[`MON-9:00am-10:30am-${className}`] = 'ASSEMBLY';
            newTimetableData[`MON-11:00am-12:00pm-${className}`] = 'NUM';
            newTimetableData[`MON-12:00pm-1:00pm-${className}`] = 'READ';
            newTimetableData[`MON-2:00pm-3:00pm-${className}`] = 'LIT A';
            newTimetableData[`MON-3:00pm-4:00pm-${className}`] = 'THEO';
            newTimetableData[`MON-4:00pm-5:00pm-${className}`] = 'RE';
            
            // Tuesday
            newTimetableData[`TUE-8:00am-9:00am-${className}`] = 'NUM';
            newTimetableData[`TUE-9:00am-10:30am-${className}`] = 'READ';
            newTimetableData[`TUE-11:00am-12:00pm-${className}`] = 'ENG';
            newTimetableData[`TUE-12:00pm-1:00pm-${className}`] = 'LIT B';
            newTimetableData[`TUE-2:00pm-3:00pm-${className}`] = 'THEO';
            newTimetableData[`TUE-3:00pm-4:00pm-${className}`] = 'RE';
            newTimetableData[`TUE-4:00pm-5:00pm-${className}`] = 'SPORTS';
            
            // Wednesday
            newTimetableData[`WED-8:00am-9:00am-${className}`] = 'ENG';
            newTimetableData[`WED-9:00am-10:30am-${className}`] = 'ASSEMBLY';
            newTimetableData[`WED-11:00am-12:00pm-${className}`] = 'NUM';
            newTimetableData[`WED-12:00pm-1:00pm-${className}`] = 'READ';
            newTimetableData[`WED-2:00pm-3:00pm-${className}`] = 'LIT A';
            newTimetableData[`WED-3:00pm-4:00pm-${className}`] = 'THEO';
            newTimetableData[`WED-4:00pm-5:00pm-${className}`] = 'SWIMMING';
          });
        } else if (sectionKey === 'middlePrimary') {
          // Middle Primary specific subjects
          classes.forEach(className => {
            // Monday
            newTimetableData[`MON-8:00am-9:00am-${className}`] = 'ENG';
            newTimetableData[`MON-9:00am-10:30am-${className}`] = 'ASSEMBLY';
            newTimetableData[`MON-11:00am-12:00pm-${className}`] = 'MTC';
            newTimetableData[`MON-12:00pm-1:00pm-${className}`] = 'SST';
            newTimetableData[`MON-2:00pm-3:00pm-${className}`] = 'SCE';
            newTimetableData[`MON-3:00pm-4:00pm-${className}`] = 'THEO';
            newTimetableData[`MON-4:00pm-5:00pm-${className}`] = 'RE';
            
            // Tuesday
            newTimetableData[`TUE-8:00am-9:00am-${className}`] = 'MTC';
            newTimetableData[`TUE-9:00am-10:30am-${className}`] = 'ENG';
            newTimetableData[`TUE-11:00am-12:00pm-${className}`] = 'SST';
            newTimetableData[`TUE-12:00pm-1:00pm-${className}`] = 'SCE';
            newTimetableData[`TUE-2:00pm-3:00pm-${className}`] = 'THEO';
            newTimetableData[`TUE-3:00pm-4:00pm-${className}`] = 'RE';
            newTimetableData[`TUE-4:00pm-5:00pm-${className}`] = 'SPORTS';
            
            // Wednesday
            newTimetableData[`WED-8:00am-9:00am-${className}`] = 'ENG';
            newTimetableData[`WED-9:00am-10:30am-${className}`] = 'ASSEMBLY';
            newTimetableData[`WED-11:00am-12:00pm-${className}`] = 'MTC';
            newTimetableData[`WED-12:00pm-1:00pm-${className}`] = 'SST';
            newTimetableData[`WED-2:00pm-3:00pm-${className}`] = 'SCE';
            newTimetableData[`WED-3:00pm-4:00pm-${className}`] = 'THEO';
            newTimetableData[`WED-4:00pm-5:00pm-${className}`] = 'SWIMMING';
          });
        } else if (sectionKey === 'upperPrimary') {
          // Upper Primary specific subjects
          classes.forEach(className => {
            // Monday
            newTimetableData[`MON-8:00am-9:00am-${className}`] = 'ENG';
            newTimetableData[`MON-9:00am-10:30am-${className}`] = 'ASSEMBLY';
            newTimetableData[`MON-11:00am-12:00pm-${className}`] = 'MTC';
            newTimetableData[`MON-12:00pm-1:00pm-${className}`] = 'SST';
            newTimetableData[`MON-2:00pm-3:00pm-${className}`] = 'SCE';
            newTimetableData[`MON-3:00pm-4:00pm-${className}`] = 'THEO';
            newTimetableData[`MON-4:00pm-5:00pm-${className}`] = 'RE';
            
            // Tuesday
            newTimetableData[`TUE-8:00am-9:00am-${className}`] = 'MTC';
            newTimetableData[`TUE-9:00am-10:30am-${className}`] = 'ENG';
            newTimetableData[`TUE-11:00am-12:00pm-${className}`] = 'SST';
            newTimetableData[`TUE-12:00pm-1:00pm-${className}`] = 'SCE';
            newTimetableData[`TUE-2:00pm-3:00pm-${className}`] = 'THEO';
            newTimetableData[`TUE-3:00pm-4:00pm-${className}`] = 'RE';
            newTimetableData[`TUE-4:00pm-5:00pm-${className}`] = 'DEBATE QUIZ';
            
            // Wednesday
            newTimetableData[`WED-8:00am-9:00am-${className}`] = 'ENG';
            newTimetableData[`WED-9:00am-10:30am-${className}`] = 'ASSEMBLY';
            newTimetableData[`WED-11:00am-12:00pm-${className}`] = 'MTC';
            newTimetableData[`WED-12:00pm-1:00pm-${className}`] = 'SST';
            newTimetableData[`WED-2:00pm-3:00pm-${className}`] = 'SCE';
            newTimetableData[`WED-3:00pm-4:00pm-${className}`] = 'THEO';
            newTimetableData[`WED-4:00pm-5:00pm-${className}`] = 'GAMES & SPORTS';
          });
        }
        
        // Add assembly and other shared activities
        if (classes.length > 1) {
          classes.forEach((className, index) => {
            if (index > 0) {
              days.forEach(day => {
                newTimetableData[`${day}-9:00am-10:30am-${className}`] = 'ASSEMBLY';
                newMergedCells[`${day}-9:00am-10:30am-${className}`] = { 
                  mergedInto: `${day}-9:00am-10:30am-${classes[0]}` 
                };
              });
            }
          });
          
          // Set the first class's assembly with rowSpan
          days.forEach(day => {
            newMergedCells[`${day}-9:00am-10:30am-${classes[0]}`] = { 
              rowSpan: classes.length, 
              colSpan: 1 
            };
          });
        }
        
        setTimetableData(newTimetableData);
        setMergedCells(newMergedCells);
        setIsLoading(false);
        setSuccessMessage('Timetable loaded successfully');
        setTimeout(() => setSuccessMessage(''), 3000);
      }, 1000);
    } catch (error) {
      setErrorMessage('Failed to load timetable data');
      setIsLoading(false);
    }
  }, []);  // Update dependency array

  // Load timetable data when displayClasses changes
  useEffect(() => {
    if (displayClasses.length > 0) {
      loadTimetableData(displayClasses);
    }
  }, [displayClasses, loadTimetableData]);

  // Handle section change
  const handleSectionChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const section = e.target.value as SectionKeys;
    setSelectedSection(section);
    setDisplayClasses([]);
    setSelectedClasses(sections[section] || []);
  };

  // Handle class selection
  const handleClassSelect = (className: string) => {
    setDisplayClasses(prev => {
      const newClasses = prev.includes(className) 
        ? prev.filter(c => c !== className)
        : [...prev, className];
      return newClasses;
    });
  };

  // Handle cell click
  const handleCellClick = (day: string, timeSlot: string, className: string) => {
    setSelectedCell({ day, timeSlot, className });
    setShowSubjectSelector(true);
  };

  // Handle clearing a cell
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
      setTimeout(() => setSuccessMessage(''), 3000);
    }
  };

  // Handle merging cells
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

  // Handle subject selection
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
      setSuccessMessage(`Updated ${className} on ${day} at ${timeSlot} to ${subject}`);
      setTimeout(() => setSuccessMessage(''), 3000);
    }
  };

  // Get cell content
  const getCellContent = (day: string, timeSlot: string, className: string) => {
    return timetableData[`${day}-${timeSlot}-${className}`] || '';
  };

  // Check if cell should be rendered
  const shouldRenderCell = (day: string, timeSlot: string, className: string) => {
    const cellKey = `${day}-${timeSlot}-${className}`;
    return !mergedCells[cellKey]?.mergedInto;
  };

  // Get cell spans
  const getCellSpans = (day: string, timeSlot: string, className: string) => {
    const cellKey = `${day}-${timeSlot}-${className}`;
    return {
      colSpan: mergedCells[cellKey]?.colSpan || 1,
      rowSpan: mergedCells[cellKey]?.rowSpan || 1
    };
  };

  // Handle save
  const handleSave = async () => {
    setIsLoading(true);
    setErrorMessage('');
    
    try {
      // Prepare timetable data for saving
      const timetableEntries = [];
      
      for (const key in timetableData) {
        const [day, timeSlot, className] = key.split('-');
        // Find the class ID based on class name - in real implementation you'd use actual class IDs
        timetableEntries.push({
          day,
          timeSlot,
          className,
          subject: timetableData[key],
          // Include any other required fields
        });
      }
      
      // TODO: Replace with actual API call when endpoint is ready
      // const response = await authFetch(`${baseUrl}/timetable/update`, {
      //   method: 'POST',
      //   headers: {
      //     'Content-Type': 'application/json',
      //   },
      //   body: JSON.stringify({
      //     classes: displayClasses,
      //     section: selectedSection,
      //     entries: timetableEntries
      //   }),
      // });
      // 
      // if (!response.ok) {
      //   throw new Error(`Failed to save timetable: ${response.status}`);
      // }
      // const result = await response.json();
      
      // Simulate API call to save timetable for now
      setTimeout(() => {
        setIsLoading(false);
        setSuccessMessage(`Timetable for classes: ${displayClasses.join(', ')} has been successfully saved.`);
        setTimeout(() => setSuccessMessage(''), 3000);
      }, 1500);
    } catch (error: any) {
      setIsLoading(false);
      setErrorMessage(error.message || 'Failed to save timetable');
    }
  };

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-6">Edit Timetable</h1>
      
      {/* Timetable Selection */}
      <div className="mb-6 grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-gray-700 mb-2">Select Section:</label>
          <select
            className="border p-2 rounded w-full"
            value={selectedSection}
            onChange={handleSectionChange}
            disabled={isLoading}
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
                  disabled={isLoading}
                />
                <label htmlFor={className}>{className}</label>
              </div>
            ))}
          </div>
        </div>
      </div>

      {isLoading && (
        <div className="flex justify-center my-8">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
        </div>
      )}

      {errorMessage && (
        <div className="mb-4 p-4 bg-red-100 text-red-700 rounded-md">
          {errorMessage}
        </div>
      )}

      {successMessage && (
        <div className="mb-4 p-4 bg-green-100 text-green-700 rounded-md">
          {successMessage}
        </div>
      )}

      {displayClasses.length > 0 && !isLoading && (
        <>
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

          <div className="mt-4 flex space-x-4">
            <button
              onClick={handleSave}
              disabled={isLoading}
              className={`px-4 py-2 rounded transition-colors ${
                isLoading 
                  ? 'bg-gray-400 cursor-not-allowed' 
                  : 'bg-blue-500 text-white hover:bg-blue-600'
              }`}
            >
              {isLoading ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </>
      )}

      {showSubjectSelector && (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50">
          <div className="bg-white p-6 rounded-lg shadow-xl max-w-2xl w-full">
            <h3 className="text-lg font-bold mb-4">Select a Subject</h3>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
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
                Clear Cell
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
    </div>
  );
};

export default EditTimeTable;