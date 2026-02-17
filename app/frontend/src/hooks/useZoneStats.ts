import { useCallback, useEffect, useState } from "react";
import { useInterval } from "@/hooks/useInterval";
import { adminService } from "@/services/adminService";
import { DEFAULT_ZONES, mergeZoneData, readZonesOverride } from "@/utils/zoneUtils";
import type { ZoneStat } from "@/types/db";

interface UseZoneStatsOptions {
  pollingMs?: number;
  autoRefresh?: boolean;
  listenOverride?: boolean;
}

export function useZoneStats(options: UseZoneStatsOptions = {}) {
  const {
    pollingMs = 5000,
    autoRefresh = true,
    listenOverride = true
  } = options;

  const [zones, setZones] = useState<ZoneStat[]>(DEFAULT_ZONES);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const applyOverride = useCallback(() => {
    if (!listenOverride) return false;
    const override = readZonesOverride();
    if (override) {
      setZones(override);
      return true;
    }
    return false;
  }, [listenOverride]);

  const refreshZones = useCallback(async (isBackground = false) => {
    if (!isBackground) setLoading(true);
    setError(null);
    try {
      const apiZones = await adminService.getZones();
      setZones(mergeZoneData(apiZones));
    } catch (err: any) {
      setError(err?.message ?? "Failed to load zone stats");
      setZones((prev) => (prev.length > 0 ? prev : DEFAULT_ZONES));
      throw err;
    } finally {
      if (!isBackground) setLoading(false);
    }
  }, []);

  useEffect(() => {
    applyOverride();
    refreshZones(true);
  }, [applyOverride, refreshZones]);

  useEffect(() => {
    if (!listenOverride) return;

    const onZonesRefresh = () => {
      applyOverride();
      refreshZones(true);
    };

    const onStorage = (e: StorageEvent) => {
      if (e.key === "zones-refresh-ts") {
        onZonesRefresh();
      }
    };

    const onVisibility = () => {
      if (document.visibilityState === "visible") {
        onZonesRefresh();
      }
    };

    window.addEventListener("zones-refresh", onZonesRefresh);
    window.addEventListener("storage", onStorage);
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      window.removeEventListener("zones-refresh", onZonesRefresh);
      window.removeEventListener("storage", onStorage);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [autoRefresh, listenOverride, applyOverride, refreshZones]);

  useInterval(() => {
    if (autoRefresh) {
      refreshZones(true);
    }
  }, autoRefresh ? pollingMs : null);

  return {
    zones,
    setZones,
    refreshZones,
    applyOverride,
    loading,
    error
  };
}
