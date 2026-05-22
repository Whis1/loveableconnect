import { Skeleton } from "@/components/ui/skeleton";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { User } from "@supabase/supabase-js";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Heart, Users, Sparkles, Search, MessageCircle, Trophy } from "lucide-react";
import { UserProfileCard } from "@/components/UserProfileCard";
import { useTranslation } from "react-i18next";
import { CreditsDisplay } from "@/components/CreditsDisplay";
import { useBanCheck } from "@/hooks/useBanCheck";
import { DashboardControls } from "@/components/DashboardControls";
import { GeolocationBanner } from "@/components/GeolocationBanner";

import { InboxDropdown } from "@/components/InboxDropdown";
import { Tutorial } from "@/components/Tutorial";
import { getStoredUserId } from "@/lib/storedSession";
import loveIcon from "@/assets/love-icon.png";
interface Profile {
  id: string;
  full_name: string;
  bio: string | null;
  age: number | null;
  gender: string | null;
  city: string | null;
  interests: string[] | null;
  avatar_url: string | null;
  photos: string[] | null;
}
interface UserRole {
  role: string;
}
const Dashboard = () => {
  const navigate = useNavigate();
  const {
    toast
  } = useToast();
  const {
    t
  } = useTranslation();
  useBanCheck(); // Check if user is banned
  const [user, setUser] = useState<User | null>(() => {
    const id = getStoredUserId();
    return id ? ({ id } as User) : null;
  });

  // Cache helpers: la dashboard si smonta quando navighi via, e si rimonta
  // tornando indietro. Per evitare l'effetto "i pannelli appaiono dal nulla"
  // (profile vuoto, matches=0, likes=0 finche' le query non rispondono),
  // salviamo gli ultimi valori in localStorage e li leggiamo sincronamente
  // al primo render. Poi le query li aggiornano in background.
  const cachedUserId = (() => {
    try { return getStoredUserId(); } catch { return null; }
  })();
  const CACHE_KEY = (k: string) => `dash_cache_v1_${cachedUserId || 'anon'}_${k}`;
  const readCache = <T,>(key: string, fallback: T): T => {
    try {
      const raw = localStorage.getItem(CACHE_KEY(key));
      return raw ? (JSON.parse(raw) as T) : fallback;
    } catch {
      return fallback;
    }
  };
  const writeCache = (key: string, value: unknown) => {
    try {
      localStorage.setItem(CACHE_KEY(key), JSON.stringify(value));
    } catch {
      /* localStorage pieno o non disponibile: ignora */
    }
  };

  const [profile, setProfile] = useState<Profile | null>(() =>
    cachedUserId ? readCache<Profile | null>("profile", null) : null
  );
  const [userRole, setUserRole] = useState<string | null>(null);
  // Se abbiamo gia' un profilo in cache, partiamo con loading=false: niente
  // skeleton, i pannelli appaiono subito coi valori dell'ultima visita.
  const [loading, setLoading] = useState(() => {
    if (!cachedUserId) return true;
    return readCache<Profile | null>("profile", null) === null;
  });
  const [matches, setMatches] = useState<any[]>(() =>
    cachedUserId ? readCache<any[]>("matches", []) : []
  );
  const [likesReceived, setLikesReceived] = useState<any[]>(() =>
    cachedUserId ? readCache<any[]>("likes", []) : []
  );
  const [showGeolocationBanner, setShowGeolocationBanner] = useState(false);
  const [showTutorial, setShowTutorial] = useState(false);

  // ============================================================
  // Real-time del contatore "Like Ricevuti" sulla home
  // ============================================================
  // Effect dedicato che si sottoscrive SUBITO al mount, senza aspettare
  // che le altre query del dashboard finiscano. Senza questo, se una
  // qualsiasi query era lenta, il canale realtime non veniva mai
  // sottoscritto e i nuovi like non comparivano finche' non si
  // ricaricava la pagina.
  useEffect(() => {
    const userId = getStoredUserId();
    if (!userId) return;

    // Filtro server-side: riceviamo solo gli INSERT che ci riguardano,
    // niente eventi inutili. Cosi' anche se Realtime ha throttling, ci
    // arrivano comunque i NOSTRI like.
    const channel = supabase
      .channel(`dashboard-likes-realtime-${userId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "likes",
          filter: `to_user_id=eq.${userId}`,
        },
        (payload) => {
          const newLike = payload.new as any;
          setLikesReceived((prev) => {
            // Evita duplicati se l'evento arriva due volte (realtime +
            // polling possono sovrapporsi).
            if (prev.some((l: any) => l.id === newLike.id)) return prev;
            const updated = [newLike, ...prev];
            // Aggiorna anche la cache localStorage cosi' tornando alla
            // home si vede subito il count corretto.
            writeCache("likes", updated);
            return updated;
          });
        }
      )
      .on(
        "postgres_changes",
        {
          event: "DELETE",
          schema: "public",
          table: "likes",
        },
        (payload) => {
          const deleted = payload.old as any;
          // Il filtro server-side non funziona sui DELETE, quindi
          // filtriamo client-side: rimuoviamo solo se era un nostro like.
          setLikesReceived((prev) => {
            if (!prev.some((l: any) => l.id === deleted.id)) return prev;
            const updated = prev.filter((l: any) => l.id !== deleted.id);
            writeCache("likes", updated);
            return updated;
          });
        }
      )
      .subscribe();

    // Polling di sicurezza ogni 5 secondi: anche se Realtime fallisce
    // (rete instabile, table non in pubblicazione, ecc.), il contatore
    // si aggiorna comunque entro ~5s, che per l'utente sembra istantaneo.
    const pollInterval = setInterval(async () => {
      try {
        const { data } = await supabase
          .from("likes")
          .select("*")
          .eq("to_user_id", userId);
        if (data) {
          setLikesReceived((prev) => {
            // Aggiorna solo se il numero e' davvero cambiato, per evitare
            // re-render inutili.
            if (prev.length === data.length) return prev;
            writeCache("likes", data);
            return data;
          });
        }
      } catch (e) {
        /* polling silenzioso: niente toast su errori transitori */
      }
    }, 5000);

    return () => {
      supabase.removeChannel(channel);
      clearInterval(pollInterval);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ============================================================
  // Real-time del contatore "I Tuoi Match" sulla home
  // ============================================================
  // Stesso pattern del realtime dei like: useEffect dedicato che parte
  // subito al mount, niente attese, con polling di sicurezza ogni 5s.
  useEffect(() => {
    const userId = getStoredUserId();
    if (!userId) return;

    const channel = supabase
      .channel(`dashboard-matches-realtime-${userId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "matches",
        },
        (payload) => {
          const newMatch = payload.new as any;
          // I match interessano solo se siamo uno dei due partecipanti.
          if (
            newMatch.user1_id !== userId &&
            newMatch.user2_id !== userId
          ) {
            return;
          }
          setMatches((prev) => {
            if (prev.some((m: any) => m.id === newMatch.id)) return prev;
            const updated = [newMatch, ...prev];
            writeCache("matches", updated);
            return updated;
          });
        }
      )
      .on(
        "postgres_changes",
        {
          event: "DELETE",
          schema: "public",
          table: "matches",
        },
        (payload) => {
          const deleted = payload.old as any;
          setMatches((prev) => {
            if (!prev.some((m: any) => m.id === deleted.id)) return prev;
            const updated = prev.filter((m: any) => m.id !== deleted.id);
            writeCache("matches", updated);
            return updated;
          });
        }
      )
      .subscribe();

    // Polling di sicurezza ogni 5 secondi (vedi commento likes sopra).
    const pollInterval = setInterval(async () => {
      try {
        const { data } = await supabase
          .from("matches")
          .select("*")
          .or(`user1_id.eq.${userId},user2_id.eq.${userId}`);
        if (data) {
          // Filtriamo anche dai match nascosti (coerente con fetchUserData).
          const { data: hidden } = await supabase
            .from("hidden_matches")
            .select("match_id")
            .eq("user_id", userId)
            .in("hidden_from", ["matches", "both"]);
          const hiddenIds = new Set((hidden || []).map((h: any) => h.match_id));
          const visible = data.filter((m: any) => !hiddenIds.has(m.id));
          setMatches((prev) => {
            if (prev.length === visible.length) return prev;
            writeCache("matches", visible);
            return visible;
          });
        }
      } catch (e) {
        /* polling silenzioso */
      }
    }, 5000);

    return () => {
      supabase.removeChannel(channel);
      clearInterval(pollInterval);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    let matchesChannel: ReturnType<typeof supabase.channel> | null = null;
    let likesChannel: ReturnType<typeof supabase.channel> | null = null;
    let profileChannel: ReturnType<typeof supabase.channel> | null = null;
    let hiddenMatchesChannel: ReturnType<typeof supabase.channel> | null = null;
    const fetchUserData = async () => {
      // Leggiamo l'id utente in modo SINCRONO dal localStorage: evita
      // l'hang di supabase.auth.getSession() che lasciava la dashboard
      // in caricamento per minuti.
      const userId = getStoredUserId();
      if (!userId) {
        navigate("/auth");
        return;
      }
      const session = { user: { id: userId } } as { user: { id: string } };
      setUser(session.user as unknown as User);

      // Fetch profile (con timeout: se la query si pianta dopo 6s, non
      // blocchiamo tutto. Senza questo, tornare velocemente alla home
      // poteva lasciare profile e likes vuoti per minuti.)
      const profileResult = (await Promise.race([
        supabase.from("profiles").select("*").eq("id", session.user.id).maybeSingle(),
        new Promise((resolve) =>
          setTimeout(() => resolve({ data: null, error: { message: "profile_timeout" } }), 6000)
        ),
      ])) as { data: Profile | null; error: any };
      const profileData = profileResult.data;
      const error = profileResult.error;

      // Se c'e' un timeout, NON redirigere ad /auth: aspetta che la rete
      // risponda. L'utente probabilmente ha solo una rete lenta o Supabase
      // ha avuto un cold start. La pagina si caricheranno al prossimo
      // refetch (focus della finestra) o navigando.
      if (error?.message === "profile_timeout") {
        console.warn("Profile fetch timeout: la home restera' in skeleton finche' la rete non torna.");
        return;
      }

      // If profile doesn't exist, redirect to auth
      if (error || !profileData) {
        console.error("Profile not found, redirecting to auth");
        navigate("/auth", {
          replace: true
        });
        return;
      }

      // Check if profile is incomplete (missing birthdate or location)
      if (!profileData.birthdate || !profileData.city) {
        navigate("/profile/edit", {
          state: {
            requiresCompletion: true
          },
          replace: true
        });
        return;
      }
      setProfile(profileData);
      writeCache("profile", profileData);

      // Check if tutorial should be shown
      if (!profileData.tutorial_completed) {
        setShowTutorial(true);
      }

      // La pagina è già utilizzabile: mostra subito l'interfaccia.
      // I dati restanti (match, like, ecc.) si caricano senza bloccare la UI.
      setLoading(false);

      // Helper: una promessa di Supabase con timeout. Se la query non
      // risponde entro N secondi, la consideriamo "vuota" invece di lasciare
      // la pagina bloccata. Ogni query e' indipendente: il fallimento di
      // una NON impedisce alle altre di completare.
      const withTimeoutFallback = <T,>(
        p: PromiseLike<T>,
        ms: number,
        fallback: T
      ): Promise<T> =>
        Promise.race<T>([
          Promise.resolve(p),
          new Promise<T>((resolve) => setTimeout(() => resolve(fallback), ms)),
        ]);

      // Lanciamo tutte e 4 le query in PARALLELO. Se una sola si pianta o e'
      // lenta, le altre arrivano comunque, e il counter "Like Ricevuti" e
      // "I Tuoi Match" sulla home non restano piu' a 0 dopo una navigazione
      // rapida.
      const [roleRes, matchesRes, hiddenRes, likesRes] = await Promise.all([
        withTimeoutFallback(
          supabase.from("user_roles").select("role").eq("user_id", session.user.id).maybeSingle(),
          5000,
          { data: null } as { data: { role: string } | null }
        ),
        withTimeoutFallback(
          supabase.from("matches").select("*").or(`user1_id.eq.${session.user.id},user2_id.eq.${session.user.id}`),
          5000,
          { data: [] } as { data: any[] }
        ),
        withTimeoutFallback(
          supabase.from("hidden_matches").select("match_id").eq("user_id", session.user.id).in("hidden_from", ["matches", "both"]),
          5000,
          { data: [] } as { data: { match_id: string }[] }
        ),
        withTimeoutFallback(
          supabase.from("likes").select("*").eq("to_user_id", session.user.id),
          5000,
          { data: [] } as { data: any[] }
        ),
      ]);

      setUserRole(roleRes.data?.role || null);

      const hiddenMatchIds = new Set((hiddenRes.data || []).map((h: any) => h.match_id));
      const visibleMatches = (matchesRes.data || []).filter((match: any) => !hiddenMatchIds.has(match.id));
      setMatches(visibleMatches);
      writeCache("matches", visibleMatches);

      const likesData = likesRes.data || [];
      setLikesReceived(likesData);
      writeCache("likes", likesData);

      // Set up realtime subscription for profile updates
      profileChannel = supabase.channel('dashboard-profile').on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'profiles',
        filter: `id=eq.${session.user.id}`
      }, payload => {
        console.log('Profile updated in dashboard:', payload.new);
        setProfile(payload.new as Profile);
      }).subscribe();

      // Set up realtime subscription for new matches
      matchesChannel = supabase.channel('dashboard-matches').on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'matches'
      }, payload => {
        const newMatch = payload.new as any;
        if (newMatch.user1_id === session.user.id || newMatch.user2_id === session.user.id) {
          setMatches(prev => [newMatch, ...prev]);
          toast({
            title: t("dashboard.newMatch"),
            description: t("dashboard.newMatchDescription")
          });
        }
      }).subscribe();

      // Set up realtime subscription for new likes
      likesChannel = supabase.channel('dashboard-likes').on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'likes'
      }, payload => {
        const newLike = payload.new as any;
        if (newLike.to_user_id === session.user.id) {
          setLikesReceived(prev => [newLike, ...prev]);
        }
      }).on('postgres_changes', {
        event: 'DELETE',
        schema: 'public',
        table: 'likes'
      }, async payload => {
        const deletedLike = payload.old as any;
        // When a like is deleted, it might mean a match was created
        // Refresh matches to show the new match
        if (deletedLike.to_user_id === session.user.id || deletedLike.from_user_id === session.user.id) {
          const {
            data: matchesData
          } = await supabase.from("matches").select("*").or(`user1_id.eq.${session.user.id},user2_id.eq.${session.user.id}`);
          const {
            data: hiddenMatches
          } = await supabase.from("hidden_matches").select("match_id").eq("user_id", session.user.id).in("hidden_from", ["matches", "both"]);
          const hiddenMatchIds = new Set(hiddenMatches?.map(h => h.match_id) || []);
          const visibleMatches = (matchesData || []).filter(match => !hiddenMatchIds.has(match.id));
          setMatches(visibleMatches);

          // Also update likes list
          const {
            data: likesData
          } = await supabase.from("likes").select("*").eq("to_user_id", session.user.id);
          setLikesReceived(likesData || []);
        }
      }).subscribe();

      // Set up realtime subscription for hidden matches
      hiddenMatchesChannel = supabase.channel('dashboard-hidden-matches').on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'hidden_matches'
      }, payload => {
        const hiddenMatch = payload.new as any;
        if (hiddenMatch.user_id === session.user.id) {
          setMatches(prev => prev.filter(m => m.id !== hiddenMatch.match_id));
        }
      }).subscribe();
    };
    fetchUserData();

    // Rete di sicurezza: non lasciare mai la pagina bloccata sul caricamento.
    const loadingSafety = setTimeout(() => setLoading(false), 6000);

    // Refetch data when window regains focus (user returns to dashboard)
    const handleFocus = () => {
      fetchUserData();
    };
    window.addEventListener('focus', handleFocus);

    // Realtime listener for deleted likes (when matches are created)
    const likesDeleteChannel = supabase.channel('likes-delete-channel').on('postgres_changes', {
      event: 'DELETE',
      schema: 'public',
      table: 'likes'
    }, async payload => {
      // When a like is deleted, refresh user data
      await fetchUserData();
    }).subscribe();
    const {
      data: {
        subscription
      }
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (!session) {
        navigate("/auth");
      }
    });
    return () => {
      clearTimeout(loadingSafety);
      window.removeEventListener('focus', handleFocus);
      subscription.unsubscribe();
      if (profileChannel) {
        supabase.removeChannel(profileChannel);
      }
      if (matchesChannel) {
        supabase.removeChannel(matchesChannel);
      }
      if (likesChannel) {
        supabase.removeChannel(likesChannel);
      }
      if (hiddenMatchesChannel) {
        supabase.removeChannel(hiddenMatchesChannel);
      }
      supabase.removeChannel(likesDeleteChannel);
    };
  }, [navigate, toast]);
  const handleExploreClick = () => {
    const geolocationEnabled = localStorage.getItem("geolocationEnabled");
    if (geolocationEnabled === "true") {
      navigate("/explore");
    } else {
      setShowGeolocationBanner(true);
    }
  };
  const handleActivateGeolocation = () => {
    // The GeolocationBanner component now handles saving to localStorage
    setShowGeolocationBanner(false);
    toast({
      title: "✓ Geolocalizzazione attivata",
      description: "Ora puoi esplorare i profili nelle tue vicinanze"
    });
    navigate("/explore");
  };
  const handleCloseGeolocationBanner = () => {
    setShowGeolocationBanner(false);
  };
  if (loading) {
     return (
       <div className="min-h-screen bg-gradient-to-br from-pink-50 via-purple-50 to-indigo-50 dark:from-gray-950 dark:via-purple-950 dark:to-indigo-950 p-6">
         <div className="max-w-6xl mx-auto space-y-6">
           {/* Header skeleton */}
           <div className="flex items-center justify-between">
             <Skeleton className="h-10 w-48" />
             <Skeleton className="h-10 w-32" />
           </div>
           
           {/* Profile card skeleton */}
           <Card>
             <CardContent className="p-6">
               <div className="flex items-center gap-4">
                 <Skeleton className="h-24 w-24 rounded-full" />
                 <div className="flex-1 space-y-3">
                   <Skeleton className="h-6 w-48" />
                   <Skeleton className="h-4 w-64" />
                   <Skeleton className="h-4 w-32" />
                 </div>
               </div>
             </CardContent>
           </Card>
           
           {/* Stats cards skeleton */}
           <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
             {[1, 2, 3].map((i) => (
               <Card key={i}>
                 <CardContent className="p-6 space-y-3">
                   <Skeleton className="h-12 w-12 rounded-full" />
                   <Skeleton className="h-5 w-full" />
                   <Skeleton className="h-4 w-3/4" />
                 </CardContent>
               </Card>
             ))}
           </div>
         </div>
       </div>
     );
  }
  return <div className="min-h-screen relative bg-gradient-to-br from-pink-50 via-purple-50 to-indigo-50 dark:from-gray-950 dark:via-purple-950 dark:to-indigo-950">
      {showTutorial && <Tutorial />}
      {/* Background Image */}
      <div className="fixed inset-0 z-0 opacity-20 dark:opacity-30" style={{
      backgroundImage: 'url(/images/love-background.png)',
      backgroundSize: 'cover',
      backgroundPosition: 'center',
      backgroundRepeat: 'no-repeat'
    }} />
      
      <DashboardControls />
      
      <div className="container mx-auto p-3 md:p-4 max-w-7xl relative z-10 pt-16 md:pt-4">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between md:justify-end items-center gap-4 md:gap-6 mb-6 md:mb-8">
          <div className="flex items-center gap-3 order-2 md:order-1">
            <img src={loveIcon} alt="Love Icon" className="h-12 w-12 md:h-14 md:w-14" />
            <div>
              <h1 className="text-2xl md:text-3xl font-bold bg-gradient-to-r from-pink-600 to-purple-600 bg-clip-text text-transparent">
                {t("dashboard.title")}
              </h1>
              
            </div>
          </div>
          <div className="flex items-center gap-2 order-1 md:order-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate("/sfida")}
              className="h-12 w-12"
              aria-label="Sfida"
            >
              <Trophy className="h-6 w-6 text-primary" />
            </Button>
            <InboxDropdown />
            <div id="credits-display">
              <CreditsDisplay />
            </div>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-3 mb-8">
          {/* User Profile Card - Redesigned */}
          <div id="user-profile-card" className="lg:col-span-1 h-full">
            {user && <UserProfileCard userId={user.id} />}
          </div>

          {/* Stats and Messages */}
          <div className="lg:col-span-2 space-y-6">
            {/* Stats Cards - Redesigned */}
            <div className="grid gap-4 md:grid-cols-2">
              {/* Matches Card */}
              <Card id="matches-card" className="relative overflow-hidden border-0 shadow-xl bg-gradient-to-br from-pink-500 to-rose-600 text-white group hover:shadow-2xl transition-all duration-300 hover:scale-[1.02]">
                {/* Card Background */}
                <div className="absolute inset-0 opacity-10" style={{
                backgroundImage: 'url(/images/love-background.png)',
                backgroundSize: 'cover',
                backgroundPosition: 'center'
              }} />
                <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4xIj48cGF0aCBkPSJNMzYgMzRjMC0yLjIxIDEuNzktNCA0LTRzNCAxLjc5IDQgNC0xLjc5IDQtNCA0LTQtMS43OS00LTR6bTAtMTBjMC0yLjIxIDEuNzktNCA0LTRzNCAxLjc5IDQgNC0xLjc5IDQtNCA0LTQtMS43OS00LTR6Ii8+PC9nPjwvZz48L3N2Zz4=')] opacity-20" />
                <CardHeader className="relative">
                  <CardTitle className="flex items-center gap-3 text-white">
                    <div className="p-2 bg-white/20 rounded-xl backdrop-blur-sm">
                      <Heart className="h-5 w-5" fill="white" />
                    </div>
                    <span className="font-bold">{t("dashboard.matches")}</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="relative">
                  <div className="text-6xl font-black mb-4 drop-shadow-lg">
                    {matches.length}
                  </div>
                  <Button className="w-full bg-white/20 hover:bg-white/30 backdrop-blur-sm border-0 text-white font-semibold shadow-lg group-hover:shadow-xl transition-all duration-300" onClick={() => navigate("/matches")}>
                    {t("dashboard.viewMatches")}
                    <Heart className="h-4 w-4 ml-2" />
                  </Button>
                </CardContent>
              </Card>

              {/* Likes Card */}
              <Card id="likes-card" className="relative overflow-hidden border-0 shadow-xl bg-gradient-to-br from-purple-500 to-indigo-600 text-white group hover:shadow-2xl transition-all duration-300 hover:scale-[1.02]">
                {/* Card Background */}
                <div className="absolute inset-0 opacity-10" style={{
                backgroundImage: 'url(/images/love-background.png)',
                backgroundSize: 'cover',
                backgroundPosition: 'center'
              }} />
                <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4xIj48cGF0aCBkPSJNMzYgMzRjMC0yLjIxIDEuNzktNCA0LTRzNCAxLjc5IDQgNC0xLjc5IDQtNCA0LTQtMS43OS00LTR6bTAtMTBjMC0yLjIxIDEuNzktNCA0LTRzNCAxLjc5IDQgNC0xLjc5IDQtNCA0LTQtMS43OS00LTR6Ii8+PC9nPjwvZz48L3N2Zz4=')] opacity-20" />
                <CardHeader className="relative">
                  <CardTitle className="flex items-center gap-3 text-white">
                    <div className="p-2 bg-white/20 rounded-xl backdrop-blur-sm">
                      <Sparkles className="h-5 w-5" />
                    </div>
                    <span className="font-bold">{t("dashboard.likesReceived")}</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="relative">
                  <div className="text-6xl font-black mb-4 drop-shadow-lg">
                    {likesReceived.length}
                  </div>
                  <Button className="w-full bg-white/20 hover:bg-white/30 backdrop-blur-sm border-0 text-white font-semibold shadow-lg group-hover:shadow-xl transition-all duration-300" onClick={() => navigate("/likes")}>
                    {t("dashboard.seeWhoLikes")}
                    <Sparkles className="h-4 w-4 ml-2" />
                  </Button>
                </CardContent>
              </Card>
            </div>

            {/* Discover and Support */}
            <div className="grid gap-4 md:grid-cols-2">
              {/* Discover Card */}
              <Card id="discover-card" className="relative overflow-hidden border-0 shadow-xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white group hover:shadow-2xl transition-all duration-300 hover:scale-[1.02] cursor-pointer" onClick={handleExploreClick}>
                {/* Card Background */}
                <div className="absolute inset-0 opacity-10" style={{
                backgroundImage: 'url(/images/love-background.png)',
                backgroundSize: 'cover',
                backgroundPosition: 'center'
              }} />
                <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4xIj48cGF0aCBkPSJNMzYgMzRjMC0yLjIxIDEuNzktNCA0LTRzNCAxLjc5IDQgNC0xLjc5IDQtNCA0LTQtMS43OS00LTR6bTAtMTBjMC0yLjIxIDEuNzktNCA0LTRzNCAxLjc5IDQgNC0xLjc5IDQtNCA0LTQtMS43OS00LTR6Ii8+PC9nPjwvZz48L3N2Zz4=')] opacity-20" />
                <CardHeader className="relative">
                  <CardTitle className="flex items-center gap-3 text-white">
                    <div className="p-2 bg-white/20 rounded-xl backdrop-blur-sm">
                      <Search className="h-5 w-5" />
                    </div>
                    <span className="font-bold">{t("dashboard.discover")}</span>
                  </CardTitle>
                  <CardDescription className="text-white/80">
                    {t("dashboard.discoverDescription")}
                  </CardDescription>
                </CardHeader>
                <CardContent className="relative flex flex-col">
                  <div className="flex-1 min-h-[76px]" />
                  <Button className="w-full bg-white/20 hover:bg-white/30 backdrop-blur-sm border-0 text-white font-semibold shadow-lg group-hover:shadow-xl transition-all duration-300">
                    {t("dashboard.exploreProfiles")}
                    <Users className="h-4 w-4 ml-2" />
                  </Button>
                </CardContent>
              </Card>
              
              {/* Support Card */}
              <Card id="support-card" className="relative overflow-hidden border-0 shadow-xl bg-gradient-to-br from-cyan-500 to-blue-600 text-white group hover:shadow-2xl transition-all duration-300 hover:scale-[1.02] cursor-pointer" onClick={() => navigate("/support")}>
                <div className="absolute inset-0 opacity-10" style={{
                backgroundImage: 'url(/images/love-background.png)',
                backgroundSize: 'cover',
                backgroundPosition: 'center'
              }} />
                <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4xIj48cGF0aCBkPSJNMzYgMzRjMC0yLjIxIDEuNzktNCA0LTRzNCAxLjc5IDQgNC0xLjc5IDQtNCA0LTQtMS43OS00LTR6bTAtMTBjMC0yLjIxIDEuNzktNCA0LTRzNCAxLjc5IDQgNC0xLjc5IDQtNCA0LTQtMS43OS00LTR6Ii8+PC9nPjwvZz48L3N2Zz4=')] opacity-20" />
                <CardHeader className="relative">
                  <CardTitle className="flex items-center gap-3 text-white">
                    <div className="p-2 bg-white/20 rounded-xl backdrop-blur-sm">
                      <MessageCircle className="h-5 w-5" />
                    </div>
                    <span className="font-bold">{t("dashboard.support")}</span>
                  </CardTitle>
                  <CardDescription className="text-white/80">
                    {t("dashboard.supportDescription")}
                  </CardDescription>
                </CardHeader>
                <CardContent className="relative">
                  <p className="text-white/90 mb-6">
                    {t("dashboard.contactSupport")}
                  </p>
                  <Button className="w-full bg-white/20 hover:bg-white/30 backdrop-blur-sm border-0 text-white font-semibold shadow-lg group-hover:shadow-xl transition-all duration-300">
                    {t("dashboard.sendMessage")}
                    <MessageCircle className="h-4 w-4 ml-2" />
                  </Button>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>

      {/* Geolocation Banner */}
      {showGeolocationBanner && <GeolocationBanner onActivate={handleActivateGeolocation} onClose={handleCloseGeolocationBanner} />}
    </div>;
};
export default Dashboard;