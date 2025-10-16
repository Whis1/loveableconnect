import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { User, Heart, MapPin } from "lucide-react";
import { ImageDialog } from "@/components/ImageDialog";
import { getGenericLocationPhrase } from "@/lib/utils";
import { useTranslation } from "react-i18next";
import { useToast } from "@/hooks/use-toast";

interface Profile {
  id: string;
  full_name: string;
  nickname: string;
  avatar_url: string | null;
  age: number | null;
  bio: string | null;
  gender: string | null;
  relationship_type: string | null;
  sexual_orientation: string | null;
  interests: string[] | null;
  photos: string[] | null;
  gallery_private: boolean | null;
}

interface ChatUserProfileProps {
  userId: string;
  currentUserId?: string;
}

export const ChatUserProfile = ({ userId, currentUserId }: ChatUserProfileProps) => {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [hasAccess, setHasAccess] = useState<boolean | null>(null);
  const [isRequesting, setIsRequesting] = useState(false);

  // Memorizza la frase di location per non cambiarla ad ogni render
  const locationPhrase = useMemo(() => getGenericLocationPhrase(), []);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const { data, error } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", userId)
          .single();

        if (error) throw error;
        setProfile(data);

        // Check if user has access to private gallery
        const { data: session } = await supabase.auth.getSession();
        
        if (!data.gallery_private) {
          // Gallery is public
          setHasAccess(true);
        } else if (session?.session?.user) {
          // Use currentUserId if provided (for admin profiles), otherwise use auth user id
          const checkerId = currentUserId || session.session.user.id;
          
          // Gallery is private, check if user has access
          const { data: accessData } = await supabase
            .from("gallery_access_requests")
            .select("*")
            .eq("requester_id", checkerId)
            .eq("profile_id", userId)
            .eq("status", "accepted")
            .maybeSingle();

          setHasAccess(!!accessData);
        } else {
          // Gallery is private and user is not logged in
          setHasAccess(false);
        }
      } catch (error) {
        console.error("Error fetching profile:", error);
        setHasAccess(false);
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();

    // Subscribe to changes in gallery_access_requests
    const checkAccessStatus = async () => {
      const { data: session } = await supabase.auth.getSession();
      if (!session?.session?.user) return;

      // Use currentUserId if provided (for admin profiles), otherwise use auth user id
      const checkerId = currentUserId || session.session.user.id;

      const { data: accessData } = await supabase
        .from("gallery_access_requests")
        .select("*")
        .eq("requester_id", checkerId)
        .eq("profile_id", userId)
        .eq("status", "accepted")
        .maybeSingle();

      setHasAccess(!!accessData);
    };

    const channel = supabase
      .channel(`gallery-access-${userId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "gallery_access_requests",
          filter: `profile_id=eq.${userId}`,
        },
        () => {
          checkAccessStatus();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, currentUserId]);

  const handleRequestAccess = async () => {
    try {
      setIsRequesting(true);
      const { data: session } = await supabase.auth.getSession();
      
      if (!session?.session?.user) {
        toast({
          title: t("chat.error") || "Errore",
          description: t("chat.mustBeLoggedIn") || "Devi essere autenticato",
          variant: "destructive",
        });
        return;
      }

      // Use currentUserId if provided (for admin profiles), otherwise use auth.uid()
      const senderId = currentUserId || session.session.user.id;

      // Create access request
      const { error: requestError } = await supabase
        .from("gallery_access_requests")
        .insert({
          requester_id: senderId,
          profile_id: userId,
          status: "pending",
        });

      if (requestError) {
        if (requestError.code === "23505") {
          toast({
            title: t("chat.requestAlreadySent") || "Richiesta già inviata",
            description: t("chat.waitForResponse") || "Attendi la risposta dell'utente",
          });
        } else {
          throw requestError;
        }
        return;
      }

      // Find or create match
      const user1 = senderId < userId ? senderId : userId;
      const user2 = senderId < userId ? userId : senderId;

      let { data: matchData } = await supabase
        .from("matches")
        .select("id")
        .eq("user1_id", user1)
        .eq("user2_id", user2)
        .maybeSingle();

      if (!matchData) {
        const { data: newMatch } = await supabase
          .from("matches")
          .insert({ user1_id: user1, user2_id: user2 })
          .select("id")
          .single();
        matchData = newMatch;
      }

      if (matchData) {
        await supabase.from("messages").insert({
          match_id: matchData.id,
          sender_id: senderId,
          receiver_id: userId,
          content: t("chat.galleryAccessRequest") || "Ha richiesto l'accesso alla tua galleria privata",
          message_type: "gallery_access_request",
        });
      }

      toast({
        title: t("chat.requestSent") || "Richiesta inviata",
        description: t("chat.requestSentSuccess") || "La richiesta è stata inviata con successo",
      });
    } catch (error) {
      console.error("Error requesting access:", error);
      toast({
        title: t("chat.error") || "Errore",
        description: t("chat.requestError") || "Errore nell'invio della richiesta",
        variant: "destructive",
      });
    } finally {
      setIsRequesting(false);
    }
  };


  if (loading) {
    return (
      <div className="p-4 text-center">
        <p className="text-muted-foreground">{t("chat.loadingProfile")}</p>
      </div>
    );
  }

  if (!profile) return null;

  const hasPhotos = profile.photos && profile.photos.length > 0;
  // Show gallery only if: has photos AND (gallery is not private OR user has access)
  // hasAccess can be null while loading, so we treat null as false
  const canShowGallery = hasPhotos && hasAccess !== null;

  return (
    <Card className="border-b rounded-none bg-gradient-to-br from-primary/5 via-secondary/5 to-accent/5">
      <div className="p-6">
        <div className="flex items-start gap-4">
          <ImageDialog 
            src={profile.avatar_url ? supabase.storage.from('profile-images').getPublicUrl(profile.avatar_url).data.publicUrl : ''} 
            alt={profile.nickname}
          >
            <Avatar className="h-20 w-20 ring-2 ring-primary/20 cursor-pointer hover:ring-primary/40 transition-all">
              {profile.avatar_url ? (
                <AvatarImage 
                  src={supabase.storage.from('profile-images').getPublicUrl(profile.avatar_url).data.publicUrl}
                />
              ) : null}
              <AvatarFallback className="text-2xl">
                {profile.nickname.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
          </ImageDialog>

          <div className="flex-1 space-y-2">
            <div>
              <h3 className="text-2xl font-bold">{profile.nickname}</h3>
              {profile.age && (
                <p className="text-muted-foreground">{profile.age} {t("chat.years")}</p>
              )}
              {profile.gender && (
                <p className="text-sm text-muted-foreground mt-1">
                  {profile.gender === 'male' ? '👨 Uomo' : 
                   profile.gender === 'female' ? '👩 Donna' : 
                   profile.gender === 'non-binary' ? '⚧️ Non binario' :
                   profile.gender === 'transexual' ? '⚧️ Transessuale' :
                   profile.gender === 'transgender' ? '⚧️ Transgender' :
                   '⚧️ Altro'}
                </p>
              )}
            </div>

            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <MapPin className="h-4 w-4" />
              <span>{locationPhrase}</span>
            </div>

            {profile.relationship_type && (
              <div className="flex items-center gap-2">
                <Heart className="h-4 w-4 text-primary" />
                <Badge variant="secondary">{profile.relationship_type}</Badge>
              </div>
            )}
          </div>
        </div>

        {profile.bio && (
          <div className="mt-4">
            <p className="text-sm text-muted-foreground line-clamp-3">{profile.bio}</p>
          </div>
        )}

        {profile.interests && profile.interests.length > 0 && (
          <div className="mt-4">
            <div className="flex flex-wrap gap-2">
              {profile.interests.slice(0, 5).map((interest, index) => (
                <Badge key={index} variant="outline" className="text-xs">
                  {interest}
                </Badge>
              ))}
              {profile.interests.length > 5 && (
                <Badge variant="outline" className="text-xs">
                  +{profile.interests.length - 5}
                </Badge>
              )}
            </div>
          </div>
        )}

        {canShowGallery && (
          <div className="mt-4">
            <h4 className="text-sm font-semibold mb-2 flex items-center gap-2">
              <User className="h-4 w-4" />
              {t("chat.photoGallery")}
            </h4>
            <ScrollArea className="w-full">
              <div className="flex gap-2 pb-2">
                {profile.photos.map((photo, index) => {
                  const photoUrl = supabase.storage.from('profile-images').getPublicUrl(photo).data.publicUrl;
                  // Blur if gallery is private AND user doesn't have access
                  const isBlurred = profile.gallery_private && hasAccess === false;
                  
                  return (
                    <ImageDialog 
                      key={index} 
                      src={photoUrl} 
                      alt={`${t("chat.photo")} ${index + 1}`}
                      isBlurred={isBlurred}
                      onRequestAccess={isBlurred ? handleRequestAccess : undefined}
                    >
                      <img
                        src={photoUrl}
                        alt={`${t("chat.photo")} ${index + 1}`}
                        className={`h-20 w-20 object-cover rounded-lg cursor-pointer hover:opacity-80 transition-opacity flex-shrink-0 ${
                          isBlurred ? 'blur-xl scale-110' : ''
                        }`}
                      />
                    </ImageDialog>
                  );
                })}
              </div>
            </ScrollArea>
          </div>
        )}

      </div>
    </Card>
  );
};
