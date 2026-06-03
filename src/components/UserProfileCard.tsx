import { useNavigate } from "react-router-dom";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Edit, MapPin, Heart, Music, Eye } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useTextTranslation } from "@/hooks/useTranslation";
import profileBackground from "@/assets/profile-background.png";
import { useAdminRole } from "@/hooks/useAdminRole";
import { SpotifySongCard } from "@/components/SpotifySongCard";
import { calculateAge } from "@/lib/utils";
import { ProfileDialog } from "@/components/ProfileDialog";
import { ProfileGridCard } from "@/components/ProfileGridCard";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Loader2, UserSquare2, LayoutGrid, Sparkles } from "lucide-react";
import { ProfileCustomizationDialog } from "@/components/ProfileCustomizationDialog";
import { getProfileTheme, type ProfileThemeId } from "@/lib/profileThemes";
import { PremiumBadge } from "@/components/PremiumBadge";

interface Profile {
  id: string;
  full_name: string;
  nickname: string;
  bio: string | null;
  age: number | null;
  birthdate: string | null;
  gender: string | null;
  sexual_orientation: string | null;
  city: string | null;
  interests: string[] | null;
  avatar_url: string | null;
  relationship_type: string | null;
  relationship_status: string | null;
  favorite_songs: any[] | null;
  translatedBio?: string | null;
  translatedInterests?: string[] | null;
  profile_theme?: string | null;
}

interface UserProfileCardProps {
  userId: string;
}

