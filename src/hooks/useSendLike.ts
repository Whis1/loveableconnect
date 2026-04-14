import { useCallback, useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

const PENDING_LIKES_KEY = "pending_likes";

interface SendLikeResult {
  success: boolean;
  already_exists: boolean;
  match_created: boolean;
  likes_remaining: number;
  credits_used: boolean;
  new_balance: number;
}

// localStorage outbox helpers
const getPendingLikes = (): string[] => {
  try {
    return JSON.parse(localStorage.getItem(PENDING_LIKES_KEY) || "[]");
  } catch {
    return [];
  }
};

const addPendingLike = (toUserId: string) => {
  const pending = getPendingLikes();
  if (!pending.includes(toUserId)) {
    pending.push(toUserId);
    localStorage.setItem(PENDING_LIKES_KEY, JSON.stringify(pending));
  }
};

const removePendingLike = (toUserId: string) => {
  const pending = getPendingLikes().filter((id) => id !== toUserId);
  localStorage.setItem(PENDING_LIKES_KEY, JSON.stringify(pending));
};

export const useSendLike = (currentUserId: string | null) => {
  const queryClient = useQueryClient();

  const invalidateCaches = useCallback(() => {
    if (!currentUserId) return;
    queryClient.invalidateQueries({ queryKey: ["user-likes", currentUserId] });
    queryClient.invalidateQueries({ queryKey: ["daily-likes"] });
    queryClient.invalidateQueries({ queryKey: ["user-credits"] });
  }, [queryClient, currentUserId]);

  const updateLikedCache = useCallback(
    (profileId: string, liked: boolean) => {
      if (!currentUserId) return;
      queryClient.setQueryData<Set<string>>(
        ["user-likes", currentUserId],
        (prev) => {
          const next = new Set(prev ? Array.from(prev) : []);
          if (liked) next.add(profileId);
          else next.delete(profileId);
          return next;
        }
      );
    },
    [queryClient, currentUserId]
  );

  // Send a like via the atomic RPC
  const sendLike = useCallback(
    async (
      toUserId: string,
      useCredits: boolean = false
    ): Promise<SendLikeResult> => {
      if (!currentUserId) {
        return { success: false, already_exists: false, match_created: false, likes_remaining: 0, credits_used: false, new_balance: 0 };
      }

      // 1. Persist to localStorage immediately
      addPendingLike(toUserId);

      // 2. Optimistic cache update
      updateLikedCache(toUserId, true);

      try {
        // 3. Call atomic RPC
        const { data, error } = await supabase.rpc("send_like", {
          _to_user_id: toUserId,
          _use_credits: useCredits,
        });

        if (error) throw error;

        const result: SendLikeResult = Array.isArray(data) ? data[0] : data;

        if (!result.success) {
          // Rollback
          updateLikedCache(toUserId, false);
          removePendingLike(toUserId);
          return result;
        }

        // Success: remove from outbox, invalidate caches
        removePendingLike(toUserId);
        invalidateCaches();

        return result;
      } catch (err) {
        // Keep in outbox for retry, but rollback UI
        updateLikedCache(toUserId, false);
        throw err;
      }
    },
    [currentUserId, updateLikedCache, invalidateCaches]
  );

  // Replay pending likes on mount
  useEffect(() => {
    if (!currentUserId) return;

    const replayPending = async () => {
      const pending = getPendingLikes();
      if (pending.length === 0) return;

      for (const toUserId of pending) {
        try {
          const { data, error } = await supabase.rpc("send_like", {
            _to_user_id: toUserId,
            _use_credits: false,
          });

          if (error) {
            console.error("Failed to replay pending like:", error);
            continue;
          }

          const result = Array.isArray(data) ? data[0] : data;
          if (result.success || result.already_exists) {
            removePendingLike(toUserId);
          }
        } catch (err) {
          console.error("Failed to replay pending like:", err);
        }
      }
      invalidateCaches();
    };

    replayPending();
  }, [currentUserId, invalidateCaches]);

  // Check if a profile is pending (in localStorage outbox)
  const isPending = useCallback((toUserId: string): boolean => {
    return getPendingLikes().includes(toUserId);
  }, []);

  return { sendLike, isPending };
};
