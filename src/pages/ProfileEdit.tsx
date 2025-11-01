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
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Save, Upload, X, Camera, MapPin, AlertCircle, Calendar } from "lucide-react";
import { PlacesAutocomplete } from "@/components/PlacesAutocomplete";
import { InterestsAutocomplete } from "@/components/InterestsAutocomplete";
import { SpotifySongSelector } from "@/components/SpotifySongSelector";
import { LocationChangeRequest } from "@/components/LocationChangeRequest";
import { BirthdateChangeRequest } from "@/components/BirthdateChangeRequest";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";

interface SpotifySong {
  id: string;
  name: string;
  artist: string;
  album: string;
  image_url: string | null;
  preview_url: string | null;
}

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
  latitude: number | null;
  longitude: number | null;
  location_locked: boolean | null;
  birthdate_locked: boolean | null;
  show_online_status: boolean | null;
  interests: string[] | null;
  avatar_url: string | null;
  photos: string[] | null;
  looking_for: string[] | null;
  relationship_type: string | null;
  relationship_status: string | null;
  favorite_songs: SpotifySong[] | null;
}

const ProfileEdit = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { t } = useTranslation();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [interests, setInterests] = useState<string[]>([]);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [photoFiles, setPhotoFiles] = useState<File[]>([]);
  const [photoPreviews, setPhotoPreviews] = useState<string[]>([]);
  const [lookingFor, setLookingFor] = useState<string[]>([]);
  const [favoriteSongs, setFavoriteSongs] = useState<SpotifySong[]>([]);
  const [showLocationRequest, setShowLocationRequest] = useState(false);
  const [showBirthdateRequest, setShowBirthdateRequest] = useState(false);
  const [pendingLocationData, setPendingLocationData] = useState<{ city: string; latitude: number; longitude: number } | null>(null);
  const [pendingBirthdateData, setPendingBirthdateData] = useState<string | null>(null);
  const [birthDay, setBirthDay] = useState("");
  const [birthMonth, setBirthMonth] = useState("");
  const [birthYear, setBirthYear] = useState("");
  const [requiresCompletion, setRequiresCompletion] = useState(false);
  const [deletionRequested, setDeletionRequested] = useState(false);

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
        setProfile({
          ...profileData,
          favorite_songs: null, // Handled separately below
        });
        setInterests(profileData.interests || []);
        setLookingFor(profileData.looking_for || []);
        
        // Parse birthdate into day, month, year
        if (profileData.birthdate) {
          const date = new Date(profileData.birthdate);
          setBirthDay(date.getDate().toString());
          setBirthMonth((date.getMonth() + 1).toString());
          setBirthYear(date.getFullYear().toString());
        }
        
        // Parse favorite_songs from Json to SpotifySong[]
        if (profileData.favorite_songs) {
          try {
            const songs = Array.isArray(profileData.favorite_songs) 
              ? profileData.favorite_songs as unknown as SpotifySong[]
              : [];
            setFavoriteSongs(songs);
          } catch {
            setFavoriteSongs([]);
          }
        }
        
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
        
        // Check if user needs to complete profile (from Google login or navigation state)
        const state = window.history.state?.usr;
        if (state?.requiresCompletion || !profileData.birthdate || !profileData.city) {
          setRequiresCompletion(true);
        }
        
        // Check if there's a pending account deletion request
        const { data: supportMessages } = await supabase
          .from('support_messages')
          .select('*')
          .eq('user_id', session.user.id)
          .eq('request_type', 'account_deletion')
          .eq('request_status', 'pending')
          .order('created_at', { ascending: false })
          .limit(1);
        
        if (supportMessages && supportMessages.length > 0) {
          setDeletionRequested(true);
        }
      }

      setLoading(false);
    };

    fetchProfile();

    // Prevent navigation away when profile completion is required
    if (requiresCompletion) {
      const handleBeforeUnload = (e: BeforeUnloadEvent) => {
        e.preventDefault();
        e.returnValue = '';
      };

      const handlePopState = (e: PopStateEvent) => {
        e.preventDefault();
        window.history.pushState(null, '', window.location.pathname);
        toast({
          title: "Completa il profilo",
          description: "Devi completare il profilo prima di poter navigare nel sito.",
          variant: "destructive",
        });
      };

      window.addEventListener('beforeunload', handleBeforeUnload);
      window.addEventListener('popstate', handlePopState);
      
      // Push initial state to enable popstate blocking
      window.history.pushState(null, '', window.location.pathname);

      return () => {
        window.removeEventListener('beforeunload', handleBeforeUnload);
        window.removeEventListener('popstate', handlePopState);
      };
    }
  }, [navigate, requiresCompletion, toast]);

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
        title: t('profile.limitReached'),
        description: t('profile.maxPhotos'),
        variant: "destructive",
      });
      e.target.value = "";
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
    
    // Reset input value to allow selecting the same file again
    e.target.value = "";
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


  const handleCityChange = (city: string, lat?: number, lng?: number) => {
    if (profile?.location_locked) {
      // Non permettere il cambio diretto se bloccato
      return;
    }
    setProfile({ 
      ...profile!, 
      city, 
      latitude: lat || null, 
      longitude: lng || null 
    });
  };

  const handleLocationChangeRequest = (city: string, latitude: number, longitude: number) => {
    setPendingLocationData({ city, latitude, longitude });
    setShowLocationRequest(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!profile) return;

    // Validate birthdate if required
    if (requiresCompletion && (!birthDay || !birthMonth || !birthYear)) {
      toast({
        title: "Errore",
        description: "La data di nascita è obbligatoria. Inserisci giorno, mese e anno.",
        variant: "destructive",
      });
      return;
    }

    // Validate age >= 18 when setting birthdate
    if (birthDay && birthMonth && birthYear) {
      const birthdate = `${birthYear}-${birthMonth.padStart(2, '0')}-${birthDay.padStart(2, '0')}`;
      const birthdateObj = new Date(birthdate);
      const today = new Date();
      let age = today.getFullYear() - birthdateObj.getFullYear();
      const monthDiff = today.getMonth() - birthdateObj.getMonth();
      if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthdateObj.getDate())) {
        age--;
      }

      if (age < 18) {
        toast({
          title: "Errore",
          description: "Devi avere almeno 18 anni per utilizzare questa piattaforma. Per questioni legali, accettiamo solo utenti maggiorenni.",
          variant: "destructive",
        });
        return;
      }
    }

    // Validate location if required
    if (requiresCompletion && !profile.city) {
      toast({
        title: "Errore",
        description: "La posizione è obbligatoria. Inserisci la tua città.",
        variant: "destructive",
      });
      return;
    }

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

      // Prepare birthdate if provided
      let birthdate = profile.birthdate;
      if (birthDay && birthMonth && birthYear) {
        birthdate = `${birthYear}-${birthMonth.padStart(2, '0')}-${birthDay.padStart(2, '0')}`;
      }

      const { error } = await supabase
        .from("profiles")
        .update({
          nickname: profile.nickname,
          bio: profile.bio,
          birthdate: birthdate,
          gender: profile.gender,
          sexual_orientation: profile.sexual_orientation,
          city: profile.city,
          latitude: profile.latitude,
          longitude: profile.longitude,
          location_locked: profile.city && !profile.location_locked ? true : profile.location_locked,
          birthdate_locked: birthdate && !profile.birthdate_locked ? true : profile.birthdate_locked,
          interests: interests.length > 0 ? interests : null,
          avatar_url: avatarPath,
          photos: photosPaths.length > 0 ? photosPaths : null,
          looking_for: lookingFor.length > 0 ? lookingFor : null,
          relationship_type: profile.relationship_type,
          relationship_status: profile.relationship_status,
          favorite_songs: favoriteSongs.length > 0 ? JSON.parse(JSON.stringify(favoriteSongs)) : null,
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
        title: t('profile.error'),
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleRequestAccountDeletion = async () => {
    if (!profile) return;

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const { error } = await supabase
        .from('support_messages')
        .insert({
          user_id: session.user.id,
          user_email: session.user.email || '',
          message: '⚠️ Richiesta di eliminazione account',
          is_admin_response: false,
          request_type: 'account_deletion',
          request_status: 'pending',
        });

      if (error) throw error;

      setDeletionRequested(true);
      toast({
        title: "Richiesta inviata",
        description: "La tua richiesta di eliminazione account è stata inviata al supporto. Riceverai una conferma via email.",
      });
    } catch (error: any) {
      toast({
        title: "Errore",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <p className="text-muted-foreground">{t('profile.loading')}</p>
      </div>
    );
  }

  if (!profile) return null;

  if (showBirthdateRequest) {
    return (
      <div className="min-h-screen relative bg-gradient-to-br from-pink-50 via-purple-50 to-indigo-50 dark:from-gray-900 dark:via-purple-900 dark:to-indigo-900 p-4">
        <div 
          className="fixed inset-0 z-0 opacity-15 dark:opacity-25" 
          style={{
            backgroundImage: 'url(/images/love-background.png)',
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            backgroundRepeat: 'no-repeat'
          }}
        />
        <div className="container mx-auto max-w-4xl relative z-10 py-8">
          <BirthdateChangeRequest
            currentBirthdate={profile.birthdate || undefined}
            onRequestSubmit={(birthdate) => {
              // La richiesta viene inviata tramite il supporto
              navigate('/support', { 
                state: { 
                  isBirthdateChangeRequest: true,
                  newBirthdateData: { birthdate }
                }
              });
            }}
          />
        </div>
      </div>
    );
  }

  if (showLocationRequest) {
    return (
      <div className="min-h-screen relative bg-gradient-to-br from-pink-50 via-purple-50 to-indigo-50 dark:from-gray-900 dark:via-purple-900 dark:to-indigo-900 p-4">
        <div 
          className="fixed inset-0 z-0 opacity-15 dark:opacity-25" 
          style={{
            backgroundImage: 'url(/images/love-background.png)',
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            backgroundRepeat: 'no-repeat'
          }}
        />
        <div className="container mx-auto max-w-4xl relative z-10 py-8">
          <LocationChangeRequest
            currentCity={profile.city || undefined}
            onRequestSubmit={(city, lat, lng) => {
              // La richiesta viene inviata tramite il supporto
              navigate('/support', { 
                state: { 
                  isLocationChangeRequest: true,
                  newLocationData: { city, latitude: lat, longitude: lng }
                }
              });
            }}
          />
        </div>
      </div>
    );
  }

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
        {!requiresCompletion && (
          <div className="mb-4">
            <Button variant="ghost" onClick={() => navigate("/")}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              {t('profile.back')}
            </Button>
          </div>
        )}

        <Card>
          <CardHeader>
            <CardTitle>{t('profile.editProfile')}</CardTitle>
            {requiresCompletion && (
              <Alert className="mt-4 bg-amber-50 dark:bg-amber-950 border-amber-200 dark:border-amber-800">
                <AlertCircle className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                <AlertDescription className="text-amber-800 dark:text-amber-200">
                  <strong>⚠️ Completa il tuo profilo per continuare</strong>
                  <br />
                  Per questioni legali, devi inserire la tua data di nascita (devi essere maggiorenne) e la tua posizione prima di poter accedere al sito. Non potrai uscire da questa pagina finché non avrai completato questi campi obbligatori.
                </AlertDescription>
              </Alert>
            )}
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
                      {t('profile.imageFormats')}
                    </p>
                  </div>
                </div>
              </div>

              {/* Photo Gallery */}
              <div className="space-y-4">
                <Label>{t('profile.gallery')} ({photoPreviews.length}/6)</Label>
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
                          <span className="text-xs font-medium">{t('profile.addPhoto')}</span>
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
                    maxLength={18}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="relationship-type">{t('profile.whatLookingFor')}</Label>
                  <Select
                    value={profile.relationship_type || ""}
                    onValueChange={(value) => setProfile({ ...profile, relationship_type: value })}
                  >
                    <SelectTrigger id="relationship-type">
                      <SelectValue placeholder={t('profile.selectStatus')} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="serious">{t('profile.seriousRelationship')}</SelectItem>
                      <SelectItem value="casual">{t('profile.casualDating')}</SelectItem>
                      <SelectItem value="friendship">{t('profile.friendship')}</SelectItem>
                      <SelectItem value="not-sure">{t('profile.notSpecified')}</SelectItem>
                      <SelectItem value="prefer-not-say">{t('profile.preferNotToSay')}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="gender">{t('profile.gender')}</Label>
                  <Select
                    value={profile.gender || ""}
                    onValueChange={(value) => setProfile({ ...profile, gender: value })}
                  >
                    <SelectTrigger id="gender">
                      <SelectValue placeholder={t('common.selectGender')} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="male">{t('common.male')}</SelectItem>
                      <SelectItem value="female">{t('common.female')}</SelectItem>
                      <SelectItem value="transgender">{t('common.transgender')}</SelectItem>
                      <SelectItem value="genderfluid">{t('common.genderfluid')}</SelectItem>
                      <SelectItem value="non-binary">{t('common.nonBinary')}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="sexual-orientation">{t('common.sexualOrientation')}</Label>
                  <Select
                    value={profile.sexual_orientation || ""}
                    onValueChange={(value) => setProfile({ ...profile, sexual_orientation: value })}
                  >
                    <SelectTrigger id="sexual-orientation">
                      <SelectValue placeholder={t('common.selectOrientation')} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="heterosexual">{t('common.heterosexual')}</SelectItem>
                      <SelectItem value="homosexual">{t('common.homosexual')}</SelectItem>
                      <SelectItem value="bisexual">{t('common.bisexual')}</SelectItem>
                      <SelectItem value="pansexual">{t('common.pansexual')}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="city">{t('profile.location')} {requiresCompletion && <span className="text-destructive">*</span>}</Label>
                  {profile.location_locked ? (
                    <div className="space-y-3">
                      <div className="relative">
                        <Input
                          value={profile.city || ""}
                          disabled
                          className="bg-muted cursor-not-allowed pr-10"
                        />
                        <MapPin className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      </div>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setShowLocationRequest(true)}
                        className="w-full"
                      >
                        <MapPin className="h-4 w-4 mr-2" />
                        {t('profile.requestLocationChange')}
                      </Button>
                    </div>
                  ) : (
                    <PlacesAutocomplete
                      value={profile.city || ""}
                      onChange={handleCityChange}
                      placeholder={t('profile.locationPlaceholder')}
                      id="city"
                    />
                  )}
                </div>

                <div className="space-y-2">
                  <Label>Data di Nascita {requiresCompletion && <span className="text-destructive">*</span>}</Label>
                  {profile.birthdate_locked ? (
                    <div className="space-y-3">
                      <div className="grid grid-cols-3 gap-2">
                        <Input
                          value={birthDay || ""}
                          disabled
                          className="bg-muted cursor-not-allowed"
                          placeholder="Giorno"
                        />
                        <Input
                          value={birthMonth ? ['Gen', 'Feb', 'Mar', 'Apr', 'Mag', 'Giu', 'Lug', 'Ago', 'Set', 'Ott', 'Nov', 'Dic'][parseInt(birthMonth) - 1] : ""}
                          disabled
                          className="bg-muted cursor-not-allowed"
                          placeholder="Mese"
                        />
                        <Input
                          value={birthYear || ""}
                          disabled
                          className="bg-muted cursor-not-allowed"
                          placeholder="Anno"
                        />
                      </div>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setShowBirthdateRequest(true)}
                        className="w-full"
                      >
                        <Calendar className="h-4 w-4 mr-2" />
                        Richiedi Cambio Data di Nascita
                      </Button>
                    </div>
                  ) : (
                    <>
                      <div className="grid grid-cols-3 gap-2">
                        <Select value={birthDay} onValueChange={setBirthDay} required={requiresCompletion}>
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder="Giorno" />
                          </SelectTrigger>
                          <SelectContent className="bg-background z-50 max-h-60">
                            {Array.from({ length: 31 }, (_, i) => i + 1).map(day => (
                              <SelectItem key={day} value={day.toString()}>
                                {day}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        
                        <Select value={birthMonth} onValueChange={setBirthMonth} required={requiresCompletion}>
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder="Mese" />
                          </SelectTrigger>
                          <SelectContent className="bg-background z-50">
                            <SelectItem value="1">Gennaio</SelectItem>
                            <SelectItem value="2">Febbraio</SelectItem>
                            <SelectItem value="3">Marzo</SelectItem>
                            <SelectItem value="4">Aprile</SelectItem>
                            <SelectItem value="5">Maggio</SelectItem>
                            <SelectItem value="6">Giugno</SelectItem>
                            <SelectItem value="7">Luglio</SelectItem>
                            <SelectItem value="8">Agosto</SelectItem>
                            <SelectItem value="9">Settembre</SelectItem>
                            <SelectItem value="10">Ottobre</SelectItem>
                            <SelectItem value="11">Novembre</SelectItem>
                            <SelectItem value="12">Dicembre</SelectItem>
                          </SelectContent>
                        </Select>
                        
                        <Select value={birthYear} onValueChange={setBirthYear} required={requiresCompletion}>
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder="Anno" />
                          </SelectTrigger>
                          <SelectContent className="bg-background z-50 max-h-60">
                            {Array.from({ length: 83 }, (_, i) => new Date().getFullYear() - 18 - i).map(year => (
                              <SelectItem key={year} value={year.toString()}>
                                {year}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      {requiresCompletion && (
                        <p className="text-xs text-muted-foreground">
                          ⚠️ Campo obbligatorio - Devi avere almeno 18 anni
                        </p>
                      )}
                    </>
                  )}
                </div>
              </div>

              {/* Relationship Status */}
              <div className="space-y-2">
                <Label htmlFor="relationship-status">{t('profile.relationshipState')}</Label>
                <Select
                  value={profile.relationship_status || ""}
                  onValueChange={(value) => setProfile({ ...profile, relationship_status: value })}
                >
                  <SelectTrigger id="relationship-status" className="max-w-xs">
                    <SelectValue placeholder={t('profile.selectStatus')} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="single">{t('profile.single')}</SelectItem>
                    <SelectItem value="sposato">{t('profile.married')}</SelectItem>
                    <SelectItem value="divorziato">{t('profile.divorced')}</SelectItem>
                    <SelectItem value="vedovo">{t('profile.widowed')}</SelectItem>
                    <SelectItem value="preferisco_non_dirlo">{t('profile.preferNotToSay')}</SelectItem>
                    <SelectItem value="scoprilo">{t('profile.findOut')}</SelectItem>
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
                <Label htmlFor="interests">{t('common.interestsLabel')}</Label>
                <InterestsAutocomplete
                  selectedInterests={interests}
                  onInterestsChange={setInterests}
                  maxInterests={4}
                />
              </div>

              {/* Online Status Toggle */}
              <div className="flex items-center justify-between space-x-2 p-4 border rounded-lg">
                <div className="space-y-0.5">
                  <Label htmlFor="show-online-status" className="text-base">
                    {t('profile.showOnlineStatus')}
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    {t('profile.showOnlineStatusDescription')}
                  </p>
                </div>
                <Switch
                  id="show-online-status"
                  checked={profile.show_online_status ?? true}
                  onCheckedChange={(checked) => setProfile({ ...profile, show_online_status: checked })}
                />
              </div>

              {/* Favorite Songs */}
              <div className="space-y-2">
                <Label>🎵 Canzoni Preferite (max 5)</Label>
                <p className="text-sm text-muted-foreground mb-2">
                  Aggiungi le tue canzoni preferite da Spotify per far sapere agli altri i tuoi gusti musicali
                </p>
                <SpotifySongSelector
                  selectedSongs={favoriteSongs}
                  onSongsChange={setFavoriteSongs}
                  maxSongs={5}
                />
              </div>

              <div className="flex gap-3">
                <Button 
                  type="button" 
                  variant="outline" 
                  className="flex-1"
                  onClick={() => navigate("/")}
                  disabled={saving}
                >
                  {t('common.cancel')}
                </Button>
                <Button 
                  type="submit" 
                  className="flex-1" 
                  disabled={saving}
                >
                  <Save className="h-4 w-4 mr-2" />
                  {saving ? t('profile.saving') : t('profile.save')}
                </Button>
              </div>

              {/* Account Deletion Section */}
              <div className="mt-8 pt-8 border-t border-destructive/20">
                <div className="space-y-4">
                  <p className="text-sm text-muted-foreground">
                    Questa azione è permanente e non può essere annullata. Tutti i tuoi dati verranno eliminati definitivamente dopo l'approvazione del supporto.
                  </p>

                  {deletionRequested ? (
                    <Alert className="border-orange-500 bg-orange-50 dark:bg-orange-950">
                      <AlertCircle className="h-4 w-4 text-orange-600" />
                      <AlertDescription className="text-orange-800 dark:text-orange-200">
                        <strong>Richiesta in elaborazione</strong><br />
                        La tua richiesta di eliminazione account è in attesa di approvazione dal supporto. Riceverai una notifica via email quando verrà elaborata.
                      </AlertDescription>
                    </Alert>
                  ) : (
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="destructive" type="button">
                          <X className="h-4 w-4 mr-2" />
                          Richiedi Eliminazione Account
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Sei assolutamente sicuro?</AlertDialogTitle>
                          <AlertDialogDescription className="space-y-3">
                            <p>
                              Questa azione richiederà l'approvazione del supporto clienti. Una volta approvata, il tuo account verrà eliminato definitivamente e:
                            </p>
                            <ul className="list-disc pl-6 space-y-1">
                              <li>Perderai tutti i tuoi dati personali</li>
                              <li>Tutti i tuoi messaggi verranno eliminati</li>
                              <li>Perderai tutti i tuoi match</li>
                              <li>Non potrai recuperare il tuo account</li>
                            </ul>
                            <p className="text-destructive font-semibold">
                              Questa operazione è irreversibile!
                            </p>
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Annulla</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={handleRequestAccountDeletion}
                            className="bg-destructive hover:bg-destructive/90"
                          >
                            Conferma Richiesta
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  )}
                </div>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ProfileEdit;