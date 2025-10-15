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
}

export const ChatUserProfile = ({ userId }: ChatUserProfileProps) => {
  const { t } = useTranslation();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  // Memorizza la frase di location per non cambiarla ad ogni render
  const locationPhrase = useMemo(() => getGenericLocationPhrase(t), [t]);

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
        <p className="text-muted-foreground">Caricamento profilo...</p>
      </div>
    );
  }

  if (!profile) return null;

  const canViewGallery = !profile.gallery_private && profile.photos && profile.photos.length > 0;

  return (
    <Card className="border-b rounded-none bg-gradient-to-br from-primary/5 via-secondary/5 to-accent/5">
      <div className="p-6">
        <div className="flex items-start gap-4">
          <Avatar className="h-20 w-20 ring-2 ring-primary/20">
            <AvatarImage src={profile.avatar_url || undefined} />
            <AvatarFallback className="text-2xl">
              {profile.nickname.charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>

          <div className="flex-1 space-y-2">
            <div>
              <h3 className="text-2xl font-bold">{profile.nickname}</h3>
              {profile.age && (
                <p className="text-muted-foreground">{profile.age} anni</p>
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

        {canViewGallery && (
          <div className="mt-4">
            <h4 className="text-sm font-semibold mb-2 flex items-center gap-2">
              <User className="h-4 w-4" />
              Galleria Foto
            </h4>
            <ScrollArea className="w-full">
              <div className="flex gap-2 pb-2">
                {profile.photos.map((photo, index) => (
                  <ImageDialog key={index} src={photo} alt={`Foto ${index + 1}`}>
                    <img
                      src={photo}
                      alt={`Foto ${index + 1}`}
                      className="h-20 w-20 object-cover rounded-lg cursor-pointer hover:opacity-80 transition-opacity flex-shrink-0"
                    />
                  </ImageDialog>
                ))}
              </div>
            </ScrollArea>
          </div>
        )}
      </div>
    </Card>
  );
};
