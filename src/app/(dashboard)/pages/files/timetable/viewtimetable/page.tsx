"use client";
import React, { useState, useEffect, useCallback, ReactNode } from 'react';
import { env } from '@/env';

// Define types for API responses and data structures based on the database schema
interface Section {
  id: string;
  name: string;
}

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

interface AcademicYear {
  id: string;
  name: string;
  year: string;
}

interface Term {
  id: string;
  name: string;
}

interface Subject {
  id: string;
  name: string;
  type: string;
}

interface Activity {
  id: string;
  name: string;
  type: string;
}

interface SubjectActivity {
  id: string;
  name: string;
  type: string;
}

interface TimetableSpecialPeriod {
  id: string;
  timetableId: string;
  timeSlot: string;
  name: string;
  bgColor: string;
  lightBgColor: string;
  isSpecialPeriod: boolean;
  createdAt: string;
  updatedAt: string;
}

interface TimetableEntry {
  id: string;
  timetableId: string;
  classId: string;
  class?: {
    name: string;
    section: string;
  };
  day: string;
  timeSlot: string;
  subjectActivityId: string | null;
  subjectActivity?: SubjectActivity;
  customActivity: string | null;
  mergedColSpan: number;
  mergedRowSpan: number;
  mergedIntoId: string | null;
  section: string;
  createdAt: string;
  updatedAt: string;
}

interface Timetable {
  id: string;
  name: string;
  academicYearId: string;
  termId: string;
  academicYear?: {
    id: string;
    name: string;
    year: string;
  };
  term?: {
    id: string;
    name: string;
  };
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  createdById: string;
  updatedById: string | null;
  entries: TimetableEntry[];
  specialPeriods: TimetableSpecialPeriod[];
  formattedEntries?: {
    days: string[];
    timeSlots: string[];
    classes: string[];
    entriesMap: Record<string, any>;
  };
  classesBySection?: Record<string, string[]>;
}

interface ApiResponse<T> {
  success: boolean;
  message?: string;
  status?: {
    returnCode: string;
    returnMessage: string;
  };
  [key: string]: any;
  sections?: Section[];
  classes?: Class[];
  academicYears?: AcademicYear[];
  terms?: Term[];
  subjects?: Subject[];
  activities?: Activity[];
  timetables?: Timetable[];
  timetable?: Timetable;
  specialPeriods?: TimetableSpecialPeriod[];
}

interface SelectedCell {
  day: string;
  timeSlot: string;
  classId: string;
  className: string;
}

interface Message {
  text: string;
  type: 'success' | 'error' | 'info' | '';
}

// Merged cells tracking interface
interface MergedCellInfo {
  mergedInto?: string;
  colSpan?: number;
  rowSpan?: number;
}

interface MergedCellsMap {
  [key: string]: MergedCellInfo;
}

// Utility function to inject Authorization header with accessToken from localStorage
const authFetch = async (input: RequestInfo, init: RequestInit = {}): Promise<Response> => {
  const accessToken = typeof window !== "undefined" ? localStorage.getItem("accessToken") : null;
  const headers = {
    ...(init.headers || {}),
    ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
  };
  return fetch(input, { ...init, headers });
};

// Card Components
const Card: React.FC<{ children: ReactNode; className?: string }> = ({ 
  children, 
  className = '' 
}) => (
  <div className={`rounded-lg border bg-card text-card-foreground shadow-sm ${className}`}>
    {children}
  </div>
);

const CardHeader: React.FC<{ children: ReactNode }> = ({ children }) => (
  <div className="flex flex-col space-y-1.5 p-6">{children}</div>
);

const CardTitle: React.FC<{ children: ReactNode; className?: string }> = ({ 
  children, 
  className = '' 
}) => (
  <h3 className={`text-2xl font-semibold leading-none tracking-tight ${className}`}>{children}</h3>
);

const CardContent: React.FC<{ children: ReactNode }> = ({ children }) => (
  <div className="p-6 pt-0">{children}</div>
);

