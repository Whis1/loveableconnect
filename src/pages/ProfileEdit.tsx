import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Save, Upload, X, Camera } from "lucide-react";
import { PlacesAutocomplete } from "@/components/PlacesAutocomplete";

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
  looking_for: string[] | null;
  relationship_type: string | null;
  gallery_private: boolean | null;
}

const ProfileEdit = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { t } = useTranslation();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [interestsInput, setInterestsInput] = useState("");
  const [interests, setInterests] = useState<string[]>([]);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [photoFiles, setPhotoFiles] = useState<File[]>([]);
  const [photoPreviews, setPhotoPreviews] = useState<string[]>([]);
  const [lookingFor, setLookingFor] = useState<string[]>([]);

  const suggestedInterests = [
    "Trekking", "Gaming", "Anime", "Viaggi", "Musica", "Cinema", 
    "Netflix", "Sport", "Cucina", "Lettura", "Fotografia", "Arte",
    "Yoga", "Fitness", "Danza", "Teatro", "Moda", "Tecnologia",
    "Serie TV", "Concerti", "Escursioni", "Bicicletta", "Nuoto", "Calcio"
  ];

  useEffect(() => {
    const fetchProfile = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        navigate("/auth");
        return;
      }

      const { data: profileData } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", session.user.id)
        .single();

      if (profileData) {
        setProfile(profileData);
        setInterests(profileData.interests || []);
        setInterestsInput("");
        setLookingFor(profileData.looking_for || []);
        
        // Load avatar preview
        if (profileData.avatar_url) {
          const { data } = supabase.storage
            .from('profile-images')
            .getPublicUrl(profileData.avatar_url);
          setAvatarPreview(data.publicUrl);
        }
        
        // Load photo previews
        if (profileData.photos && profileData.photos.length > 0) {
          const urls = profileData.photos.map((photo: string) => {
            const { data } = supabase.storage
              .from('profile-images')
              .getPublicUrl(photo);
            return data.publicUrl;
          });
          setPhotoPreviews(urls);
        }
      }

      setLoading(false);
    };

    fetchProfile();
  }, [navigate]);

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setAvatarFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setAvatarPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handlePhotosChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const totalPhotos = (profile?.photos?.length || 0) + photoFiles.length + files.length;
    
    if (totalPhotos > 6) {
      toast({
        title: "Limite raggiunto",
        description: t('profile.maxPhotos'),
        variant: "destructive",
      });
      return;
    }

    setPhotoFiles([...photoFiles, ...files]);
    
    files.forEach(file => {
      const reader = new FileReader();
      reader.onloadend = () => {
        setPhotoPreviews(prev => [...prev, reader.result as string]);
      };
      reader.readAsDataURL(file);
    });
  };

  const handleRemovePhoto = async (index: number) => {
    if (index < (profile?.photos?.length || 0)) {
      // Remove from existing photos
      const photoPath = profile!.photos![index];
      await supabase.storage
        .from('profile-images')
        .remove([photoPath]);
      
      const newPhotos = [...(profile?.photos || [])];
      newPhotos.splice(index, 1);
      setProfile({ ...profile!, photos: newPhotos });
    } else {
      // Remove from new photos
      const newIndex = index - (profile?.photos?.length || 0);
      const newFiles = [...photoFiles];
      newFiles.splice(newIndex, 1);
      setPhotoFiles(newFiles);
    }
    
    const newPreviews = [...photoPreviews];
    newPreviews.splice(index, 1);
    setPhotoPreviews(newPreviews);
  };

  const handleAddInterest = (interest: string) => {
    if (interests.length >= 6) {
      toast({
        title: "Limite raggiunto",
        description: "Puoi aggiungere massimo 6 interessi",
        variant: "destructive",
      });
      return;
    }
    if (!interests.includes(interest) && interest.trim()) {
      setInterests([...interests, interest.trim()]);
      setInterestsInput("");
    }
  };

  const handleRemoveInterest = (interest: string) => {
    setInterests(interests.filter(i => i !== interest));
  };

  const handleInterestInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && interestsInput.trim()) {
      e.preventDefault();
      handleAddInterest(interestsInput);
    }
  };

  const filteredSuggestions = suggestedInterests.filter(
    s => s.toLowerCase().includes(interestsInput.toLowerCase()) && !interests.includes(s)
  );

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!profile) return;

    setSaving(true);

    try {
      const userId = profile.id;
      let avatarPath = profile.avatar_url;
      let photosPaths = [...(profile.photos || [])];

      // Upload avatar if changed
      if (avatarFile) {
        const avatarExt = avatarFile.name.split('.').pop();
        const avatarFileName = `${userId}/avatar-${Date.now()}.${avatarExt}`;
        
        const { error: avatarError } = await supabase.storage
          .from('profile-images')
          .upload(avatarFileName, avatarFile, { upsert: true });

        if (avatarError) throw avatarError;
        avatarPath = avatarFileName;
      }

      // Upload new photos
      if (photoFiles.length > 0) {
        for (const file of photoFiles) {
          const photoExt = file.name.split('.').pop();
          const photoFileName = `${userId}/photo-${Date.now()}-${Math.random().toString(36).substring(7)}.${photoExt}`;
          
          const { error: photoError } = await supabase.storage
            .from('profile-images')
            .upload(photoFileName, file);

          if (photoError) throw photoError;
          photosPaths.push(photoFileName);
        }
      }

      const { error } = await supabase
        .from("profiles")
        .update({
          nickname: profile.nickname,
          bio: profile.bio,
          age: profile.age,
          gender: profile.gender,
          city: profile.city,
          interests: interests.length > 0 ? interests : null,
          avatar_url: avatarPath,
          photos: photosPaths.length > 0 ? photosPaths : null,
          looking_for: lookingFor.length > 0 ? lookingFor : null,
          relationship_type: profile.relationship_type,
          gallery_private: profile.gallery_private,
        })
        .eq("id", profile.id);

      if (error) throw error;

      toast({
        title: t('profile.profileUpdated'),
        description: t('profile.profileUpdateSuccess'),
      });

      navigate("/");
    } catch (error: any) {
      toast({
        title: "Errore",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <p className="text-muted-foreground">Caricamento...</p>
      </div>
    );
  }

  if (!profile) return null;

  return (
    <div className="min-h-screen relative bg-gradient-to-br from-pink-50 via-purple-50 to-indigo-50 dark:from-gray-900 dark:via-purple-900 dark:to-indigo-900 p-4">
      {/* Background Image */}
      <div 
        className="fixed inset-0 z-0 opacity-15 dark:opacity-25" 
        style={{
          backgroundImage: 'url(/images/love-background.png)',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat'
        }}
      />
      
      <div className="container mx-auto max-w-4xl relative z-10">
        <div className="mb-4">
          <Button variant="ghost" onClick={() => navigate("/")}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Indietro
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>{t('profile.editProfile')}</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSave} className="space-y-6">
              {/* Avatar Section */}
              <div className="space-y-4">
                <Label>{t('profile.avatar')}</Label>
                <div className="flex items-center gap-6">
                  {avatarPreview ? (
                    <div className="relative group">
                      <div className="w-32 h-32 rounded-full overflow-hidden border-4 border-primary/20 shadow-xl ring-2 ring-primary/10">
                        <img
                          src={avatarPreview}
                          alt="Avatar"
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <Button
                        type="button"
                        size="icon"
                        variant="destructive"
                        className="absolute -top-1 -right-1 h-8 w-8 rounded-full shadow-lg opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={() => {
                          setAvatarPreview(null);
                          setAvatarFile(null);
                        }}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ) : (
                    <div className="w-32 h-32 rounded-full bg-gradient-to-br from-pink-100 to-purple-100 dark:from-pink-900/30 dark:to-purple-900/30 flex items-center justify-center border-2 border-dashed border-primary/30">
                      <Camera className="h-12 w-12 text-primary/60" />
                    </div>
                  )}
                  <div className="flex-1">
                    <Input
                      id="avatar-upload"
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handleAvatarChange}
                    />
                    <Button
                      type="button"
                      variant="outline"
                      className="w-full sm:w-auto bg-gradient-to-r from-pink-500/10 to-purple-500/10 hover:from-pink-500/20 hover:to-purple-500/20 border-pink-200 dark:border-pink-800 transition-all duration-300"
                      onClick={() => document.getElementById('avatar-upload')?.click()}
                    >
                      <Upload className="h-4 w-4 mr-2" />
                      {avatarPreview ? t('profile.changeAvatar') : t('profile.uploadAvatar')}
                    </Button>
                    <p className="text-xs text-muted-foreground mt-2">
                      JPG, PNG o WEBP fino a 5MB
                    </p>
                  </div>
                </div>
              </div>

              {/* Photo Gallery */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label>{t('profile.gallery')} ({photoPreviews.length}/6)</Label>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="gallery-private"
                      checked={profile.gallery_private || false}
                      onCheckedChange={(checked) => 
                        setProfile({ ...profile, gallery_private: checked as boolean })
                      }
                    />
                    <label
                      htmlFor="gallery-private"
                      className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                    >
                      Galleria privata
                    </label>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">
                  {profile.gallery_private 
                    ? "🔒 La tua galleria è privata - solo tu puoi vederla" 
                    : "🌍 La tua galleria è pubblica - tutti possono vederla"}
                </p>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                  {photoPreviews.map((preview, index) => (
                    <div key={index} className="relative aspect-square group">
                      <img
                        src={preview}
                        alt={`Photo ${index + 1}`}
                        className="w-full h-full object-cover rounded-2xl shadow-md group-hover:shadow-xl transition-all duration-300"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                      <Button
                        type="button"
                        size="icon"
                        variant="destructive"
                        className="absolute top-2 right-2 h-8 w-8 rounded-full shadow-lg opacity-0 group-hover:opacity-100 transition-all duration-300 scale-90 group-hover:scale-100"
                        onClick={() => handleRemovePhoto(index)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                      <div className="absolute bottom-2 left-2 text-white text-xs font-medium bg-black/40 px-2 py-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                        #{index + 1}
                      </div>
                    </div>
                  ))}
                  {photoPreviews.length < 6 && (
                    <div className="aspect-square">
                      <Input
                        id="photos-upload"
                        type="file"
                        accept="image/*"
                        multiple
                        className="hidden"
                        onChange={handlePhotosChange}
                      />
                      <Button
                        type="button"
                        variant="outline"
                        className="w-full h-full rounded-2xl border-2 border-dashed border-primary/30 bg-gradient-to-br from-pink-50/50 to-purple-50/50 dark:from-pink-950/20 dark:to-purple-950/20 hover:from-pink-100/50 hover:to-purple-100/50 dark:hover:from-pink-900/30 dark:hover:to-purple-900/30 transition-all duration-300 group"
                        onClick={() => document.getElementById('photos-upload')?.click()}
                      >
                        <div className="flex flex-col items-center gap-2">
                          <div className="p-3 rounded-full bg-gradient-to-br from-pink-500 to-purple-500 text-white group-hover:scale-110 transition-transform duration-300">
                            <Upload className="h-5 w-5" />
                          </div>
                          <span className="text-xs font-medium">Aggiungi foto</span>
                        </div>
                      </Button>
                    </div>
                  )}
                </div>
                <p className="text-sm text-muted-foreground">{t('profile.maxPhotos')}</p>
              </div>

              {/* Basic Info */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="nickname">{t('profile.nickname')}</Label>
                  <Input
                    id="nickname"
                    value={profile.nickname}
                    onChange={(e) => setProfile({ ...profile, nickname: e.target.value })}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="age">{t('profile.age')}</Label>
                  <Input
                    id="age"
                    type="number"
                    value={profile.age || ""}
                    onChange={(e) => setProfile({ ...profile, age: parseInt(e.target.value) || null })}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="gender">{t('profile.gender')}</Label>
                  <Select
                    value={profile.gender || ""}
                    onValueChange={(value) => setProfile({ ...profile, gender: value })}
                  >
                    <SelectTrigger id="gender">
                      <SelectValue placeholder="Seleziona il tuo genere" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="male">Uomo</SelectItem>
                      <SelectItem value="female">Donna</SelectItem>
                      <SelectItem value="transgender">Transgender</SelectItem>
                      <SelectItem value="transessuale">Transessuale</SelectItem>
                      <SelectItem value="omosessuale">Omosessuale</SelectItem>
                      <SelectItem value="non-binary">Non Binario</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="city">{t('profile.location')}</Label>
                  <PlacesAutocomplete
                    value={profile.city || ""}
                    onChange={(value) => setProfile({ ...profile, city: value })}
                    placeholder={t('profile.locationPlaceholder')}
                    id="city"
                  />
                </div>
              </div>

              {/* Relationship Type */}
              <div className="space-y-2">
                <Label htmlFor="relationship-type">Cosa stai cercando?</Label>
                <Select
                  value={profile.relationship_type || ""}
                  onValueChange={(value) => setProfile({ ...profile, relationship_type: value })}
                >
                  <SelectTrigger id="relationship-type">
                    <SelectValue placeholder="Seleziona il tipo di relazione" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="serious">Relazione seria</SelectItem>
                    <SelectItem value="casual">Relazione occasionale</SelectItem>
                    <SelectItem value="friendship">Amicizia</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Bio */}
              <div className="space-y-2">
                <Label htmlFor="bio">{t('profile.bio')}</Label>
                <Textarea
                  id="bio"
                  value={profile.bio || ""}
                  onChange={(e) => setProfile({ ...profile, bio: e.target.value })}
                  placeholder={t('profile.bioPlaceholder')}
                  rows={4}
                />
              </div>

              {/* Interests */}
              <div className="space-y-2">
                <Label htmlFor="interests">{t('profile.interests')} ({interests.length}/6)</Label>
                
                {/* Selected Interests Tags */}
                {interests.length > 0 && (
                  <div className="flex flex-wrap gap-2 mb-2">
                    {interests.map((interest) => (
                      <div
                        key={interest}
                        className="inline-flex items-center gap-1 bg-primary text-primary-foreground px-3 py-1 rounded-full text-sm"
                      >
                        <span>{interest}</span>
                        <button
                          type="button"
                          onClick={() => handleRemoveInterest(interest)}
                          className="hover:bg-primary-foreground/20 rounded-full p-0.5"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {/* Input with Suggestions */}
                {interests.length < 6 && (
                  <div className="relative">
                    <Input
                      id="interests"
                      value={interestsInput}
                      onChange={(e) => setInterestsInput(e.target.value)}
                      onKeyDown={handleInterestInputKeyDown}
                      placeholder="Scrivi un interesse e premi Invio..."
                    />
                  
                    {/* Suggestions Dropdown */}
                    {interestsInput && filteredSuggestions.length > 0 && (
                      <div className="absolute z-50 w-full mt-1 bg-popover border border-border rounded-md shadow-lg max-h-48 overflow-y-auto">
                        {filteredSuggestions.slice(0, 8).map((suggestion) => (
                          <button
                            key={suggestion}
                            type="button"
                            onClick={() => handleAddInterest(suggestion)}
                            className="w-full text-left px-4 py-2 hover:bg-accent hover:text-accent-foreground transition-colors"
                          >
                            {suggestion}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>

              <Button type="submit" className="w-full" disabled={saving}>
                <Save className="h-4 w-4 mr-2" />
                {saving ? t('profile.saving') : t('profile.save')}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ProfileEdit;