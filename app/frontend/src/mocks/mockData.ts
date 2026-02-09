import type { ZoneLayout } from "@/types/db";

// Zones Layout Mock (Fallback)
export const zonesLayoutMock: Record<number, ZoneLayout> = {};
[1, 2, 3, 4].forEach(zId => {
  zonesLayoutMock[zId] = {
    zoneId: zId,
    lines: Array.from({ length: 12 }).map((_, i) => ({
      lineNumber: i + 1,
      bins: Array.from({ length: 6 }).map((_, j) => ({ binNumber: j + 1 }))
    }))
  };
});
