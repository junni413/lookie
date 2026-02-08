import { useRef, useState, useEffect } from "react";
import { motion } from "framer-motion";
import { cn } from "@/utils/cn";

type Phase = "START" | "L" | "EYES" | "K" | "LOOKie";

interface LogoAnimationProps {
  scale?: number;
  color?: string;
  eyeColor?: string;
  showTagline?: boolean;
  origin?: string;
  className?: string;
}

export default function LogoAnimation({ 
  scale = 1, 
  color = "#304FFF", 
  eyeColor,
  showTagline = true,
  origin = "center center",
  className 
}: LogoAnimationProps) {
  const [phase, setPhase] = useState<Phase>("START");
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const sequence = async () => {
      await wait(500);
      setPhase("L");
      await wait(500);
      setPhase("EYES");
      await wait(500);
      setPhase("K");
      await wait(700);
      setPhase("LOOKie");
    };
    sequence();

    const handleMouseMove = (e: MouseEvent) => {
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const x = e.clientX - (rect.left + rect.width / 2);
      const y = e.clientY - (rect.top + rect.height / 2);
      
      const dist = Math.sqrt(x * x + y * y);
      const maxDist = 300; 

      if (dist < 2) {
        setMousePos({ x: 0, y: 0 });
        return;
      }

      const limitedDist = Math.min(dist, maxDist);
      const factor = limitedDist / maxDist;
      const angle = Math.atan2(y, x);
      
      setMousePos({
        x: Math.cos(angle) * factor,
        y: Math.sin(angle) * factor
      });
    };

    window.addEventListener("mousemove", handleMouseMove);
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, []);

  const showL = phase !== "START";
  const showEyes = phase === "EYES" || phase === "K" || phase === "LOOKie";
  const showK = phase === "K" || phase === "LOOKie";
  const showIE = phase === "LOOKie";

  return (
    <div 
      ref={containerRef}
      className={cn("flex flex-col items-center justify-center mb-10 select-none group", className)}
      style={{ 
        transform: `scale(${scale})`, 
        transformOrigin: origin,
      }}
    >
      <div className="relative flex items-center h-[90px]">
        {/* L */}
        <motion.span
          animate={{ 
            opacity: showL ? 1 : 0,
            scale: showL ? 1 : 0.85,
            y: showL ? [0, -4, 0] : 10
          }}
          transition={{ 
            duration: 0.8, 
            ease: "circOut",
            y: { duration: 2, repeat: Infinity, ease: "easeInOut" } 
          }}
          className="text-[72px] font-black tracking-tighter leading-none drop-shadow-sm"
          style={{ fontFamily: "'Inter', sans-serif", color }}
        >
          L
        </motion.span>

        {/* Eyes (OO) */}
        <div className="flex items-center mx-1">
            <Eye mousePos={mousePos} isVisible={showEyes} delay={0} color={eyeColor || color} />
            <Eye mousePos={mousePos} isVisible={showEyes} delay={0.1} color={eyeColor || color} />
        </div>

        {/* K */}
        <motion.span
          animate={{ 
            opacity: showK ? 1 : 0,
            scale: showK ? 1 : 0.85,
            y: showK ? [0, -4, 0] : 10
          }}
          transition={{ 
            duration: 0.8, 
            ease: "circOut",
            y: { duration: 2, repeat: Infinity, ease: "easeInOut", delay: 0.2 } 
          }}
          className="text-[72px] font-black tracking-tighter leading-none ml-1 drop-shadow-sm"
          style={{ fontFamily: "'Inter', sans-serif", color }}
        >
          K
        </motion.span>

        {/* IE */}
        <div className="flex items-center ml-2">
          <motion.span 
            animate={{ 
              opacity: showIE ? 1 : 0,
              y: showIE ? [0, -4, 0] : 10,
              scale: showIE ? 1 : 0.8
            }}
            transition={{ 
              duration: 1.0, 
              ease: "circOut",
              y: { duration: 2, repeat: Infinity, ease: "easeInOut", delay: 0.6 } 
            }}
            className="text-[72px] font-black tracking-tighter leading-none drop-shadow-sm"
            style={{ color }}
          >
            i
          </motion.span>
          <motion.span 
            animate={{ 
              opacity: showIE ? 1 : 0,
              y: showIE ? [0, -4, 0] : 10,
              scale: showIE ? 1 : 0.8
            }}
            transition={{ 
              duration: 1.0, 
              ease: "circOut",
              y: { duration: 2, repeat: Infinity, ease: "easeInOut", delay: 0.6 } 
            }}
            className="text-[72px] font-black tracking-tighter leading-none ml-1 drop-shadow-sm"
            style={{ color }}
          >
            e
          </motion.span>
        </div>

        {/* Glow Effects - Only if showEffects is true */}

      </div>

      {/* Tagline */}
      {showTagline && (
        <div className="overflow-hidden mt-4">
          <motion.p
            animate={showIE ? { opacity: 0.25, y: 0 } : { opacity: 0, y: 20 }}
            transition={{ duration: 1.2, ease: [0.22, 1, 0.36, 1] }}
            className="text-[12px] font-bold text-slate-500 tracking-[0.3em] uppercase"
          >
            Smart Logistics Partner
          </motion.p>
        </div>
      )}
    </div>
  );
}

