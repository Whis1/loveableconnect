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

// 🔒 LOCK GLOBALE: una sola chiamata send_like in corso alla volta.
// Senza questo, l'utente spammando "Usa 2 crediti" sparava 5-10 RPC in
// parallelo → alcune timeoutavano lato client (ma il backend le processava
// comunque, scalando crediti silenziosamente) → percezione "like fake infiniti".
let sendLikeInFlight: Promise<any> | null = null;

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
    // 🔄 refetchType: 'all' forza il refetch anche delle query INATTIVE
    // (es. useDailyLikes/useCredits quando l'utente è dentro una partita e
    // mette like dal ProfileStatsDialog: il Dashboard è smontato ma vogliamo
    // che al ritorno il counter sia gia' aggiornato senza F5).
    queryClient.invalidateQueries({ queryKey: ["daily-likes"], refetchType: "all" });
    queryClient.invalidateQueries({ queryKey: ["user-credits"], refetchType: "all" });
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

  // Send a like via the atomic RPC — SERIALIZZATO con lock globale
  const sendLike = useCallback(
    async (
      toUserId: string,
      useCredits: boolean = false
    ): Promise<SendLikeResult> => {
      if (!currentUserId) {
        return { success: false, already_exists: false, match_created: false, likes_remaining: 0, credits_used: false, new_balance: 0 };
      }

      // 🔒 SERIALIZZAZIONE: se c'è già una chiamata in corso, aspettiamo che
      //    finisca PRIMA di partire. Niente più 10 RPC in parallelo che
      //    saturano il backend (e scalano crediti senza che il client lo veda).
      if (sendLikeInFlight) {
        try {
          await sendLikeInFlight;
        } catch {
          // ignore: la chiamata precedente ha fallito, noi proviamo comunque
        }
      }

      const doSend = async (): Promise<SendLikeResult> => {
        // 1. Persist to localStorage immediately
        addPendingLike(toUserId);

        // 2. Optimistic cache update
        updateLikedCache(toUserId, true);

        // 3. 💰 OPTIMISTIC DECREMENT del balance se useCredits=true: così il
        //    pre-check client-side in ProfileGridCard vede SUBITO il balance
        //    aggiornato senza dover aspettare il refetch.
        if (useCredits) {
          queryClient.setQueryData<any>(["user-credits"], (prev: any) => {
            if (!prev) return prev;
            return { ...prev, balance: Math.max(0, (prev.balance ?? 0) - 2) };
          });
        }

        try {
          // 🛡️ TIMEOUT 15s: backend Lovable Cloud sotto carico può essere lento
          const TIMEOUT_MS = 15000;
          const rpcPromise = supabase.rpc("send_like", {
            _to_user_id: toUserId,
            _use_credits: useCredits,
          });
          const { data, error } = (await Promise.race([
            rpcPromise,
            new Promise((_, reject) =>
              setTimeout(() => reject(new Error("SEND_LIKE_TIMEOUT")), TIMEOUT_MS)
            ),
          ])) as { data: any; error: any };

          if (error) throw error;

          const result: SendLikeResult = Array.isArray(data) ? data[0] : data;

          if (!result.success) {
            // Rollback: like UI + balance ottimistico (se decremato)
            updateLikedCache(toUserId, false);
            removePendingLike(toUserId);
            if (useCredits) {
              queryClient.setQueryData<any>(["user-credits"], (prev: any) => {
                if (!prev) return prev;
                return { ...prev, balance: (prev.balance ?? 0) + 2 };
              });
            }
            return result;
          }

          // Success: aggiorna balance al valore reale ritornato dalla RPC
          if (useCredits && typeof result.new_balance === "number") {
            queryClient.setQueryData<any>(["user-credits"], (prev: any) => {
              if (!prev) return prev;
              return { ...prev, balance: result.new_balance };
            });
          }
          removePendingLike(toUserId);
          invalidateCaches();

          return result;
        } catch (err) {
          // Rollback: like UI + balance ottimistico (se decremato).
          // NB: il backend POTREBBE aver processato la richiesta in timeout,
          // ma il refetch successivo (invalidateCaches) ricalibra il balance.
          updateLikedCache(toUserId, false);
          if (useCredits) {
            queryClient.setQueryData<any>(["user-credits"], (prev: any) => {
              if (!prev) return prev;
              return { ...prev, balance: (prev.balance ?? 0) + 2 };
            });
            // Refetch per ricalibrare al valore reale (timeout != failure server)
            queryClient.invalidateQueries({ queryKey: ["user-credits"], refetchType: "all" });
          }
          throw err;
        }
      };

      // Esegui la chiamata sotto lock
      const promise = doSend();
      sendLikeInFlight = promise;
      try {
        return await promise;
      } finally {
        if (sendLikeInFlight === promise) {
          sendLikeInFlight = null;
        }
      }
    },
    [currentUserId, updateLikedCache, invalidateCaches, queryClient]
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
