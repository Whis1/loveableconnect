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
  relationship_status: string | null;
  sexual_orientation: string | null;
  interests: string[] | null;
  photos: string[] | null;
}

interface ChatUserProfileProps {
  userId: string;
  currentUserId?: string;
}

export const ChatUserProfile = ({ userId, currentUserId }: ChatUserProfileProps) => {
  const { t } = useTranslation();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

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
      } catch (error) {
        console.error("Error fetching profile:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, [userId]);



  if (loading) {
    return (
      <div className="p-4 text-center">
        <p className="text-muted-foreground">{t("chat.loadingProfile")}</p>
      </div>
    );
  }

  if (!profile) return null;

  const hasPhotos = profile.photos && profile.photos.length > 0;

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
              <div className="flex flex-wrap gap-3 mt-2">
                {profile.gender && (
                  <div className="flex items-center gap-1 text-sm">
                    <span>
                      {profile.gender === 'male' ? '👨' : 
                       profile.gender === 'female' ? '👩' : 
                       profile.gender === 'non-binary' ? '⚧️' :
                       profile.gender === 'transexual' ? '⚧️' :
                       profile.gender === 'transgender' ? '⚧️' :
                       '⚧️'}
                    </span>
                    <span className="text-muted-foreground">
                      {profile.gender === 'male' ? 'Uomo' : 
                       profile.gender === 'female' ? 'Donna' : 
                       profile.gender === 'non-binary' ? 'Non binario' :
                       profile.gender === 'transexual' ? 'Transessuale' :
                       profile.gender === 'transgender' ? 'Transgender' :
                       'Altro'}
                    </span>
                  </div>
                )}
                {profile.relationship_status && (
                  <div className="flex items-center gap-1 text-sm">
                    <span>
                      {profile.relationship_status === 'single' ? '💙' : 
                       profile.relationship_status === 'in_relationship' ? '❤️' :
                       profile.relationship_status === 'married' ? '💍' :
                       profile.relationship_status === 'divorced' ? '💔' :
                       profile.relationship_status === 'widowed' ? '🖤' :
                       '💭'}
                    </span>
                    <span className="text-muted-foreground">
                      {profile.relationship_status === 'single' ? 'Single' : 
                       profile.relationship_status === 'in_relationship' ? 'In una relazione' :
                       profile.relationship_status === 'married' ? 'Sposato/a' :
                       profile.relationship_status === 'divorced' ? 'Divorziato/a' :
                       profile.relationship_status === 'widowed' ? 'Vedovo/a' :
                       profile.relationship_status === 'prefer_not_say' ? 'Preferisco non dirlo' :
                       profile.relationship_status}
                    </span>
                  </div>
                )}
              </div>
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

        {hasPhotos && (
          <div className="mt-4">
            <h4 className="text-sm font-semibold mb-2 flex items-center gap-2">
              <User className="h-4 w-4" />
              {t("chat.photoGallery")}
            </h4>
            <ScrollArea className="w-full">
              <div className="flex gap-2 pb-2">
                {profile.photos.map((photo, index) => {
                  const photoUrl = supabase.storage.from('profile-images').getPublicUrl(photo).data.publicUrl;
                  
                  return (
                    <ImageDialog 
                      key={index} 
                      src={photoUrl} 
                      alt={`${t("chat.photo")} ${index + 1}`}
                    >
                      <img
                        src={photoUrl}
                        alt={`${t("chat.photo")} ${index + 1}`}
                        className="h-20 w-20 object-cover rounded-lg cursor-pointer hover:opacity-80 transition-opacity flex-shrink-0"
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
