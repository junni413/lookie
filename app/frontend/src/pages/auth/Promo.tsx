import { useState, useEffect, useMemo, memo } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence, useMotionValue, useTransform, animate, type MotionValue } from "framer-motion";

type FruitType = "apple" | "grapes" | "tomato" | "avocado" | "banana" | "kiwi" | "strawberry" | "cherry" | "orange";

interface FruitDef {
  type: FruitType;
  color: string;
  threshold: number;
}

export default function Promo() {
  const navigate = useNavigate();
  const [isZooming, setIsZooming] = useState(false);
  const [showScan, setShowScan] = useState(false);
  const laserY = useMotionValue(-10);

  useEffect(() => {
    const timer = setTimeout(() => setShowScan(true), 1000);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!showScan || isZooming) return;

    const controls = animate(laserY, [15, 85], {
      duration: 2.4,
      ease: "easeInOut",
      repeat: Infinity,
      repeatType: "loop",
      repeatDelay: 0.6
    });

    return () => controls.stop();
  }, [showScan, isZooming, laserY]);

  const handleStart = () => {
    setIsZooming(true);
    setTimeout(() => {
      navigate("/login", { replace: true });
    }, 1200);
  };

  return (
    <div className="relative min-h-dvh bg-black overflow-hidden select-none flex items-center justify-center">
      <Starfield />

      <motion.div
        animate={isZooming ? {
          scale: 20,
          opacity: 0,
          filter: "blur(30px)"
        } : {
          scale: 1,
          opacity: 1,
          filter: "blur(0px)"
        }}
        transition={{ 
          duration: 1.4, 
          ease: [0.7, 0, 0.3, 1] 
        }}
        className="relative z-10 w-full flex flex-col items-center justify-center p-6"
      >
        <PromoContent showScan={showScan} laserY={laserY} onStart={handleStart} />
      </motion.div>

      <div className="absolute inset-0 pointer-events-none z-20 bg-gradient-to-t from-white/5 via-transparent to-transparent opacity-30" />
      <div className="absolute inset-0 pointer-events-none z-[60] opacity-[0.03] bg-[url('https://www.transparenttextures.com/patterns/asfalt-light.png')]" />
    </div>
  );
}

const Starfield = memo(function Starfield() {
  const stars = useMemo(() => {
    return Array.from({ length: 80 }).map(() => ({
      left: `${Math.random() * 100}%`,
      top: `${Math.random() * 100}%`,
      size: Math.random() * 1.5 + 1,
      duration: Math.random() * 3 + 2,
      delay: Math.random() * 5
    }));
  }, []);

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {stars.map((star, i) => (
        <motion.div
          key={i}
          initial={{ opacity: 0.1 }}
          animate={{ opacity: [0.1, 0.6, 0.1] }}
          transition={{
            duration: star.duration,
            repeat: Infinity,
            delay: star.delay,
            ease: "easeInOut"
          }}
          className="absolute bg-white rounded-full shadow-[0_0_6px_rgba(255,255,255,0.6)]"
          style={{
            left: star.left,
            top: star.top,
            width: `${star.size}px`,
            height: `${star.size}px`,
          }}
        />
      ))}
    </div>
  );
});

