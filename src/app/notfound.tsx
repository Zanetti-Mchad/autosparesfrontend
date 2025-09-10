"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Home, RotateCw, AlertTriangle } from "lucide-react";
import { usePathname, useRouter } from 'next/navigation';

const emojis = ["😕", "😟", "🤔", "👻", "🔍", "🧭", "🚧"];

export default function NotFound() {
  const pathname = usePathname();
  const router = useRouter();
  const [emoji, setEmoji] = useState(emojis[0]);

  useEffect(() => {
    console.error(
      "404 Error: User attempted to access non-existent route:",
      pathname
    );
    
    // Rotate through emojis
    const interval = setInterval(() => {
      setEmoji(emojis[Math.floor(Math.random() * emojis.length)]);
    }, 2000);
    
    return () => clearInterval(interval);
  }, [pathname]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-50 to-blue-50 p-4">
      <motion.div 
        className="w-full max-w-md bg-white rounded-2xl shadow-xl overflow-hidden"
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.5 }}
      >
        <div className="p-8 text-center">
          <motion.div
            key={emoji}
            className="text-8xl mb-6 inline-block"
            animate={{ 
              scale: [1, 1.2, 1],
              rotate: [0, 10, -10, 0],
            }}
            transition={{ 
              duration: 0.8,
              repeat: Infinity,
              repeatType: "reverse"
            }}
          >
            {emoji}
          </motion.div>
          
          <motion.h1 
            className="text-6xl font-bold text-gray-900 mb-2"
            initial={{ y: -20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.2 }}
          >
            404
          </motion.h1>
          
          <motion.p 
            className="text-xl text-gray-600 mb-6 flex items-center justify-center gap-2"
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.3 }}
          >
            <AlertTriangle className="w-5 h-5 text-yellow-500" />
            Oops! Page not found
          </motion.p>
          
          <motion.p 
            className="text-gray-500 mb-8 text-sm font-mono bg-gray-50 p-3 rounded-lg inline-block"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
          >
            {pathname}
          </motion.p>
          
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="flex flex-col sm:flex-row gap-4 justify-center"
          >
            <motion.a
              href="/"
              className="px-6 py-3 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 transition-colors flex items-center justify-center gap-2"
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.98 }}
            >
              <Home className="w-4 h-4" />
              Return to Home
            </motion.a>
            
            <motion.button
              onClick={() => window.location.reload()}
              className="px-6 py-3 border border-gray-300 rounded-lg font-medium hover:bg-gray-50 transition-colors flex items-center justify-center gap-2"
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.98 }}
            >
              <RotateCw className="w-4 h-4" />
              Try Again
            </motion.button>
          </motion.div>
          
          <motion.p 
            className="mt-8 text-sm text-gray-400"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6 }}
          >
            Need help? Contact our support team
          </motion.p>
        </div>
      </motion.div>
    </div>
  );
};

