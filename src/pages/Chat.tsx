import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ArrowLeft, Send, Paperclip, ChevronDown, ChevronUp, Gift } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { EmojiPicker } from "@/components/chat/EmojiPicker";
import { GifPicker } from "@/components/chat/GifPicker";
import { VoiceRecorder } from "@/components/chat/VoiceRecorder";
import { VoicePreview } from "@/components/chat/VoicePreview";
import { MessageBubble } from "@/components/chat/MessageBubble";
import { ChatUserProfile } from "@/components/chat/ChatUserProfile";
import { InsufficientCreditsBanner } from "@/components/chat/InsufficientCreditsBanner";
import { VoicePremiumBanner } from "@/components/chat/VoicePremiumBanner";
import { ReportUserDialog } from "@/components/chat/ReportUserDialog";
import { GiftSubscriptionBanner } from "@/components/chat/GiftSubscriptionBanner";
import { MessageSuggestions } from "@/components/chat/MessageSuggestions";
import { useCredits } from "@/hooks/useCredits";
import { useTranslation } from "react-i18next";
import OnlineIndicator from "@/components/OnlineIndicator";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";

interface Message {
  id: string;
  match_id: string;
  sender_id: string;
  receiver_id: string;
  content: string;
  message_type: 'text' | 'image' | 'emoji' | 'gif' | 'voice';
  media_url: string | null;
  created_at: string;
  read: boolean;
  translatedContent?: string;
}

interface Profile {
  id: string;
  full_name: string;
  nickname: string;
  is_admin_profile: boolean;
  avatar_url: string | null;
}

type DirectChatSettlement = {
  creditCost: number;
  mode: "premium" | "free" | "credits";
};

type ResolvedDirectChat = {
  matchId: string;
  wasCreated: boolean;
};

const withTimeout = <T,>(promise: Promise<T>, timeoutMs: number, timeoutMessage: string): Promise<T> =>
  Promise.race([
    promise,
    new Promise<T>((_, reject) => {
      setTimeout(() => reject(new Error(timeoutMessage)), timeoutMs);
    }),
  ]);

const resolveDirectChatSettlement = async (userId: string): Promise<DirectChatSettlement> => {
  const [{ data: creditsSnapshot, error: creditsSnapshotError }, { data: creditsMeta, error: creditsMetaError }, { data: freeChatsSnapshot, error: freeChatsError }] = await Promise.all([
    supabase.rpc("check_and_reset_user_credits", { _user_id: userId }),
    supabase
      .from("user_credits")
      .select("subscription_type, premium_tier, premium_expires_at")
      .eq("user_id", userId)
      .maybeSingle(),
    supabase.rpc("check_and_reset_daily_free_chats", { _user_id: userId }),
  ]);

  if (creditsSnapshotError) throw creditsSnapshotError;
  if (creditsMetaError) throw creditsMetaError;
  if (freeChatsError) throw freeChatsError;

  const balance = creditsSnapshot?.[0]?.balance ?? 0;
  const chatsRemaining = freeChatsSnapshot?.[0]?.chats_remaining ?? 0;
  const isPremiumTier = Boolean(
    creditsSnapshot?.[0]?.is_premium &&
      creditsMeta?.subscription_type === "monthly" &&
      creditsMeta?.premium_tier === "premium" &&
      (!creditsMeta?.premium_expires_at || new Date(creditsMeta.premium_expires_at) > new Date())
  );

  if (isPremiumTier) {
    return { mode: "premium", creditCost: 0 };
  }

  if (chatsRemaining > 0) {
    return { mode: "free", creditCost: 0 };
  }

  if (balance >= 6) {
    return { mode: "credits", creditCost: 6 };
  }

  throw new Error("INSUFFICIENT_DIRECT_CHAT_CREDITS");
};

