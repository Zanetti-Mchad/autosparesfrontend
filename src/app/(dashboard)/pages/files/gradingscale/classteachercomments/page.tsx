'use client';

import React, { useState, useEffect, useCallback, useMemo, Suspense } from 'react';
import { env } from '@/env';
import Image from 'next/image';
import { AlertCircle, Check, Calendar, FileText } from "lucide-react";
import { useRouter, useSearchParams } from 'next/navigation';

// Local Alert component with static methods
const Alert = ({ children, className }: { children: React.ReactNode; className?: string }) => (
 <div className={`p-4 border rounded ${className}`}>{children}</div>
);

Alert.error = (message: string) => {
 const errorAlert = document.createElement('div');
 errorAlert.className = 'fixed top-4 right-4 bg-red-100 border-red-400 text-red-700 rounded-lg p-4';
 errorAlert.innerHTML = message;
 document.body.appendChild(errorAlert);
 
 setTimeout(() => {
   document.body.removeChild(errorAlert);
 }, 3000);
};

Alert.success = (message: string) => {
 const successAlert = document.createElement('div');
 successAlert.className = 'fixed top-4 right-4 bg-green-100 border-green-400 text-green-700 rounded-lg p-4';
 successAlert.innerHTML = message;
 document.body.appendChild(successAlert);
 
 setTimeout(() => {
   document.body.removeChild(successAlert);
 }, 3000);
};

interface CommentRow {
 startMarks: string;
 endMarks: string;
 comment: string;
}

interface Term {
 id: string;
 name: string;
}

interface AcademicYear {
 id: string;
 year: string;
 isActive: boolean;
}

interface ClassDetails {
 name: string;
 id: string;
}

interface ApiResponse {
 returnCode?: string;
 returnMessage?: string;
 success?: boolean;
 comments?: CommentRow[];
 createdBy?: {
   id: string;
   first_name: string;
   last_name: string;
   role: string;
 };
 status?: {
   returnCode: string;
   returnMessage: string;
 };
 data?: {
   comments: any[];
 };
}