function PromoContent({ showScan, laserY, onStart }: { showScan: boolean; laserY: MotionValue<number>; onStart: () => void }) {
  const laserPosition = useTransform(laserY, (y) => `${y}%`);
  const laserGlowPosition = useTransform(laserY, (y) => `${y - 3}%`);

  return (
    <div className="w-full max-w-[380px] text-center">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2, duration: 0.8 }}
        className="mb-12"
      >
        <h1 className="text-[65px] font-bold tracking-tighter text-blue-500 font-pixel leading-none">
          LOOKIE
        </h1>
        <p className="mt-4 text-[12px] font-bold tracking-[0.3em] text-slate-500 uppercase">
          Smart Logistics Partner
        </p>
      </motion.div>

      <div className="relative group cursor-pointer" onClick={onStart}>
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.4, duration: 1 }}
          className="relative aspect-square w-full rounded-[48px] overflow-hidden border border-white/5 shadow-[0_40px_80px_rgba(0,0,0,0.9)] bg-neutral-950"
        >
          <div className="absolute inset-0 bg-white/[0.03] z-0" />
          
          <img
            src="/assets/promo/promo-cinematic.png"
            alt="Cinematic Logistics"
            className="w-full h-full object-cover opacity-40 contrast-125 grayscale-[0.2]"
          />
          
          <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-transparent" />

          <div className="absolute inset-x-6 inset-y-12 z-10 flex items-center justify-center">
            {showScan && <PixelFruits laserY={laserY} />}
          </div>

          <AnimatePresence>
            {showScan && (
              <>
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 0.2 }}
                  style={{ y: laserGlowPosition }}
                  className="absolute inset-x-0 inset-y-0 z-[15] blur-md pointer-events-none"
                >
                  <div className="h-4 w-full bg-gradient-to-b from-red-500/60 to-transparent" />
                </motion.div>
                
                <motion.div
                  style={{ y: laserPosition }}
                  className="absolute inset-0 z-20 pointer-events-none"
                >
                  <div className="absolute inset-x-0 h-[1.5px] bg-[#FF0000] shadow-[0_0_10px_rgba(255,0,0,0.8)]" />
                  <div className="absolute inset-x-0 h-[3px] -top-[0.75px] bg-red-600/40 blur-[1px]" />
                </motion.div>
              </>
            )}
          </AnimatePresence>
        </motion.div>

        <motion.div
          animate={{ opacity: [0.3, 0.6, 0.3] }}
          transition={{ duration: 2.5, repeat: Infinity }}
          className="absolute -bottom-14 left-0 right-0 text-[10px] font-bold text-slate-700 tracking-[0.4em] uppercase"
        >
          Tap Screen to Start
        </motion.div>
      </div>

      <motion.button
        onClick={onStart}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.8, duration: 0.6 }}
        className="mt-24 w-full h-15 rounded-2xl bg-white text-black font-black text-[15px] uppercase tracking-widest active:scale-[0.98] transition-all hover:bg-slate-100"
      >
        UNLOCK THE WORKFLOW
      </motion.button>
    </div>
  );
}

function PixelFruits({ laserY }: { laserY: MotionValue<number> }) {
  const fruits: FruitDef[] = [
    { type: "apple", color: "#FF3B30", threshold: 25 },
    { type: "grapes", color: "#AF52DE", threshold: 25 },
    { type: "tomato", color: "#FF453A", threshold: 25 },
    { type: "avocado", color: "#34C759", threshold: 46 },
    { type: "banana", color: "#FFD60A", threshold: 46 },
    { type: "kiwi", color: "#BF5AF2", threshold: 46 },
    { type: "strawberry", color: "#FF2D55", threshold: 67 },
    { type: "cherry", color: "#FF375F", threshold: 67 },
    { type: "orange", color: "#FF9F0A", threshold: 67 },
  ];

  return (
    <div className="grid grid-cols-3 gap-x-6 gap-y-10 p-4 justify-items-center items-center w-full max-w-[320px]">
      {fruits.map((fruit, i) => (
        <PixelFruitItem key={i} fruit={fruit} laserY={laserY} />
      ))}
    </div>
  );
}

function PixelFruitItem({ fruit, laserY }: { fruit: FruitDef, laserY: MotionValue<number> }) {
  const scale = useTransform(
    laserY,
    [fruit.threshold - 6, fruit.threshold, fruit.threshold + 6],
    [1, 1.08, 1]
  );

  const filter = useTransform(
    laserY,
    [fruit.threshold - 6, fruit.threshold, fruit.threshold + 5, fruit.threshold + 6],
    [
      "brightness(0.35) saturate(0.5) blur(0.5px)",
      "brightness(1.8) contrast(1.2)",
      "brightness(1) saturate(1)",
      "brightness(1) saturate(1)"
    ]
  );

  const glowOpacity = useTransform(
    laserY,
    [fruit.threshold - 6, fruit.threshold, fruit.threshold + 6],
    [0, 0.6, 0]
  );

  const glowScale = useTransform(
    laserY,
    [fruit.threshold - 6, fruit.threshold, fruit.threshold + 6],
    [1, 1.4, 1]
  );

  return (
    <motion.div
      style={{ scale, filter }}
      className="relative flex items-center justify-center will-change-transform"
    >
      <div className="relative group">
        <PixelArtIcon type={fruit.type} />
        <motion.div 
          style={{ opacity: glowOpacity, scale: glowScale, backgroundColor: fruit.color }}
          className="absolute inset-0 blur-2xl -z-10 rounded-full"
        />
      </div>
    </motion.div>
  );
}

