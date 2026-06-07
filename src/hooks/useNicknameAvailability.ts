import { useEffect, useMemo, useState } from "react";
import { isNicknameTaken, normalizeNickname } from "@/lib/nickname";

type NicknameAvailabilityStatus = "idle" | "checking" | "taken" | "available" | "error";

interface UseNicknameAvailabilityOptions {
  enabled?: boolean;
  delayMs?: number;
}

export const useNicknameAvailability = (
  nickname: string,
  currentProfileId?: string,
  options: UseNicknameAvailabilityOptions = {},
) => {
  const { enabled = true, delayMs = 450 } = options;
  const normalizedNickname = useMemo(() => normalizeNickname(nickname), [nickname]);
  const [status, setStatus] = useState<NicknameAvailabilityStatus>("idle");

  useEffect(() => {
    if (!enabled || !normalizedNickname) {
      setStatus("idle");
      return;
    }

    let cancelled = false;
    const timeoutId = window.setTimeout(async () => {
      setStatus("checking");

      try {
        const taken = await isNicknameTaken(normalizedNickname, currentProfileId);
        if (!cancelled) {
          setStatus(taken ? "taken" : "available");
        }
      } catch (error) {
        console.warn("Nickname availability check failed:", error);
        if (!cancelled) {
          setStatus("error");
        }
      }
    }, delayMs);

    return () => {
      cancelled = true;
      window.clearTimeout(timeoutId);
    };
  }, [currentProfileId, delayMs, enabled, normalizedNickname]);

  return {
    normalizedNickname,
    status,
    isChecking: status === "checking",
    isTaken: status === "taken",
    isAvailable: status === "available",
  };
};