const ClassTeacherCommentsView: React.FC = () => {
 const router = useRouter();
 const searchParams = useSearchParams();
 const [showSuccess, setShowSuccess] = useState(false);
 const [commentData, setCommentData] = useState<CommentRow[]>([
  { startMarks: '', endMarks: '', comment: '' },
  { startMarks: '', endMarks: '', comment: '' },
  { startMarks: '', endMarks: '', comment: '' },
  { startMarks: '', endMarks: '', comment: '' },
  { startMarks: '', endMarks: '', comment: '' },
  { startMarks: '', endMarks: '', comment: '' }
 ]);
 const [classDetails, setClassDetails] = useState<ClassDetails | null>(null);
 const [isSaving, setIsSaving] = useState(false);
 const [existingComments, setExistingComments] = useState<CommentRow[]>([]);
 const [currentYear, setCurrentYear] = useState<AcademicYear | null>(null);
 const [currentTerm, setCurrentTerm] = useState<Term | null>(null);
 const [loading, setLoading] = useState({
   general: true,
   terms: false,
   classes: false
 });
 const [data, setData] = useState<ApiResponse>({});
 const [creatorInfo, setCreatorInfo] = useState<{
   first_name: string;
   last_name: string;
   role: string;
 } | null>(null);

 // Get classId from URL
 const classId = useMemo(() => {
   if (!searchParams) return '';
   const id = searchParams.get('classId');
   console.log('Class ID from URL:', id);
   return id || '';
 }, [searchParams]);

 // Fetch class details
 const fetchClassDetails = useCallback(async (id: string) => {
   console.log('Fetching class details for ID:', id);
   if (!id) return;
   
   try {
     const token = localStorage.getItem('accessToken');
     if (!token) {
       Alert.error('Authentication required');
       return;
     }

     const response = await fetch(`${env.BACKEND_API_URL}/api/v1/classes/${id}`, {
       headers: {
         'Authorization': `Bearer ${token}`,
         'Content-Type': 'application/json'
       }
     });
     
     const data = await response.json();
     console.log('Class details API response:', data);
     
     // Handle different possible response formats
     if (data.success && data.class) {
       setClassDetails({
         name: data.class.name || 'Unknown Class',
         id: data.class.id
       });
       console.log('Class details set:', data.class.name);
     } else if (data.data && data.data.class) {
       // Alternative response format
       setClassDetails({
         name: data.data.class.name || 'Unknown Class',
         id: data.data.class.id
       });
       console.log('Class details set (alt format):', data.data.class.name);
     } else {
       console.error('Invalid class data:', data);
       Alert.error(data.message || data.error || 'Failed to fetch class details');
     }
   } catch (error) {
     console.error('Error fetching class details:', error);
     Alert.error('Failed to fetch class details');
   }
 }, []);

 // Fetch existing comments
 const fetchExistingComments = useCallback(async () => {
   if (!classId || !currentYear?.id || !currentTerm?.id) return;
   
   try {
     const token = localStorage.getItem('accessToken');
     if (!token) {
       throw new Error("Authentication required");
     }

     const response = await fetch(
       `${env.BACKEND_API_URL}/api/v1/classteacherscomments/comments?academicYearId=${currentYear.id}&termId=${currentTerm.id}&classId=${classId}`, 
       {
         headers: {
           'Authorization': `Bearer ${token}`
         }
       }
     );
     
     const data = await response.json();
     if (data.comments && data.comments.length > 0) {
       setExistingComments(data.comments);
       
       const existingData = data.comments.map((comment: any) => ({
         startMarks: comment.startMarks?.toString() || '',
         endMarks: comment.endMarks?.toString() || '',
         comment: comment.comment
       }));
       
       setCommentData(existingData);
     }
   } catch (error) {
     console.error('Error fetching existing comments:', error);
     Alert.error('Failed to fetch existing comments');
   }
 }, [classId, currentYear?.id, currentTerm?.id]);

 // Handle input change
 const handleInputChange = useCallback((index: number, field: 'startMarks' | 'endMarks' | 'comment', value: string) => {
   setCommentData(prevData => {
     const newData = [...prevData];
     newData[index] = {
       ...newData[index],
       [field]: value
     };
     return newData;
   });
 }, []);

 // Validate and save comments
 const validateAndSaveComments = useCallback(async () => {
   try {
     setIsSaving(true);
     
     // Validate all fields are filled
     const hasEmptyFields = commentData.some((row: CommentRow) => 
       !row.startMarks.trim() || !row.endMarks.trim() || !row.comment.trim()
     );

     if (hasEmptyFields) {
       Alert.error('Please fill out all fields before saving!');
       return;
     }

     // Sort comments by marks (by startMarks)
     const sortedComments = [...commentData].sort((a: CommentRow, b: CommentRow) => 
       parseInt(a.startMarks) - parseInt(b.startMarks)
     );

     const token = localStorage.getItem('accessToken');
     if (!token) {
       Alert.error('Authentication required');
       return;
     }

     // Format the request body according to API expectations
     const requestBody = {
       academicYearId: currentYear?.id,
       termId: currentTerm?.id,
       classId: classDetails?.id,
       comments: sortedComments.map(comment => ({
         startMarks: parseInt(comment.startMarks),
         endMarks: parseInt(comment.endMarks),
         comment: comment.comment.trim()
       }))
     };

     console.log('Saving comments with data:', requestBody); // Debug log

     const response = await fetch(`${env.BACKEND_API_URL}/api/v1/classteacherscomments/create-comments`, {
       method: 'POST',
       headers: {
         'Content-Type': 'application/json',
         'Authorization': `Bearer ${token}`
       },
       body: JSON.stringify(requestBody)
     });

     // Check response status
     const data = await response.json();
     console.log('Save comments response:', data); // Debug log

     setData(data);

     if (data.status?.returnCode === '00' || data.success) {
       setShowSuccess(true);
       setExistingComments(sortedComments);
       setTimeout(() => setShowSuccess(false), 3000);
     } else {
       setShowSuccess(false);
     }
   } catch (error) {
     console.error('Error saving comments:', error);
     setData({ returnMessage: 'Failed to save comments' });
     setShowSuccess(false);
   } finally {
     setIsSaving(false);
   }
 }, [commentData, currentYear?.id, currentTerm?.id, classDetails?.id]);

 // Clear success state when data changes
 useEffect(() => {
   if (data.returnMessage) {
     setShowSuccess(false);
   }
 }, [data]);

 // Fetch creator info from token
 const fetchCreatorInfo = useCallback(async () => {
   try {
     const token = localStorage.getItem('accessToken');
     if (!token) return;

     const payload = token.split('.')[1];
     const userData = JSON.parse(atob(payload));
     
     setCreatorInfo({
       first_name: userData.firstName || userData.first_name || "Unknown",
       last_name: userData.lastName || userData.last_name || "Unknown",
       role: userData.role || "Staff"
     });
   } catch (error) {
     console.error('Error fetching creator info:', error);
     setCreatorInfo(null);
   }
 }, []);

 // Effect to fetch academic year and term - runs only once on mount
 useEffect(() => {
   const fetchInitialData = async () => {
     try {
       setLoading(prev => ({ ...prev, general: true }));
       
       const token = localStorage.getItem('accessToken');
       if (!token) {
         throw new Error("Authentication required");
       }

       // Fetch academic year
       const yearResponse = await fetch(`${env.BACKEND_API_URL}/api/v1/academic-years/filter`, {
         headers: {
           'Authorization': `Bearer ${token}`,
           'Content-Type': 'application/json'
         }
       });

       if (!yearResponse.ok) {
         throw new Error(`HTTP error! status: ${yearResponse.status}`);
       }

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

       if (!termResponse.ok) {
         throw new Error(`HTTP error! status: ${termResponse.status}`);
       }

       const termData = await termResponse.json();
       if (termData.success && termData.term) {
         setCurrentTerm(termData.term);
       } else {
         setCurrentTerm(null);
       }

       // Fetch creator info
       await fetchCreatorInfo();
     } catch (error) {
       console.error('Error fetching settings:', error);
       Alert.error('Failed to load settings');
     } finally {
       setLoading(prev => ({ ...prev, general: false }));
     }
   };

   fetchInitialData();
 }, [fetchCreatorInfo]);

 // Effect to fetch class data when URL parameters change
 useEffect(() => {
   if (!searchParams) return;
   
   const fetchClassData = async () => {
     if (!classId || !currentYear?.id || !currentTerm?.id) return;
     
     try {
       setLoading(prev => ({ ...prev, classes: true }));
       
       // Fetch class details and existing comments in parallel
       await Promise.all([
         fetchClassDetails(classId),
         fetchExistingComments()
       ]);
     } catch (error) {
       console.error('Error fetching class data:', error);
       Alert.error('Failed to fetch class data');
     } finally {
       setLoading(prev => ({ ...prev, classes: false }));
     }
   };

   fetchClassData();
 }, [searchParams, classId, currentYear?.id, currentTerm?.id, fetchClassDetails, fetchExistingComments]);

 return (
   <div className="min-h-screen bg-gray-100 flex items-center justify-center">
     <div className="container mx-auto bg-white shadow-lg rounded-lg p-6 max-w-xl">
       
       {/* Page Title */}
       <h1 className="text-2xl font-bold text-gray-800 text-center mb-6">
         Class Teacher Comments - Grading Scale
       </h1>

       {loading.general ? (
         <div className="text-center py-8">
           <p>Loading settings...</p>
         </div>
       ) : (
         <>
           {/* Academic Year, Term, and Class */}
           <div className="grid grid-cols-3 gap-4 mb-6">
             <div className="bg-gray-50 p-4 rounded-md">
               <div className="flex items-center space-x-2 mb-2">
                 <Calendar className="w-4 h-4 text-green-600" />
                 <span className="font-medium">Academic Year:</span>
               </div>
               <p className="text-lg font-semibold">{currentYear?.year || 'Not set'}</p>
             </div>
             <div className="bg-gray-50 p-4 rounded-md">
               <div className="flex items-center space-x-2 mb-2">
                 <FileText className="w-4 h-4 text-green-600" />
                 <span className="font-medium">Term:</span>
               </div>
               <p className="text-lg font-semibold">{currentTerm?.name || 'Not set'}</p>
             </div>
             <div className="bg-gray-50 p-4 rounded-md">
               <div className="flex items-center space-x-2 mb-2">
                 <span className="font-medium">Class:</span>
               </div>
               <p className="text-lg font-semibold">{classDetails?.name || 'Not set'}</p>
             </div>
           </div>

           {/* Form Content */}
           {loading.classes ? (
             <div className="text-center py-8">
               <p>Loading class data...</p>
             </div>
           ) : (
             <>
               {/* Table Headers */}
               <div className="grid grid-cols-3 gap-4 text-center mb-2">
                 <span className="font-semibold text-sm text-gray-600 italic">
                   Start marks
                 </span>
                 <span className="font-semibold text-sm text-gray-600 italic">
                   End marks
                 </span>
                 <span className="font-semibold text-sm text-gray-600 italic">
                   Class Teachers&apos; Comments
                 </span>
               </div>

               {/* Form */}
               <div className="space-y-4">
                 {commentData.map((row, index) => (
                   <div key={index} className="grid grid-cols-3 gap-4">
                     <input
                       type="number"
                       value={row.startMarks}
                       onChange={(e) => handleInputChange(index, 'startMarks', e.target.value)}
                       className="border p-2 rounded-md text-center shadow-md"
                       placeholder={`Start`}
                       disabled={isSaving}
                     />
                     <input
                       type="number"
                       value={row.endMarks}
                       onChange={(e) => handleInputChange(index, 'endMarks', e.target.value)}
                       className="border p-2 rounded-md text-center shadow-md"
                       placeholder={`End`}
                       disabled={isSaving}
                     />
                     <input
                       type="text"
                       value={row.comment}
                       onChange={(e) => handleInputChange(index, 'comment', e.target.value)}
                       className="border p-2 rounded-md text-center shadow-md"
                       placeholder="Enter comment"
                       disabled={isSaving}
                     />
                   </div>
                 ))}

                 {/* Submit Button */}
                 <button
                   type="button"
                   onClick={validateAndSaveComments}
                   className="bg-teal-600 text-white px-4 py-2 rounded-md w-full mt-4 hover:bg-teal-700 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                   disabled={isSaving}
                 >
                   {isSaving ? 'Saving...' : 'Save Commenting Scale'}
                 </button>

                 {/* Success Message */}
                 {showSuccess && (
                   <div className="mt-4 bg-green-100 border border-green-300 text-green-700 px-4 py-3 rounded-md text-center font-medium flex items-center justify-center">
                     <Check className="w-5 h-5 mr-2" />
                     <span>{data?.status?.returnMessage || 'Comments saved successfully!'}</span>
                   </div>
                 )}

                 {/* Error Message */}
                 {!showSuccess && data?.status?.returnMessage && (
                   <div className="mt-4 bg-red-100 border border-red-300 text-red-700 px-4 py-3 rounded-md text-center flex items-center justify-center">
                     <AlertCircle className="w-5 h-5 mr-2" />
                     <span>{data.status.returnMessage}</span>
                   </div>
                 )}

                 {/* Notes */}
                 <div className="mt-4 p-4 bg-gray-50 rounded-md">
                   <h3 className="text-lg font-semibold mb-2">Notes:</h3>
                   <ul className="list-disc list-inside text-sm text-gray-600">
                     <li>Enter range of total grades starting from lowest to highest</li>
                     <li>Example: 4 - 6 = Excellent Results.</li>
                     <li>Example: 7 - 7 = Better Performance.</li>
                     <li>Each mark range must be unique within a term</li>
                   </ul>
                 </div>
               </div>
             </>
           )}
         </>
       )}
     </div>
   </div>
 );
};

const ClassTeacherCommentsPageWrapper: React.FC = () => {
  return (
    <Suspense fallback={<div className="p-4 w-full h-full flex justify-center items-center"><p>Loading comments...</p></div>}>
      <ClassTeacherCommentsView />
    </Suspense>
  );
};

export default ClassTeacherCommentsPageWrapper;