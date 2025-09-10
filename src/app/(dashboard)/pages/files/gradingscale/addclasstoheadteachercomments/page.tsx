'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import ClassesList from '@/components/ClassesList';
import { env } from '@/env';

const AssignHeadTeacherComments: React.FC = () => {
  const router = useRouter();

  const handleSelectClass = (classId: string | number) => {
    console.log(`Selected class ID: ${classId}, redirecting to head teacher comments page`);
    router.push(`/pages/gradingscale/headteachercomments?classId=${classId}`);
  };

  return (
    <ClassesList
      title="Select Class for Head Teacher Comments"
      onSelectClass={handleSelectClass}
      actionLabel="Assign Comments →"
      fetchFromApi={true}
      apiEndpoint={`${env.BACKEND_API_URL}/api/v1/classes/filter?limit=100`}
    />
  );
};

export default AssignHeadTeacherComments;