function Eye({ mousePos, isVisible, delay, color }: { mousePos: { x: number; y: number }; isVisible: boolean; delay: number; color?: string }) {
  const [isBlinking, setIsBlinking] = useState(false);

  useEffect(() => {
    if (!isVisible) return;
    const blink = async () => {
      const timeout = Math.random() * 4000 + 2000;
      setTimeout(async () => {
        setIsBlinking(true);
        await wait(120);
        setIsBlinking(false);
        blink();
      }, timeout);
    };
    blink();
  }, [isVisible]);

  const maxMove = 8; // Reduced range for "focused" look
  const pupilX = mousePos.x * maxMove;
  const pupilY = mousePos.y * maxMove;

  return (
    <div className="relative w-[72px] h-[72px] flex items-center justify-center">
      <motion.div
        animate={{ 
            scale: isVisible ? 1 : 0.6, 
            opacity: isVisible ? 1 : 0,
            y: isVisible ? 0 : 15
        }}
        transition={{ 
            type: "spring", 
            stiffness: 140, 
            damping: 18,
            mass: 0.8,
            delay
        }}
        className="relative w-[60px] h-[60px] rounded-full bg-white border border-blue-100 shadow-[0_12px_24px_rgba(59,130,246,0.12)] overflow-hidden"
      >
        <div className="absolute inset-0 shadow-[inset_0_4px_12px_rgba(0,0,0,0.03)]" />
        <div className="absolute inset-0 bg-gradient-to-tr from-blue-500/[0.04] to-transparent" />

        <motion.div
           animate={{ height: isBlinking ? "100%" : "0%" }}
           transition={{ duration: 0.12, ease: "easeInOut" }}
           className="absolute top-0 left-0 right-0 bg-slate-50 z-20 border-b border-blue-50"
        />

        <motion.div
          animate={{ x: pupilX, y: pupilY, scale: isBlinking ? 0.8 : 1 }}
          transition={{ type: "spring", stiffness: 200, damping: 20, mass: 0.4 }}
          className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[28px] h-[28px] rounded-full"
          style={{ 
            backgroundColor: color || "#304FFF",
            boxShadow: "0 4px 12px rgba(37,99,235,0.4), inset 0 6px 8px rgba(255,255,255,0.2)" 
          }}
        >
            <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[12px] h-[12px] rounded-full bg-black/10" />
        </motion.div>

        <motion.div
          animate={{ x: pupilX * 0.5, y: pupilY * 0.5 }}
          transition={{ type: "spring", stiffness: 200, damping: 20, mass: 0.4 }}
          className="absolute top-4 left-5 w-[10px] h-[10px] rounded-full bg-white opacity-90 blur-[0.5px]"
        />
      </motion.div>
    </div>
  );
}

function wait(ms: number) {
  return new Promise<void>((r) => setTimeout(r, ms));
}
