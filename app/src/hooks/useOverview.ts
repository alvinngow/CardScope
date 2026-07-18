"use client";

import { useCallback, useEffect, useState } from "react";
import type { OverviewData } from "@/lib/types";

type OverviewResponse = OverviewData | { error?: string };

export function useOverview() {
  const [overview, setOverview] = useState<OverviewData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const requestOverview = useCallback(async () => {
    const response = await fetch("/api/overview", { cache: "no-store" });
    const payload = (await response.json()) as OverviewResponse;

    if (!response.ok) {
      throw new Error("error" in payload && payload.error ? payload.error : "Unable to load overview.");
    }

    return payload as OverviewData;
  }, []);

  const refresh = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      setOverview(await requestOverview());
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to load overview.");
    } finally {
      setIsLoading(false);
    }
  }, [requestOverview]);

  useEffect(() => {
    let isCurrent = true;

    requestOverview()
      .then((payload) => {
        if (isCurrent) {
          setOverview(payload);
        }
      })
      .catch((caught) => {
        if (isCurrent) {
          setError(caught instanceof Error ? caught.message : "Unable to load overview.");
        }
      })
      .finally(() => {
        if (isCurrent) {
          setIsLoading(false);
        }
      });

    return () => {
      isCurrent = false;
    };
  }, [requestOverview]);

  return { error, isLoading, overview, refresh };
}
