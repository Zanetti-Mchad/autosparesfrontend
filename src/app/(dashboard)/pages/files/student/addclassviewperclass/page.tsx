"use client"; 
import React, { useState, useEffect } from 'react'; 
import { env } from '@/env'; 
import { useRouter } from 'next/navigation'; 
import ClassesList from '@/components/ClassesList';

const AssignClassAttendance: React.FC = () => {   
  const router = useRouter();    
  
  // Handle class selection with only the classId parameter
  const handleSelectClass = (classId: string | number) => {
    // We'll use an API call in the attendance tracker to get the full class details
    // For now, just pass the class ID to the attendance page
    router.push(`/pages/student/addclassviewperclass/generalview?classId=${classId}`);
  };
  
  return (
    <ClassesList
      title="Select Class to View and Edit Student Details"
      onSelectClass={handleSelectClass}
      actionLabel="Select Class 🡪"
      fetchFromApi={true}
      apiEndpoint={`${env.BACKEND_API_URL}/api/v1/classes/filter?limit=100`}
    />
  );
};

export default AssignClassAttendance;