export const UserProfileCard = ({ userId }: UserProfileCardProps) => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { isAdmin, loading: adminLoading } = useAdminRole();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [translatedBio, setTranslatedBio] = useState<string>('');
  const [translatedInterests, setTranslatedInterests] = useState<string[]>([]);
  // Anteprima profilo: scelta tra "Interno" (ProfileDialog) ed "Esterno"
  // (la card della bacheca, come la vedono gli altri utenti).
  const [showChooser, setShowChooser] = useState(false);
  const [showPreview, setShowPreview] = useState(false); // interno
  const [showExternal, setShowExternal] = useState(false); // esterno (card bacheca)
  const [externalProfile, setExternalProfile] = useState<any>(null);
  const [externalLoading, setExternalLoading] = useState(false);
  // Personalizzazione (temi estetici) — riservata agli abbonati Premium.
  const [showCustomize, setShowCustomize] = useState(false);
  const [isPremium, setIsPremium] = useState(false);
  const { translateText, translateArray } = useTextTranslation();

  // Tema estetico selezionato dall'utente (salvato in profiles.profile_theme).
  const selfTheme = getProfileTheme((profile as any)?.profile_theme);

  // Carica il profilo completo (dal DB) e apre l'anteprima della card esterna.
  const openExternalPreview = async () => {
    setShowChooser(false);
    setShowExternal(true);
    if (externalProfile) return; // gia' caricato
    setExternalLoading(true);
    try {
      const { data } = await supabase.from("profiles").select("*").eq("id", userId).single();
      setExternalProfile(data);
    } catch (e) {
      console.warn("Errore caricamento profilo esterno:", e);
    } finally {
      setExternalLoading(false);
    }
  };

  useEffect(() => {
    const fetchCurrentUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        setCurrentUserId(session.user.id);
      }
    };
    fetchCurrentUser();
  }, []);

  // Stato Premium dell'utente: serve a sbloccare i temi estetici.
  useEffect(() => {
    let active = true;
    (async () => {
      const { data } = await supabase
        .from("user_credits")
        .select("is_premium, premium_expires_at")
        .eq("user_id", userId)
        .maybeSingle();
      if (!active) return;
      const prem = !!(
        data?.is_premium &&
        (!data.premium_expires_at || new Date(data.premium_expires_at) > new Date())
      );
      setIsPremium(prem);
    })();
    return () => {
      active = false;
    };
  }, [userId]);

  useEffect(() => {
    let cancelled = false;
    let retryTimer: ReturnType<typeof setTimeout>;

    const applyProfile = (data: any) => {
      setProfile({
        ...data,
        favorite_songs: data.favorite_songs as any[] | null,
      });
      if (data.avatar_url) {
        const { data: urlData } = supabase.storage
          .from("profile-images")
          .getPublicUrl(data.avatar_url);
        setAvatarUrl(urlData.publicUrl);
      } else {
        setAvatarUrl(null);
      }
    };

    // Caricamento del profilo con timeout + retry: se una query si blocca,
    // viene riprovata con una richiesta nuova invece di restare in attesa.
    const fetchProfile = async (attempt = 0) => {
      try {
        const result = (await Promise.race([
          supabase.from("profiles").select("*").eq("id", userId).maybeSingle(),
          new Promise((_, reject) => setTimeout(() => reject(new Error("timeout")), 6000)),
        ])) as { data: any; error: unknown };
        if (cancelled) return;
        if (result.error) throw result.error;
        if (result.data) {
          applyProfile(result.data);
          return;
        }
        if (attempt < 6) retryTimer = setTimeout(() => fetchProfile(attempt + 1), 1500);
      } catch {
        if (cancelled) return;
        if (attempt < 6) retryTimer = setTimeout(() => fetchProfile(attempt + 1), 1500);
      }
    };

    fetchProfile();

    // Subscribe to profile changes
    const channel = supabase
      .channel(`user-profile-card-${userId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'profiles',
          filter: `id=eq.${userId}`
        },
        (payload) => {
          const updatedProfile = {
            ...payload.new,
            favorite_songs: payload.new.favorite_songs as any[] | null
          } as Profile;
          setProfile(updatedProfile);

          if (updatedProfile.avatar_url) {
            const { data: urlData } = supabase.storage
              .from('profile-images')
              .getPublicUrl(updatedProfile.avatar_url);
            setAvatarUrl(urlData.publicUrl);
          } else {
            setAvatarUrl(null);
          }
        }
      )
      .subscribe();

    return () => {
      cancelled = true;
      clearTimeout(retryTimer);
      supabase.removeChannel(channel);
    };
  }, [userId]);

  useEffect(() => {
    const loadTranslations = async () => {
      // Use pre-translated data if available
      if (profile?.translatedBio) {
        setTranslatedBio(profile.translatedBio);
      } else if (profile?.bio) {
        const translated = await translateText(profile.bio);
        setTranslatedBio(translated);
      }
      
      if (profile?.translatedInterests) {
        setTranslatedInterests(profile.translatedInterests);
      } else if (profile?.interests) {
        const translated = await translateArray(profile.interests);
        setTranslatedInterests(translated);
      }
    };
    loadTranslations();
  }, [profile?.bio, profile?.interests, profile?.translatedBio, profile?.translatedInterests]);

  const getRelationshipTypeLabel = (type: string) => {
    const key = type.toLowerCase();
    const labels: Record<string, string> = {
      serious: t('profile.seriousRelationship'),
      'relazione seria': t('profile.seriousRelationship'),
      'serious relationship': t('profile.seriousRelationship'),
      casual: t('profile.casualDating'),
      'incontri casuali': t('profile.casualDating'),
      'casual dating': t('profile.casualDating'),
      friendship: t('profile.friendship'),
      amicizia: t('profile.friendship'),
      open: t('common.openRelationship'),
      'relazione aperta': t('common.openRelationship'),
      'open relationship': t('common.openRelationship'),
      'prefer-not-say': t('common.preferNotSay'),
      'prefer_not_say': t('common.preferNotSay'),
      'preferisco non dirlo': t('common.preferNotSay'),
      'preferisco_non_dirlo': t('common.preferNotSay'),
      'not-sure': t('common.notSure'),
      'not_sure': t('common.notSure'),
      'not sure': t('common.notSure'),
      'non specifico': t('common.notSure'),
    };
    return labels[key] || type;
  };

  const getRelationshipStatusLabel = (status: string) => {
    const key = status.toLowerCase();
    const labels: Record<string, string> = {
      single: t('common.single'),
      sposato: t('common.married'),
      sposata: t('common.married'),
      'sposato/a': t('common.married'),
      married: t('common.married'),
      divorced: t('common.divorced'),
      divorziato: t('common.divorced'),
      divorziata: t('common.divorced'),
      'divorziato/a': t('common.divorced'),
      widowed: t('common.widowed'),
      vedovo: t('common.widowed'),
      vedova: t('common.widowed'),
      'vedovo/a': t('common.widowed'),
      in_relationship: t('common.inRelationship'),
      fidanzato: t('common.inRelationship'),
      fidanzata: t('common.inRelationship'),
      'fidanzato/a': t('common.inRelationship'),
      'in una relazione': t('common.inRelationship'),
      prefer_not_say: t('common.preferNotSay'),
      preferisco_non_dirlo: t('common.preferNotSay'),
      'preferisco non dirlo': t('common.preferNotSay'),
      scoprilo: t('common.notSpecified'),
    };
    return labels[key] || status;
  };

  // Mentre il profilo carica, mostra comunque il pannello (scheletro): così
  // non "sparisce" mai dalla home.
  if (!profile) {
    return (
      <Card className="h-full flex flex-col overflow-hidden relative border-0 shadow-xl bg-gradient-to-br from-white/90 to-white/70 dark:from-gray-900/90 dark:to-gray-900/70 backdrop-blur-sm">
        <div
          className="absolute inset-0 w-full h-full"
          style={{
            backgroundImage: `url(${profileBackground})`,
            backgroundSize: "cover",
            backgroundPosition: "center",
            opacity: 0.15,
          }}
        />
        <CardContent className="p-8 relative z-10 flex-1 flex flex-col">
          <div className="flex flex-col items-center text-center space-y-6">
            <div className="h-36 w-36 rounded-full bg-muted/60 animate-pulse" />
            <div className="h-8 w-40 rounded-lg bg-muted/60 animate-pulse" />
          </div>
          <div className="flex-1 flex flex-col items-center justify-center gap-3 pt-8">
            <Button
              onClick={() => navigate("/profile/edit")}
              className="px-6 bg-gradient-to-r from-pink-500 via-purple-500 to-indigo-500 hover:from-pink-600 hover:via-purple-600 hover:to-indigo-600 text-white font-semibold shadow-lg hover:shadow-xl transition-all duration-300 border-0"
            >
              <Edit className="h-4 w-4 mr-2" />
              {t("dashboard.editProfile")}
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  // favoriteSongs non e' piu' usata qui: le canzoni vengono mostrate nel
  // dialog "Anteprima Profilo" che riusa ProfileDialog.

  return (
    <Card className="h-full flex flex-col overflow-hidden relative border-0 shadow-xl bg-gradient-to-br from-white/90 to-white/70 dark:from-gray-900/90 dark:to-gray-900/70 backdrop-blur-sm">
      <div
        className="absolute inset-0 w-full h-full"
        style={{
          backgroundImage: `url(${profileBackground})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          opacity: 0.15
        }}
      />

      {/* CardContent occupa tutta l'altezza disponibile: il pannello del
          profilo cosi' arriva fino al bordo basso della riga della griglia,
          allineato con i pannelli a destra. */}
      <CardContent className="p-8 relative z-10 flex-1 flex flex-col">
        {/* Blocco superiore: avatar + nickname, ancorato in alto */}
        <div className="flex flex-col items-center text-center space-y-6">
          {/* Avatar with gradient border (+ eventuale tema estetico) */}
          <div className="relative">
            <div className="absolute inset-0 bg-gradient-to-br from-pink-500 via-purple-500 to-indigo-500 rounded-full blur-md opacity-50 animate-pulse" />
            <div className={selfTheme.avatarClass}>
              <Avatar className={`h-36 w-36 border-4 shadow-2xl relative ${selfTheme.avatarClass ? "border-transparent" : "border-white dark:border-gray-800"}`}>
                <AvatarImage src={avatarUrl || undefined} />
                <AvatarFallback className="text-5xl font-bold bg-gradient-to-br from-pink-500 to-purple-600 text-white">
                  {profile.nickname?.charAt(0) || profile.full_name?.charAt(0)}
                </AvatarFallback>
              </Avatar>
            </div>
          </div>

          {/* Nickname (+ badge Premium per gli abbonati) */}
          <div className="space-y-2 flex flex-col items-center">
            <h2
              className={`text-3xl font-black ${
                selfTheme.nameClass ||
                "bg-gradient-to-r from-pink-600 via-purple-600 to-indigo-600 bg-clip-text text-transparent"
              }`}
            >
              {profile.nickname}
            </h2>
            {selfTheme.badge && <PremiumBadge />}
          </div>
        </div>

        {/* Blocco inferiore: i due pulsanti centrati verticalmente nello
            spazio rimasto. */}
        <div className="flex-1 flex flex-col items-center justify-center pt-8">
          {/* 📐 Wrapper w-fit: prende la larghezza del pulsante PIÙ LARGO; i due
              bottoni con w-full diventano così identici di larghezza, a
              prescindere dalla lunghezza del testo (anche in altre lingue). */}
          <div className="flex flex-col items-stretch gap-3 w-fit">
            {/* Edit Button — gradiente rosa→viola */}
            <Button
              onClick={() => navigate("/profile/edit")}
              className="w-full px-6 bg-gradient-to-r from-pink-500 via-purple-500 to-indigo-500 hover:from-pink-600 hover:via-purple-600 hover:to-indigo-600 text-white font-semibold shadow-lg hover:shadow-xl transition-all duration-300 border-0"
            >
              <Edit className="h-4 w-4 mr-2" />
              {t("dashboard.editProfile")}
            </Button>

            {/* Anteprima Profilo: stesso gradiente del bottone Modifica
                Profilo (richiesta dell'utente), si distingue solo per
                l'icona occhio. */}
            <Button
              onClick={() => setShowChooser(true)}
              className="w-full px-6 bg-gradient-to-r from-pink-500 via-purple-500 to-indigo-500 hover:from-pink-600 hover:via-purple-600 hover:to-indigo-600 text-white font-semibold shadow-lg hover:shadow-xl transition-all duration-300 border-0"
            >
              <Eye className="h-4 w-4 mr-2" />
              Anteprima Profilo
            </Button>

            {/* Personalizzazione: temi estetici del profilo (Premium). */}
            <Button
              onClick={() => setShowCustomize(true)}
              className="w-full px-6 bg-gradient-to-r from-pink-500 via-purple-500 to-indigo-500 hover:from-pink-600 hover:via-purple-600 hover:to-indigo-600 text-white font-semibold shadow-lg hover:shadow-xl transition-all duration-300 border-0"
            >
              <Sparkles className="h-4 w-4 mr-2" />
              Personalizzazione
            </Button>
          </div>
        </div>
      </CardContent>

      {/* Pannello scelta: Profilo Interno o Profilo Esterno (tema sito) */}
      <Dialog open={showChooser} onOpenChange={setShowChooser}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-center gap-2 text-xl">
              <Eye className="h-5 w-5 text-primary" />
              <span className="bg-gradient-to-r from-pink-600 via-purple-600 to-indigo-600 bg-clip-text text-transparent font-extrabold">
                Anteprima profilo
              </span>
            </DialogTitle>
            {/* descrizione nascosta solo per accessibilità */}
            <DialogDescription className="sr-only">
              Scegli come vedere il tuo profilo
            </DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
            <button
              type="button"
              onClick={() => { setShowChooser(false); setShowPreview(true); }}
              className="group flex flex-col items-center gap-3 rounded-2xl border-2 border-transparent bg-gradient-to-br from-pink-500/10 via-purple-500/10 to-indigo-500/10 p-6 text-center transition-all hover:border-primary/40 hover:from-pink-500/20 hover:via-purple-500/20 hover:to-indigo-500/20 hover:shadow-lg"
            >
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-pink-500 via-purple-500 to-indigo-500 text-white shadow-md transition-transform group-hover:scale-110">
                <UserSquare2 className="h-7 w-7" />
              </div>
              <span className="font-bold bg-gradient-to-r from-pink-600 via-purple-600 to-indigo-600 bg-clip-text text-transparent">
                Profilo Interno
              </span>
            </button>
            <button
              type="button"
              onClick={openExternalPreview}
              className="group flex flex-col items-center gap-3 rounded-2xl border-2 border-transparent bg-gradient-to-br from-pink-500/10 via-purple-500/10 to-indigo-500/10 p-6 text-center transition-all hover:border-primary/40 hover:from-pink-500/20 hover:via-purple-500/20 hover:to-indigo-500/20 hover:shadow-lg"
            >
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-pink-500 via-purple-500 to-indigo-500 text-white shadow-md transition-transform group-hover:scale-110">
                <LayoutGrid className="h-7 w-7" />
              </div>
              <span className="font-bold bg-gradient-to-r from-pink-600 via-purple-600 to-indigo-600 bg-clip-text text-transparent">
                Profilo Esterno
              </span>
            </button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Anteprima INTERNA: stesso ProfileDialog usato in bacheca/likes. */}
      {showPreview && currentUserId && (
        <ProfileDialog
          profileId={userId}
          currentUserId={currentUserId}
          open={showPreview}
          onOpenChange={setShowPreview}
        />
      )}

      {/* Anteprima ESTERNA: la card della bacheca, sola lettura. */}
      <Dialog open={showExternal} onOpenChange={setShowExternal}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Come ti vedono nella bacheca profili</DialogTitle>
            <DialogDescription className="sr-only">Anteprima della tua card di bacheca</DialogDescription>
          </DialogHeader>
          {externalLoading || !externalProfile || !currentUserId ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            // pointer-events-none: anteprima puramente visiva (niente like/chat su se stessi).
            <div className="pointer-events-none select-none">
              <ProfileGridCard
                profile={externalProfile}
                currentUserId={currentUserId}
                onLike={() => {}}
              />
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Pannello Personalizzazione: temi estetici con anteprime live. */}
      {showCustomize && profile && currentUserId && (
        <ProfileCustomizationDialog
          open={showCustomize}
          onOpenChange={setShowCustomize}
          userId={userId}
          profile={profile}
          currentUserId={currentUserId}
          nickname={profile.nickname}
          avatarUrl={avatarUrl}
          city={profile.city}
          age={profile.age ?? (profile.birthdate ? calculateAge(profile.birthdate) : null)}
          isPremium={isPremium || isAdmin}
          currentTheme={((profile as any).profile_theme as ProfileThemeId) || "none"}
          onSaved={(themeId) =>
            setProfile((p) => (p ? ({ ...p, profile_theme: themeId } as Profile) : p))
          }
        />
      )}
    </Card>
  );
};
