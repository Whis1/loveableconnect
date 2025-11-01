import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface OnlineStatus {
  isOnline: boolean;
  showStatus: boolean;
}

export const useOnlineStatus = (userId: string | null | undefined) => {
  const [status, setStatus] = useState<OnlineStatus>({
    isOnline: false,
    showStatus: true,
  });

  useEffect(() => {
    if (!userId) {
      setStatus({ isOnline: false, showStatus: true });
      return;
    }

    const checkOnlineStatus = async () => {
      // Fetch profile to check if user wants to show status and if they're an admin
      const { data: profile } = await supabase
        .from('profiles')
        .select('show_online_status, is_admin_profile, last_active, manual_online_status')
        .eq('id', userId)
        .single();

      if (!profile) {
        setStatus({ isOnline: false, showStatus: true });
        return;
      }

      // Check if manual_online_status is set (not null) - this takes priority
      if (profile.manual_online_status !== null) {
        setStatus({ 
          isOnline: profile.manual_online_status, 
          showStatus: profile.show_online_status ?? true 
        });
        return;
      }

      // Admin profiles are always online (when manual status is not set)
      if (profile.is_admin_profile) {
        setStatus({ isOnline: true, showStatus: true });
        return;
      }

      // Check if last_active is within 2 minutes
      const lastActive = profile.last_active ? new Date(profile.last_active) : null;
      const now = new Date();
      const twoMinutesAgo = new Date(now.getTime() - 2 * 60 * 1000);
      
      const isOnline = lastActive ? lastActive > twoMinutesAgo : false;

      setStatus({
        isOnline,
        showStatus: profile.show_online_status ?? true,
      });
    };

    checkOnlineStatus();

    // Subscribe to profile changes
    const channel = supabase
      .channel(`online-status-${userId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'profiles',
          filter: `id=eq.${userId}`,
        },
        () => {
          checkOnlineStatus();
        }
      )
      .subscribe();

    // Refresh every 30 seconds
    const interval = setInterval(checkOnlineStatus, 30000);

    return () => {
      supabase.removeChannel(channel);
      clearInterval(interval);
    };
  }, [userId]);

  return status;
};
