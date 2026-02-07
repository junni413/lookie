import { motion, AnimatePresence } from "framer-motion";
import { useState, useEffect } from "react";
import { Key } from "lucide-react";

export default function LogoAnimation() {
  const [phase, setPhase] = useState<"IDLE" | "KEY" | "UNLOCK" | "LOOKIE">("IDLE");

  useEffect(() => {
    const sequence = async () => {
      await wait(600);
      setPhase("KEY");
      await wait(950);
      setPhase("UNLOCK");
      await wait(420);
      setPhase("LOOKIE");
    };
    sequence();
  }, []);

  const isUnlocked = phase === "UNLOCK" || phase === "LOOKIE";
  const showKey = phase === "KEY";

  return (
    <div className="flex flex-col items-center justify-center mb-10 select-none pointer-events-none">
      <div className="relative flex items-center">
        {/* Wordmark */}
        <span className="text-[64px] font-extrabold tracking-tight text-primary leading-none">
          L
        </span>

        <Eye isUnlocked={isUnlocked} />
        <Eye isUnlocked={isUnlocked} />

        <span className="text-[64px] font-extrabold tracking-tight text-primary leading-none ml-1">
          K
        </span>

        {/* Minimal Key */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <AnimatePresence>
          {showKey && (
            <motion.div
              initial={{ x: -70, opacity: 0, scale: 0.9 }}
              animate={{ x: -10, opacity: 0.9, scale: 1 }}
              exit={{ x: 40, opacity: 0, scale: 1.02 }}
              transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
              className="z-10"
              style={{ imageRendering: "pixelated" as any }}
            >
              <div className="relative">
                <Key size={34} strokeWidth={3} className="text-primary" />
              </div>
            </motion.div>
          )}

          </AnimatePresence>

          {/* Unlock ripple (very subtle) */}
          <AnimatePresence>
            {phase === "UNLOCK" && (
              <motion.div
                initial={{ scale: 0.7, opacity: 0 }}
                animate={{ scale: 1.15, opacity: 0.22 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.45, ease: "easeOut" }}
                className="absolute w-[132px] h-[72px] rounded-[28px] border border-blue-400/50"
              />
            )}
          </AnimatePresence>
        </div>

        {/* IE Reveal */}
        <AnimatePresence>
          {phase === "LOOKIE" && (
            <motion.div
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
              className="flex items-center"
            >
              <span className="text-[64px] font-extrabold tracking-tight text-primary leading-none ml-2">
                I
              </span>
              <span className="text-[64px] font-extrabold tracking-tight text-primary leading-none ml-1">
                E
              </span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Soft bloom (premium) */}
        <div
          className="absolute -inset-6 -z-10 rounded-[28px] opacity-35"
          style={{
            background:
              "radial-gradient(circle at 50% 55%, rgba(59,130,246,0.16), transparent 60%)",
          }}
        />
      </div>

      {/* Tagline */}
      <motion.p
        initial={{ opacity: 0, y: 2 }}
        animate={phase === "LOOKIE" ? { opacity: 0.45, y: 0 } : { opacity: 0, y: 2 }}
        transition={{ delay: 0.15, duration: 0.45 }}
        className="mt-3 text-[11px] font-medium text-slate-700 tracking-widest"
      >
        Your Key to Smart Logistics
      </motion.p>
    </div>
  );
}

function Eye({ isUnlocked }: { isUnlocked: boolean }) {
  return (
    <div className="relative w-16 h-16 flex items-center justify-center ml-1">
      <motion.div
        animate={{ scale: isUnlocked ? 1 : 0.995 }}
        transition={{ type: "spring", stiffness: 220, damping: 18 }}
        className="relative w-14 h-14 rounded-full bg-white border border-blue-200 shadow-[0_10px_22px_rgba(15,23,42,0.08)] overflow-hidden"
      >
        <div className="absolute inset-0 bg-blue-500/[0.03]" />

        {/* pupil: 항상 중앙 */}
        <motion.div
          animate={isUnlocked ? { scale: 1, opacity: 1 } : { scale: 0.96, opacity: 0.92 }}
          transition={{ type: "spring", stiffness: 260, damping: 18 }}
          className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[26px] h-[26px] rounded-full bg-primary"
          style={{ boxShadow: "inset 0 8px 10px rgba(255,255,255,0.20)" }}
        />

        {/* highlight 2개로 귀여움 */}
        <motion.div
          animate={{ opacity: isUnlocked ? 0.95 : 0.75 }}
          transition={{ duration: 0.2 }}
          className="absolute top-[14px] left-[16px] w-[9px] h-[9px] rounded-full bg-white"
        />
        <motion.div
          animate={{ opacity: isUnlocked ? 0.65 : 0.45 }}
          transition={{ duration: 0.2 }}
          className="absolute top-[23px] left-[24px] w-[4px] h-[4px] rounded-full bg-white"
        />
      </motion.div>
    </div>
  );
}



function wait(ms: number) {
  return new Promise<void>((r) => setTimeout(r, ms));
}
