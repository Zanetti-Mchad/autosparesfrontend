"use client";
import React, { useEffect } from 'react';

const Homepage = () => {
  useEffect(() => {
    window.location.href = '/sign-in';
  }, []);

  return null;
};

export default Homepage;
