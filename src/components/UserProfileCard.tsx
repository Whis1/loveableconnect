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
  // Apertura del "Anteprima Profilo": mostra la card del proprio profilo
  // come la vedrebbero gli altri utenti dalla bacheca.
  const [showPreview, setShowPreview] = useState(false);
  const { translateText, translateArray } = useTextTranslation();

  useEffect(() => {
    const fetchCurrentUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        setCurrentUserId(session.user.id);
      }
    };
    fetchCurrentUser();
  }, []);

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
          {/* Avatar with gradient border */}
          <div className="relative">
            <div className="absolute inset-0 bg-gradient-to-br from-pink-500 via-purple-500 to-indigo-500 rounded-full blur-md opacity-50 animate-pulse" />
            <Avatar className="h-36 w-36 border-4 border-white dark:border-gray-800 shadow-2xl relative">
              <AvatarImage src={avatarUrl || undefined} />
              <AvatarFallback className="text-5xl font-bold bg-gradient-to-br from-pink-500 to-purple-600 text-white">
                {profile.nickname?.charAt(0) || profile.full_name?.charAt(0)}
              </AvatarFallback>
            </Avatar>
          </div>

          {/* Nickname */}
          <div className="space-y-1">
            <h2 className="text-3xl font-black bg-gradient-to-r from-pink-600 via-purple-600 to-indigo-600 bg-clip-text text-transparent">
              {profile.nickname}
            </h2>
          </div>
        </div>

        {/* Blocco inferiore: i due pulsanti centrati verticalmente nello
            spazio rimasto, larghi quanto basta al loro contenuto (non a
            tutta la larghezza del pannello). */}
        <div className="flex-1 flex flex-col items-center justify-center gap-3 pt-8">
          {/* Edit Button — gradiente rosa→viola, larghezza auto */}
          <Button
            onClick={() => navigate("/profile/edit")}
            className="px-6 bg-gradient-to-r from-pink-500 via-purple-500 to-indigo-500 hover:from-pink-600 hover:via-purple-600 hover:to-indigo-600 text-white font-semibold shadow-lg hover:shadow-xl transition-all duration-300 border-0"
          >
            <Edit className="h-4 w-4 mr-2" />
            {t("dashboard.editProfile")}
          </Button>

          {/* Anteprima Profilo: stesso gradiente del bottone Modifica
              Profilo (richiesta dell'utente), si distingue solo per
              l'icona occhio. */}
          <Button
            onClick={() => setShowPreview(true)}
            className="px-6 bg-gradient-to-r from-pink-500 via-purple-500 to-indigo-500 hover:from-pink-600 hover:via-purple-600 hover:to-indigo-600 text-white font-semibold shadow-lg hover:shadow-xl transition-all duration-300 border-0"
          >
            <Eye className="h-4 w-4 mr-2" />
            Anteprima Profilo
          </Button>
        </div>
      </CardContent>

      {/* Dialog: stesso ProfileDialog usato in bacheca/likes, mostra il
          profilo completo (foto, bio, interessi, canzoni preferite, ecc.) */}
      {showPreview && currentUserId && (
        <ProfileDialog
          profileId={userId}
          currentUserId={currentUserId}
          open={showPreview}
          onOpenChange={setShowPreview}
        />
      )}
    </Card>
  );
};
