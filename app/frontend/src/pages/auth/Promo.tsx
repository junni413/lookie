import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";

export default function Promo() {
  const navigate = useNavigate();
  const [isSplitting, setIsSplitting] = useState(false);
  const [showScan, setShowScan] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setShowScan(true), 1000);
    return () => clearTimeout(timer);
  }, []);

  const handleStart = () => {
    setIsSplitting(true);
    setTimeout(() => {
      navigate("/login", { replace: true });
    }, 800);
  };

  return (
    <div className="relative min-h-dvh bg-white overflow-hidden select-none">
      {/* 1. Underlying Reveal Layer (Login Mock) */}
      <div className="absolute inset-0 bg-white flex items-center justify-center p-10">
        <div className="text-center space-y-4 opacity-30">
          <div className="text-4xl font-black text-slate-200 tracking-tighter">AUTHENTICATING...</div>
          <div className="h-1.5 w-64 bg-slate-100 rounded-full overflow-hidden mx-auto">
            <motion.div 
              initial={{ x: "-100%" }}
              animate={{ x: "0%" }}
              transition={{ duration: 0.8, ease: "easeInOut" }}
              className="h-full bg-blue-600" 
            />
          </div>
        </div>
      </div>

      {/* 2. Splitting Cinematic Layer */}
      <AnimatePresence>
        {!isSplitting && (
          <>
            {/* Left Half */}
            <motion.div
              key="left-split"
              initial={{ x: 0 }}
              animate={isSplitting ? { x: "-100%" } : { x: 0 }}
              transition={{ duration: 0.7, ease: [0.77, 0, 0.175, 1] }}
              style={{ clipPath: "inset(0 50% 0 0)" }}
              className="absolute inset-0 z-50 bg-black flex flex-col items-center justify-center"
            >
              <PromoContent showScan={showScan} onStart={handleStart} />
            </motion.div>

            {/* Right Half */}
            <motion.div
              key="right-split"
              initial={{ x: 0 }}
              animate={isSplitting ? { x: "100%" } : { x: 0 }}
              transition={{ duration: 0.7, ease: [0.77, 0, 0.175, 1] }}
              style={{ clipPath: "inset(0 0 0 50%)" }}
              className="absolute inset-0 z-50 bg-black flex flex-col items-center justify-center"
            >
              <PromoContent showScan={showScan} onStart={handleStart} />
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Texture Overlay */}
      <div className="absolute inset-0 pointer-events-none z-[60] opacity-[0.03] bg-[url('https://www.transparenttextures.com/patterns/asfalt-light.png')]" />
    </div>
  );
}

function PromoContent({ showScan, onStart }: { showScan: boolean; onStart: () => void }) {
  return (
    <div className="w-full max-w-[420px] px-6 text-center">
      {/* Brand */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2, duration: 0.8 }}
        className="mb-12"
      >
        <h1 className="text-[52px] font-bold tracking-tighter text-blue-500 font-pixel leading-none">
          LOOKIE
        </h1>
        <p className="mt-4 text-[12px] font-bold tracking-[0.3em] text-slate-500 uppercase">
          See it. Scan it. Done.
        </p>
      </motion.div>

      {/* Hero Illustration */}
      <div className="relative group cursor-pointer" onClick={onStart}>
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.4, duration: 1 }}
          className="relative aspect-square w-full rounded-[48px] overflow-hidden border border-white/10 shadow-[0_20px_50px_rgba(0,0,0,0.5)]"
        >
          <img
            src="/assets/promo/promo-cinematic.png"
            alt="Cinematic Logistics"
            className="w-full h-full object-cover"
          />
          
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />

          {/* AR Frame */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: showScan ? 0.4 : 0 }}
            className="absolute inset-10 border-2 border-dashed border-white/40 rounded-3xl"
          />

          {/* Scan Laser */}
          <AnimatePresence>
            {showScan && (
              <motion.div
                initial={{ top: "15%", opacity: 0 }}
                animate={{ 
                  top: ["15%", "85%"], 
                  opacity: [0, 1, 1, 0] 
                }}
                transition={{ 
                  duration: 2.2, 
                  ease: "easeInOut",
                  times: [0, 0.1, 0.9, 1],
                  repeat: Infinity,
                  repeatDelay: 0.5
                }}
                className="absolute left-0 right-0 h-[3px] bg-red-500 shadow-[0_0_20px_rgba(239,68,68,1)] z-10"
              >
                <div className="absolute inset-0 bg-red-400 blur-md opacity-40" />
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

        {/* Interaction Hint */}
        <motion.div
          animate={{ opacity: [0.2, 0.5, 0.2] }}
          transition={{ duration: 2.5, repeat: Infinity }}
          className="absolute -bottom-10 left-0 right-0 text-[10px] font-bold text-slate-600 tracking-[0.4em] uppercase"
        >
          Tap Screen to Start
        </motion.div>
      </div>

      {/* Button */}
      <motion.button
        onClick={onStart}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.8, duration: 0.6 }}
        className="mt-24 w-full h-15 rounded-2xl bg-white text-black font-black text-[15px] uppercase tracking-widest active:scale-[0.98] transition-all hover:bg-slate-100"
      >
        Begin Workflow
      </motion.button>
    </div>
  );
}
