import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Dialog,
  DialogContent,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Heart, MessageCircle, MapPin, Sparkles, User, Heart as HeartIcon } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { getGenericLocationPhrase } from "@/lib/utils";

interface Profile {
  id: string;
  full_name: string;
  nickname: string;
  bio: string | null;
  age: number | null;
  gender: string | null;
  city: string | null;
  interests: string[] | null;
  avatar_url: string | null;
  photos: string[] | null;
  relationship_type: string | null;
  sexual_orientation: string | null;
  relationship_status: string | null;
}

interface ProfileDialogProps {
  profileId: string;
  currentUserId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const ProfileDialog = ({
  profileId,
  currentUserId,
  open,
  onOpenChange,
}: ProfileDialogProps) => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [photoUrls, setPhotoUrls] = useState<string[]>([]);
  const [hasLiked, setHasLiked] = useState(false);
  const [isLiking, setIsLiking] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  useEffect(() => {
    if (!open || !profileId) return;

    const fetchProfile = async () => {
      const { data } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", profileId)
        .single();

      if (data) {
        setProfile(data);
        
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

      // Check if already liked
      const { data: likeData } = await supabase
        .from("likes")
        .select("id")
        .eq("from_user_id", currentUserId)
        .eq("to_user_id", profileId)
        .maybeSingle();

      setHasLiked(!!likeData);
    };

    fetchProfile();
  }, [profileId, currentUserId, open]);

  const handleLike = async () => {
    if (isLiking) return;
    setIsLiking(true);

    try {
      const { data: existingLike } = await supabase
        .from("likes")
        .select("id")
        .eq("from_user_id", currentUserId)
        .eq("to_user_id", profileId)
        .maybeSingle();

      if (existingLike) {
        // Remove like
        await supabase.from("likes").delete().eq("id", existingLike.id);
        setHasLiked(false);
        toast({
          title: "Like rimosso",
          description: `Hai rimosso il like da ${profile?.nickname || profile?.full_name}`,
        });
      } else {
        // Add like
        await supabase.from("likes").insert({
          from_user_id: currentUserId,
          to_user_id: profileId,
        });
        setHasLiked(true);

        // Check for match
        const { data: matchData } = await supabase
          .from("matches")
          .select("*")
          .or(`and(user1_id.eq.${currentUserId},user2_id.eq.${profileId}),and(user1_id.eq.${profileId},user2_id.eq.${currentUserId})`)
          .maybeSingle();

        if (matchData) {
          toast({
            title: "È un Match! 💕",
            description: `Hai fatto match con ${profile?.nickname || profile?.full_name}!`,
          });
        } else {
          toast({
            title: "Like inviato",
            description: `Like inviato a ${profile?.nickname || profile?.full_name}`,
          });
        }
      }
    } catch (error: any) {
      toast({
        title: "Errore",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsLiking(false);
    }
  };

  const handleChat = async () => {
    // Check for match
    const { data: matchData } = await supabase
      .from("matches")
      .select("*")
      .or(`and(user1_id.eq.${currentUserId},user2_id.eq.${profileId}),and(user1_id.eq.${profileId},user2_id.eq.${currentUserId})`)
      .maybeSingle();

    if (matchData) {
      navigate(`/chat/${matchData.id}`);
      onOpenChange(false);
    } else {
      toast({
        title: "Match richiesto",
        description: "Devi fare match con questo utente prima di poter chattare",
        variant: "destructive",
      });
    }
  };

  const getGenderLabel = (gender: string) => {
    const labels: Record<string, string> = {
      male: "Uomo",
      female: "Donna",
      transgender: "Transgender",
      transexual: "Transessuale",
      genderfluid: "Genderfluid",
      "non-binary": "Non binario",
    };
    return labels[gender] || gender;
  };

  const getOrientationLabel = (orientation: string) => {
    const labels: Record<string, string> = {
      heterosexual: "Eterosessuale",
      homosexual: "Omosessuale",
      bisexual: "Bisessuale",
      pansexual: "Pansexuale",
      asexual: "Asessuale",
    };
    return labels[orientation] || orientation;
  };

  const getRelationshipTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      serious: "Relazione seria",
      casual: "Relazione casual",
      friendship: "Amicizia",
    };
    return labels[type] || type;
  };

  if (!profile) return null;

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto p-0 bg-gradient-to-br from-background via-background to-primary/5">
          {/* Hero Section with Avatar */}
          <div className="relative h-64 bg-gradient-to-br from-primary/20 via-primary/10 to-background overflow-hidden">
            <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxwYXRoIGQ9Ik0zNiAxOGMzLjMxNCAwIDYgMi42ODYgNiA2cy0yLjY4NiA2LTYgNi02LTIuNjg2LTYtNiAyLjY4Ni02IDYtNnoiIHN0cm9rZT0iY3VycmVudENvbG9yIiBzdHJva2Utb3BhY2l0eT0iLjEiLz48L2c+PC9zdmc+')] opacity-20"></div>
            
            {/* Avatar */}
            <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 translate-y-1/2">
              <div className="relative">
                <div className="w-40 h-40 rounded-full border-4 border-background shadow-2xl overflow-hidden bg-gradient-to-br from-primary/20 to-primary/5">
                  {avatarUrl ? (
                    <img
                      src={avatarUrl}
                      alt={profile.nickname}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-6xl font-bold text-primary/40">
                      {profile.nickname?.charAt(0) || profile.full_name?.charAt(0)}
                    </div>
                  )}
                </div>
                <div className="absolute -bottom-2 -right-2 bg-primary text-primary-foreground rounded-full p-3 shadow-lg">
                  <Sparkles className="h-5 w-5" />
                </div>
              </div>
            </div>
          </div>

          {/* Content */}
          <div className="px-6 pb-6 space-y-6 mt-24">
            {/* Name and Basic Info */}
            <div className="text-center space-y-3">
              <h2 className="text-3xl font-bold bg-gradient-to-r from-primary via-primary/80 to-primary bg-clip-text text-transparent">
                {profile.nickname || profile.full_name}
              </h2>
              
              {/* Age, Gender, Orientation Pills */}
              <div className="flex items-center justify-center gap-2 flex-wrap">
                {profile.age && (
                  <div className="px-4 py-1.5 rounded-full bg-primary/10 text-primary font-semibold text-sm">
                    {profile.age} anni
                  </div>
                )}
                {profile.gender && (
                  <div className="px-4 py-1.5 rounded-full bg-gradient-to-r from-blue-500/10 to-blue-600/10 text-blue-600 dark:text-blue-400 font-semibold text-sm">
                    <User className="h-3.5 w-3.5 inline mr-1" />
                    {getGenderLabel(profile.gender)}
                  </div>
                )}
                {profile.sexual_orientation && (
                  <div className="px-4 py-1.5 rounded-full bg-gradient-to-r from-pink-500/10 to-purple-600/10 text-pink-600 dark:text-pink-400 font-semibold text-sm">
                    <HeartIcon className="h-3.5 w-3.5 inline mr-1" />
                    {getOrientationLabel(profile.sexual_orientation)}
                  </div>
                )}
              </div>

              {/* Location */}
              <div className="flex items-center justify-center gap-2 text-muted-foreground">
                <MapPin className="h-4 w-4" />
                <span className="text-sm">{getGenericLocationPhrase()}</span>
              </div>
            </div>

            {/* Bio Section */}
            {profile.bio && (
              <div className="bg-gradient-to-br from-card to-card/50 rounded-2xl p-5 shadow-sm border border-border/50">
                <h3 className="font-semibold text-lg mb-3 flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-primary" />
                  Bio
                </h3>
                <p className="text-muted-foreground leading-relaxed italic">
                  "{profile.bio}"
                </p>
              </div>
            )}

            {/* Relationship Info Section */}
            {profile.relationship_type && (
              <div className="bg-gradient-to-br from-primary/5 to-primary/10 rounded-2xl p-5 shadow-sm border border-primary/20">
                <h3 className="font-semibold text-lg mb-3 flex items-center gap-2">
                  <Heart className="h-5 w-5 text-primary" />
                  Cerca
                </h3>
                <div className="text-lg font-medium text-primary">
                  {getRelationshipTypeLabel(profile.relationship_type)}
                </div>
              </div>
            )}

            {/* Interests Section */}
            {profile.interests && profile.interests.length > 0 && (
              <div className="bg-gradient-to-br from-card to-card/50 rounded-2xl p-5 shadow-sm border border-border/50">
                <h3 className="font-semibold text-lg mb-4">Interessi</h3>
                <div className="flex flex-wrap gap-2">
                  {profile.interests.map((interest, index) => (
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

            {/* Action Buttons */}
            <div className="flex gap-3 pt-2">
              <Button
                variant={hasLiked ? "default" : "outline"}
                size="lg"
                className="flex-1 h-14 text-base font-semibold"
                onClick={(e) => {
                  e.stopPropagation();
                  handleLike();
                }}
                disabled={isLiking}
              >
                <Heart className={`h-5 w-5 mr-2 ${hasLiked ? 'fill-current' : ''}`} />
                {hasLiked ? 'Rimuovi Like' : 'Mi Piace'}
              </Button>
              <Button
                variant="default"
                size="lg"
                className="flex-1 h-14 text-base font-semibold bg-gradient-to-r from-primary to-primary/80"
                onClick={(e) => {
                  e.stopPropagation();
                  handleChat();
                }}
              >
                <MessageCircle className="h-5 w-5 mr-2" />
                Messaggio
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Image Viewer Dialog */}
      {selectedImage && (
        <Dialog open={!!selectedImage} onOpenChange={(open) => !open && setSelectedImage(null)}>
          <DialogContent className="max-w-4xl w-full p-0 overflow-hidden bg-black/95">
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