const resolveOrCreateDirectChat = async (currentUserId: string, otherUserId: string): Promise<ResolvedDirectChat> => {
  const user1Id = currentUserId < otherUserId ? currentUserId : otherUserId;
  const user2Id = currentUserId < otherUserId ? otherUserId : currentUserId;

  const { data: existingMatch, error: existingMatchError } = await supabase
    .from("matches")
    .select("id")
    .eq("user1_id", user1Id)
    .eq("user2_id", user2Id)
    .maybeSingle();

  if (existingMatchError) throw existingMatchError;

  if (existingMatch?.id) {
    return { matchId: existingMatch.id, wasCreated: false };
  }

  const { data: newMatch, error: createMatchError } = await supabase
    .from("matches")
    .insert({ user1_id: user1Id, user2_id: user2Id })
    .select("id")
    .single();

  if (createMatchError) {
    if ((createMatchError as { code?: string })?.code === "23505") {
      const { data: concurrentMatch, error: concurrentMatchError } = await supabase
        .from("matches")
        .select("id")
        .eq("user1_id", user1Id)
        .eq("user2_id", user2Id)
        .maybeSingle();

      if (concurrentMatchError) throw concurrentMatchError;

      if (concurrentMatch?.id) {
        return { matchId: concurrentMatch.id, wasCreated: false };
      }
    }

    throw createMatchError;
  }

  return {
    matchId: newMatch.id,
    wasCreated: true,
  };
};

const settleDirectChatCost = async (userId: string, settlement: DirectChatSettlement) => {
  if (settlement.mode === "premium") return;

  if (settlement.mode === "free") {
    const { data, error } = await supabase.rpc("consume_free_chat", { _user_id: userId });

    if (error || !data?.[0]?.success) {
      throw error ?? new Error("Unable to consume free direct chat");
    }

    return;
  }

  const { data, error } = await supabase.rpc("deduct_credits", {
    _user_id: userId,
    _amount: settlement.creditCost,
  });

  if (error || !data) {
    throw error ?? new Error("Unable to deduct direct chat credits");
  }
};

