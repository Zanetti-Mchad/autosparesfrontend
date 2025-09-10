"use client";
import React from 'react';
import { useRouter } from 'next/navigation';
import ClassesList from '@/components/ClassesList';
import { env } from '@/env';

const AssignGradingScale: React.FC = () => {
  const router = useRouter();

  const handleSelectClass = (classId: string | number) => {
    router.push(`/pages/gradingscale/gradingscale?classId=${classId}`);
  };

  return (
    <ClassesList
      title="Select Class to Assign Teacher to Subject"
      onSelectClass={handleSelectClass}
      actionLabel="Select Class 🡪"
      fetchFromApi={true}
      apiEndpoint={`${env.BACKEND_API_URL}/api/v1/classes/filter?limit=100`}
    />
  );
};

export default AssignGradingScale;