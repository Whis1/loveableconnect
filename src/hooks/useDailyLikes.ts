import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface DailyLikesStatus {
  likesRemaining: number;
  resetAt: string | null;
  isPremium: boolean;
  loading: boolean;
}

export const useDailyLikes = () => {
  const [status, setStatus] = useState<DailyLikesStatus>({
    likesRemaining: 13,
    resetAt: null,
    isPremium: false,
    loading: true,
  });
  const { toast } = useToast();

  const checkStatus = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase.rpc('check_and_reset_daily_likes', {
        _user_id: user.id,
      });

      if (error) throw error;

      if (data && data.length > 0) {
        setStatus({
          likesRemaining: data[0].likes_remaining,
          resetAt: data[0].reset_at,
          isPremium: data[0].is_premium,
          loading: false,
        });
      }
    } catch (error) {
      console.error('Error checking daily likes:', error);
      setStatus(prev => ({ ...prev, loading: false }));
    }
  };

  const consumeLike = async (useCredits: boolean = false): Promise<{ success: boolean; creditsUsed: boolean }> => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return { success: false, creditsUsed: false };

      const { data, error } = await supabase.rpc('consume_daily_like', {
        _user_id: user.id,
        _use_credits: useCredits,
      });

      if (error) throw error;

      if (data && data.length > 0) {
        const result = data[0];
        
        if (result.success) {
          setStatus(prev => ({
            ...prev,
            likesRemaining: result.likes_remaining,
          }));

          if (result.credits_used) {
            toast({
              title: "Like inviato",
              description: "Hai usato 2 crediti per mettere questo like",
            });
          }

          return { success: true, creditsUsed: result.credits_used };
        } else {
          return { success: false, creditsUsed: false };
        }
      }

      return { success: false, creditsUsed: false };
    } catch (error) {
      console.error('Error consuming like:', error);
      return { success: false, creditsUsed: false };
    }
  };

  useEffect(() => {
    checkStatus();

    // Subscribe to changes in user_credits
    const setupSubscription = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const channel = supabase
          .channel('daily-likes-changes')
          .on(
            'postgres_changes',
            {
              event: '*',
              schema: 'public',
              table: 'user_credits',
              filter: `user_id=eq.${user.id}`,
            },
            () => {
              checkStatus();
            }
          )
          .subscribe();

        return channel;
      }
      return null;
    };

    let channel: any;
    setupSubscription().then(ch => {
      channel = ch;
    });

    return () => {
      if (channel) {
        supabase.removeChannel(channel);
      }
    };
  }, []);

  return { ...status, consumeLike, refetch: checkStatus };
};