const Chat = () => {
  const { matchId, otherUserId } = useParams<{ matchId?: string; otherUserId?: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { t } = useTranslation();
  const [currentUser, setCurrentUser] = useState<string | null>(null);
  const [otherUser, setOtherUser] = useState<Profile | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [myAvatar, setMyAvatar] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [showCreditsBanner, setShowCreditsBanner] = useState(false);
  const [showVoicePremiumBanner, setShowVoicePremiumBanner] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [isBlocked, setIsBlocked] = useState(false);
  const [recordedAudio, setRecordedAudio] = useState<{ blob: Blob; url: string } | null>(null);
  const [giftingSubscription, setGiftingSubscription] = useState(false);
  const [showGiftBanner, setShowGiftBanner] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(true);
  const [hasUserInteracted, setHasUserInteracted] = useState(false);
  const [otherUserOnlineStatus, setOtherUserOnlineStatus] = useState<{ isOnline: boolean; showStatus: boolean } | undefined>();
  const [resolvedMatchId, setResolvedMatchId] = useState<string | null>(matchId ?? null);
  const [isLoadingHistory, setIsLoadingHistory] = useState(true);
  const activeMatchId = matchId ?? resolvedMatchId;
  // Chat is "usable" as soon as we have current user, match, and other user — history can keep loading.
  const isChatPending = !currentUser || !activeMatchId || !otherUser;
  const { deductCredits, credits, refetch: refetchCredits } = useCredits();
  const refetchCreditsRef = useRef(refetchCredits);
  useEffect(() => {
    refetchCreditsRef.current = refetchCredits;
  }, [refetchCredits]);

  // Check for gift payment result in URL params
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const sessionId = urlParams.get('session_id');
    
    // Verifica automaticamente il regalo se c'è un session_id
    const verifyGiftPayment = async (sessionId: string) => {
      try {
        const { data, error } = await supabase.functions.invoke('verify-gift-subscription', {
          body: { session_id: sessionId }
        });

        if (error) throw error;

        if (data?.success) {
          toast({
            title: "🎁 Regalo inviato!",
            description: "L'abbonamento Premium è stato regalato con successo!",
          });
        }
      } catch (error: any) {
        console.error("Error verifying gift:", error);
        toast({
          title: "Errore",
          description: "Impossibile verificare il pagamento del regalo",
          variant: "destructive",
        });
      } finally {
        // Remove params from URL
        urlParams.delete('session_id');
        urlParams.delete('gift_success');
        const newUrl = window.location.pathname + (urlParams.toString() ? '?' + urlParams.toString() : '');
        window.history.replaceState({}, '', newUrl);
      }
    };

    if (sessionId && urlParams.get('gift_success') === 'true') {
      verifyGiftPayment(sessionId);
    } else if (urlParams.get('gift_cancelled') === 'true') {
      toast({
        title: "Regalo annullato",
        description: "Il pagamento è stato annullato",
        variant: "destructive",
      });
      // Remove the param from URL
      urlParams.delete('gift_cancelled');
      const newUrl = window.location.pathname + (urlParams.toString() ? '?' + urlParams.toString() : '');
      window.history.replaceState({}, '', newUrl);
    }
  }, [toast]);

  useEffect(() => {
    setResolvedMatchId(matchId ?? null);
  }, [matchId]);

  useEffect(() => {
    let channel: ReturnType<typeof supabase.channel> | null = null;
    let cancelled = false;

    const checkBlockStatus = async (userId: string, otherUserId: string) => {
      const { data, error } = await supabase
        .from("blocked_users")
        .select("id")
        .or(`and(blocker_id.eq.${userId},blocked_id.eq.${otherUserId}),and(blocker_id.eq.${otherUserId},blocked_id.eq.${userId})`)
        .maybeSingle();

      if (!error && data) {
        setIsBlocked(true);
      } else {
        setIsBlocked(false);
      }
    };

    const initChat = async () => {
      try {
        console.log('[Chat] initChat start', { matchId, otherUserId });
        const { data: { session } } = await supabase.auth.getSession();

        if (!session) {
          navigate("/auth");
          return;
        }

        const userId = session.user.id;

        // Set current user immediately so the composer can mount
        if (!cancelled) setCurrentUser(userId);

        let targetMatchId = matchId ?? null;
        let directChatSettlement: DirectChatSettlement | null = null;
        let createdDirectChat = false;

        if (!targetMatchId) {
          if (!otherUserId) {
            navigate("/matches");
            return;
          }

          const resolvedChat = await withTimeout(
            resolveOrCreateDirectChat(userId, otherUserId),
            12000,
            "DIRECT_CHAT_TIMEOUT"
          );

          targetMatchId = resolvedChat.matchId;
          directChatSettlement = resolvedChat.settlement;
          createdDirectChat = resolvedChat.wasCreated;

          if (!cancelled) {
            setResolvedMatchId(resolvedChat.matchId);
            navigate(`/chat/${resolvedChat.matchId}`, { replace: true });
          }
        }

        if (!targetMatchId) {
          navigate("/matches");
          return;
        }

        if (cancelled) return;

        // Fetch match to determine the "other" user id, then load everything in parallel.
        const { data: match } = await supabase
          .from("matches")
          .select("user1_id, user2_id")
          .eq("id", targetMatchId)
          .single();

        if (!match) {
          toast({
            title: t("chat.error"),
            description: t("chat.matchNotFound"),
            variant: "destructive",
          });
          navigate("/matches");
          return;
        }

        const otherProfileId = match.user1_id === userId ? match.user2_id : match.user1_id;

        // PARALLEL fetch: my avatar, other profile, block status, messages history
        const [myProfileRes, otherProfileRes, blockedRes, messagesRes] = await Promise.all([
          supabase.from("profiles").select("avatar_url").eq("id", userId).maybeSingle(),
          supabase
            .from("profiles")
            .select("id, full_name, nickname, is_admin_profile, avatar_url, show_online_status, last_active, manual_online_status")
            .eq("id", otherProfileId)
            .single(),
          supabase
            .from("blocked_users")
            .select("id")
            .or(`and(blocker_id.eq.${userId},blocked_id.eq.${otherProfileId}),and(blocker_id.eq.${otherProfileId},blocked_id.eq.${userId})`)
            .maybeSingle(),
          supabase
            .from("messages")
            .select("*")
            .eq("match_id", targetMatchId)
            .order("created_at", { ascending: true }),
        ]);

        if (cancelled) return;

        const myAvatarUrl = myProfileRes.data?.avatar_url
          ? supabase.storage.from('profile-images').getPublicUrl(myProfileRes.data.avatar_url).data.publicUrl
          : null;
        setMyAvatar(myAvatarUrl);

        const profile = otherProfileRes.data;
        if (!profile) {
          toast({
            title: t("chat.error"),
            description: t("chat.profileNotFound"),
            variant: "destructive",
          });
          navigate("/matches");
          return;
        }

        setOtherUser({
          id: profile.id,
          full_name: profile.full_name,
          nickname: profile.nickname,
          is_admin_profile: profile.is_admin_profile,
          avatar_url: profile.avatar_url
            ? supabase.storage.from('profile-images').getPublicUrl(profile.avatar_url).data.publicUrl
            : null,
        });

        let isOnline = false;
        const showStatus = profile.show_online_status ?? true;
        if (profile.manual_online_status !== null) {
          isOnline = profile.manual_online_status;
        } else if (profile.is_admin_profile) {
          isOnline = true;
        } else if (profile.last_active) {
          const lastActive = new Date(profile.last_active);
          isOnline = lastActive > new Date(Date.now() - 2 * 60 * 1000);
        }
        setOtherUserOnlineStatus({ isOnline, showStatus });

        setIsBlocked(Boolean(blockedRes.data));

        setMessages((messagesRes.data || []) as Message[]);
        setIsLoadingHistory(false);
        setLoading(false);

        // Background: mark messages as read (non-blocking)
        void supabase
          .from("messages")
          .update({ read: true })
          .eq("match_id", targetMatchId)
          .eq("receiver_id", userId)
          .eq("read", false);

        // Background: settle direct chat cost (non-blocking)
        if (createdDirectChat && directChatSettlement) {
          void settleDirectChatCost(userId, directChatSettlement)
            .then(() => {
              refetchCreditsRef.current?.();
            })
            .catch((error) => {
              console.error("[Chat] Direct chat cost settlement failed", error);
            });
        }

        channel = supabase
          .channel(`messages-${targetMatchId}`)
          .on(
            "postgres_changes",
            {
              event: "INSERT",
              schema: "public",
              table: "messages",
              filter: `match_id=eq.${targetMatchId}`,
            },
            async (payload) => {
              const newMsg = payload.new as Message;
              console.log('[Chat] Realtime INSERT', newMsg);

              setMessages((prev) => {
                const exists = prev.some(m => m.id === newMsg.id);
                if (exists) return prev;
                return [...prev, newMsg];
              });

              if (newMsg.receiver_id === userId) {
                supabase
                  .from("messages")
                  .update({ read: true })
                  .eq("id", newMsg.id);
              }
            }
          )
          .on(
            "postgres_changes",
            {
              event: "*",
              schema: "public",
              table: "blocked_users",
            },
            async (payload) => {
              console.log('[Chat] Block status changed:', payload);
              const { data } = await supabase
                .from("blocked_users")
                .select("id")
                .or(`and(blocker_id.eq.${userId},blocked_id.eq.${otherProfileId}),and(blocker_id.eq.${otherProfileId},blocked_id.eq.${userId})`)
                .maybeSingle();
              setIsBlocked(Boolean(data));
            }
          )
          .subscribe((status) => {
            console.log('[Chat] Channel status:', status);
          });
      } catch (error: any) {
        console.error('[Chat] initChat error', error);

        if (cancelled) return;

        setLoading(false);
        setIsLoadingHistory(false);

        if (error?.message === "INSUFFICIENT_DIRECT_CHAT_CREDITS") {
          setShowCreditsBanner(true);
          toast({
            title: t("common.error"),
            description: "Crediti insufficienti per aprire la chat",
            variant: "destructive",
          });
          navigate("/credits");
          return;
        }

        toast({
          title: t("common.error"),
          description: error?.message === "DIRECT_CHAT_TIMEOUT"
            ? "La chat sta impiegando troppo tempo ad aprirsi"
            : "Si è verificato un errore nell'apertura della chat",
          variant: "destructive",
        });
        navigate("/matches");
      }
    };

    initChat();

    return () => {
      cancelled = true;
      if (channel) {
        console.log('[Chat] removing channel');
        supabase.removeChannel(channel);
      }
    };
  }, [matchId, otherUserId, navigate, toast, t]);

  useEffect(() => {
    // Scroll to bottom when messages change
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Scroll to bottom on initial load
  useEffect(() => {
    if (!loading && messages.length > 0) {
      // Small timeout to ensure DOM has updated
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
      }, 100);
    }
  }, [loading]);

  const handleSendMessage = async (
    e?: React.FormEvent, 
    messageType: 'text' | 'emoji' | 'gif' | 'image' | 'voice' = 'text',
    mediaUrl: string | null = null,
    content?: string
  ) => {
    if (e) e.preventDefault();
    
    const messageContent = content || newMessage.trim();
    if (!messageContent || !currentUser || !otherUser || !activeMatchId) return;

    // CRITICAL: Blocca l'invio se l'utente è bloccato
    if (isBlocked) {
      toast({
        title: "Impossibile inviare",
        description: "Non puoi inviare messaggi a questo utente perché uno di voi ha bloccato l'altro",
        variant: "destructive",
      });
      return;
    }

    // Nascondi i suggerimenti quando l'utente invia un messaggio
    setShowSuggestions(false);
    setHasUserInteracted(true);

    // Check and deduct credits before sending
    const hasCredits = await deductCredits();
    if (!hasCredits) {
      setShowCreditsBanner(true);
      return;
    }

    // Crea il messaggio temporaneo per mostrarlo subito
    const tempMessage: Message = {
      id: `temp-${Date.now()}`,
      match_id: activeMatchId,
      sender_id: currentUser,
      receiver_id: otherUser.id,
      content: messageContent,
      message_type: messageType,
      media_url: mediaUrl,
      created_at: new Date().toISOString(),
      read: false,
    };

    // Aggiungi subito il messaggio alla lista locale
    setMessages((prev) => [...prev, tempMessage]);
    setNewMessage("");

    try {
      const { data, error } = await supabase
        .from("messages")
        .insert({
          match_id: activeMatchId,
          sender_id: currentUser,
          receiver_id: otherUser.id,
          content: messageContent,
          message_type: messageType,
          media_url: mediaUrl,
        })
        .select()
        .single();

      if (error) throw error;

      // Sostituisci il messaggio temporaneo con quello reale
      if (data) {
        setMessages((prev) => 
          prev.map(msg => msg.id === tempMessage.id ? data as Message : msg)
        );
      }
    } catch (error: any) {
      // Rimuovi il messaggio temporaneo in caso di errore
      setMessages((prev) => prev.filter(msg => msg.id !== tempMessage.id));
      
      toast({
        title: t("chat.error"),
        description: t("chat.cannotSendMessage"),
        variant: "destructive",
      });
    }
  };

  const handleEmojiSelect = (emoji: string) => {
    setNewMessage((prev) => prev + emoji);
  };

  const handleGifSelect = (gifUrl: string) => {
    handleSendMessage(undefined, 'gif', gifUrl, 'GIF');
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !currentUser) return;

    setUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${currentUser}/${Date.now()}.${fileExt}`;
      
      const { error: uploadError } = await supabase.storage
        .from('chat-images')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      const { data } = supabase.storage
        .from('chat-images')
        .getPublicUrl(fileName);

      await handleSendMessage(undefined, 'image', data.publicUrl, t("chat.photo"));
      
      toast({
        title: t("chat.success"),
        description: t("chat.imageSent"),
      });
    } catch (error: any) {
      toast({
        title: t("chat.error"),
        description: t("chat.cannotUploadImage"),
        variant: "destructive",
      });
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleVoiceRecording = async (audioBlob: Blob) => {
    // Create a URL for preview
    const audioUrl = URL.createObjectURL(audioBlob);
    setRecordedAudio({ blob: audioBlob, url: audioUrl });
  };

  const handleSendVoiceMessage = async () => {
    if (!currentUser || !recordedAudio) return;

    setUploading(true);
    try {
      const fileName = `${currentUser}/${Date.now()}.webm`;
      
      const { error: uploadError } = await supabase.storage
        .from('chat-images')
        .upload(fileName, recordedAudio.blob, {
          contentType: 'audio/webm'
        });

      if (uploadError) throw uploadError;

      const { data } = supabase.storage
        .from('chat-images')
        .getPublicUrl(fileName);

      await handleSendMessage(undefined, 'voice', data.publicUrl, '🎤 Messaggio vocale');
      
      // Clean up
      URL.revokeObjectURL(recordedAudio.url);
      setRecordedAudio(null);
    } catch (error: any) {
      console.error("Error uploading voice message:", error);
      toast({
        title: t("chat.error"),
        description: "Impossibile inviare il messaggio vocale",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

  const handleDeleteVoiceMessage = () => {
    if (recordedAudio) {
      URL.revokeObjectURL(recordedAudio.url);
      setRecordedAudio(null);
    }
  };

  const handleBlock = async () => {
    if (!currentUser || !otherUser) return;
    
    try {
      const { error } = await supabase
        .from("blocked_users")
        .insert({
          blocker_id: currentUser,
          blocked_id: otherUser.id,
        });

      if (error && error.code !== "23505") {
        throw error;
      }

      setIsBlocked(true);
      toast({
        title: "Utente bloccato",
        description: "Non potrete più scrivervi messaggi",
      });
    } catch (error: any) {
      console.error("Errore nel blocco:", error);
      toast({
        title: "Errore",
        description: "Impossibile bloccare l'utente",
        variant: "destructive",
      });
    }
  };

  const handleUnblock = async () => {
    if (!currentUser || !otherUser) return;
    
    try {
      const { error } = await supabase
        .from("blocked_users")
        .delete()
        .or(`and(blocker_id.eq.${currentUser},blocked_id.eq.${otherUser.id}),and(blocker_id.eq.${otherUser.id},blocked_id.eq.${currentUser})`);

      if (error) throw error;

      setIsBlocked(false);
      toast({
        title: "Utente sbloccato",
        description: "Potete scrivervi nuovamente messaggi",
      });
    } catch (error: any) {
      console.error("Errore nello sblocco:", error);
      toast({
        title: "Errore",
        description: "Impossibile sbloccare l'utente",
        variant: "destructive",
      });
    }
  };

  const handleShowGiftBanner = () => {
    setShowGiftBanner(true);
  };

  const handleConfirmGift = async () => {
    if (!otherUser || !currentUser || !activeMatchId) return;

    setGiftingSubscription(true);
    try {
      const { data, error } = await supabase.functions.invoke('gift-subscription', {
        body: { 
          recipient_id: otherUser.id,
          match_id: activeMatchId 
        }
      });

      if (error) throw error;

      if (data?.url) {
        // Chiudi il banner prima di aprire Stripe
        setShowGiftBanner(false);
        window.open(data.url, '_blank');
        toast({
          title: "Pagamento in corso",
          description: `Stai per regalare Premium a ${otherUser.nickname}`,
        });
      }
    } catch (error: any) {
      console.error("Errore nel regalo abbonamento:", error);
      toast({
        title: "Errore",
        description: "Impossibile avviare il regalo dell'abbonamento",
        variant: "destructive",
      });
    } finally {
      setGiftingSubscription(false);
    }
  };

  const handleCancelGift = () => {
    setShowGiftBanner(false);
  };

  const handleSuggestionSelect = (suggestion: string) => {
    // Invia il messaggio suggerito
    handleSendMessage(undefined, 'text', null, suggestion);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setNewMessage(e.target.value);
    // Nascondi i suggerimenti quando l'utente inizia a scrivere
    if (e.target.value && !hasUserInteracted) {
      setShowSuggestions(false);
      setHasUserInteracted(true);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50 via-purple-50 to-indigo-50 dark:from-gray-900 dark:via-purple-900 dark:to-indigo-900">
      {showGiftBanner && otherUser && (
        <GiftSubscriptionBanner
          recipientNickname={otherUser.nickname}
          onConfirm={handleConfirmGift}
          onCancel={handleCancelGift}
          isProcessing={giftingSubscription}
        />
      )}
      <InsufficientCreditsBanner 
        isVisible={showCreditsBanner} 
        onClose={() => setShowCreditsBanner(false)} 
      />
      <div className="container mx-auto max-w-2xl h-screen flex flex-col p-2 md:p-4">
        <Card className="flex-1 flex flex-col overflow-hidden shadow-xl">
          {/* Header with back button */}
          <div className="border-b p-3 md:p-4 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 md:gap-3 flex-1 min-w-0">
                <Button 
                  variant="ghost" 
                  size="icon" 
                  onClick={() => navigate("/matches")}
                  className="shrink-0 h-9 w-9 md:h-10 md:w-10"
                >
                  <ArrowLeft className="h-4 w-4 md:h-5 md:w-5" />
                </Button>
                {otherUser ? (
                  <div className="flex items-center gap-2 min-w-0 flex-1">
                    <div className="relative shrink-0">
                      <Avatar className="h-9 w-9 md:h-10 md:w-10">
                        <AvatarImage src={otherUser.avatar_url || undefined} />
                        <AvatarFallback>
                          {otherUser.nickname.charAt(0)}
                        </AvatarFallback>
                    </Avatar>
                    <div className="absolute bottom-0 right-0">
                      <OnlineIndicator userId={otherUser.id} size="sm" preloadedStatus={otherUserOnlineStatus} />
                    </div>
                    </div>
                    <span className="font-semibold text-sm md:text-base truncate">
                      {otherUser.nickname}
                    </span>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 min-w-0 flex-1">
                    <Skeleton className="h-9 w-9 md:h-10 md:w-10 rounded-full" />
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-4 w-28" />
                      <Skeleton className="h-3 w-20" />
                    </div>
                  </div>
                )}
              </div>
              <div className="flex items-center gap-1">
                {otherUser && activeMatchId && (
                  <>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={handleShowGiftBanner}
                      disabled={giftingSubscription}
                      className="text-primary hover:text-primary hover:bg-primary/10"
                      title="Regala abbonamento Premium"
                    >
                      <Gift className="h-5 w-5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={isBlocked ? handleUnblock : handleBlock}
                      className={isBlocked ? "text-green-600 hover:text-green-600 hover:bg-green-100 dark:hover:bg-green-900" : "text-destructive hover:text-destructive hover:bg-destructive/10"}
                      title={isBlocked ? "Sblocca utente" : "Blocca utente"}
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
                        {isBlocked ? (
                          <>
                            <rect x="5" y="11" width="14" height="10" rx="2" ry="2"/>
                            <path d="M12 16v1"/>
                            <path d="M12 13v1"/>
                            <path d="M7 11V7a5 5 0 0 1 9.9-1"/>
                          </>
                        ) : (
                          <>
                            <rect x="5" y="11" width="14" height="10" rx="2" ry="2"/>
                            <path d="M12 16v1"/>
                            <path d="M12 13v1"/>
                            <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                          </>
                        )}
                      </svg>
                    </Button>
                    <ReportUserDialog
                      reportedUserId={otherUser.id}
                      reportedUserName={otherUser.nickname}
                      matchId={activeMatchId}
                    />
                  </>
                )}
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={() => setShowProfile(!showProfile)}
                  className="gap-1 md:gap-2 shrink-0"
                >
                  {showProfile ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                  <span className="hidden sm:inline">{showProfile ? t("chat.hideProfile") : t("chat.showProfile")}</span>
                </Button>
              </div>
            </div>
          </div>

          {/* User Profile Section */}
          {otherUser && showProfile && <ChatUserProfile userId={otherUser.id} />}
          
          {/* Messages Section */}
          <CardContent className="flex-1 overflow-hidden p-0">
            <ScrollArea className="h-full p-3 md:p-6">
              <div className="space-y-3 md:space-y-4">
                {isChatPending && messages.length === 0 && (
                  <div className="space-y-4 py-2">
                    <div className="flex justify-start">
                      <div className="space-y-2 max-w-[75%]">
                        <Skeleton className="h-4 w-16" />
                        <Skeleton className="h-16 w-48 rounded-2xl" />
                      </div>
                    </div>
                    <div className="flex justify-end">
                      <div className="space-y-2 max-w-[75%]">
                        <Skeleton className="ml-auto h-4 w-12" />
                        <Skeleton className="h-16 w-40 rounded-2xl" />
                      </div>
                    </div>
                    <div className="flex justify-start">
                      <div className="space-y-2 max-w-[75%]">
                        <Skeleton className="h-4 w-14" />
                        <Skeleton className="h-20 w-56 rounded-2xl" />
                      </div>
                    </div>
                  </div>
                )}
                {/* Message Suggestions - shown only for first message */}
                {!isChatPending && showSuggestions && messages.length === 0 && !hasUserInteracted && !isBlocked && (
                  <MessageSuggestions
                    onSuggestionSelect={handleSuggestionSelect}
                    onDismiss={() => {
                      setShowSuggestions(false);
                      setHasUserInteracted(true);
                    }}
                  />
                )}
                {messages.map((message) => {
                  const isOwn = message.sender_id === currentUser;
                  const senderAvatar = isOwn ? myAvatar : otherUser?.avatar_url || null;
                  
                  return (
                    <MessageBubble
                      key={message.id}
                      content={message.content}
                      messageType={message.message_type}
                      mediaUrl={message.media_url}
                      isOwn={isOwn}
                      timestamp={message.created_at}
                      messageId={message.id}
                      senderId={message.sender_id}
                      receiverId={message.receiver_id}
                      matchId={message.match_id}
                      senderAvatarUrl={senderAvatar}
                    />
                  );
                })}
                <div ref={messagesEndRef} />
              </div>
            </ScrollArea>
          </CardContent>

          {/* Input Section */}
          <div className="border-t p-2 md:p-4 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 space-y-2">
            {recordedAudio && (
              <VoicePreview
                audioUrl={recordedAudio.url}
                onSend={handleSendVoiceMessage}
                onDelete={handleDeleteVoiceMessage}
              />
            )}
            {isBlocked ? (
              <div className="text-center py-6 px-4">
                <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4 max-w-md mx-auto">
                  <p className="text-sm font-semibold text-destructive mb-1">
                    ⛔ Chat bloccata
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Non puoi inviare messaggi perché uno di voi ha bloccato l'altro
                  </p>
                </div>
              </div>
            ) : (
              <form onSubmit={(e) => handleSendMessage(e)}>
                <div className="flex gap-1 md:gap-2 items-center">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleImageUpload}
                  />
                  <Button 
                    type="button"
                    variant="ghost" 
                    size="icon"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isChatPending || uploading || !!recordedAudio}
                    className="shrink-0 h-9 w-9 md:h-10 md:w-10"
                  >
                    <Paperclip className="h-4 w-4 md:h-5 md:w-5" />
                  </Button>
                  <EmojiPicker onEmojiSelect={handleEmojiSelect} />
                  <GifPicker onGifSelect={handleGifSelect} />
                  <Input
                    value={newMessage}
                    onChange={handleInputChange}
                    placeholder={isChatPending ? "..." : t("chat.writeMessage")}
                    className="flex-1 text-sm md:text-base"
                    disabled={isChatPending || !!recordedAudio}
                  />
                  <VoiceRecorder 
                    onRecordingComplete={handleVoiceRecording}
                    disabled={isChatPending || uploading || !!recordedAudio}
                    isPremiumMonthly={credits?.is_premium && credits.subscription_type === 'monthly' && (!credits.premium_tier || credits.premium_tier === 'premium')}
                    onPremiumRequired={() => setShowVoicePremiumBanner(true)}
                  />
                  <Button 
                    type="submit" 
                    disabled={isChatPending || !newMessage.trim() || uploading || !!recordedAudio}
                    className="shrink-0 h-9 w-9 md:h-10 md:w-10"
                    size="icon"
                  >
                    <Send className="h-4 w-4" />
                  </Button>
                </div>
              </form>
            )}
          </div>
        </Card>
      </div>

      <VoicePremiumBanner 
        isVisible={showVoicePremiumBanner}
        onClose={() => setShowVoicePremiumBanner(false)}
      />
    </div>
  );
};

export default Chat;