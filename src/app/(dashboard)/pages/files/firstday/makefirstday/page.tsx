"use client";
import React, { useState, ChangeEvent, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Image from 'next/image';
import { Check, X, Download } from 'lucide-react';
import PrintableContent from '../../../../../components/ui/print';
import { env } from '@/env';
import { supabase } from '../../../../../lib/supabaseClient';

interface StudentInfo {
  id: string;
  name: string;
  first_name?: string;
  middle_name?: string;
  last_name?: string;
  class: string;
  class_assigned?: string;
  term: string;
  year: string;
  photoUrl: string;
  student_photo?: string;
  academicYearId?: string;
  termId?: string;
}

interface Item {
  name: string;
  required: number;
  brought: number;
}

const BoardingChecklistView: React.FC = () => {
  const searchParams = useSearchParams();
  const router = useRouter();
  
  const [studentInfo, setStudentInfo] = useState<StudentInfo>({
    id: '',
    name: '',
    class: '',
    term: '',
    year: '',
    photoUrl: '/api/placeholder/120/120'
  });
  
  // State to track photo loading errors
  const [photoError, setPhotoError] = useState(false);
  
  // Function to get proper class display name - matched with StudentSelector version
  const getClassDisplayName = (classValue?: string): string => {
    if (!classValue) return 'Not assigned';
    
    const classMap: Record<string, string> = {
      'baby_class': 'Baby Class',
      'middle_class': 'Middle Class',
      'top_class': 'Top Class',
      'p1': 'P1',
      'p2': 'P2',
      'p3': 'P3',
      'p4': 'P4',
      'p5': 'P5',
      'p6': 'P6',
      'p7': 'P7',
      'form 3': 'Form 3',
      'form3': 'Form 3'
    };
    
    // Normalize class name by converting to lowercase for consistent lookup
    const normalizedClass = classValue.toLowerCase().trim();
    return classMap[normalizedClass] || classValue;
  };
  
  // Generate a consistent background color based on name for avatar fallback
  const getColorFromName = (name: string): string => {
    const colors = [
      'bg-blue-500',
      'bg-green-500',
      'bg-purple-500',
      'bg-pink-500',
      'bg-indigo-500',
      'bg-red-500',
    ];
    const index = name.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    return colors[index % colors.length];
  };
  
  // Get initials from name for avatar fallback
  const getInitials = (name: string): string => {
    if (!name) return '';
    const parts = name.split(' ').filter(part => part.length > 0);
    if (parts.length === 0) return '';
    if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
    return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
  };
  
  // Debug - log student info after state update has been applied
  useEffect(() => {
    console.log('Current student info state:', studentInfo);
    // Add extra validation to ensure student ID is always available
    if (!studentInfo.id && searchParams && searchParams.get('id')) {
      console.log('Fixing missing student ID from URL params');
      setStudentInfo(prev => ({
        ...prev,
        id: searchParams.get('id') || ''
      }));
    }
  }, [studentInfo, searchParams]);

  // Load student information from URL parameters and API
  useEffect(() => {
    if (searchParams) {
      const idFromUrl = searchParams.get('id') || '';
      const name = searchParams.get('name') || '';
      const className = searchParams.get('class') || '';
      const term = searchParams.get('term') || '';
      const year = searchParams.get('year') || '';
      const academicYearId = searchParams.get('academicYearId') || '';
      const termId = searchParams.get('termId') || '';
      
      console.log('URL parameters:', { id: idFromUrl, name, className, term, year });
      
      // Parse the full name to get first/middle/last names for better display and fallback avatar
      const nameParts = name.split(' ').filter(part => part.trim().length > 0);
      const firstName = nameParts.length > 0 ? nameParts[0] : '';
      const lastName = nameParts.length > 1 ? nameParts[nameParts.length - 1] : '';
      const middleName = nameParts.length > 2 ? nameParts.slice(1, -1).join(' ') : '';
      
      // Update student info with URL parameters initially
      setStudentInfo(prev => ({
        ...prev,
        id: idFromUrl, // Use the ID from the 'id' parameter
        name,
        first_name: firstName,
        middle_name: middleName,
        last_name: lastName,
        class: className,
        term,
        year,
        photoUrl: '/api/placeholder/120/120', // Default placeholder
        academicYearId,
        termId
      }));
      
      // Reset photo error state when loading new student
      setPhotoError(false);
      
      // Fetch the student's detailed information if we have an ID
      if (idFromUrl) {
        const accessToken = localStorage.getItem('accessToken');
        if (accessToken) {
          console.log('Fetching student details for ID:', idFromUrl);
          
          // Fetch student details from API
          const fetchStudentDetails = async () => {
            try {
              // Try the direct API endpoint with filter query parameter instead
              const apiUrl = `${env.BACKEND_API_URL}/api/v1/students/filter?studentId=${idFromUrl}`;
              console.log('Fetching student details from:', apiUrl);
              const response = await fetch(apiUrl, {
                headers: {
                  'Authorization': `Bearer ${accessToken}`,
                  'Content-Type': 'application/json'
                }
              });
              
              // Check if response is OK before parsing JSON
              if (!response.ok) {
                console.error('API response not OK:', response.status, response.statusText);
                // Don't try to parse as JSON if the status isn't OK
                throw new Error(`API responded with status ${response.status}`);
              }
              
              // Check content type to make sure we're getting JSON, not HTML
              const contentType = response.headers.get('content-type');
              if (!contentType || !contentType.includes('application/json')) {
                console.error('API returned non-JSON response:', contentType);
                throw new Error('API returned non-JSON response');
              }
              
              // Parse JSON response with proper error handling
              let data;
              try {
                data = await response.json();
              } catch (parseError) {
                console.error('Error parsing JSON response:', parseError);
                // If we can't parse the JSON, we'll fall back to URL parameters
                setStudentInfo(prev => ({
                  ...prev,
                  // Use whatever we already have from URL parameters
                  // This ensures we still show something even if the API fails
                }));
                throw new Error('Invalid JSON response from API');
              }
              console.log('Student API response:', data);
              
              // The API might return data in different formats
              // Handle both the students array format and direct student object format
              let studentData = null;
              
              // Format 1: data.data.students array
              if (data.data?.students && data.data.students.length > 0) {
                studentData = data.data.students[0];
              } 
              // Format 2: data.student direct object
              else if (data.student) {
                studentData = data.student;
              }
              // Format 3: data is the student object itself
              else if (data.id) {
                studentData = data;
              }
              
              if (studentData) {
                
                // Extract full name components if not provided in URL
                let fullName = `${studentData.first_name || ''} ${studentData.middle_name || ''} ${studentData.last_name || ''}`.trim();
                // If the API didn't return a proper name, use what we got from the URL
                if (!fullName && studentInfo.name) {
                  fullName = studentInfo.name;
                }
                
                // Extract photo URL from response - handle multiple field names
                const studentPhoto = studentData?.student_photo || '';
                
                // Construct proper photo URL if we have a student_photo filename
                let photoUrl = '/api/placeholder/120/120'; // Default fallback
                if (studentPhoto) {
                  // Construct URL to the student photo on the API server
                  photoUrl = `${env.BACKEND_API_URL}/api/v1/students/photo/${studentPhoto}`;
                } else {
                  // Try other possible photo URL fields
                  photoUrl = studentData?.photoUrl || studentData?.photo_url || 
                           studentData?.photo || studentData?.image || '/api/placeholder/120/120';
                }
                
                console.log('Student data:', {
                  studentId: idFromUrl,
                  name: studentData?.first_name,
                  studentPhoto,
                  photoUrl,
                  class: studentData?.class,
                  class_assigned: studentData?.class_assigned
                });
                
                // Extract class information properly - following same pattern as StudentSelector component
                let classInfo = className; // Start with URL param as default
                
                // Try different possible class fields from API response - match the logic in StudentSelector
                if (studentData?.class?.name) {
                  classInfo = studentData.class.name;
                } else if (studentData?.class_assigned) {
                  // class_assigned might contain the actual class name or an ID
                  classInfo = studentData.class_assigned;
                } else if (studentData?.class?.id) {
                  classInfo = studentData.class.id;
                } else if (studentData?.className) {
                  classInfo = studentData.className;
                }
                
                // Update student info with API data, but preserve the original student ID from URL
                setStudentInfo(prev => ({
                  ...prev,
                  // ALWAYS use the ID from the URL parameter to ensure consistency
                  id: idFromUrl,
                  // Always preserve academicYearId and termId from prev or URL
                  academicYearId: prev.academicYearId || academicYearId,
                  termId: prev.termId || termId,
                  gender: studentData?.gender,
                  photoUrl: photoUrl,
                  student_photo: studentPhoto,
                  class: classInfo || prev.class,
                  class_assigned: studentData?.class_assigned,
                  // Also update name parts if available in API 
                  first_name: studentData?.first_name || prev.first_name,
                  middle_name: studentData?.middle_name || prev.middle_name,
                  last_name: studentData?.last_name || prev.last_name
                }));
                
                console.log('Updated student info:', {
                  photo: studentPhoto,
                  photoUrl: photoUrl,
                  class: classInfo,
                  fullName
                });
              } else {
                console.warn('Failed to fetch student details, status:', response.status);
                
                // We're not using the profile API endpoint as it's returning 404 errors
                console.log('Skipping profile endpoint since it returns 404 errors');
                
              }
            } catch (error) {
              console.error('Error fetching student details:', error);
              
              // Even if the API call fails, we can still show the student info from URL parameters
              // This ensures we display something rather than nothing
              const nameFromUrl = searchParams.get('name') || '';
              const classFromUrl = searchParams.get('class') || '';
              
              console.log('Falling back to URL parameters for student data:', { 
                name: nameFromUrl, 
                class: classFromUrl
              });
              
              // Make sure we at least show the name and class from URL parameters
              setStudentInfo(prev => ({
                ...prev,
                name: nameFromUrl || prev.name,
                class: classFromUrl || prev.class,
                // Set a static placeholder image
                photoUrl: '/placeholder-student.png'
              }));
              
              // Set photo error to true to show initials
              setPhotoError(true);
            }
          };
          
          fetchStudentDetails();
        }
      }
    }
  }, [searchParams, studentInfo.name]); // Added studentInfo.name as dependency

  const [items, setItems] = useState<Item[]>([
    { name: 'Non-metallic suit case', required: 1, brought: 0 },
    { name: 'Pad lock', required: 1, brought: 0 },
    { name: 'Mosquito net', required: 1, brought: 0 },
    { name: 'Cotton night wear', required: 2, brought: 0 },
    { name: 'Cotton bed sheets', required: 2, brought: 0 },
    { name: 'Blanket', required: 1, brought: 0 },
    { name: 'Bathing soap', required: 3, brought: 0 },
    { name: 'Washing soap', required: 3, brought: 0 },
    { name: 'Detergent', required: 1, brought: 0 },
    { name: 'Local bathing sponge', required: 2, brought: 0 },
    { name: 'Pants', required: 12, brought: 0 },
    { name: 'Pant peg', required: 1, brought: 0 },
    { name: 'Hankies', required: 6, brought: 0 },
    { name: 'Nail cutter', required: 1, brought: 0 },
    { name: 'Vaseline', required: 1, brought: 0 },
    { name: 'Black shoes', required: 1, brought: 0 },
    { name: 'Shoe polish', required: 1, brought: 0 },
    { name: 'Canvas shoes', required: 1, brought: 0 },
    { name: 'Open shoes', required: 1, brought: 0 },
    { name: 'Sandals', required: 1, brought: 0 },
    { name: 'Toothbrushes', required: 3, brought: 0 },
    { name: 'Toothpaste', required: 2, brought: 0 },
    { name: 'Toilet bag', required: 1, brought: 0 },
    { name: 'Towel', required: 1, brought: 0 },
    { name: 'Comb', required: 1, brought: 0 },
    { name: 'Bucket', required: 1, brought: 0 },
    { name: 'Basin', required: 1, brought: 0 },
    { name: 'Hangers', required: 2, brought: 0 },
    { name: 'Soap dish', required: 1, brought: 0 },
    { name: 'Holy book / Yasarunah', required: 1, brought: 0 },
    { name: 'School bag', required: 1, brought: 0 },
    { name: 'Passport photos', required: 1, brought: 0 },
    { name: 'Religious attire', required: 1, brought: 0 },
    { name: 'Prayer mat', required: 1, brought: 0 },
    { name: 'Half petty', required: 1, brought: 0 },
    { name: 'Wrist watch', required: 1, brought: 0 },
    { name: 'Rechargeable torch', required: 1, brought: 0 },
    { name: 'Pegs', required: 12, brought: 0 },
    { name: 'Water bottle', required: 1, brought: 0 },
    { name: 'Shoe brush', required: 1, brought: 0 }
  ]);

  const [saveStatus, setSaveStatus] = useState<'success' | 'error' | ''>('');
  const [showPrintDialog, setShowPrintDialog] = useState(false);
  const [preparedBy, setPreparedBy] = useState<string>('');
  const [guardianInfo, setGuardianInfo] = useState({
    name: '',
    phone: ''
  });

  const handleQuantityChange = (index: number, value: number): void => {
    const newItems = [...items];
    newItems[index].brought = Math.max(0, Math.min(value, newItems[index].required));
    setItems(newItems);
    setSaveStatus('');
  };

  const handleGuardianInfoChange = (field: 'name' | 'phone', value: string): void => {
    setGuardianInfo(prev => ({
      ...prev,
      [field]: value
    }));
    setSaveStatus('');
  };

  const isCompleted = (): boolean => {
    // Only check if required fields are filled, not if all items match required quantities
    const allFieldsFilled = preparedBy.trim() !== '' &&
      guardianInfo.name.trim() !== '' &&
      guardianInfo.phone.trim() !== '';
    
    // Log validation state for debugging
    console.log('Form validation:', {
      preparedBy: preparedBy.trim() !== '',
      guardianName: guardianInfo.name.trim() !== '',
      guardianPhone: guardianInfo.phone.trim() !== '',
      result: allFieldsFilled
    });
    
    return allFieldsFilled;
  };

  const handleSave = async (): Promise<void> => {
    // Validation check - don't log repeatedly to avoid confusion
    const preparedByValid = preparedBy.trim() !== '';
    const guardianNameValid = guardianInfo.name.trim() !== '';
    const guardianPhoneValid = guardianInfo.phone.trim() !== '';
    
    // Check if all required fields are filled
    const allValid = preparedByValid && guardianNameValid && guardianPhoneValid;
    
    // If validation fails, set error state and return
    if (!allValid) {
      setSaveStatus('error');
      return;
    }
    
    try {
      // Get access token for API call
      const accessToken = localStorage.getItem('accessToken');
      if (!accessToken) {
        console.error('No access token found');
        setSaveStatus('error');
        return;
      }

      // IMPORTANT: Ensure we have all required IDs before saving
      if (!studentInfo.id) {
        console.error('Missing student ID, cannot save checklist');
        setSaveStatus('error');
        return;
      }

      // Format the data for API call - simplified to match what your API expects
      const checklistData = {
        studentId: studentInfo.id,
        academicYearId: studentInfo.academicYearId || '',
        termId: studentInfo.termId || '',
        guardianName: guardianInfo.name,
        guardianPhone: guardianInfo.phone,
        preparedBy: preparedBy,
        items: items.map(item => ({
          name: item.name,
          required: item.required,
          brought: item.brought
        }))
      };
      
      console.log('Saving boarding checklist data:', checklistData);
      
      // Validation: Prevent saving if required fields are missing
      if (!checklistData.studentId || !checklistData.academicYearId || !checklistData.termId) {
        setSaveStatus('error');
        alert('Please select Student, Academic Year, and Term before saving.');
        return;
      }
      
      // First, check if a record for this student, academic year and term already exists
      try {
        const checkUrl = `${env.BACKEND_API_URL}/api/v1/boardingChecklists/checkExists?studentId=${checklistData.studentId}&academicYearId=${checklistData.academicYearId}&termId=${checklistData.termId}`;
        console.log(`Checking for existing boarding checklist record:`, checkUrl);
        
        const checkResponse = await fetch(checkUrl, {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          }
        });
        
        if (checkResponse.ok) {
          const data = await checkResponse.json();
          
          if (data.exists) {
            // Record already exists
            alert('A boarding checklist record already exists for this student in this term. Cannot create duplicate entries.');
            setSaveStatus('error');
            return;
          }
        }
      } catch (checkError) {
        console.error('Error checking for existing records:', checkError);
        // Continue with save operation even if the check fails
      }
      
      // Make API call using the Next.js rewrite middleware defined in next.config.js
      // Use environment variable for the API URL
      const apiUrl = `${env.BACKEND_API_URL}/api/v1/boardingChecklists/add`;
      console.log(`Saving boarding checklist to ${apiUrl}`);
      
      try {
        const response = await fetch(apiUrl, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(checklistData)
        });
        
        if (response.ok) {
          try {
            const responseData = await response.json();
            console.log('Boarding checklist saved successfully:', responseData);
            setSaveStatus('success');
            setShowPrintDialog(true);
            
            // Show the print dialog first, then redirect after a short delay
            setTimeout(() => {
              router.push('/pages/firstday');
            }, 2500); // 2.5 second delay to show success message before redirect
          } catch (jsonError) {
            // Even if JSON parsing fails, the request was successful
            console.log('Boarding checklist saved successfully (no JSON response)');
            setSaveStatus('success');
            setShowPrintDialog(true);
            
            // Show the print dialog first, then redirect after a short delay
            setTimeout(() => {
              router.push('/pages/firstday');
            }, 2500); // 2.5 second delay to show success message before redirect
          }
        } else {
          console.error('Failed to save boarding checklist, status:', response.status);
          try {
            const errorData = await response.json();
            console.error('API error details:', errorData);
          } catch (e) {
            // If we can't parse the error as JSON, just log the status
            console.error('No detailed error information available');
          }
          setSaveStatus('error');
        }
      } catch (fetchError) {
        console.error('Error saving boarding checklist:', fetchError);
        setSaveStatus('error');
      }
      
      // Log incomplete items outside of the try/catch hierarchy for reference
      /*
      const incomplete = items
        .filter(item => item.brought !== item.required)
        .map(item => item.name);
      if (incomplete.length > 0) {
        // console.log('Incomplete items that were not fully brought:', incomplete);
      }
      */
    } catch (error) {
      console.error('Error saving boarding checklist:', error);
      setSaveStatus('error');
    }
  };

  const handleSaveToPDF = async (): Promise<void> => {
    try {
      const { jsPDF } = await import('jspdf');
      const doc = new jsPDF('p', 'mm', 'a4');
      
      // Title
      doc.setFontSize(20);
      doc.setFont('helvetica', 'bold');
      doc.text('BOARDING REQUIREMENTS CHECKLIST', 105, 20, { align: 'center' });
      
      // Line under title
      doc.setLineWidth(0.5);
      doc.line(20, 25, 190, 25);
      
      // Student information box
      doc.setFontSize(12);
      doc.setFont('helvetica', 'normal');
      doc.rect(20, 35, 170, 35);
      
      doc.setFont('helvetica', 'bold');
      doc.text('STUDENT INFORMATION', 25, 43);
      doc.setFont('helvetica', 'normal');
      doc.text(`Name: ${studentInfo.name}`, 25, 51);
      doc.text(`Class: ${getClassDisplayName(studentInfo.class)}`, 25, 58);
      doc.text(`Academic Year: ${studentInfo.year}`, 120, 51);
      doc.text(`Term: ${studentInfo.term}`, 120, 58);
      doc.text(`Date: ${new Date().toLocaleDateString()}`, 25, 65);
      
      // Guardian information
      doc.setFont('helvetica', 'bold');
      doc.text('GUARDIAN INFORMATION', 25, 85);
      doc.setFont('helvetica', 'normal');
      doc.text(`Guardian Name: ${guardianInfo.name}`, 25, 93);
      doc.text(`Phone Number: ${guardianInfo.phone}`, 25, 100);
      
      // Items table header
      let yPos = 120;
      doc.setFont('helvetica', 'bold');
      doc.text('ITEMS CHECKLIST', 25, yPos - 5);
      
      // Table headers
      doc.rect(20, yPos, 170, 10);
      doc.setFontSize(10);
      doc.text('No.', 25, yPos + 7);
      doc.text('Item Name', 40, yPos + 7);
      doc.text('Required', 120, yPos + 7);
      doc.text('Brought', 140, yPos + 7);
      doc.text('Remaining', 160, yPos + 7);
      doc.text('Status', 175, yPos + 7);
      
      yPos += 10;
      
      // Table content
      doc.setFont('helvetica', 'normal');
      items.forEach((item, index) => {
        const remaining = item.required - item.brought;
        const status = remaining === 0 ? '✓' : '✗';
        
        // Alternate row colors (simulate with border)
        if (index % 2 === 0) {
          doc.setFillColor(245, 245, 245);
          doc.rect(20, yPos, 170, 8, 'F');
        }
        
        doc.text(`${index + 1}`, 25, yPos + 5);
        doc.text(item.name.length > 25 ? item.name.substring(0, 25) + '...' : item.name, 40, yPos + 5);
        doc.text(String(item.required), 125, yPos + 5);
        doc.text(String(item.brought), 145, yPos + 5);
        doc.text(String(remaining), 165, yPos + 5);
        doc.text(status, 178, yPos + 5);
        
        yPos += 8;
        
        // Add new page if needed
        if (yPos > 250) {
          doc.addPage();
          yPos = 30;
        }
      });
      
      // Summary section
      yPos += 10;
      const totalRequired = items.reduce((sum, item) => sum + item.required, 0);
      const totalBrought = items.reduce((sum, item) => sum + item.brought, 0);
      const totalRemaining = totalRequired - totalBrought;
      
      doc.setFont('helvetica', 'bold');
      doc.text('SUMMARY', 25, yPos);
      doc.setFont('helvetica', 'normal');
      doc.text(`Total Items Required: ${totalRequired}`, 25, yPos + 8);
      doc.text(`Total Items Brought: ${totalBrought}`, 25, yPos + 16);
      doc.text(`Total Items Remaining: ${totalRemaining}`, 25, yPos + 24);
      
      // Footer
      yPos += 40;
      doc.setFont('helvetica', 'bold');
      doc.text(`Prepared By: ${preparedBy}`, 25, yPos);
      doc.text(`Date: ${new Date().toLocaleDateString()}`, 120, yPos);
      doc.text(`Time: ${new Date().toLocaleTimeString()}`, 120, yPos + 8);
      
      // Generate filename with student name and date
      const fileName = `boarding-checklist-${studentInfo.name.replace(/\s+/g, '-')}-${new Date().toISOString().split('T')[0]}.pdf`;
      
      // Save the PDF
      doc.save(fileName);
      
    } catch (error) {
      console.error('Error generating PDF:', error);
      alert('Error generating PDF. Please try again.');
    }
  };

  const handlePrint = (): void => {
    // The actual printing is now handled by the PrintableContent component
    setShowPrintDialog(false);
    // Only redirect after print dialog is closed
    setTimeout(() => {
      router.push('/pages/firstday');
    }, 500);
  };

  // Student photo component
  const StudentPhoto = ({ studentInfo }: { studentInfo: StudentInfo }) => {
    const [imageUrl, setImageUrl] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [photoError, setPhotoError] = useState(false);

    useEffect(() => {
      const getSignedUrl = async () => {
        if (!studentInfo.student_photo) {
          setIsLoading(false);
          return;
        }

        const { data, error } = await supabase.storage
          .from('student-photos')
          .createSignedUrl(studentInfo.student_photo, 3600);
        
        if (error) {
          console.error("Error creating signed URL for first day page:", error);
          setIsLoading(false);
          setPhotoError(true);
          return;
        }

        if (data?.signedUrl) {
          setImageUrl(data.signedUrl);
        }
        
        setIsLoading(false);
      };
      
      getSignedUrl();
    }, [studentInfo.student_photo]);

    // Show a loading shimmer while fetching the URL
    if (isLoading) {
      return (
        <div className="absolute inset-0 bg-gray-200 animate-pulse flex items-center justify-center">
          <div className="h-8 w-8 rounded-full bg-gray-300"></div>
        </div>
      );
    }
    
    // If we have a valid URL, show the image
    if (imageUrl && !photoError) {
      return (
        <Image
          src={imageUrl}
          alt={`${studentInfo.name}'s photo`}
          fill
          className="object-cover"
          sizes="128px"
          unoptimized // Important for external URLs like those from Supabase
          onError={() => {
            console.error('Failed to load student photo from Supabase:', imageUrl);
            setPhotoError(true);
          }}
        />
      );
    }

    // Otherwise, show the fallback initials
    return (
      <div className={`absolute inset-0 flex items-center justify-center ${getColorFromName(studentInfo.name)}`}>
        <span className="text-white text-4xl font-bold">
          {getInitials(studentInfo.name)}
        </span>
      </div>
    );
  };

  return (
    <div className="w-full max-w-4xl bg-white rounded-lg shadow-lg ml-24">
      <div className="border-b p-6">
        <h1 className="text-2xl font-bold">Personal Boarding Requirements - {studentInfo.year || new Date().getFullYear()}</h1>
      </div>

      <div className="p-6">
        {/* Student Information with Photo */}
        <div className="grid grid-cols-4 gap-6 mb-6 bg-gray-50 p-6 rounded-lg items-start">
          {/* Photo Column */}
          <div className="flex flex-col items-center space-y-2">
            <div className="w-32 h-32 rounded-lg overflow-hidden border-4 border-white shadow-lg relative">
              <StudentPhoto studentInfo={studentInfo} />
            </div>
            <span className="text-sm text-gray-500">Student ID Photo</span>
          </div>

          {/* Details Column */}
          <div className="col-span-3 grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <span className="text-sm font-medium text-gray-500">Student Name</span>
              <p className="text-lg font-semibold text-gray-900">{studentInfo.name}</p>
            </div>
            <div className="space-y-1">
              <span className="text-sm font-medium text-gray-500">Class</span>
              <p className="text-lg font-semibold text-gray-900">
                {studentInfo.class_assigned ? 
                  getClassDisplayName(studentInfo.class_assigned) : 
                  getClassDisplayName(studentInfo.class)}
              </p>
            </div>
            <div className="space-y-1">
              <span className="text-sm font-medium text-gray-500">Term</span>
              <p className="text-lg font-semibold text-gray-900">{studentInfo.term}</p>
            </div>
            <div className="space-y-1">
              <span className="text-sm font-medium text-gray-500">Year</span>
              <p className="text-lg font-semibold text-gray-900">{studentInfo.year}</p>
            </div>
          </div>
        </div>

        {/* Date and Time Information */}
        <div className="mb-6 bg-white border border-gray-200 rounded-lg p-4">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">Date Reported</h3>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">
                Date
              </label>
              <p className="text-lg text-gray-900">
                {new Date().toLocaleDateString('en-US', {
                  weekday: 'long',
                  day: 'numeric',
                  month: 'long',
                  year: 'numeric'
                })}
              </p>
            </div>
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">
                Time
              </label>
              <p className="text-lg text-gray-900">
                {new Date().toLocaleTimeString('en-US', {
                  hour: '2-digit',
                  minute: '2-digit',
                  hour12: true
                })}
              </p>
            </div>
          </div>
        </div>

        {/* Brought By Information */}
        <div className="mb-6 bg-white border border-gray-200 rounded-lg p-4">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">Brought By</h3>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label htmlFor="guardianName" className="block text-sm font-medium text-gray-700">
                Parent/Guardian Name
              </label>
              <input
                id="guardianName"
                type="text"
                className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  saveStatus === 'error' && !guardianInfo.name.trim() ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder="Enter full name"
                value={guardianInfo.name}
                onChange={(e: ChangeEvent<HTMLInputElement>) =>
                  handleGuardianInfoChange('name', e.target.value)
                }
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="phoneNumber" className="block text-sm font-medium text-gray-700">
                Phone Number
              </label>
              <input
                id="phoneNumber"
                type="tel"
                className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  saveStatus === 'error' && !guardianInfo.phone.trim() ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder="Enter phone number"
                value={guardianInfo.phone}
                onChange={(e: ChangeEvent<HTMLInputElement>) =>
                  handleGuardianInfoChange('phone', e.target.value)
                }
              />
            </div>
          </div>
        </div>

        <div className="rounded-lg border border-gray-200 overflow-hidden mb-4">
          <div className="grid grid-cols-7 gap-0 bg-gray-50">
            <div className="p-4 text-sm font-semibold text-gray-600 border-r">#</div>
            <div className="col-span-2 p-4 text-sm font-semibold text-gray-600 border-r">Item</div>
            <div className="p-4 text-sm font-semibold text-gray-600 border-r">Required</div>
            <div className="p-4 text-sm font-semibold text-gray-600 border-r">Brought</div>
            <div className="p-4 text-sm font-semibold text-gray-600 border-r">Remaining</div>
            <div className="p-4 text-sm font-semibold text-gray-600">Status</div>
          </div>

          {items.map((item, index) => {
            const remaining = item.required - item.brought;
            return (
              <div key={index} className={`grid grid-cols-7 gap-0 border-t ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}>
                <div className="p-4 text-sm text-gray-600 border-r">{index + 1}</div>
                <div className="col-span-2 p-4 text-sm text-gray-800 border-r">{item.name}</div>
                <div className="p-4 text-sm text-gray-600 border-r">{item.required}</div>
                <div className="p-4 text-sm border-r">
                  <input
                    type="number"
                    value={item.brought}
                    onChange={(e: ChangeEvent<HTMLInputElement>) =>
                      handleQuantityChange(index, parseInt(e.target.value) || 0)
                    }
                    className="w-16 px-2 py-1 border rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    min="0"
                    max={item.required}
                  />
                </div>
                <div className={`p-4 text-sm border-r ${remaining > 0 ? "text-red-500" : "text-green-500"}`}>
                  {remaining === 0 ? '-' : remaining}
                </div>
                <div className="p-4 flex justify-center">
                  {remaining === 0 ? (
                    <Check className="text-green-500 w-5 h-5" />
                  ) : (
                    <X className="text-red-500 w-5 h-5" />
                  )}
                </div>
              </div>
            );
          })}
        </div>

        <div className="mt-6 space-y-4 bg-gray-50 p-6 rounded-lg">
          <div>
            <h3 className="font-bold text-gray-800 mb-2">Drinks Allowed:</h3>
            <p className="text-gray-600">Mineral water, Packed milk, Oner or Minute maid</p>
          </div>

          <div>
            <h3 className="font-bold text-gray-800 mb-2">Stationery Fees:</h3>
            <div className="space-y-1 text-gray-600">
              <p>Nursery: 70,000/= Per year</p>
              <p>P1, P2 & P3: 80,000/= Per term</p>
              <p>P4 - P5: 140,000/= Per term</p>
              <p>P6 - P7: 160,000/= Per term</p>
            </div>
          </div>
        </div>

        <div className="mt-6 border-t pt-6">
          <div className="space-y-2">
            <label htmlFor="preparedBy" className="block text-sm font-medium text-gray-700">
              Prepared By
            </label>
            <input
              id="preparedBy"
              type="text"
              value={preparedBy}
              onChange={(e: ChangeEvent<HTMLInputElement>) => setPreparedBy(e.target.value)}
              className={`w-full max-w-md px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                saveStatus === 'error' && !preparedBy.trim() ? 'border-red-500' : 'border-gray-300'
              }`}
              placeholder="Enter your name"
            />
          </div>
        </div>

        <div className="flex justify-end mt-6 space-x-4">
          <button
            onClick={handleSave}
            className="px-6 py-2 rounded-lg text-white bg-green-600 hover:bg-green-700 transition-colors"
          >
            Save Requirements
          </button>
          <button
            onClick={handleSaveToPDF}
            className="px-6 py-2 rounded-lg text-white bg-blue-600 hover:bg-blue-700 transition-colors flex items-center space-x-2"
          >
            <Download className="w-4 h-4" />
            <span>Save to PDF</span>
          </button>
        </div>

        {saveStatus === 'success' && (
          <div className="mt-4 bg-green-50 text-green-800 border border-green-200 rounded-lg p-4">
            Requirements successfully saved!
          </div>
        )}

        {saveStatus === 'error' && (
          <div className="mt-4 bg-red-50 text-red-800 border border-red-200 rounded-lg p-4">
            Please fill out all required fields (Prepared By, Guardian Name and Phone) before saving.
          </div>
        )}
      </div>

    </div>
  );
};

const MakeFirstDayPageWrapper: React.FC = () => {
  return (
    <Suspense fallback={<div className="p-4 w-full h-full flex justify-center items-center"><p>Loading checklist...</p></div>}>
      <BoardingChecklistView />
    </Suspense>
  );
};

export default MakeFirstDayPageWrapper;