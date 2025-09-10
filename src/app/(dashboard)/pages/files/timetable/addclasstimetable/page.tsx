"use client";
import React, { useState, useEffect, ReactNode } from 'react';
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

// Define prop types for Card components
interface CardProps {
  children: ReactNode;
  className?: string;
}

const Card: React.FC<CardProps> = ({ children, className = '' }) => (
  <div className={`rounded-lg border bg-card text-card-foreground shadow-sm ${className}`}>
    {children}
  </div>
);

const CardHeader: React.FC<{ children: ReactNode }> = ({ children }) => (
  <div className="flex flex-col space-y-1.5 p-6">{children}</div>
);

const CardTitle: React.FC<CardProps> = ({ children, className = '' }) => (
  <h3 className={`text-2xl font-semibold leading-none tracking-tight ${className}`}>{children}</h3>
);

const CardContent: React.FC<{ children: ReactNode }> = ({ children }) => (
  <div className="p-6 pt-0">{children}</div>
);

// Define types for state variables
interface TimetableData {
  [key: string]: string; // Adjust this type based on your actual data structure
}

interface MergedCells {
  [key: string]: {
    mergedInto?: string;
    colSpan?: number;
    rowSpan?: number;
  };
}

// Define type for ClassObj
type ClassObj = { id: string; name: string };

// Define the type for selected cell
type SelectedCell = { day: string; timeSlot: string; className: ClassObj };

// Define the type for Class
interface Class {
  id: string;
  name: string;
  section: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  createdById: string;
  updatedById: string | null;
  createdBy: {
    id: string;
    first_name: string;
    last_name: string;
  };
}

// Define the type for Section
interface Section {
  id: string;
  name: string;
}

interface AcademicYear {
  id: string;
  year: string;
  isActive: boolean;
}

interface Term {
  id: string;
  name: string;
}

