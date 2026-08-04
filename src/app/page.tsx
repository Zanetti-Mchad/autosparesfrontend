"use client";
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

/** Fallback if middleware does not run; prefer server redirect to /sign-in. */
const Homepage = () => {
  const router = useRouter();

  useEffect(() => {
    router.replace('/sign-in');
  }, [router]);

  return null;
};

export default Homepage;
