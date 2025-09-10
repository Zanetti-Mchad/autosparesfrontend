"use client";

import { useEffect } from "react";
import { setupApiDebugger } from "../utils/apiDebugger";

const ApiDebuggerInitializer = () => {
  useEffect(() => {
    // Initialize API debugger to catch incorrect endpoint usage
    setupApiDebugger();
    console.log("API debugger initialized");
  }, []);

  // This component doesn't render anything visible
  return null;
};

export default ApiDebuggerInitializer;
