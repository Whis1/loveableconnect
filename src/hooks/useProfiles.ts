import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useEffect } from "react";

interface Profile {
  id: string;
  full_name: string;
  nickname: string;
  bio: string | null;
  age: number | null;
  birthdate: string | null;
  gender: string | null;
  sexual_orientation: string | null;
  relationship_status: string | null;
  city: string | null;
  interests: string[] | null;
  avatar_url: string | null;
  photos: string[] | null;
  relationship_type: string | null;
  looking_for: string[] | null;
  latitude: number | null;
  longitude: number | null;
  last_active: string | null;
}

const fetchProfiles = async (): Promise<Profile[]> => {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.user) return [];

  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .neq("id", session.user.id)
    .order("last_active", { ascending: false });

  if (error) throw error;
  return data || [];
};

export const useProfiles = () => {
  const queryClient = useQueryClient();

  const { data: profiles = [], isLoading, error, isFetching } = useQuery({
    queryKey: ["profiles"],
    queryFn: fetchProfiles,
    staleTime: 10 * 60 * 1000, // 10 minuti - dati sempre freschi per navigazione istantanea
    gcTime: 30 * 60 * 1000, // 30 minuti in cache
    refetchOnWindowFocus: false, // Non ricaricare quando si torna alla finestra
    refetchOnMount: false, // Non ricaricare quando il componente si monta se i dati sono in cache
  });

  // Realtime updates per i profili
  useEffect(() => {
    const channel = supabase
      .channel("profiles_changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "profiles",
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ["profiles"] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  return {
    profiles,
    loading: isLoading,
    error,
  };
};
