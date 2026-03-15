
import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { LogoIcon } from './Icons';

const SplashScreen: React.FC = () => {
  const [isVisible, setIsVisible] = useState(true);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    // Lock scroll
    document.body.style.overflow = 'hidden';
    
    // Simulate loading progress
    const interval = setInterval(() => {
      setProgress((prev) => {
        const next = prev + Math.random() * 15;
        if (next >= 100) {
          clearInterval(interval);
          return 100;
        }
        return next;
      });
    }, 200);

    const timer = setTimeout(() => {
      setIsVisible(false);
      // Unlock scroll
      document.body.style.overflow = '';
    }, 3500);

    return () => {
      clearInterval(interval);
      clearTimeout(timer);
      document.body.style.overflow = '';
    };
  }, []);

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          key="splash-screen"
          initial={{ opacity: 1 }}
          exit={{ 
            opacity: 0,
            scale: 1.1,
            filter: 'blur(10px)',
            transition: { duration: 0.8, ease: [0.43, 0.13, 0.23, 0.96] }
          }}
          className="fixed inset-0 z-[9999] flex items-center justify-center bg-[#0d4a6b] overflow-hidden"
        >
          {/* Dynamic Background Gradients */}
          <motion.div 
            animate={{ 
              scale: [1, 1.2, 1],
              rotate: [0, 90, 0],
            }}
            transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
            className="absolute top-[-20%] left-[-10%] w-[60%] h-[60%] bg-teal-600/20 rounded-full blur-[120px]"
          />
          <motion.div 
            animate={{ 
              scale: [1.2, 1, 1.2],
              rotate: [0, -90, 0],
            }}
            transition={{ duration: 15, repeat: Infinity, ease: "linear" }}
            className="absolute bottom-[-20%] right-[-10%] w-[70%] h-[70%] bg-blue-900/40 rounded-full blur-[120px]"
          />

          <div className="relative z-10 flex flex-col items-center">
            {/* Text Animations */}
            <div className="overflow-hidden mb-1">
              <motion.h1
                initial={{ y: 100 }}
                animate={{ y: 0 }}
                transition={{ delay: 0.5, duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
                className="text-5xl font-black text-white tracking-tighter"
              >
                MIRONA <span className="text-teal-400">MA</span>
              </motion.h1>
            </div>
            
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.6 }}
              transition={{ delay: 1.2, duration: 1 }}
              className="flex items-center gap-3"
            >
              <div className="h-px w-8 bg-teal-500/50" />
              <p className="text-teal-100 text-[10px] font-bold tracking-[0.4em] uppercase">
                Hotel Management System
              </p>
              <div className="h-px w-8 bg-teal-500/50" />
            </motion.div>

            {/* Refined Loading Bar */}
            <div className="mt-16 w-64">
              <div className="flex justify-between items-end mb-2">
                <motion.span 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 1.5 }}
                  className="text-[9px] text-teal-300/60 font-bold uppercase tracking-widest"
                >
                  Initializing Core
                </motion.span>
                <motion.span 
                  className="text-[10px] text-white font-mono font-bold"
                >
                  {Math.round(progress)}%
                </motion.span>
              </div>
              <div className="h-1 w-full bg-white/5 rounded-full overflow-hidden border border-white/5">
                <motion.div 
                  className="h-full bg-gradient-to-r from-teal-600 to-teal-400 shadow-[0_0_15px_rgba(45,212,191,0.5)]"
                  initial={{ width: 0 }}
                  animate={{ width: `${progress}%` }}
                  transition={{ type: "spring", stiffness: 50, damping: 20 }}
                />
              </div>
            </div>
          </div>

          {/* Bottom Footer Text */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 0.3, y: 0 }}
            transition={{ delay: 2, duration: 1 }}
            className="absolute bottom-10 text-white text-[9px] font-medium tracking-widest uppercase"
          >
            Premium Hospitality Solutions v2.0
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default SplashScreen;