const TimeTable: React.FC = () => {
  const [currentYear, setCurrentYear] = useState<AcademicYear | null>(null);
  const [currentTerm, setCurrentTerm] = useState<Term | null>(null);

  // Fetch current academic year and term
  useEffect(() => {
    const fetchCurrentSettings = async () => {
      try {
        const token = localStorage.getItem('accessToken');
        // Fetch academic year
        const yearResponse = await fetch(`${env.BACKEND_API_URL}/api/v1/academic-years/filter`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });
        const yearData = await yearResponse.json();
        if (yearData.success) {
          const activeYear = yearData.years.find((year: AcademicYear) => year.isActive);
          setCurrentYear(activeYear || null);
        }
        // Fetch current term
        const termResponse = await fetch(`${env.BACKEND_API_URL}/api/v1/term/active`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });
        const termData = await termResponse.json();
        if (termData.success && termData.term) {
          setCurrentTerm(termData.term);
        }
      } catch (error) {
        console.error('Error fetching current year/term:', error);
      }
    };
    fetchCurrentSettings();
  }, []);

  const [timetableData, setTimetableData] = useState<TimetableData>({});
  const [selectedCell, setSelectedCell] = useState<SelectedCell | null>(null);
  const [mergedCells, setMergedCells] = useState<MergedCells>({});
  const [selectedSection, setSelectedSection] = useState<string>('');
  const [selectedClasses, setSelectedClasses] = useState<{ id: string; name: string }[]>([]);
  const [displayClasses, setDisplayClasses] = useState<{id: string, name: string}[]>([]);
  const [showSubjectSelector, setShowSubjectSelector] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [classes, setClasses] = useState<Class[]>([]); // Adjust type as needed
  const [subjectsData, setSubjectsData] = useState<any[]>([]); // New state for subjects
  const [activities, setActivities] = useState<any[]>([]); // New state for activities
  const [sectionsData, setSectionsData] = useState<Section[]>([]); // New state for sections

  const baseUrl = `${env.BACKEND_API_URL}/api/v1`;

  useEffect(() => {
    // Fetch classes, subjects, and activities on component mount
    const fetchData = async () => {
      try {
        // Fetch classes
        const classesResponse = await authFetch(`${baseUrl}/classes/filter?limit=100`);
        if (!classesResponse.ok) {
          throw new Error(`Error fetching classes: ${classesResponse.status} ${classesResponse.statusText}`);
        }
        const classesData = await classesResponse.json();
        if (classesData.success) {
          setClasses(classesData.classes);
          // Set sections based on classes data
          const uniqueSections = Array.from(new Set(classesData.classes.map((c: Class) => c.section))) as string[];
          setSectionsData(uniqueSections.map((section) => ({ id: section, name: section })));
        }

        // Fetch subjects
        const subjectsResponse = await authFetch(`${baseUrl}/subjects/filter?limit=100`);
        if (!subjectsResponse.ok) {
          throw new Error(`Error fetching subjects: ${subjectsResponse.status} ${subjectsResponse.statusText}`);
        }
        const subjectsData = await subjectsResponse.json();
        if (subjectsData.success) {
          setSubjectsData(subjectsData.subjects);
        }

        // Fetch activities
        const activitiesResponse = await authFetch(`${baseUrl}/activities/filter?limit=100`);
        if (!activitiesResponse.ok) {
          throw new Error(`Error fetching activities: ${activitiesResponse.status} ${activitiesResponse.statusText}`);
        }
        const activitiesData = await activitiesResponse.json();
        if (activitiesData.success) {
          setActivities(activitiesData.activities);
        }
      } catch (error) {
        console.error("Error fetching data:", error);
      }
    };

    fetchData();
  }, [baseUrl]);

  const initialTimeSlots = [
    "6:30am-7:30am", "7:30am-8:00am", "8:00am-9:00am",
    "9:00am-10:30am", "10:30am-11:00am", "11:00am-12:00pm",
    "12:00pm-1:00pm", "1:00pm-2:00pm", "2:00pm-3:00pm",
    "3:00pm-4:00pm", "4:00pm-5:00pm", "5:00pm-7:00pm"
  ];

  const days = ["MON", "TUE", "WED", "THUR", "FRI", "SAT", "SUN"];

  // Define special periods for the timetable
  const specialPeriods = [
    { timeSlot: "7:30am-8:00am", name: "MORNING TEA", bgColor: "bg-blue-200", lightBgColor: "bg-blue-100" },
    { timeSlot: "10:30am-11:00am", name: "BREAK TIME", bgColor: "bg-orange-200", lightBgColor: "bg-orange-100" },
    { timeSlot: "1:00pm-2:00pm", name: "LUNCH TIME", bgColor: "bg-green-200", lightBgColor: "bg-green-100" },
    { timeSlot: "5:00pm-7:00pm", name: "PRAYERS/PERSONAL ADMIN", bgColor: "bg-purple-200", lightBgColor: "bg-purple-100" }
  ];

  const handleSectionChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const sectionId = e.target.value; // Assuming section ID is used as value
    setSelectedSection(sectionId);
    setDisplayClasses([]);

    // Filter classes based on the selected section
    const filteredClasses = classes.filter(c => c.section === sectionId);
    const selectedClassesWithId = filteredClasses.map(classObj => ({
      id: classObj.id,
      name: classObj.name
    }));

    setSelectedClasses(selectedClassesWithId);
  };

  const handleClassSelect = (classObj: { id: string; name: string }) => {
    // Store the full class object or at least {id, name}
    setDisplayClasses(prev =>
      prev.some(c => c.id === classObj.id)
        ? prev.filter(c => c.id !== classObj.id)
        : [...prev, { id: classObj.id, name: classObj.name }]
    );
  };

  const handleCellClick = (day: string, timeSlot: string, classId: string, className: ClassObj) => {
    // Don't allow editing special period cells
    if (specialPeriods.some(period => period.timeSlot === timeSlot)) {
      console.log("Cannot edit special period cell:", timeSlot);
      return;
    }

    console.log("Cell clicked:", day, timeSlot, className);
    setSelectedCell({ day, timeSlot, className }); // className is now {id, name}
    setShowSubjectSelector(true);
  };

  const handleClearCell = () => {
    if (selectedCell) {
      const { day, timeSlot, className } = selectedCell;
      // Ensure className is always {id, name}
      const classId = typeof className === 'string' ? '' : className.id;
      const classDisplayName = typeof className === 'string' ? className : className.name;
      const currentCellKey = [day, timeSlot, classId, classDisplayName].join('|||');

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
            const [parentDay, parentTimeSlot, parentClassId, parentClassName] = parentKey.split('|||');

            // Check if cells are in the same row (horizontal merge)
            const sameRow = cells.every(key => {
              const [, , cellClassId, cellClassName] = key.split('|||');
              return cellClassId === parentClassId && cellClassName === parentClassName;
            });

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
      else if (isMergeParent(day, timeSlot, classId, classDisplayName)) {
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
      setSuccessMessage(`Cell cleared for ${typeof className === 'string' ? className : className.name} on ${day} at ${timeSlot}`);
    }
  };

  // Define the handleSubjectSelect function that actually updates the timetable data
  const handleSubjectSelect = (subject: string) => {
    if (selectedCell) {
      const { day, timeSlot, className } = selectedCell;
      // Ensure className is always {id, name}
      const classId = typeof className === 'string' ? '' : className.id;
      const classDisplayName = typeof className === 'string' ? className : className.name;
      const currentCellKey = [day, timeSlot, classId, classDisplayName].join('|||');
      console.log("Setting subject:", subject, "for cell:", day, timeSlot, className);
      console.log("Using key:", currentCellKey);

      // Update the timetable data with the selected subject
      setTimetableData(prev => ({
        ...prev,
        [currentCellKey]: subject
      }));

      // Check if we need to merge cells with the same subject
      checkAndMergeCells(day, timeSlot, classId, classDisplayName, subject);

      // Close the subject selector and reset selected cell
      setShowSubjectSelector(false);
      setSelectedCell(null);
      setSuccessMessage(`Added "${getSubjectOrActivityName(subject)}" to ${classDisplayName} on ${day} at ${timeSlot}`);
    }
  };

  // Function to check and merge cells with the same subject
  const checkAndMergeCells = (day: string, timeSlot: string, classId: string, className: string, subject: string) => {
    const timeIndex = initialTimeSlots.indexOf(timeSlot);
    const currentCellKey = [day, timeSlot, classId, className].join('|||');
    let newMergedCells = { ...mergedCells };

    // Process horizontal merges (same class, adjacent time slots)
    let rowCells = [currentCellKey];
    for (let i = timeIndex + 1; i < initialTimeSlots.length; i++) {
      const nextTimeSlot = initialTimeSlots[i];
      const key = [day, nextTimeSlot, classId, className].join('|||');

      // Skip cells that are already part of another merge or special periods
      if (specialPeriods.some(period => period.timeSlot === nextTimeSlot)) {
        break;
      }

      if (timetableData[key] === subject && !newMergedCells[key]?.mergedInto) {
        rowCells.push(key);
      } else {
        break;
      }
    }

    for (let i = timeIndex - 1; i >= 0; i--) {
      const prevTimeSlot = initialTimeSlots[i];
      const key = [day, prevTimeSlot, classId, className].join('|||');

      // Skip cells that are already part of another merge or special periods
      if (specialPeriods.some(period => period.timeSlot === prevTimeSlot)) {
        break;
      }

      if (timetableData[key] === subject && !newMergedCells[key]?.mergedInto) {
        rowCells.unshift(key);
      } else {
        break;
      }
    }

    // Process vertical merges (same time slot, adjacent classes)
    let colCells = [currentCellKey];
    for (let i = 0; i < displayClasses.length; i++) {
      const nextClass = displayClasses[i];
      const key = [day, timeSlot, nextClass.id, nextClass.name].join('|||');

      // Skip cells that are already part of another merge
      if (timetableData[key] === subject && !newMergedCells[key]?.mergedInto) {
        colCells.push(key);
      } else {
        break;
      }
    }

    for (let i = displayClasses.length - 1; i >= 0; i--) {
      const prevClass = displayClasses[i];
      const key = [day, timeSlot, prevClass.id, prevClass.name].join('|||');

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

  const getSubjectOrActivityName = (id: string) => {
    // Try to find in subjects first
    const subject = subjectsData.find((s) => s.id === id);
    if (subject) return subject.name;
    // Then try activities
    const activity = activities.find((a) => a.id === id);
    if (activity) return activity.name;
    // Fallback to ID if not found
    return id || '';
  };

  const getCellContent = (day: string, timeSlot: string, classId: string, className: string) => {
    const id = timetableData[[day, timeSlot, classId, className].join('|||')];
    return id ? getSubjectOrActivityName(id) : '';
  };

  const shouldRenderCell = (day: string, timeSlot: string, classId: string, className: string) => {
    const cellKey = [day, timeSlot, classId, className].join('|||');
    return !mergedCells[cellKey]?.mergedInto;
  };

  const getCellSpans = (day: string, timeSlot: string, classId: string, className: string) => {
    const cellKey = [day, timeSlot, classId, className].join('|||');
    return {
      colSpan: mergedCells[cellKey]?.colSpan || 1,
      rowSpan: mergedCells[cellKey]?.rowSpan || 1
    };
  };

  const debugTimetableData = () => {
    console.log("=== TIMETABLE DEBUG INFO ===");
    console.log("timetableData keys:", Object.keys(timetableData));
    console.log("timetableData values:", Object.values(timetableData));
    console.log("Selected section:", selectedSection);
    console.log("Selected classes:", selectedClasses);
    console.log("Display classes:", displayClasses);
    console.log("=== END DEBUG INFO ===");
  };

  const handleSave = async () => {
    // First debug the current state
    debugTimetableData();
    
    // Check for prerequisites
    if (Object.keys(timetableData).length === 0) {
      setSuccessMessage("No timetable data to save. Please add at least one subject to the timetable.");
      return;
    }
    
    if (!selectedSection) {
      setSuccessMessage("Please select a section before saving.");
      return;
    }

    // Create an array to hold valid entries
    const validEntries = [];

    // Process each key in the timetable data
    for (const key of Object.keys(timetableData)) {
      console.log(`[handleSave] Processing key: ${key}`);
      
      // Split the key using the separator
      const keyParts = key.split('|||');
      
      // We need at least day, timeSlot, and classId
      if (keyParts.length < 3) {
        console.warn(`[handleSave] Invalid key format (too few parts): ${key}`);
        continue;
      }
      
      const day = keyParts[0];
      const timeSlot = keyParts[1];
      const classId = keyParts[2];
      const className = keyParts[3] || "";
      
      // Skip special periods
      if (specialPeriods.some(period => period.timeSlot === timeSlot)) {
        console.log(`[handleSave] Skipping special period: ${timeSlot}`);
        continue;
      }
      
      // Make sure we have the subject/activity ID
      const subjectActivityId = timetableData[key];
      if (!subjectActivityId) {
        console.warn(`[handleSave] No subject/activity ID for key: ${key}`);
        continue;
      }
      
      // Double check if the classId is valid by checking against the selected classes
      const validClass = selectedClasses.some(c => c.id === classId);
      if (!validClass) {
        console.warn(`[handleSave] Invalid class ID: ${classId} for key: ${key}`);
        continue;
      }
      
      // Create the entry
      const entry = {
        day,
        timeSlot,
        subjectActivityId,
        section: selectedSection,
        classId
      };
      
      console.log(`[handleSave] Created valid entry:`, entry);
      validEntries.push(entry);
    }
    
    // Build descriptive timetable name
    const sectionName = sectionsData.find(s => s.id === selectedSection)?.name || selectedSection;
    const classNames = displayClasses.map(c => c.name).join(', ');
    const timetableName = `RICH DAD JUNIOR SCHOOL - NAJJANANKUMBI | Section: ${sectionName} | Classes: ${classNames} | ${currentYear?.year || ''} | ${currentTerm?.name || ''}`;

    // Prepare the payload
    const timetablePayload = {
      name: timetableName,
      academicYearId: currentYear?.id,
      termId: currentTerm?.id,
      specialPeriods: [
        { timeSlot: "7:30am-8:00am", name: "MORNING TEA", bgColor: "bg-blue-200", lightBgColor: "bg-blue-100" },
        { timeSlot: "10:30am-11:00am", name: "BREAK", bgColor: "bg-orange-200", lightBgColor: "bg-orange-100" },
        { timeSlot: "1:00pm-2:00pm", name: "LUNCH", bgColor: "bg-green-200", lightBgColor: "bg-green-100" },
        { timeSlot: "5:00pm-7:00pm", name: "PERSONAL ADMIN", bgColor: "bg-purple-200", lightBgColor: "bg-purple-100" }
      ],
      entries: validEntries
    };


    // Check if we have entries to save
    if (timetablePayload.entries.length === 0) {
      setSuccessMessage("No valid timetable entries created. Please check console logs for details.");
      return;
    }

    // Debugging logs
    console.log(`[handleSave] Timetable entries count: ${timetablePayload.entries.length}`);
    console.log("[handleSave] First few entries:", timetablePayload.entries.slice(0, 3));
    console.log("[handleSave] Save Timetable clicked");
    console.log("[handleSave] timetablePayload:", timetablePayload);

    try {
      const response = await authFetch(`${baseUrl}/timetable/create`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(timetablePayload),
      });
      console.log("[handleSave] API response status:", response.status);
      const result = await response.json();
      console.log("[handleSave] API response JSON:", result);
      
      if (result.status && result.status.returnCode === "00") {
        setSuccessMessage(`Timetable created successfully! Saved ${timetablePayload.entries.length} entries.`);
      } else {
        setSuccessMessage(
          (result.status && result.status.returnMessage) ||
          result.message ||
          "Failed to save timetable. Check console for details."
        );
      }
    } catch (error: any) {
      console.error("Error creating timetable:", error);
      setSuccessMessage(error.message || "Error creating timetable. Check console for details.");
    }
  };

  const isMergeParent = (day: string, timeSlot: string, classId: string, className: string) => {
    // Check if this cell is the parent of any merged cells
    const cellKey = [day, timeSlot, classId, className].join('|||');
    return Object.keys(mergedCells).some(key => 
      key !== cellKey && mergedCells[key]?.mergedInto === cellKey
    );
  };

  // Helper function to find the special period info for a time slot
  const getSpecialPeriodForTimeSlot = (timeSlot: string) => {
    return specialPeriods.find(period => period.timeSlot === timeSlot);
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
            {sectionsData.map(section => (
              <option key={section.id} value={section.id}>{section.name}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-gray-700 mb-2">Select Classes:</label>
          <div className="flex flex-wrap gap-4">
            {selectedClasses.map((classObj: { id: string; name: string }) => (
              <div key={classObj.id} className="flex items-center">
                <input
                  type="checkbox"
                  id={classObj.name}
                  checked={displayClasses.some(c => c.id === classObj.id)}
                  onChange={() => handleClassSelect(classObj)}
                  className="mr-2"
                />
                <label htmlFor={classObj.name}>{classObj.name}</label>
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
              <p className="text-sm">Classes: {displayClasses.map(c => c.name).join(', ')}</p>
            </div>
          </CardTitle>
        </CardHeader><CardContent>
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
                    {initialTimeSlots.map((slot) => {
                      const specialPeriod = getSpecialPeriodForTimeSlot(slot);
                      return (
                        <th key={slot} className={`border-2 border-black p-2 text-sm ${specialPeriod ? specialPeriod.lightBgColor : ''}`}>
                          {slot}
                        </th>
                      );
                    })}
                  </tr>
                </thead>
                <tbody>
                  {/* Regular timetable rows with special periods merged vertically */}
                  {days.map((day, dayIndex) => (
                    <React.Fragment key={day}>
                      {displayClasses.map((className, classIdx) => (
                        <tr key={`${day}-${className.id}-${className.name}`}>
                          {classIdx === 0 && (
                            <td rowSpan={displayClasses.length} className="border-2 border-black p-2 font-bold">
                              {day}
                            </td>
                          )}
                          <td className="border-2 border-black p-2">{className.name}</td>
                          {initialTimeSlots.map((timeSlot) => {
                            // Check if this is a special period
                            const specialPeriod = getSpecialPeriodForTimeSlot(timeSlot);
                            
                            // For special periods, only render in the first day and first class of each day
                            if (specialPeriod) {
                              if (dayIndex === 0 && classIdx === 0) {
                                // Show the special period for the first day and class with rowspan covering all days and classes
                                return (
                                  <td 
                                    key={`special-${timeSlot}`} 
                                    className={`border-2 border-black p-2 text-center ${specialPeriod.bgColor}`}
                                    rowSpan={days.length * displayClasses.length}
                                    style={{
                                      padding: '8px 12px',
                                      verticalAlign: 'middle',
                                      position: 'relative',
                                      height: '100%'
                                    }}
                                  >
                                    <div
                                      style={{
                                        position: 'absolute',
                                        left: '50%',
                                        top: '50%',
                                        transform: 'translate(-50%, -50%) rotate(-90deg)',
                                        whiteSpace: 'nowrap',
                                        fontSize: '18px',
                                        fontWeight: 'bold',
                                        width: 'auto'
                                      }}
                                    >
                                      {specialPeriod.name}
                                    </div>
                                  </td>
                                );
                              } else {
                                // Skip rendering for other days and classes
                                return null;
                              }
                            }
                            
                            if (!shouldRenderCell(day, timeSlot, className.id, className.name)) {
                              return null;
                            }
                            
                            const { colSpan, rowSpan } = getCellSpans(day, timeSlot, className.id, className.name);
                            return (
                              <td
                                key={`${day}-${timeSlot}-${className.id}-${className.name}`}
                                className={`border-2 border-black p-2 text-sm cursor-pointer hover:bg-gray-100 ${
                                  isMergeParent(day, timeSlot, className.id, className.name) ? 'bg-blue-200' :
                                  getCellContent(day, timeSlot, className.id, className.name) ? 'bg-blue-50' : ''
                                }`}
                                onClick={() => handleCellClick(day, timeSlot, className.id, className)}
                                colSpan={colSpan}
                                rowSpan={rowSpan}
                                style={{
                                  textAlign: 'center'
                                }}
                              >
                                {getCellContent(day, timeSlot, className.id, className.name)}
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
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50">
          <div className="bg-white p-6 rounded-lg shadow-xl max-w-2xl w-full">
            <h3 className="text-lg font-bold mb-4">Select a Subject or Activity</h3>
            <div className="flex gap-4">
              <div className="grid grid-cols-3 gap-3">
                {subjectsData.map((subject) => (
                  <button
                    key={`subject-${subject.id}`}
                    className="p-2 text-sm bg-gray-100 hover:bg-gray-200 rounded transition-colors"
                    onClick={() => handleSubjectSelect(subject.id)}
                  >
                    {subject.name}
                  </button>
                ))}
              </div>
              <div className="flex items-center px-2 text-gray-400 text-2xl font-bold select-none">|</div>
              <div className="grid grid-cols-3 gap-3">
                {activities.map((activity) => (
                  <button
                    key={`activity-${activity.id}`}
                    className="p-2 text-sm bg-yellow-100 hover:bg-yellow-200 rounded transition-colors"
                    onClick={() => handleSubjectSelect(activity.id)}
                  >
                    {activity.name}
                  </button>
                ))}
              </div>
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