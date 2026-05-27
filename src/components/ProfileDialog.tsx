import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useTextTranslation } from "@/hooks/useTranslation";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { MapPin, User } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { getGenericLocationPhrase } from "@/lib/utils";
import profileBadge from "@/assets/profile-badge.png";
import { SpotifySongCard } from "./SpotifySongCard";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Music } from "lucide-react";

interface Profile {
  id: string;
  full_name: string;
  nickname: string;
  bio: string | null;
  age: number | null;
  birthdate: string | null;
  gender: string | null;
  city: string | null;
  interests: string[] | null;
  avatar_url: string | null;
  photos: string[] | null;
  relationship_type: string | null;
  sexual_orientation: string | null;
  relationship_status: string | null;
  looking_for: string[] | null;
  translatedBio?: string | null;
  translatedInterests?: string[] | null;
  favorite_songs?: any[] | null;
}

interface ProfileDialogProps {
  profileId: string;
  currentUserId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  // 🚀 Pre-load: passando i dati già caricati nella card della bacheca,
  // il dialog si apre ISTANTANEO senza fare un'altra query. Risolve il
  // problema "skeleton vuoto per minuti" quando la rete è satura.
  initialProfile?: Partial<Profile> & { id: string };
}

export const ProfileDialog = ({
  profileId,
  currentUserId,
  open,
  onOpenChange,
  initialProfile,
}: ProfileDialogProps) => {
  const { t } = useTranslation();
  const [profile, setProfile] = useState<Profile | null>(
    initialProfile ? (initialProfile as Profile) : null
  );
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [photoUrls, setPhotoUrls] = useState<string[]>([]);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [translatedBio, setTranslatedBio] = useState<string>('');
  const [translatedInterests, setTranslatedInterests] = useState<string[]>([]);
  const { translateText, translateArray } = useTextTranslation();

  useEffect(() => {
    if (!open || !profileId) return;

    // 🚀 Se abbiamo già un initialProfile completo (con bio, photos, ecc.),
    //    saltiamo del tutto la query e generiamo subito gli avatar URL.
    //    Il dialog appare ISTANTANEO. Facciamo comunque una fetch in
    //    background per i campi che potrebbero mancare (favorite_songs).
    if (initialProfile && initialProfile.id === profileId) {
      setProfile(initialProfile as Profile);
      if (initialProfile.avatar_url) {
        const { data: urlData } = supabase.storage
          .from("profile-images")
          .getPublicUrl(initialProfile.avatar_url);
        setAvatarUrl(urlData.publicUrl);
      }
      if (initialProfile.photos && initialProfile.photos.length > 0) {
        const urls = initialProfile.photos.map((photo: string) => {
          const { data: urlData } = supabase.storage
            .from("profile-images")
            .getPublicUrl(photo);
          return urlData.publicUrl;
        });
        setPhotoUrls(urls);
      }
    }

    const fetchProfile = async () => {
      // Timeout sulla fetch: se la query si pianta (es. cold start
      // Supabase), il dialog non resta vuoto in eterno.
      const result = (await Promise.race([
        supabase.from("profiles").select("*").eq("id", profileId).single(),
        new Promise((resolve) =>
          setTimeout(() => resolve({ data: null, error: { message: "profile_dialog_timeout" } }), 8000)
        ),
      ])) as { data: any; error: any };
      const data = result.data;

      if (data) {
        // Parse favorite_songs from Json
        const favoriteSongs = data.favorite_songs
          ? (Array.isArray(data.favorite_songs) ? data.favorite_songs : [])
          : null;
        
        setProfile({
          ...data,
          favorite_songs: favoriteSongs
        });
        
        // Get avatar URL
        if (data.avatar_url) {
          const { data: urlData } = supabase.storage
            .from("profile-images")
            .getPublicUrl(data.avatar_url);
          setAvatarUrl(urlData.publicUrl);
        }

        // Get photo URLs
        if (data.photos && data.photos.length > 0) {
          const urls = data.photos.map((photo: string) => {
            const { data: urlData } = supabase.storage
              .from("profile-images")
              .getPublicUrl(photo);
            return urlData.publicUrl;
          });
          setPhotoUrls(urls);
        }
      }
    };

    fetchProfile();

    // Subscribe to profile changes
    const channel = supabase
      .channel(`profile-dialog-${profileId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'profiles',
          filter: `id=eq.${profileId}`
        },
        (payload) => {
          console.log('Profile updated in dialog:', payload.new);
          const updatedProfile = payload.new as any;
          
          // Parse favorite_songs from Json
          const favoriteSongs = updatedProfile.favorite_songs
            ? (Array.isArray(updatedProfile.favorite_songs) ? updatedProfile.favorite_songs : [])
            : null;
          
          setProfile({
            ...updatedProfile,
            favorite_songs: favoriteSongs
          });
          
          // Update avatar URL if changed
          if (updatedProfile.avatar_url) {
            const { data: urlData } = supabase.storage
              .from("profile-images")
              .getPublicUrl(updatedProfile.avatar_url);
            setAvatarUrl(urlData.publicUrl);
          }
          
          // Update photo URLs if changed
          if (updatedProfile.photos && updatedProfile.photos.length > 0) {
            const urls = updatedProfile.photos.map((photo: string) => {
              const { data: urlData } = supabase.storage
                .from("profile-images")
                .getPublicUrl(photo);
              return urlData.publicUrl;
            });
            setPhotoUrls(urls);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [profileId, currentUserId, open]);

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

  const getGenderLabel = (gender: string | null | undefined) => {
    if (!gender) return t('common.notSpecified');
    const key = gender.toLowerCase();
    const labels: Record<string, string> = {
      male: t('common.male'),
      uomo: t('common.male'),
      female: t('common.female'),
      donna: t('common.female'),
      transgender: t('common.transgender'),
      transexual: t('common.transexual'),
      transessuale: t('common.transexual'),
      genderfluid: t('common.genderfluid'),
      "non-binary": t('common.nonBinary'),
      "non binario": t('common.nonBinary'),
      other: t('common.other'),
      altro: t('common.other'),
    };
    return labels[key] || gender;
  };

  const getOrientationLabel = (orientation: string | null | undefined) => {
    if (!orientation) return t('common.notSpecified');
    const key = orientation.toLowerCase();
    const labels: Record<string, string> = {
      heterosexual: t('common.heterosexual'),
      eterosessuale: t('common.heterosexual'),
      homosexual: t('common.homosexual'),
      omosessuale: t('common.homosexual'),
      bisexual: t('common.bisexual'),
      bisessuale: t('common.bisexual'),
      pansexual: t('common.pansexual'),
      pansessuale: t('common.pansexual'),
      asexual: t('common.asexual'),
      asessuale: t('common.asexual'),
      other: t('common.other'),
      altro: t('common.other'),
    };
    return labels[key] || orientation;
  };
  const getRelationshipTypeLabel = (type: string | null | undefined) => {
    if (!type) return t('common.notSpecified');
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

  const getRelationshipStatusLabel = (status: string | null | undefined) => {
    if (!status) return t('common.notSpecified');
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

  // PRIMA c'era "if (!profile) return null;" qui. Era un bug: se la fetch
  // del profilo era lenta o si piantava, il dialog non si apriva per niente
  // anche se open=true → l'utente cliccava sulla card e NON succedeva
  // nulla. Adesso il dialog si apre comunque mostrando uno scheletro.
  if (!open) return null;

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent
          className="max-w-3xl max-h-[90vh] overflow-y-auto p-0 bg-gradient-to-br from-background via-background to-primary/5"
        >
          <DialogTitle className="sr-only">Profilo utente</DialogTitle>
          <DialogDescription className="sr-only">Dettagli del profilo e azioni</DialogDescription>

          {/* Scheletro mostrato finche' la fetch del profilo non completa */}
          {!profile && (
            <div className="p-8 space-y-4">
              <div className="flex flex-col items-center gap-4">
                <div className="w-72 h-80 rounded-3xl bg-muted/40 animate-pulse" />
                <div className="h-7 w-40 rounded-md bg-muted/40 animate-pulse" />
                <div className="flex gap-2">
                  <div className="h-7 w-20 rounded-full bg-muted/40 animate-pulse" />
                  <div className="h-7 w-24 rounded-full bg-muted/40 animate-pulse" />
                  <div className="h-7 w-28 rounded-full bg-muted/40 animate-pulse" />
                </div>
              </div>
              <div className="h-24 rounded-2xl bg-muted/30 animate-pulse" />
              <div className="h-24 rounded-2xl bg-muted/30 animate-pulse" />
            </div>
          )}

          {/* Contenuto vero del profilo quando i dati sono pronti */}
          {profile && (
          <>
          {/* Hero Section with Avatar Rectangle */}
          <div className="relative p-6 bg-gradient-to-br from-primary/20 via-primary/10 to-background overflow-hidden">
            <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxwYXRoIGQ9Ik0zNiAxOGMzLjMxNCAwIDYgMi42ODYgNiA2cy0yLjY4NiA2LTYgNi02LTIuNjg2LTYtNiAyLjY4Ni02IDYtNnoiIHN0cm9rZT0iY3VycmVudENvbG9yIiBzdHJva2Utb3BhY2l0eT0iLjEiLz48L2c+PC9zdmc+')] opacity-20"></div>
            
            {/* Avatar Rectangle */}
            <div className="relative flex flex-col items-center">
              <div className="relative group">
                {/* Main Rectangle Card */}
                <div 
                  className="relative w-72 h-80 rounded-3xl border-4 border-background shadow-2xl overflow-hidden bg-gradient-to-br from-primary/20 to-primary/5 transform transition-transform duration-300 group-hover:scale-105 cursor-pointer"
                  onClick={() => avatarUrl && setSelectedImage(avatarUrl)}
                >
                  {avatarUrl ? (
                    <img
                      src={avatarUrl}
                      alt={profile.nickname}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <span className="text-8xl font-bold text-primary/40">
                        {profile.nickname?.charAt(0) || profile.full_name?.charAt(0)}
                      </span>
                    </div>
                  )}
                  {/* Gradient Overlay */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent"></div>
                </div>
                
                {/* Profile Badge */}
                <div className="absolute -top-4 -right-4 w-14 h-14 rounded-2xl shadow-2xl rotate-12 group-hover:rotate-0 transition-transform duration-300 overflow-hidden">
                  <img src={profileBadge} alt="Profile Badge" className="w-full h-full object-contain" />
                </div>
                
                {/* Decorative Corner Elements */}
                <div className="absolute -bottom-2 -left-2 w-12 h-12 bg-primary/20 rounded-full blur-xl"></div>
                <div className="absolute -top-2 -right-2 w-12 h-12 bg-primary/20 rounded-full blur-xl"></div>
              </div>
            </div>
          </div>

          {/* Content */}
          <div className="px-6 pb-6 space-y-6 mt-6">
            {/* Name and Basic Info */}
            <div className="text-center space-y-3">
              <h2 className="text-3xl font-bold bg-gradient-to-r from-primary via-primary/80 to-primary bg-clip-text text-transparent">
                {profile.nickname || profile.full_name}
              </h2>
              
              {/* Age, Gender, Orientation Pills */}
              <div className="flex items-center justify-center gap-2 flex-wrap">
                {profile.age && (
                  <div className="px-4 py-1.5 rounded-full bg-primary/10 text-primary font-semibold text-sm">
                    {profile.age} {t('userProfile.years')}
                  </div>
                )}
                <div className="px-4 py-1.5 rounded-full bg-gradient-to-r from-blue-500/10 to-blue-600/10 text-blue-600 dark:text-blue-400 font-semibold text-sm">
                  <User className="h-3.5 w-3.5 inline mr-1" />
                  {getGenderLabel(profile.gender)}
                </div>
                <div className="px-4 py-1.5 rounded-full bg-gradient-to-r from-pink-500/10 to-purple-600/10 text-pink-600 dark:text-pink-400 font-semibold text-sm">
                  <User className="h-3.5 w-3.5 inline mr-1" />
                  {getOrientationLabel(profile.sexual_orientation)}
                </div>
              </div>

              {/* Location: il "vicino alle tue parti" e' una frase generica
                  pensata per quando un utente guarda IL PROFILO DI UN ALTRO.
                  Se invece l'utente sta guardando il proprio profilo
                  (anteprima dalla home), nascondiamo questa riga perche'
                  e' bruttina e priva di senso ("sei vicino a te stesso?"). */}
              {profileId !== currentUserId && (
                <div className="flex items-center justify-center gap-2 text-muted-foreground">
                  <MapPin className="h-4 w-4" />
                  <span className="text-sm">{getGenericLocationPhrase()}</span>
                </div>
              )}
            </div>

            {/* Photo Gallery */}
            {photoUrls.length > 0 && (
              <div className="bg-gradient-to-br from-card to-card/50 rounded-2xl p-5 shadow-sm border border-border/50">
                <h3 className="font-semibold text-lg mb-4">Galleria Foto</h3>
                <div className="grid grid-cols-3 gap-3">
                  {photoUrls.map((url, index) => (
                    <div
                      key={index}
                      className="relative aspect-square rounded-xl overflow-hidden cursor-pointer group"
                      onClick={() => setSelectedImage(url)}
                    >
                      <img
                        src={url}
                        alt={`Foto ${index + 1}`}
                        className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
                      />
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors" />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Bio Section */}
            {profile.bio && (
              <div className="bg-gradient-to-br from-card to-card/50 rounded-2xl p-5 shadow-sm border border-border/50">
                <h3 className="font-semibold text-lg mb-3 flex items-center gap-2">
                  <User className="h-5 w-5 text-primary" />
                  Bio
                </h3>
                <p className="text-muted-foreground leading-relaxed italic">
                  "{translatedBio || profile.bio}"
                </p>
              </div>
            )}

            {/* Relationship Status Section */}
            <div className="bg-gradient-to-br from-card to-card/50 rounded-2xl p-5 shadow-sm border border-border/50">
              <h3 className="font-semibold text-lg mb-3 flex items-center gap-2">
                <User className="h-5 w-5 text-primary" />
                {t('common.relationshipStatus')}
              </h3>
              <div className="text-base font-medium">
                {getRelationshipStatusLabel(profile.relationship_status)}
              </div>
            </div>

            {/* Looking For Section */}
            <div className="bg-gradient-to-br from-primary/5 to-primary/10 rounded-2xl p-5 shadow-sm border border-primary/20">
              <h3 className="font-semibold text-lg mb-3 flex items-center gap-2">
                <User className="h-5 w-5 text-primary" />
                {t('common.lookingFor')}
              </h3>
              {/* Filtra vecchi valori italiani salvati erroneamente in
                  looking_for (che dovrebbe contenere solo generi), per
                  evitare la duplicazione "Relazione seria • Relazione seria". */}
              {(() => {
                const OLD_STRINGS = new Set([
                  "Relazione seria", "Incontri casuali", "Amicizia",
                  "Non specifico", "Non specificato", "Preferisco non dirlo",
                ]);
                const cleanLookingFor = (profile.looking_for || []).filter(
                  (item) => item && !OLD_STRINGS.has(item)
                );
                const hasLookingFor = cleanLookingFor.length > 0;
                return (
              <div className="space-y-2">
                {hasLookingFor || profile.relationship_type ? (
                  <>
                    {hasLookingFor && (
                      <div className="text-base font-medium text-primary">
                        {cleanLookingFor.map((item) => getGenderLabel(item)).join(", ")}
                      </div>
                    )}
                    {profile.relationship_type && (
                      <div className="text-sm text-muted-foreground">
                        {getRelationshipTypeLabel(profile.relationship_type)}
                      </div>
                    )}
                  </>
                ) : (
                  <div className="text-base font-medium text-muted-foreground">
                    {t('common.notSpecified')}
                  </div>
                )}
              </div>
                );
              })()}
            </div>

            {/* Interests Section */}
            {profile.interests && profile.interests.length > 0 && (
              <div className="bg-gradient-to-br from-card to-card/50 rounded-2xl p-5 shadow-sm border border-border/50">
                <h3 className="font-semibold text-lg mb-4">{t('common.interests')}</h3>
                <div className="flex flex-wrap gap-2">
                  {(translatedInterests.length > 0 ? translatedInterests : profile.interests).map((interest, index) => (
                    <span
                      key={index}
                      className="px-4 py-2 rounded-full bg-primary/10 hover:bg-primary/20 transition-colors text-sm font-medium"
                    >
                      {interest}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Favorite Songs */}
            {profile.favorite_songs && profile.favorite_songs.length > 0 && (
              <div className="bg-gradient-to-br from-card to-card/50 rounded-2xl p-5 shadow-sm border border-border/50">
                <h3 className="font-semibold text-lg mb-4 flex items-center gap-2">
                  <Music className="h-5 w-5 text-primary" />
                  Canzoni Preferite
                </h3>
                <ScrollArea className="w-full">
                  <div className="flex gap-4 pb-2">
                    {profile.favorite_songs.map((song: any, index: number) => (
                      <SpotifySongCard
                        key={index}
                        song={song}
                        size="large"
                        onPlay={() => {
                          // Pause all other songs
                          profile.favorite_songs?.forEach((s: any, i: number) => {
                            if (i !== index && (window as any)[`pauseAudio_${s.id}`]) {
                              (window as any)[`pauseAudio_${s.id}`]();
                            }
                          });
                        }}
                      />
                    ))}
                  </div>
                </ScrollArea>
              </div>
            )}

          </div>
          </>
          )}
        </DialogContent>
      </Dialog>

      {/* Image Viewer Dialog */}
      {selectedImage && (
        <Dialog open={!!selectedImage} onOpenChange={(open) => !open && setSelectedImage(null)}>
          <DialogContent className="max-w-4xl w-full p-0 overflow-hidden bg-black/95">
            <DialogTitle className="sr-only">Immagine profilo</DialogTitle>
            <DialogDescription className="sr-only">Visualizzazione ingrandita della foto</DialogDescription>
            <div className="relative">
              <img
                src={selectedImage || ""}
                alt="Foto ingrandita"
                className="w-full h-auto max-h-[90vh] object-contain"
              />
            </div>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
};