const EnhancedTimetableManager: React.FC = () => {
  const baseUrl = `${env.BACKEND_API_URL}/api/v1`;

  // -------------------- State: Filters & Data --------------------
  const [sections, setSections] = useState<Section[]>([]);
  const [classes, setClasses] = useState<Class[]>([]);
  const [academicYears, setAcademicYears] = useState<AcademicYear[]>([]);
  const [terms, setTerms] = useState<Term[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);

  // Selected filter values
  const [selectedSection, setSelectedSection] = useState<string>('');
  const [selectedClass, setSelectedClass] = useState<string>('');
  const [selectedAcademicYear, setSelectedAcademicYear] = useState<string>('');
  const [selectedTerm, setSelectedTerm] = useState<string>('');

  // Timetable data
  const [timetables, setTimetables] = useState<Timetable[]>([]);
  const [selectedTimetable, setSelectedTimetable] = useState<Timetable | null>(null);
  const [timetableEntries, setTimetableEntries] = useState<TimetableEntry[]>([]);
  const [specialPeriods, setSpecialPeriods] = useState<TimetableSpecialPeriod[]>([]);
  const [mergedCells, setMergedCells] = useState<MergedCellsMap>({});

  // UI states
  const [loading, setLoading] = useState<boolean>(false);
  const [message, setMessage] = useState<Message>({ text: '', type: '' });
  const [isEditMode, setIsEditMode] = useState<boolean>(false);
  const [showSubjectSelector, setShowSubjectSelector] = useState<boolean>(false);
  const [selectedCell, setSelectedCell] = useState<SelectedCell | null>(null);

  // -------------------- Derived Data --------------------
  // Only show timetable entries for the selected section (if any)
  const filteredEntries = selectedTimetable
    ? (selectedSection
        ? selectedTimetable.entries.filter(e => e.section === selectedSection)
        : selectedTimetable.entries)
    : [];

  // Time slots and days
  const initialTimeSlots = [
    "6:30am-7:30am", "7:30am-8:00am", "8:00am-9:00am",
    "9:00am-10:30am", "10:30am-11:00am", "11:00am-12:00pm",
    "12:00pm-1:00pm", "1:00pm-2:00pm", "2:00pm-3:00pm",
    "3:00pm-4:00pm", "4:00pm-5:00pm", "5:00pm-7:00pm"
  ];
  const days = ["MON", "TUE", "WED", "THUR", "FRI", "SAT", "SUN"];

  // -------------------- Data Fetching --------------------
  const fetchInitialData = useCallback(async (): Promise<void> => {
    setLoading(true);
    try {
      // Fetch classes
      const classesResponse = await authFetch(`${baseUrl}/classes/filter?limit=100`);
      if (classesResponse.ok) {
        const data = await classesResponse.json() as ApiResponse<Class[]>;
        if (data.success && data.classes) {
          setClasses(data.classes);
          // Derive unique sections from classes
          const uniqueSections = Array.from(new Set(data.classes.map((c: Class) => c.section)));
          setSections(uniqueSections.map((section) => ({ id: section, name: section })));
        }
      }
      // Academic years
      const academicYearsResponse = await authFetch(`${baseUrl}/academic-years/filter?limit=100`);
      if (academicYearsResponse.ok) {
        const data = await academicYearsResponse.json() as ApiResponse<AcademicYear[]>;
        if (data.success && data.academicYears) setAcademicYears(data.academicYears);
      }
      // Subjects
      const subjectsResponse = await authFetch(`${baseUrl}/subjects/filter?limit=100`);
      if (subjectsResponse.ok) {
        const data = await subjectsResponse.json() as ApiResponse<Subject[]>;
        if (data.success && data.subjects) setSubjects(data.subjects);
      }
      // Activities
      const activitiesResponse = await authFetch(`${baseUrl}/activities/filter?limit=100`);
      if (activitiesResponse.ok) {
        const data = await activitiesResponse.json() as ApiResponse<Activity[]>;
        if (data.success && data.activities) setActivities(data.activities);
      }
    } catch (error) {
      console.error("Error fetching initial data:", error);
      setMessage({ text: 'Failed to load initial data', type: 'error' });
    } finally {
      setLoading(false);
    }
  }, [baseUrl]);

  useEffect(() => {
    fetchInitialData();
  }, [fetchInitialData]);

  // -------------------- Filtering & Selection --------------------
  


  // Filter timetables based on selected criteria
  const filterTimetables = async (): Promise<void> => {
    setLoading(true);
    try {
      let queryParams: string[] = [];
      if (selectedSection) queryParams.push(`section=${selectedSection}`);
      if (selectedClass) queryParams.push(`classId=${selectedClass}`);
      if (selectedAcademicYear) queryParams.push(`academicYearId=${selectedAcademicYear}`);
      if (selectedTerm) queryParams.push(`termId=${selectedTerm}`);
      const queryString = queryParams.length > 0 ? `?${queryParams.join('&')}` : '';

      const response = await authFetch(`${baseUrl}/timetable/filter${queryString}`);
      if (response.ok) {
        const raw = await response.json();
        console.log('Raw timetable API response:', raw); // Debug log
        // Support both { timetables: [...] } and { data: { timetables: [...] } }
        const timetables = raw.timetables || raw.data?.timetables || [];
        const success = raw.success !== undefined ? raw.success : raw.status?.returnCode === '00';

        if (success && timetables) {
          // Filter timetable entries by section/class on the frontend
          const filteredTimetables = timetables.map((tt: any) => {
            let entries = tt.entries || [];
            if (selectedSection) {
              entries = entries.filter((e: any) => e.section === selectedSection);
            }
            if (selectedClass) {
              entries = entries.filter((e: any) => e.classId === selectedClass);
            }
            return { ...tt, entries };
          }).filter((tt: any) => tt.entries && tt.entries.length > 0);

          setTimetables(filteredTimetables);
          setMessage({
            text: filteredTimetables.length > 0
              ? `Found ${filteredTimetables.length} timetables`
              : 'No timetables found with the selected criteria',
            type: filteredTimetables.length > 0 ? 'success' : 'info'
          });
        } else {
          setTimetables([]);
          setMessage({
            text: 'No timetables found with the selected criteria',
            type: 'info'
          });
        }
      } else {
        throw new Error(`Server responded with ${response.status}: ${response.statusText}`);
      }
    } catch (error) {
      console.error("Error filtering timetables:", error);
      setMessage({
        text: 'Failed to filter timetables: ' + (error instanceof Error ? error.message : String(error)),
        type: 'error'
      });
      setTimetables([]);
    } finally {
      setLoading(false);
    }
  };

  // Load a specific timetable when selected
  const loadTimetable = async (timetableId: string): Promise<void> => {
    setLoading(true);
    try {
      // Fetch timetable details including entries and special periods
      const response = await authFetch(`${baseUrl}/timetable/filter/${timetableId}`);
      if (response.ok) {
        const raw = await response.json();
        // Support both { timetable: ... } and { data: { timetable: ... } }
        const timetable = raw.timetable || raw.data?.timetable;
        const success = raw.success !== undefined ? raw.success : raw.status?.returnCode === '00';
        if (success && timetable) {
          // Merge academicYear and term objects from lookup arrays if available
          const academicYearObj = academicYears.find(y => y.id === timetable.academicYearId);
          const termObj = terms.find(t => t.id === timetable.termId);
          setSelectedTimetable({
            ...timetable,
            academicYear: academicYearObj || timetable.academicYear,
            term: termObj || timetable.term,
          });
          setTimetableEntries(timetable.entries || []);
          setSpecialPeriods(timetable.specialPeriods || []);
          // Process merged cells
          processMergedCells(timetable.entries);
          setMessage({ text: `Loaded timetable: ${timetable.name}`, type: 'success' });
        } else {
          setMessage({ text: 'Failed to load timetable details', type: 'error' });
        }
      } else {
        throw new Error(`Server responded with ${response.status}: ${response.statusText}`);
      }
    } catch (error) {
      console.error("Error loading timetable:", error);
      setMessage({
        text: 'Failed to load timetable: ' + (error instanceof Error ? error.message : String(error)),
        type: 'error'
      });
    } finally {
      setLoading(false);
    }
  };

  // Process merged cells from timetable entries
  const processMergedCells = (entries: TimetableEntry[]): void => {
    const mergedCellsMap: MergedCellsMap = {};
    
    // Process entries to build merged cells map
    entries.forEach(entry => {
      const cellKey = `${entry.day}-${entry.timeSlot}-${entry.classId}`;
      
      // If this entry is merged into another entry
      if (entry.mergedIntoId) {
        // Find the parent entry
        const parentEntry = entries.find(e => e.id === entry.mergedIntoId);
        if (parentEntry) {
          const parentKey = `${parentEntry.day}-${parentEntry.timeSlot}-${parentEntry.classId}`;
          mergedCellsMap[cellKey] = { 
            mergedInto: parentKey 
          };
          
          // Make sure the parent is registered
          if (!mergedCellsMap[parentKey]) {
            mergedCellsMap[parentKey] = {
              colSpan: 1,
              rowSpan: 1
            };
          }
        }
      }
      
      // If this entry has merged cells (is a parent)
      if (entry.mergedColSpan > 1 || entry.mergedRowSpan > 1) {
        const cellKey = `${entry.day}-${entry.timeSlot}-${entry.classId}`;
        mergedCellsMap[cellKey] = {
          colSpan: entry.mergedColSpan,
          rowSpan: entry.mergedRowSpan
        };
      }
    });
    
    setMergedCells(mergedCellsMap);
  };

  // Save updated timetable
  const saveTimetable = async (): Promise<void> => {
    setLoading(true);
    try {
      if (!selectedTimetable || !selectedTimetable.id) {
        throw new Error("No timetable selected");
      }
      
      // Prepare entries with merged cell information
      const updatedEntries = timetableEntries.map(entry => {
        const cellKey = `${entry.day}-${entry.timeSlot}-${entry.classId}`;
        const mergedInfo = mergedCells[cellKey];
        
        if (mergedInfo && mergedInfo.mergedInto) {
          // Find the mergedIntoId based on the key
          const [parentDay, parentTimeSlot, parentClassId] = mergedInfo.mergedInto.split('-');
          const parentEntry = timetableEntries.find(e => 
            e.day === parentDay && 
            e.timeSlot === parentTimeSlot && 
            e.classId === parentClassId
          );
          
          return {
            ...entry,
            mergedIntoId: parentEntry?.id || null,
            mergedColSpan: 1,
            mergedRowSpan: 1
          };
        } else if (mergedInfo) {
          return {
            ...entry,
            mergedColSpan: mergedInfo.colSpan || 1,
            mergedRowSpan: mergedInfo.rowSpan || 1,
            mergedIntoId: null
          };
        }
        
        return entry;
      });
      
      // Update timetable details
      const updateResponse = await authFetch(`${baseUrl}/timetable/${selectedTimetable.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: selectedTimetable.name,
          academicYearId: selectedTimetable.academicYearId,
          termId: selectedTimetable.termId,
          specialPeriods: specialPeriods,
          entries: updatedEntries,
          replaceAllEntries: true // Replace all entries
        }),
      }); // authFetch will inject Authorization header
      
      if (updateResponse.ok) {
        const result = await updateResponse.json() as ApiResponse<any>;
        if (result.success) {
          setMessage({ text: 'Timetable updated successfully', type: 'success' });
          setIsEditMode(false);
          
          // Reload the timetable to refresh data
          await loadTimetable(selectedTimetable.id);
        } else {
          throw new Error(result.message || 'Failed to update timetable');
        }
      } else {
        const errorData = await updateResponse.json() as ApiResponse<any>;
        throw new Error(errorData.message || `Server responded with ${updateResponse.status}`);
      }
    } catch (error) {
      console.error("Error saving timetable:", error);
      setMessage({ 
        text: 'Failed to save timetable: ' + (error instanceof Error ? error.message : String(error)), 
        type: 'error' 
      });
    } finally {
      setLoading(false);
    }
  };

  // Function to handle cell click
  const handleCellClick = (day: string, timeSlot: string, classId: string, className: string): void => {
    // Don't allow editing special period cells
    if (specialPeriods.some(period => period.timeSlot === timeSlot)) {
      return;
    }
    
    if (!isEditMode) {
      setMessage({ text: 'Enable edit mode to modify timetable', type: 'info' });
      return;
    }
    
    // If the cell is already part of a merged cell, show message
    const cellKey = `${day}-${timeSlot}-${classId}`;
    if (mergedCells[cellKey]?.mergedInto) {
      setMessage({ 
        text: 'This is a merged cell. Edit the parent cell or unmarge first.', 
        type: 'info' 
      });
      return;
    }
    
    setSelectedCell({ day, timeSlot, classId, className });
    setShowSubjectSelector(true);
  };

  // Get existing entry for a cell
  const getCellEntry = (day: string, timeSlot: string, classId: string): TimetableEntry | undefined => {
    return timetableEntries.find(entry => 
      entry.day === day && entry.timeSlot === timeSlot && entry.classId === classId
    );
  };

  // Handle subject selection for a cell
  const handleSubjectSelect = (subjectId: string): void => {
    if (!selectedCell) return;
    
    const { day, timeSlot, classId } = selectedCell;
    
    // Check if an entry already exists for this cell
    const existingEntryIndex = timetableEntries.findIndex(entry => 
      entry.day === day && entry.timeSlot === timeSlot && entry.classId === classId
    );
    
    // Create a new entries array
    const newEntries = [...timetableEntries];
    
    if (existingEntryIndex >= 0) {
      // Update existing entry
      newEntries[existingEntryIndex] = {
        ...newEntries[existingEntryIndex],
        subjectActivityId: subjectId,
        customActivity: null
      };
    } else {
      // Add new entry
      newEntries.push({
        id: `temp-${Date.now()}`, // Temporary ID, will be replaced on save
        timetableId: selectedTimetable?.id || '',
        day,
        timeSlot,
        classId,
        subjectActivityId: subjectId,
        customActivity: null,
        mergedColSpan: 1,
        mergedRowSpan: 1,
        mergedIntoId: null,
        section: selectedSection || (selectedTimetable?.entries[0]?.section || ''),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });
    }
    
    setTimetableEntries(newEntries);
    setShowSubjectSelector(false);
    setSelectedCell(null);
    setMessage({ text: 'Cell updated successfully', type: 'success' });
  };

  // Handle clearing a cell
  const handleClearCell = (): void => {
    if (!selectedCell) return;
    
    const { day, timeSlot, classId } = selectedCell;
    
    // Remove the entry for this cell
    const newEntries = timetableEntries.filter(entry => 
      !(entry.day === day && entry.timeSlot === timeSlot && entry.classId === classId)
    );
    
    // Remove merged cell info if exists
    const cellKey = `${day}-${timeSlot}-${classId}`;
    const newMergedCells = { ...mergedCells };
    
    // If this is a merge parent, clear all child cells too
    if (newMergedCells[cellKey] && (newMergedCells[cellKey].colSpan || newMergedCells[cellKey].rowSpan)) {
      // Find all cells merged into this one
      const childKeys = Object.keys(newMergedCells).filter(key => 
        newMergedCells[key].mergedInto === cellKey
      );
      
      // Remove child merged cells
      childKeys.forEach(key => {
        delete newMergedCells[key];
      });
    }
    
    // Delete this cell from merged cells
    delete newMergedCells[cellKey];
    
    setTimetableEntries(newEntries);
    setMergedCells(newMergedCells);
    setShowSubjectSelector(false);
    setSelectedCell(null);
    setMessage({ text: 'Cell cleared successfully', type: 'success' });
  };

  // Handle merging cells
  const handleMergeCells = (): void => {
    if (!selectedCell) return;
    
    // Show an alert to get direction for merging
    const direction = window.prompt(
      "Enter merge direction (right, down) and number of cells to merge, e.g. 'right 3' or 'down 2':"
    );
    
    if (!direction) return;
    
    const [directionType, cellsCountStr] = direction.toLowerCase().split(' ');
    const cellsCount = parseInt(cellsCountStr);
    
    if (
      (directionType !== 'right' && directionType !== 'down') || 
      isNaN(cellsCount) || 
      cellsCount < 2
    ) {
      setMessage({ 
        text: 'Invalid merge format. Use "right X" or "down X" where X is number of cells.', 
        type: 'error' 
      });
      return;
    }
    
    const { day, timeSlot, classId } = selectedCell;
    const cellKey = `${day}-${timeSlot}-${classId}`;
    const newMergedCells = { ...mergedCells };
    
    // Set this cell as a merge parent
    newMergedCells[cellKey] = {
      colSpan: directionType === 'right' ? cellsCount : 1,
      rowSpan: directionType === 'down' ? cellsCount : 1
    };
    
    if (directionType === 'right') {
      // Merge horizontally (same day, same class, adjacent time slots)
      const timeSlotIndex = initialTimeSlots.indexOf(timeSlot);
      
      for (let i = 1; i < cellsCount; i++) {
        const nextTimeSlotIndex = timeSlotIndex + i;
        
        if (nextTimeSlotIndex >= initialTimeSlots.length) {
          setMessage({ text: 'Cannot merge beyond timetable bounds', type: 'error' });
          return;
        }
        
        const nextTimeSlot = initialTimeSlots[nextTimeSlotIndex];
        
        // Skip if it's a special period
        if (specialPeriods.some(p => p.timeSlot === nextTimeSlot)) {
          setMessage({ text: 'Cannot merge with special periods', type: 'error' });
          return;
        }
        
        const mergedCellKey = `${day}-${nextTimeSlot}-${classId}`;
        
        // Check if the target cell is already a merge parent
        if (newMergedCells[mergedCellKey] && !newMergedCells[mergedCellKey].mergedInto) {
          setMessage({ text: 'Cannot merge with a cell that is already a merge parent', type: 'error' });
          return;
        }
        
        newMergedCells[mergedCellKey] = { mergedInto: cellKey };
      }
    } else if (directionType === 'down') {
      // Get the classes for this section
      const sectionClasses = classes.filter(c => 
        c.section === selectedTimetable?.entries[0]?.section || selectedSection
      );
      
      const classIndex = sectionClasses.findIndex(c => c.id === classId);
      
      for (let i = 1; i < cellsCount; i++) {
        const nextClassIndex = classIndex + i;
        
        if (nextClassIndex >= sectionClasses.length) {
          setMessage({ text: 'Cannot merge beyond available classes', type: 'error' });
          return;
        }
        
        const nextClassId = sectionClasses[nextClassIndex].id;
        const mergedCellKey = `${day}-${timeSlot}-${nextClassId}`;
        
        // Check if the target cell is already a merge parent
        if (newMergedCells[mergedCellKey] && !newMergedCells[mergedCellKey].mergedInto) {
          setMessage({ text: 'Cannot merge with a cell that is already a merge parent', type: 'error' });
          return;
        }
        
        newMergedCells[mergedCellKey] = { mergedInto: cellKey };
      }
    }
    
    setMergedCells(newMergedCells);
    setSelectedCell(null);
    setMessage({ text: 'Cells merged successfully', type: 'success' });
  };

  // Get subject or activity name from ID
  const getSubjectOrActivityName = (id: string | null): string => {
    if (!id) return '';
    
    const subject = subjects.find(s => s.id === id);
    if (subject) return subject.name;
    
    const activity = activities.find(a => a.id === id);
    if (activity) return activity.name;
    
    return '';
  };

  // Render the cell content
  const getCellContent = (day: string, timeSlot: string, classId: string): string => {
    const entry = getCellEntry(day, timeSlot, classId);
    if (entry) {
      if (entry.customActivity) {
        return entry.customActivity;
      } else if (entry.subjectActivityId) {
        return getSubjectOrActivityName(entry.subjectActivityId);
      }
    }
    return '';
  };

  // Helper function to find the special period info for a time slot
  const getSpecialPeriodForTimeSlot = (timeSlot: string): TimetableSpecialPeriod | undefined => {
    return specialPeriods.find(period => period.timeSlot === timeSlot);
  };

  // Get filtered classes based on selected section
  // Used for both timetable list and detailed view
  const getFilteredClasses = (): Class[] => {
    if (selectedTimetable) {
      const timetableSection = selectedSection || selectedTimetable.entries[0]?.section;
      return classes.filter(c => c.section === timetableSection);
    }
    if (!selectedSection) return classes;
    return classes.filter(c => c.section === selectedSection);
  };

  // -------------------- Utility Functions --------------------

  // Check if a cell should be rendered (not merged into another cell)
  const shouldRenderCell = (day: string, timeSlot: string, classId: string): boolean => {
    const cellKey = `${day}-${timeSlot}-${classId}`;
    return !mergedCells[cellKey]?.mergedInto;
  };

  // Get cell spans (for merged cells)
  const getCellSpans = (day: string, timeSlot: string, classId: string): { colSpan: number, rowSpan: number } => {
    const cellKey = `${day}-${timeSlot}-${classId}`;
    return {
      colSpan: mergedCells[cellKey]?.colSpan || 1,
      rowSpan: mergedCells[cellKey]?.rowSpan || 1
    };
  };

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-3xl font-bold mb-6">Timetable Manager</h1>
      
      {/* Filter Section */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Filter Timetables</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-gray-700 mb-1">Section</label>
              <select
                className="w-full border p-2 rounded"
                value={selectedSection}
                onChange={(e) => setSelectedSection(e.target.value)}
              >
                <option value="">All Sections</option>
                {sections.map(section => (
                  <option key={section.id} value={section.id}>{section.name}</option>
                ))}
              </select>
            </div>
            
            <div>
              <label className="block text-gray-700 mb-1">Class</label>
              <select
                className="w-full border p-2 rounded"
                value={selectedClass}
                onChange={(e) => setSelectedClass(e.target.value)}
              >
                <option value="">All Classes</option>
                {getFilteredClasses().map(classObj => (
                  <option key={classObj.id} value={classObj.id}>{classObj.name}</option>
                ))}
              </select>
            </div>
          </div>
          
          <button
            className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded transition-colors"
            onClick={filterTimetables}
            disabled={loading}
          >
            {loading ? 'Loading...' : 'Search Timetables'}
          </button>
        </CardContent>
      </Card>
      
      {/* Message Display */}
      {message.text && (
        <div className={`p-4 mb-6 rounded-md ${
          message.type === 'error' ? 'bg-red-100 text-red-700' :
          message.type === 'success' ? 'bg-green-100 text-green-700' :
          'bg-blue-100 text-blue-700'
        }`}>
          {message.text}
        </div>
      )}
      
      {/* Timetables List */}
      {timetables.length > 0 && !selectedTimetable && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Available Timetables</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="bg-gray-100">
                    <th className="border p-2 text-left">Name</th>
                    <th className="border p-2 text-left">Academic Year</th>
                    <th className="border p-2 text-left">Term</th>
                    <th className="border p-2 text-left">Entries</th>
                    <th className="border p-2 text-left">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {timetables.map(timetable => (
                    <tr key={timetable.id} className="hover:bg-gray-50">
                      <td className="border p-2">{timetable.name}</td>
                      <td className="border p-2">
                        {academicYears.find(y => y.id === timetable.academicYearId)?.year
                          || timetable.academicYear?.year
                          || timetable.academicYearId}
                      </td>
                      <td className="border p-2">
                        {terms.find(t => t.id === timetable.termId)?.name
                          || timetable.term?.name
                          || timetable.termId}
                      </td>
                      <td className="border p-2">
                        {timetable.entries?.length || 0} entries, 
                        {timetable.specialPeriods?.length || 0} special periods
                        {timetable.entries?.length === 0 && timetable.specialPeriods?.length > 0 && (
                          <div className="mt-2 text-xs text-gray-700">
                            <strong>Special Periods:</strong>
                            <ul className="list-disc ml-4">
                              {timetable.specialPeriods.map(period => (
                                <li key={period.id}>
                                  {period.timeSlot}: {period.name}
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </td>
                      <td className="border p-2">
                        <button
                          className="bg-blue-500 hover:bg-blue-600 text-white px-3 py-1 rounded mr-2 transition-colors"
                          onClick={() => loadTimetable(timetable.id)}
                          disabled={loading}
                        >
                          View
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
      
      {/* Timetable View and Edit */}
      {selectedTimetable && (
        <div>
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-2xl font-bold">{selectedTimetable.name}</h2>
            <div className="space-x-2">
              <button
                className={`px-4 py-2 rounded ${
                  isEditMode 
                    ? 'bg-gray-300 hover:bg-gray-400' 
                    : 'bg-yellow-500 hover:bg-yellow-600 text-white'
                } transition-colors`}
                onClick={() => setIsEditMode(!isEditMode)}
              >
                {isEditMode ? 'Cancel Edit' : 'Edit Timetable'}
              </button>
              
              {isEditMode && (
                <button
                  className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded transition-colors"
                  onClick={saveTimetable}
                  disabled={loading}
                >
                  {loading ? 'Saving...' : 'Save Changes'}
                </button>
              )}
              
              <button
                className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded transition-colors"
                onClick={() => {
                  setSelectedTimetable(null);
                  setTimetableEntries([]);
                  setSpecialPeriods([]);
                  setMergedCells({});
                  setIsEditMode(false);
                }}
              >
                Back to List
              </button>
            </div>
          </div>
          
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="text-center">
                <div className="space-y-2">
                  <h2 className="text-xl font-bold">RICH DAD JUNIOR SCHOOL - NAJJANANKUMBI</h2>
                  <h3 className="text-lg">TIME TABLE {new Date(selectedTimetable.createdAt).getFullYear()}</h3>
                  <p className="text-sm">
                    Academic Year: {
                      academicYears.find(y => y.id === selectedTimetable.academicYearId)?.year ||
                      selectedTimetable.academicYear?.year ||
                      selectedTimetable.academicYearId
                    }
                  </p>
                  <p className="text-sm">
                    Term: {
                      terms.find(t => t.id === selectedTimetable.termId)?.name ||
                      selectedTimetable.term?.name ||
                      selectedTimetable.termId
                    }
                  </p>
                  <p className="text-sm">Class: {selectedTimetable.entries[0]?.class?.name || 'All Classes'}</p>
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
                      {initialTimeSlots.map((slot) => {
                        const specialPeriod = getSpecialPeriodForTimeSlot(slot);
                        return (
                          <th 
                            key={slot} 
                            className={`border-2 border-black p-2 text-sm ${
                              specialPeriod ? specialPeriod.lightBgColor : ''
                            }`}
                          >
                            {slot}
                          </th>
                        );
                      })}
                    </tr>
                  </thead>
                  <tbody>
                    {days.map((day, dayIndex) => (
                      <React.Fragment key={day}>
                        {getFilteredClasses()
                          .filter(c => c.id === selectedClass)
                          .map((classObj, classIdx) => (
                            <tr key={`${day}-${classObj.id}`}>
                              {classIdx === 0 && (
                                <td 
                                  rowSpan={1}
                                  className="border-2 border-black p-2 font-bold"
                                >
                                  {day}
                                </td>
                              )}
                              <td className="border-2 border-black p-2">{classObj.name}</td>
                              {initialTimeSlots.map((timeSlot) => {
                                const specialPeriod = getSpecialPeriodForTimeSlot(timeSlot);
                                
                                // For special periods, only render in the first day and first class of each day
                                if (specialPeriod) {
                                  if (dayIndex === 0 && classIdx === 0) {
                                    return (
                                      <td 
                                        key={`special-${timeSlot}`} 
                                        className={`border-2 border-black p-2 text-center ${specialPeriod.bgColor}`}
                                        rowSpan={
                                          days.length * 
                                          getFilteredClasses().filter(c => 
                                            selectedTimetable.entries.length === 0 || 
                                            c.section === selectedTimetable.entries[0]?.section
                                          ).length
                                        }
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
                                    return null; // Skip rendering for other instances of special periods
                                  }
                                }
                                
                                // Skip rendering if this cell is merged into another
                                if (!shouldRenderCell(day, timeSlot, classObj.id)) {
                                  return null;
                                }
                                
                                const { colSpan, rowSpan } = getCellSpans(day, timeSlot, classObj.id);
                                const cellContent = getCellContent(day, timeSlot, classObj.id);
                                
                                return (
                                  <td
                                    key={`${day}-${timeSlot}-${classObj.id}`}
                                    className={`border-2 border-black p-2 text-sm ${
                                      isEditMode ? 'cursor-pointer hover:bg-gray-100' : ''
                                    } ${cellContent ? 'bg-blue-50' : ''}`}
                                    onClick={() => handleCellClick(day, timeSlot, classObj.id, classObj.name)}
                                    colSpan={colSpan}
                                    rowSpan={rowSpan}
                                    style={{ textAlign: 'center' }}
                                  >
                                    {cellContent}
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
        </div>
      )}
      
      {/* Subject Selector Modal */}
      {showSubjectSelector && (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50">
          <div className="bg-white p-6 rounded-lg shadow-xl max-w-2xl w-full">
            <h3 className="text-lg font-bold mb-4">Select a Subject or Activity</h3>
            <div className="flex gap-4">
              <div className="grid grid-cols-3 gap-3">
                <h4 className="col-span-3 font-semibold">Subjects</h4>
                {subjects.map((subject) => (
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
                <h4 className="col-span-3 font-semibold">Activities</h4>
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
              <div>
                <button
                  className="bg-yellow-500 text-white px-4 py-2 rounded hover:bg-yellow-600 transition-colors mr-2"
                  onClick={handleClearCell}
                >
                  Clear Cell
                </button>
                <button
                  className="bg-purple-500 text-white px-4 py-2 rounded hover:bg-purple-600 transition-colors"
                  onClick={handleMergeCells}
                >
                  Merge Cells
                </button>
              </div>
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
}

export default EnhancedTimetableManager;