function PixelArtIcon({ type }: { type: FruitType }) {
  const icons: Record<FruitType, any> = {
    apple: (
      <svg viewBox="0 0 16 16" className="w-14 h-14" style={{ imageRendering: "pixelated" }}>
        <path d="M7 0h2v1H7z" fill="#1A1A3A" />
        <path d="M8 1h1v1H8z" fill="#4CAF50" />
        <path d="M9 0h2v1H9z" fill="#4CAF50" />
        <path d="M4 2h8v2h1v1h1v6h-1v2h-1v1H5v-1H4v-2H3v-6h1V4h1V2z" fill="#1A1A3A" />
        <path d="M5 3h6v1h1v1h1v6h-1v2h-1v1H6v-1H5v-2H4v-6h1V3z" fill="#D32F2F" />
        <path d="M9 4h3v9H6v-1h4V4z" fill="#B71C1C" /> 
        <path d="M5 4h2v2H5V4zm-1 2h1v1H4V6z" fill="#FF5252" />
        <rect x="6" y="5" width="1" height="1" fill="#FFFFFF" opacity="0.4" />
      </svg>
    ),
    grapes: (
      <svg viewBox="0 0 16 16" className="w-14 h-14" style={{ imageRendering: "pixelated" }}>
        <rect x="7" y="0" width="2" height="3" fill="#1A1A3A" />
        <rect x="7.5" y="1" width="1" height="2" fill="#388E3C" />
        <path d="M4 3h8v1h1v5h-1v2h-1v2H9v1H7v-1H5v-2h-1V4h1V3z" fill="#1A1A3A" />
        <path d="M5 4h6v1h1v4h-1v2h-1v2H8v-1H6v-1H5V5h1V4z" fill="#7B1FA2" />
        <path d="M8 4h3v1h1v4h-1v2h-1v2H8V4z" fill="#4A148C" />
        <rect x="6" y="5" width="2" height="2" fill="#9C27B0" />
        <rect x="7" y="6" width="1" height="1" fill="#FFFFFF" opacity="0.4" />
      </svg>
    ),
    tomato: (
      <svg viewBox="0 0 16 16" className="w-14 h-14" style={{ imageRendering: "pixelated" }}>
        <path d="M6 1h5v3H5V2h1z" fill="#1A1A3A" />
        <path d="M6 2h4v1H6z" fill="#2E7D32" />
        <path d="M4 3h8v1h2v9h-2v1H4v-1H2V4h2V3z" fill="#1A1A3A" />
        <path d="M5 4h6v1h2v8h-2v1H5v-1H3V5h2V4z" fill="#F44336" />
        <path d="M9 4h4v9h-6v-1h4V4z" fill="#C62828" />
        <rect x="6" y="6" width="2" height="2" fill="#FF5252" />
        <rect x="7" y="7" width="1" height="1" fill="#FFFFFF" opacity="0.4" />
      </svg>
    ),
    avocado: (
      <svg viewBox="0 0 16 16" className="w-14 h-14" style={{ imageRendering: "pixelated" }}>
        <path d="M6 1h4v1h2v11h-2v2H6v-2H4V2h2V1z" fill="#1A1A3A" />
        <path d="M7 2h3v11H6V3h1z" fill="#1B5E20" />
        <path d="M7 3h2v10H6v-1H5V4h1V3z" fill="#8BC34A" />
        <path d="M7 8h2v3H7z" fill="#1A1A3A" />
        <rect x="7" y="9" width="2" height="2" fill="#5D4037" />
        <rect x="7.5" y="9.5" width="1" height="1" fill="#795548" opacity="0.6" />
      </svg>
    ),
    banana: (
      <svg viewBox="0 0 16 16" className="w-14 h-14" style={{ imageRendering: "pixelated" }}>
        <path d="M11 2h3v2h-3z" fill="#1A1A3A" />
        <path d="M12 2.5h1.5v1H12z" fill="#5D4037" />
        <path d="M4 6h3v1h1v1h1v1h1v1h1v1h2v2h1v1H3v-8z" fill="#1A1A3A" />
        <path d="M4 7h3v1h1v1h1v1h1v1h1v1h2v1H5V9H4V7z" fill="#FFEB3B" />
        <path d="M8 10h4v2H9v-1H8V10z" fill="#FBC02D" />
        <path d="M5 8h2v1H5V8z" fill="#FFF176" />
      </svg>
    ),
    kiwi: (
      <svg viewBox="0 0 16 16" className="w-14 h-14" style={{ imageRendering: "pixelated" }}>
        <path d="M5 1h6v1h2v2h1v6h-1v2h-2v1H5v-1H3v-2H2v-6h1V4h2V1z" fill="#1A1A3A" />
        <path d="M6 2h4v1h2v10H6v-1H5V4h1V2z" fill="#8D6E63" />
        <path d="M5 5h6v1h1v4h-1v1H5v-1H4V6h1V5z" fill="#C0CA33" />
        <rect x="7" y="7" width="2" height="2" fill="#F0F4C3" />
        <rect x="6" y="6" width="1" height="1" fill="#1B5E20" />
        <rect x="9" y="6" width="1" height="1" fill="#1B5E20" />
        <rect x="6" y="9" width="1" height="1" fill="#1B5E20" />
        <rect x="9" y="9" width="1" height="1" fill="#1B5E20" />
      </svg>
    ),
    strawberry: (
      <svg viewBox="0 0 16 16" className="w-14 h-14" style={{ imageRendering: "pixelated" }}>
        <path d="M6 1h4v2H6V1z" fill="#1A1A3A" />
        <path d="M7 1.5h2v1H7z" fill="#43A047" />
        <path d="M5 3h6v2h2v4h-1v2h-1v2h-1v2H6v-2H5v-2H4V5h1V3z" fill="#1A1A3A" />
        <path d="M6 4h4v1h2v3h-1v2h-1v2h-4v-2h-1v-2h-1V5h2V4z" fill="#E91E63" />
        <path d="M9 4h3v9H9V4z" fill="#AD1457" />
        <rect x="7" y="6" width="1" height="1" fill="#FDD835" />
        <rect x="9" y="8" width="1" height="1" fill="#FDD835" opacity="0.8" />
        <rect x="7" y="10" width="1" height="1" fill="#FDD835" opacity="0.6" />
      </svg>
    ),
    cherry: (
      <svg viewBox="0 0 16 16" className="w-14 h-14" style={{ imageRendering: "pixelated" }}>
        <path d="M8 1l2 3v1h-1V4L7 2L5 4v1H4V4l4-3z" fill="#1A1A3A" />
        <path d="M7 1.5h1v1H7z" fill="#43A047" />
        <path d="M2 7h5v1h2v8H7v1H3v-1H2v-9z M9 7h5v1h1v8h-4v1h-1v-9z" fill="#1A1A3A" />
        <path d="M3 8h4v8H3V8z M10 8h4v8H10V8z" fill="#D32F2F" />
        <path d="M5 8h2v8H6V8z M12 8h2v8h-1V8z" fill="#B71C1C" />
        <rect x="4" y="9" width="1" height="1" fill="#FF5252" />
        <rect x="11" y="9" width="1" height="1" fill="#FF5252" />
      </svg>
    ),
    orange: (
      <svg viewBox="0 0 16 16" className="w-14 h-14" style={{ imageRendering: "pixelated" }}>
        <rect x="7" y="1" width="3" height="2" fill="#1A1A3A" />
        <rect x="8" y="1.5" width="1.5" height="1" fill="#43A047" />
        <path d="M5 4h6v1h2v2h1v6h-1v2h-2v1H5v-1H3v-2H2v-6h1V5h2V4z" fill="#1A1A3A" />
        <path d="M6 5h4v1h2v6h-1v2h-2v1H6v-1H4v-1h-1V7h1V5h2z" fill="#FF9800" />
        <path d="M10 5h2v9h-5v-1h3V5z" fill="#F57C00" opacity="0.6" />
        <rect x="5" y="7" width="2" height="2" fill="#FFB74D" />
        <rect x="6" y="8" width="1" height="1" fill="#FFFFFF" opacity="0.4" />
      </svg>
    ),
  };

  return icons[type] || null;
}
