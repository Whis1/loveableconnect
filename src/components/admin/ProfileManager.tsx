import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Switch } from "@/components/ui/switch";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useTranslation } from "react-i18next";
import { Users, MessageSquare, Save, Upload, X, Image as ImageIcon, Search, Heart, Link2, Send } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { AdminChatDialog } from "./AdminChatDialog";
import { InterestsAutocomplete } from "@/components/InterestsAutocomplete";
import { SpotifySongSelector } from "@/components/SpotifySongSelector";

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
  nickname: string;
  full_name: string;
  age: number | null;
  bio: string | null;
  city: string | null;
  gender: string | null;
  sexual_orientation: string | null;
  relationship_status: string | null;
  relationship_type: string | null;
  looking_for: string[] | null;
  interests: string[] | null;
  avatar_url: string | null;
  photos: string[] | null;
  favorite_songs?: SpotifySong[] | null;
  user_images_link?: string | null;
  manual_online_status?: boolean | null;
}

interface Message {
  id: string;
  content: string;
  created_at: string;
  sender_id: string;
  receiver_id: string;
  sender_profile?: { nickname: string; avatar_url?: string };
  receiver_profile?: { nickname: string; avatar_url?: string };
}

interface UserProfile {
  id: string;
  nickname: string;
  full_name: string;
  age: number | null;
  city: string | null;
  avatar_url: string | null;
  bio: string | null;
}

// Valori validi corrispondenti alle opzioni mostrate nei form (admin e
// utente). Usati per la pulizia/allineamento dei profili esistenti.
const VALID_GENDERS = new Set(["male", "female", "transgender", "genderfluid", "non-binary"]);
const VALID_ORIENTATIONS = new Set(["heterosexual", "homosexual", "bisexual", "pansexual"]);
const VALID_RELATIONSHIP_TYPES = new Set(["serious", "casual", "friendship", "not-sure", "prefer-not-say"]);
// Nomi italiani maschili che finiscono in 'a' (eccezioni alla regola
// generale "se finisce in 'a' → femmina"). Lista limitata ai piu' comuni.
const MALE_NAMES_ENDING_A = new Set([
  "andrea", "luca", "nicola", "mattia", "elia", "tobia",
  "giona", "battista", "barnaba", "isaia",
]);
// Migrazione di vecchi valori di "Cosa cerchi" salvati come stringhe
// italiane in looking_for (vecchio admin form) verso i codici nuovi.
const LOOKING_FOR_MIGRATION: Record<string, string> = {
  "Relazione seria": "serious",
  "Incontri casuali": "casual",
  "Amicizia": "friendship",
  "Non specifico": "not-sure",
  "Non specificato": "not-sure",
  "Preferisco non dirlo": "prefer-not-say",
};

// Pool di canzoni preferite per fascia d'eta'. Quando un profilo admin non
// ha canzoni preferite, l'allineamento ne pesca 1-4 dalla fascia giusta:
// piu' giovane = pop/trap recente, piu' grande = classici/boomer.
type AgePool = "young" | "millennial" | "genx" | "boomer";
const SONG_POOLS: Record<AgePool, Array<{ name: string; artist: string; album: string }>> = {
  // 18-25 (Gen Z): pop/trap/hit recenti
  young: [
    { name: "Brividi", artist: "Mahmood & Blanco", album: "Sanremo 2022" },
    { name: "La dolce vita", artist: "Fedez, Tananai, Mara Sattei", album: "Disumano" },
    { name: "Mille", artist: "Fedez, Achille Lauro, Orietta Berti", album: "Mille" },
    { name: "La canzone nostra", artist: "Mace, Blanco, Salmo", album: "OBE" },
    { name: "Tropicana", artist: "Boomdabash, Annalisa", album: "Don't Worry (Best of)" },
    { name: "Bellissima", artist: "Annalisa", album: "Bellissima" },
    { name: "Sesso e samba", artist: "Tony Effe, Gaia", album: "Icon" },
    { name: "Espresso", artist: "Sabrina Carpenter", album: "Short n' Sweet" },
    { name: "Houdini", artist: "Dua Lipa", album: "Radical Optimism" },
    { name: "As It Was", artist: "Harry Styles", album: "Harry's House" },
    { name: "I Wanna Be Yours", artist: "Arctic Monkeys", album: "AM" },
    { name: "Cha Cha Cha", artist: "Käärijä", album: "Eurovision 2023" },
  ],
  // 26-35 (Millennials): hits 2005-2015
  millennial: [
    { name: "Quanto ti amo", artist: "Tiziano Ferro", album: "Ferro" },
    { name: "La differenza tra me e te", artist: "Tiziano Ferro", album: "Alla mia eta'" },
    { name: "Andra' tutto bene", artist: "Marracash", album: "Persona" },
    { name: "Vieni a ballare in Puglia", artist: "Caparezza", album: "Le dimensioni del mio caos" },
    { name: "Cosa mi manchi a fare", artist: "Calcutta", album: "Mainstream" },
    { name: "Viva la Vida", artist: "Coldplay", album: "Viva la Vida or Death and All His Friends" },
    { name: "Rolling in the Deep", artist: "Adele", album: "21" },
    { name: "Someone Like You", artist: "Adele", album: "21" },
    { name: "Get Lucky", artist: "Daft Punk, Pharrell Williams", album: "Random Access Memories" },
    { name: "Sweater Weather", artist: "The Neighbourhood", album: "I Love You" },
    { name: "Riptide", artist: "Vance Joy", album: "God Loves You When You're Dancing" },
    { name: "Sex on Fire", artist: "Kings of Leon", album: "Only by the Night" },
  ],
  // 36-50 (Gen X): rock/pop anni 80-90
  genx: [
    { name: "Vita spericolata", artist: "Vasco Rossi", album: "Bollicine" },
    { name: "Albachiara", artist: "Vasco Rossi", album: "Non si vive senza..." },
    { name: "Certe notti", artist: "Ligabue", album: "Buon compleanno Elvis" },
    { name: "Piccola stella senza cielo", artist: "Ligabue", album: "Lambrusco coltelli rose & pop corn" },
    { name: "Il bambino con i suoi occhi blu", artist: "883", album: "La donna il sogno & il grande incubo" },
    { name: "Smells Like Teen Spirit", artist: "Nirvana", album: "Nevermind" },
    { name: "Wonderwall", artist: "Oasis", album: "(What's the Story) Morning Glory?" },
    { name: "One", artist: "U2", album: "Achtung Baby" },
    { name: "Bohemian Rhapsody", artist: "Queen", album: "A Night at the Opera" },
    { name: "Hotel California", artist: "Eagles", album: "Hotel California" },
    { name: "Stairway to Heaven", artist: "Led Zeppelin", album: "Led Zeppelin IV" },
    { name: "Sweet Child o' Mine", artist: "Guns N' Roses", album: "Appetite for Destruction" },
  ],
  // 51+ (Boomer): classici italiani e internazionali
  boomer: [
    { name: "Il cielo in una stanza", artist: "Mina", album: "Studio Uno" },
    { name: "La cura", artist: "Franco Battiato", album: "L'imboscata" },
    { name: "Centro di gravita' permanente", artist: "Franco Battiato", album: "La voce del padrone" },
    { name: "La canzone del sole", artist: "Lucio Battisti", album: "Umanamente uomo: il sogno" },
    { name: "Pensieri e parole", artist: "Lucio Battisti", album: "Pensieri e parole" },
    { name: "Caruso", artist: "Lucio Dalla", album: "DallAmeriCaruso" },
    { name: "Bocca di rosa", artist: "Fabrizio De Andre'", album: "Volume 1" },
    { name: "La canzone di Marinella", artist: "Fabrizio De Andre'", album: "Volume III" },
    { name: "Imagine", artist: "John Lennon", album: "Imagine" },
    { name: "Yesterday", artist: "The Beatles", album: "Help!" },
    { name: "Wish You Were Here", artist: "Pink Floyd", album: "Wish You Were Here" },
    { name: "Hey Jude", artist: "The Beatles", album: "Hey Jude" },
  ],
};

function getSongPoolForAge(age: number | null | undefined): AgePool {
  if (!age || age < 0) return "millennial"; // fallback ragionevole
  if (age <= 25) return "young";
  if (age <= 35) return "millennial";
  if (age <= 50) return "genx";
  return "boomer";
}

function pickRandomSongs(
  pool: any[],
  count: number
): any[] {
  const shuffled = [...pool].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, Math.min(count, shuffled.length));
}

// Seed di query random per fascia d'eta'. Permette di pescare canzoni
// "a tema generazione" pur restando randomiche (combinati con una
// lettera, fanno query come "rock x", "anni 80 m", "trap b").
const RANDOM_QUERY_SEEDS: Record<AgePool, string[]> = {
  young: ["pop", "trap", "love", "vibe", "summer", "hit", "night", "dance", "italo", "rave", "indie", "rap"],
  millennial: ["pop", "indie", "rock", "ballad", "love", "summer", "anni 2000", "hit", "you", "tonight", "remix"],
  genx: ["rock", "anni 90", "italia", "amore", "notte", "sole", "anni 80", "punk", "ligabue", "vasco", "grunge"],
  boomer: ["classic", "italia", "amore", "vita", "anni 70", "battisti", "mina", "battiato", "queen", "beatles", "de andre"],
};
const RANDOM_LETTERS = "abcdefghijklmnopqrstuvwxyz".split("");

function generateRandomQueryForAge(age: number | null | undefined): string {
  const pool = getSongPoolForAge(age);
  const seeds = RANDOM_QUERY_SEEDS[pool];
  const seed = seeds[Math.floor(Math.random() * seeds.length)];
  const letter = RANDOM_LETTERS[Math.floor(Math.random() * RANDOM_LETTERS.length)];
  // 3 strategie random per massimizzare varieta':
  const mode = Math.floor(Math.random() * 3);
  if (mode === 0) return seed;
  if (mode === 1) return letter;
  return `${seed} ${letter}`;
}

// Cerca brani su Spotify (con fallback /api/music-search) per una query.
const searchTracks = async (query: string): Promise<any[]> => {
  try {
    const { data, error } = await supabase.functions.invoke("spotify-search", {
      body: { query },
    });
    if (!error) {
      const tracks = (data?.tracks || []) as any[];
      if (tracks.length > 0) return tracks;
    }
  } catch {
    /* try fallback */
  }
  try {
    const response = await fetch(`/api/music-search?query=${encodeURIComponent(query)}`);
    if (response.ok) {
      const json = await response.json();
      return (json?.tracks || []) as any[];
    }
  } catch {
    /* nothing more */
  }
  return [];
};

// Per un profilo, fa 1-3 ricerche random e pesca count brani UNICI (mai
// gia' usati da altri profili in questa sessione di allineamento). Usa
// globalSeenIds come "memoria condivisa" per evitare duplicati tra card.
const fetchUniqueSongsForProfile = async (
  age: number | null | undefined,
  count: number,
  globalSeenIds: Set<string>
): Promise<any[]> => {
  const picked: any[] = [];
  let attempts = 0;
  const MAX_ATTEMPTS = 4;

  while (picked.length < count && attempts < MAX_ATTEMPTS) {
    attempts++;
    const query = generateRandomQueryForAge(age);
    const tracks = await searchTracks(query);

    // Shuffle per evitare di pescare sempre il primo
    const shuffled = [...tracks].sort(() => Math.random() - 0.5);
    for (const t of shuffled) {
      if (picked.length >= count) break;
      if (!t || !t.id) continue;
      if (globalSeenIds.has(t.id)) continue;
      // Accetta solo brani con copertina o preview (almeno uno)
      if (!t.image_url && !t.preview_url) continue;
      globalSeenIds.add(t.id);
      picked.push(t);
    }
  }

  // Se ancora non bastano, ultima chance: rilassa il globalSeenIds (permetti
  // duplicati con altri profili) per quel profilo specifico.
  if (picked.length < count) {
    const query = generateRandomQueryForAge(age);
    const tracks = await searchTracks(query);
    const shuffled = [...tracks].sort(() => Math.random() - 0.5);
    for (const t of shuffled) {
      if (picked.length >= count) break;
      if (!t || !t.id) continue;
      if (picked.find((s) => s.id === t.id)) continue; // no duplicati interni al profilo
      if (!t.image_url && !t.preview_url) continue;
      picked.push(t);
    }
  }

  return picked;
};

// (Legacy) Cerca UN singolo brano da una query — rimasto per compatibilita'
// ma non piu' usato dall'allineamento (che ora cerca per profilo).
const searchOneSong = async (query: string): Promise<any | null> => {
  // 1) Spotify edge function
  try {
    const { data, error } = await supabase.functions.invoke("spotify-search", {
      body: { query },
    });
    if (!error) {
      const tracks = (data?.tracks || []) as any[];
      if (tracks.length > 0) {
        const ideal = tracks.find((t) => t.preview_url && t.image_url);
        if (ideal) return ideal;
        const onlyImage = tracks.find((t) => t.image_url);
        if (onlyImage) return onlyImage;
        const onlyPreview = tracks.find((t) => t.preview_url);
        if (onlyPreview) return onlyPreview;
      }
    }
  } catch (e) {
    console.warn(`spotify-search KO per "${query}":`, e);
  }

  // 2) Fallback API musicale (stesso flow di SpotifySongSelector)
  try {
    const response = await fetch(
      `/api/music-search?query=${encodeURIComponent(query)}`
    );
    if (response.ok) {
      const json = await response.json();
      const tracks = (json?.tracks || []) as any[];
      if (tracks.length > 0) {
        const ideal = tracks.find((t) => t.preview_url && t.image_url);
        if (ideal) return ideal;
        const onlyImage = tracks.find((t) => t.image_url);
        if (onlyImage) return onlyImage;
        const onlyPreview = tracks.find((t) => t.preview_url);
        if (onlyPreview) return onlyPreview;
      }
    }
  } catch (e) {
    console.warn(`/api/music-search KO per "${query}":`, e);
  }

  return null;
};

// Arricchisce le pool con dati Spotify reali (copertina + preview audio).
const enrichSongPoolsWithSpotify = async (): Promise<Record<AgePool, any[]>> => {
  const result: Record<AgePool, any[]> = {
    young: [],
    millennial: [],
    genx: [],
    boomer: [],
  };
  const pools: AgePool[] = ["young", "millennial", "genx", "boomer"];

  for (const pool of pools) {
    const songs = SONG_POOLS[pool];
    // Batch di 5 in parallelo per non saturare l'edge function
    for (let i = 0; i < songs.length; i += 5) {
      const batch = songs.slice(i, i + 5);
      const enriched = await Promise.all(
        batch.map((s) => searchOneSong(`${s.name} ${s.artist}`))
      );
      enriched.forEach((t, idx) => {
        if (t) {
          // Logga ogni successo per facilitare il debug
          console.log(
            `🎵 [${pool}] "${batch[idx].name}" → "${t.name}" by ${t.artist} (img:${!!t.image_url}, preview:${!!t.preview_url})`
          );
          result[pool].push(t);
        } else {
          console.warn(`❌ [${pool}] Nessun risultato per "${batch[idx].name} - ${batch[idx].artist}"`);
        }
      });
    }
  }
  return result;
};

function inferGenderFromName(nickname: string): string {
  const lower = (nickname || "").toLowerCase().trim();
  if (!lower) return Math.random() < 0.5 ? "male" : "female";
  if (MALE_NAMES_ENDING_A.has(lower)) return "male";
  const lastChar = lower[lower.length - 1];
  if (lastChar === "a") return "female";
  if (lastChar === "o") return "male";
  // Nomi neutri (finiscono in e/i/u o consonante): scelta random
  return Math.random() < 0.5 ? "male" : "female";
}

export const ProfileManager = () => {
  const { toast } = useToast();
  const { t } = useTranslation();
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [aligning, setAligning] = useState(false);
  // Id del profilo il cui dialog di modifica e' aperto. Rendiamo il
  // Dialog "controllato" cosi' possiamo chiuderlo dopo Salva Modifiche.
  const [editingProfileId, setEditingProfileId] = useState<string | null>(null);
  const [selectedProfile, setSelectedProfile] = useState<Profile | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [uploadingImages, setUploadingImages] = useState<{ [key: string]: boolean }>({});
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [profileLikes, setProfileLikes] = useState<{ [profileId: string]: string[] }>({});
  const [chatDialogOpen, setChatDialogOpen] = useState(false);
  const [selectedChatProfile, setSelectedChatProfile] = useState<{ profileId: string; profileNickname: string; userId: string; userNickname: string } | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [likesSearchQuery, setLikesSearchQuery] = useState("");
  const [tempImageLinks, setTempImageLinks] = useState<{ [profileId: string]: string }>({});

  const getGenderLabel = (gender: string | null) => {
    if (!gender) return "";
    const key = gender.toLowerCase();
    const genderMap: Record<string, string> = {
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
    return genderMap[key] || gender;
  };

  const getOrientationLabel = (orientation: string | null) => {
    if (!orientation) return "";
    const key = orientation.toLowerCase();
    const orientationMap: Record<string, string> = {
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
    return orientationMap[key] || orientation;
  };

  useEffect(() => {
    fetchProfiles();
    fetchUsers();
  }, []);

  const fetchProfiles = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('admin-list-profiles');
      if (error || !data?.success) throw new Error(error?.message || data?.error || 'Failed to load');
      const profilesData = (data.profiles || []) as Profile[];
      setProfiles(profilesData);
    } catch (error: any) {
      console.error("Error fetching profiles:", error);
      toast({
        title: "Errore",
        description: "Impossibile caricare i profili",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchUsers = async () => {
    setLoadingUsers(true);
    try {
      const { data, error } = await supabase.functions.invoke('admin-list-all-profiles');
      if (error || !data?.success) throw new Error(error?.message || data?.error || 'Failed to load');
      
      setUsers((data.profiles || []) as UserProfile[]);
    } catch (error: any) {
      console.error("Error fetching users:", error);
      toast({
        title: "Errore",
        description: "Impossibile caricare gli utenti",
        variant: "destructive",
      });
    } finally {
      setLoadingUsers(false);
    }
  };

  const fetchProfileLikes = async (profileId: string) => {
    try {
      const { data, error } = await supabase.functions.invoke('admin-get-profile-likes', {
        body: { profileId },
      });
      if (error || !data?.success) throw new Error(error?.message || data?.error || 'Failed to load likes');
      const likedUserIds = (data.likes || []).map((l: { to_user_id: string }) => l.to_user_id);
      setProfileLikes(prev => ({ ...prev, [profileId]: likedUserIds }));
    } catch (error: any) {
      console.error("Error fetching profile likes:", error);
    }
  };

  const handleToggleLike = async (profileId: string, userId: string) => {
    const currentLikes = profileLikes[profileId] || [];
    const isLiked = currentLikes.includes(userId);

    try {
      const action = isLiked ? 'remove' : 'add';
      
      const { data, error } = await supabase.functions.invoke('admin-manage-like', {
        body: { 
          action, 
          fromUserId: profileId, 
          toUserId: userId 
        },
      });

      if (error || !data.success) {
        throw new Error(error?.message || data.error || 'Operation failed');
      }

      if (isLiked) {
        setProfileLikes(prev => ({
          ...prev,
          [profileId]: currentLikes.filter(id => id !== userId)
        }));

        toast({
          title: "Like rimosso",
          description: "Il like è stato rimosso",
        });
      } else {
        if (data.match_created) {
          setProfileLikes(prev => ({
            ...prev,
            [profileId]: currentLikes.filter(id => id !== userId)
          }));

          toast({
            title: "🎉 Match creato!",
            description: "È stato creato un match con questo utente",
          });
        } else {
          setProfileLikes(prev => ({
            ...prev,
            [profileId]: [...currentLikes, userId]
          }));

          toast({
            title: "Like aggiunto",
            description: "Il like è stato aggiunto",
          });
        }
      }

      await fetchProfileLikes(profileId);
    } catch (error: any) {
      console.error("Error toggling like:", error);
      toast({
        title: "Errore",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleAvatarUpload = async (profileId: string, file: File) => {
    setUploadingImages({ ...uploadingImages, [`${profileId}-avatar`]: true });
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${profileId}-avatar-${Date.now()}.${fileExt}`;
      
      const formData = new FormData();
      formData.append('file', file);
      formData.append('fileName', fileName);
      formData.append('bucket', 'profile-images');

      const { data, error: uploadError } = await supabase.functions.invoke('admin-upload-image', {
        body: formData,
      });

      if (uploadError || !data.success) {
        throw new Error(uploadError?.message || data.error || 'Upload failed');
      }

      const { data: updateData, error: updateError } = await supabase.functions.invoke('admin-update-profile', {
        body: { profileId, updates: { avatar_url: fileName } },
      });

      if (updateError || !updateData.success) {
        throw new Error(updateError?.message || updateData.error || 'Update failed');
      }

      toast({
        title: "Avatar caricato",
        description: "L'immagine profilo è stata aggiornata",
      });

      fetchProfiles();
    } catch (error: any) {
      console.error("Error uploading avatar:", error);
      toast({
        title: "Errore",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setUploadingImages({ ...uploadingImages, [`${profileId}-avatar`]: false });
    }
  };

  const handleGalleryUpload = async (profileId: string, file: File) => {
    const profile = profiles.find(p => p.id === profileId);
    if (!profile) return;
    
    if ((profile.photos || []).length >= 6) {
      toast({
        title: t("profile.limitReached"),
        description: t("profile.maxPhotos"),
        variant: "destructive",
      });
      return;
    }

    setUploadingImages({ ...uploadingImages, [`${profileId}-gallery`]: true });
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${profileId}-gallery-${Date.now()}.${fileExt}`;
      
      const formData = new FormData();
      formData.append('file', file);
      formData.append('fileName', fileName);
      formData.append('bucket', 'profile-images');

      const { data, error: uploadError } = await supabase.functions.invoke('admin-upload-image', {
        body: formData,
      });

      if (uploadError || !data.success) {
        throw new Error(uploadError?.message || data.error || 'Upload failed');
      }

      const updatedPhotos = [...(profile.photos || []), fileName];
      
      const { data: updateData, error: updateError } = await supabase.functions.invoke('admin-update-profile', {
        body: { profileId, updates: { photos: updatedPhotos } },
      });

      if (updateError || !updateData.success) {
        throw new Error(updateError?.message || updateData.error || 'Update failed');
      }

      toast({
        title: "Foto aggiunta",
        description: "La foto è stata aggiunta alla galleria",
      });

      fetchProfiles();
    } catch (error: any) {
      console.error("Error uploading gallery photo:", error);
      toast({
        title: "Errore",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setUploadingImages({ ...uploadingImages, [`${profileId}-gallery`]: false });
    }
  };

  const handleRemoveGalleryPhoto = async (profileId: string, photoUrl: string) => {
    const profile = profiles.find(p => p.id === profileId);
    if (!profile) return;

    try {
      const { data, error: deleteError } = await supabase.functions.invoke('admin-delete-image', {
        body: { filePath: photoUrl, bucket: 'profile-images' },
      });

      if (deleteError || !data.success) {
        throw new Error(deleteError?.message || data.error || 'Delete failed');
      }

      const updatedPhotos = (profile.photos || []).filter(p => p !== photoUrl);
      
      const { data: updateData, error: updateError } = await supabase.functions.invoke('admin-update-profile', {
        body: { profileId, updates: { photos: updatedPhotos } },
      });

      if (updateError || !updateData.success) {
        throw new Error(updateError?.message || updateData.error || 'Update failed');
      }

      toast({
        title: "Foto rimossa",
        description: "La foto è stata rimossa dalla galleria",
      });

      fetchProfiles();
    } catch (error: any) {
      console.error("Error removing photo:", error);
      toast({
        title: "Errore",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleUpdateProfile = async (profile: Profile): Promise<boolean> => {
    try {
      const { data, error } = await supabase.functions.invoke('admin-update-profile', {
        body: {
            profileId: profile.id,
            updates: {
              nickname: profile.nickname,
              age: profile.age,
              bio: profile.bio,
              city: profile.city,
              gender: profile.gender,
              sexual_orientation: profile.sexual_orientation,
              relationship_status: profile.relationship_status,
              relationship_type: profile.relationship_type,
              looking_for: profile.looking_for,
              interests: profile.interests,
              favorite_songs: profile.favorite_songs ? JSON.parse(JSON.stringify(profile.favorite_songs)) : null,
              user_images_link: profile.user_images_link,
              manual_online_status: profile.manual_online_status,
            }
          },
        });

      if (error || !data.success) {
        throw new Error(error?.message || data.error || 'Update failed');
      }

      toast({
        title: "Profilo aggiornato",
        description: "Le modifiche sono state salvate",
      });

      fetchProfiles();
      return true;
    } catch (error: any) {
      console.error("Error updating profile:", error);
      toast({
        title: "Errore",
        description: error.message,
        variant: "destructive",
      });
      return false;
    }
  };

  const handleSaveImageLink = async (profileId: string) => {
    const link = tempImageLinks[profileId];
    if (!link || !link.trim()) {
      toast({
        title: "Errore",
        description: "Inserisci un link valido",
        variant: "destructive",
      });
      return;
    }

    try {
      const { data, error } = await supabase.functions.invoke('admin-update-profile', {
        body: {
          profileId,
          updates: { user_images_link: link.trim() }
        },
      });

      if (error || !data.success) {
        throw new Error(error?.message || data.error || 'Update failed');
      }

      toast({
        title: "Link salvato",
        description: "Il link alle immagini è stato aggiunto",
      });

      setTempImageLinks({ ...tempImageLinks, [profileId]: "" });
      fetchProfiles();
    } catch (error: any) {
      console.error("Error saving image link:", error);
      toast({
        title: "Errore",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleDeleteImageLink = async (profileId: string) => {
    try {
      const { data, error } = await supabase.functions.invoke('admin-update-profile', {
        body: {
          profileId,
          updates: { user_images_link: null }
        },
      });

      if (error || !data.success) {
        throw new Error(error?.message || data.error || 'Update failed');
      }

      toast({
        title: "Link eliminato",
        description: "Il link alle immagini è stato rimosso",
      });

      fetchProfiles();
    } catch (error: any) {
      console.error("Error deleting image link:", error);
      toast({
        title: "Errore",
        description: error.message,
        variant: "destructive",
      });
    }
  };


  // Pulisce/allinea tutti i profili admin esistenti: tronca interessi a
  // max 4, sostituisce valori vecchi/non validi di genere e orientamento,
  // migra "Cosa cerchi" dal vecchio looking_for[] al nuovo relationship_type.
  // Svuota le canzoni preferite di tutti i profili admin, una sola query
  // diretta sulla tabella (RLS permette agli admin update su profiles).
  const handleClearAdminSongs = async () => {
    if (
      !confirm(
        "Svuotare le canzoni preferite di TUTTI i profili admin? " +
          "Servira' per testare di nuovo l'Allinea Profili."
      )
    )
      return;

    setAligning(true);
    try {
      const { data: adminProfiles, error: fetchError } = await supabase
        .from("profiles")
        .select("id")
        .eq("is_admin_profile", true);

      if (fetchError) throw fetchError;
      if (!adminProfiles || adminProfiles.length === 0) {
        toast({ title: "Nessun profilo admin trovato" });
        return;
      }

      let count = 0;
      const BATCH_SIZE = 8;
      for (let i = 0; i < adminProfiles.length; i += BATCH_SIZE) {
        const batch = adminProfiles.slice(i, i + BATCH_SIZE);
        await Promise.all(
          batch.map(async (p: any) => {
            try {
              await supabase.functions.invoke("admin-update-profile", {
                body: { profileId: p.id, updates: { favorite_songs: null } },
              });
              count++;
            } catch (e) {
              console.warn("Clear songs fallito per", p.id, e);
            }
          })
        );
      }

      toast({
        title: `Svuotate canzoni di ${count}/${adminProfiles.length} profili admin`,
        description: "Ora puoi rilanciare 'Allinea Profili' per riassegnarne di uniche.",
      });
      await fetchProfiles();
    } catch (error: any) {
      console.error("Error clearing admin songs:", error);
      toast({
        title: "Errore",
        description: error?.message || "Impossibile svuotare le canzoni",
        variant: "destructive",
      });
    } finally {
      setAligning(false);
    }
  };

  const handleAlignProfiles = async () => {
    if (
      !confirm(
        "Vuoi davvero allineare TUTTI i profili admin? L'azione cerca e sistema:\n\n" +
          "- Interessi > 4 (li tronca a 1-4 random)\n" +
          "- Genere non valido (lo deduce dal nickname)\n" +
          "- Orientamento non valido (default: Eterosessuale)\n" +
          "- 'Cosa cerchi' vecchio formato (migra a relationship_type)\n" +
          "- Canzoni preferite: aggiunge 1-4 brani random ai profili senza,\n" +
          "  scelti in base all'eta' (giovani = pop/trap recenti, boomer = classici)"
      )
    )
      return;

    setAligning(true);
    try {
      const { data: adminProfiles, error: fetchError } = await supabase
        .from("profiles")
        .select(
          "id, nickname, age, gender, sexual_orientation, interests, relationship_type, looking_for, favorite_songs"
        )
        .eq("is_admin_profile", true);

      if (fetchError) throw fetchError;
      if (!adminProfiles || adminProfiles.length === 0) {
        toast({ title: "Nessun profilo admin trovato" });
        return;
      }

      // Niente piu' pre-fetch della pool unica. Adesso ogni profilo fa una
      // sua ricerca Spotify random (lettera + parola tematica per fascia
      // d'eta'), cosi' i brani sono potenzialmente UNICI per profilo.
      toast({
        title: "Allineamento iniziato",
        description:
          "Per ogni profilo cerchero' su Spotify canzoni uniche. Puo' richiedere qualche secondo.",
      });
      // Memoria condivisa degli ID gia' usati: tra profili evitiamo doppioni.
      const globalSongIds = new Set<string>();
      // Pre-popola con gli ID Spotify gia' presenti nei profili (cosi' non
      // ri-assegniamo lo stesso brano a un altro profilo).
      for (const p of adminProfiles as any[]) {
        const songs = Array.isArray(p.favorite_songs) ? p.favorite_songs : [];
        for (const s of songs) {
          if (
            s?.id &&
            typeof s.id === "string" &&
            !s.id.startsWith("admin-curated-")
          ) {
            globalSongIds.add(s.id);
          }
        }
      }

      let countFixed = 0;
      let countInterests = 0;
      let countGender = 0;
      let countOrientation = 0;
      let countRelType = 0;
      let countSongs = 0;

      // Eseguiamo in batch da 5 per non saturare la edge function admin-update-profile.
      const BATCH_SIZE = 5;
      for (let i = 0; i < adminProfiles.length; i += BATCH_SIZE) {
        const batch = adminProfiles.slice(i, i + BATCH_SIZE);
        await Promise.all(
          batch.map(async (p: any) => {
            const updates: Record<string, unknown> = {};

            // 1. Interessi: max 4 (tronca a numero random 1..4)
            if (Array.isArray(p.interests) && p.interests.length > 4) {
              const shuffled = [...p.interests].sort(() => Math.random() - 0.5);
              const keep = 1 + Math.floor(Math.random() * 4);
              updates.interests = shuffled.slice(0, keep);
              countInterests++;
            }

            // 2. Genere: se non valido, deduci dal nickname
            if (!p.gender || !VALID_GENDERS.has(p.gender)) {
              updates.gender = inferGenderFromName(p.nickname || "");
              countGender++;
            }

            // 3. Orientamento: se non valido, default biased verso etero
            if (
              !p.sexual_orientation ||
              !VALID_ORIENTATIONS.has(p.sexual_orientation)
            ) {
              const r = Math.random();
              updates.sexual_orientation =
                r < 0.7 ? "heterosexual"
                : r < 0.85 ? "homosexual"
                : r < 0.93 ? "bisexual"
                : "pansexual";
              countOrientation++;
            }

            // 4. "Cosa cerchi": migra dal vecchio formato a relationship_type
            if (
              !p.relationship_type ||
              !VALID_RELATIONSHIP_TYPES.has(p.relationship_type)
            ) {
              const lookingFirst =
                Array.isArray(p.looking_for) && typeof p.looking_for[0] === "string"
                  ? p.looking_for[0]
                  : null;
              const migrated = lookingFirst && LOOKING_FOR_MIGRATION[lookingFirst];
              if (migrated) {
                updates.relationship_type = migrated;
                countRelType++;
              } else if (!p.relationship_type) {
                // Niente da migrare e campo vuoto: imposta un valore random
                // tra serious/casual/friendship (i piu' usati).
                const opts = ["serious", "casual", "friendship"];
                updates.relationship_type = opts[Math.floor(Math.random() * opts.length)];
                countRelType++;
              }
            }

            // 4-bis. Pulizia looking_for: le vecchie stringhe italiane
            // ("Relazione seria", "Amicizia", ecc.) NON appartengono al
            // campo looking_for (che dovrebbe contenere generi). Le rimuoviamo
            // cosi' la card della bacheca non mostra piu' duplicati tipo
            // "Relazione seria • Relazione seria".
            if (Array.isArray(p.looking_for) && p.looking_for.length > 0) {
              const cleaned = p.looking_for.filter(
                (item: string) => item && !(item in LOOKING_FOR_MIGRATION)
              );
              if (cleaned.length !== p.looking_for.length) {
                updates.looking_for = cleaned;
              }
            }

            // 5. Canzoni preferite UNICHE per profilo: ogni profilo fa la
            //    sua ricerca Spotify random (lettera + parola della sua
            //    fascia d'eta'). Cosi' nessuna card avra' le stesse canzoni
            //    di un'altra. Sostituiamo se: nessuna canzone OPPURE
            //    placeholder del nostro pool vecchio (id "admin-curated-*"
            //    o senza copertina/preview).
            const currentSongs = Array.isArray(p.favorite_songs)
              ? (p.favorite_songs as any[])
              : [];
            const allPlaceholder =
              currentSongs.length > 0 &&
              currentSongs.every(
                (s: any) =>
                  (typeof s?.id === "string" && s.id.startsWith("admin-curated-")) ||
                  (!s?.image_url && !s?.preview_url)
              );
            const needsSongs = currentSongs.length === 0 || allPlaceholder;

            if (needsSongs) {
              const howMany = 1 + Math.floor(Math.random() * 4); // 1..4
              const songs = await fetchUniqueSongsForProfile(
                p.age,
                howMany,
                globalSongIds
              );
              if (songs.length > 0) {
                updates.favorite_songs = songs;
                countSongs++;
              }
            }

            if (Object.keys(updates).length === 0) return;

            try {
              await supabase.functions.invoke("admin-update-profile", {
                body: { profileId: p.id, updates },
              });
              countFixed++;
            } catch (e) {
              console.warn("Update fallito per profilo", p.id, e);
            }
          })
        );
      }

      toast({
        title: `Allineati ${countFixed}/${adminProfiles.length} profili`,
        description:
          `Interessi: ${countInterests} | ` +
          `Genere: ${countGender} | ` +
          `Orientamento: ${countOrientation} | ` +
          `Cosa cerchi: ${countRelType} | ` +
          `🎵 Canzoni aggiunte: ${countSongs}`,
      });

      await fetchProfiles();
    } catch (error: any) {
      console.error("Error aligning profiles:", error);
      toast({
        title: "Errore",
        description: error?.message || "Impossibile allineare i profili",
        variant: "destructive",
      });
    } finally {
      setAligning(false);
    }
  };

  const filteredProfiles = profiles.filter((profile) =>
    profile.nickname.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <p className="text-muted-foreground">{t("common.loadingProfiles")}</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-4">
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Gestione Profili ({filteredProfiles.length})
            </CardTitle>
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Cerca per nickname..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>
          {/* Pulsanti admin: allineamento e svuota canzoni. */}
          <div className="pt-2 flex flex-wrap gap-2">
            <Button
              variant="outline"
              onClick={handleAlignProfiles}
              disabled={aligning || loading}
            >
              {aligning ? "Allineamento in corso..." : "🧹 Allinea Profili Admin"}
            </Button>
            <Button
              variant="outline"
              onClick={handleClearAdminSongs}
              disabled={aligning || loading}
            >
              🎵 Svuota canzoni admin
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[600px] pr-4">
            <Accordion 
              type="single" 
              collapsible 
              className="space-y-2"
              onValueChange={(value) => {
                // Carica i likes solo quando l'accordion viene espanso
                if (value && !profileLikes[value]) {
                  fetchProfileLikes(value);
                }
              }}
            >
              {filteredProfiles.map((profile) => (
                <AccordionItem key={profile.id} value={profile.id} className="border rounded-lg px-4">
                  <AccordionTrigger className="hover:no-underline">
                    <div className="flex items-center gap-3">
                      <Avatar className="h-10 w-10">
                        {profile.avatar_url ? (
                          <AvatarImage 
                            src={supabase.storage.from('profile-images').getPublicUrl(profile.avatar_url).data.publicUrl}
                          />
                        ) : null}
                        <AvatarFallback>{profile.nickname[0]?.toUpperCase()}</AvatarFallback>
                      </Avatar>
                      <div className="text-left">
                        <p className="font-semibold">{profile.nickname}</p>
                        <p className="text-sm text-muted-foreground">{profile.full_name}</p>
                      </div>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent>
                    <div className="space-y-4 pt-4">
                      {/* Link Immagini Utente */}
                      {profile.user_images_link && (
                        <div className="flex items-center gap-2">
                          <Link2 className="h-4 w-4 text-primary" />
                          <a
                            href={profile.user_images_link}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-primary font-medium hover:underline"
                          >
                            Immagini utente
                          </a>
                          <Button
                            onClick={() => handleDeleteImageLink(profile.id)}
                            size="icon"
                            variant="ghost"
                            className="h-6 w-6"
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      )}

                      {/* Input per aggiungere link */}
                      <div className="space-y-2">
                        <Label className="text-sm font-medium">Aggiungi link immagini utente</Label>
                        <div className="flex gap-2">
                          <Input
                            placeholder="Incolla qui il link..."
                            value={tempImageLinks[profile.id] || ""}
                            onChange={(e) => setTempImageLinks({ ...tempImageLinks, [profile.id]: e.target.value })}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") {
                                handleSaveImageLink(profile.id);
                              }
                            }}
                          />
                          <Button
                            onClick={() => handleSaveImageLink(profile.id)}
                            size="icon"
                            variant="default"
                          >
                            <Send className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </div>

                    <div className="flex gap-2 pt-4">
                      {/* Dialog Modifica Profilo — controllato con
                          editingProfileId per chiuderlo dopo il salvataggio */}
                      <Dialog
                        open={editingProfileId === profile.id}
                        onOpenChange={(open) =>
                          setEditingProfileId(open ? profile.id : null)
                        }
                      >
                        <DialogTrigger asChild>
                          <Button variant="outline" className="flex-1">
                            <Save className="h-4 w-4 mr-2" />
                            Modifica profilo
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-4xl max-h-[90vh]">
                          <DialogHeader>
                            <DialogTitle>Modifica Profilo: {profile.nickname}</DialogTitle>
                          </DialogHeader>
                          <ScrollArea className="max-h-[calc(90vh-120px)] pr-4">
                            <div className="space-y-4 pt-4">
                              {/* Avatar */}
                              <div className="space-y-2">
                                <Label>Foto Profilo</Label>
                                <div className="flex items-center gap-4">
                                  <Avatar className="h-20 w-20">
                                    {profile.avatar_url ? (
                                      <AvatarImage 
                                        src={supabase.storage.from('profile-images').getPublicUrl(profile.avatar_url).data.publicUrl} 
                                      />
                                    ) : null}
                                    <AvatarFallback>{profile.nickname[0]?.toUpperCase()}</AvatarFallback>
                                  </Avatar>
                                  <div>
                                    <Input
                                      type="file"
                                      accept="image/*"
                                      onChange={(e) => {
                                        const file = e.target.files?.[0];
                                        if (file) handleAvatarUpload(profile.id, file);
                                      }}
                                      disabled={uploadingImages[`${profile.id}-avatar`]}
                                      className="max-w-xs"
                                    />
                                    {uploadingImages[`${profile.id}-avatar`] && (
                                      <p className="text-sm text-muted-foreground mt-1">{t("common.uploadingImage")}</p>
                                    )}
                                  </div>
                                </div>
                              </div>

                              {/* Galleria Foto */}
                              <div className="space-y-3">
                                <Label>Galleria Foto ({(profile.photos || []).length}/6)</Label>
                                <div className="grid grid-cols-3 gap-3">
                                  {(profile.photos || []).map((photoUrl, index) => (
                                    <div key={index} className="relative group aspect-square">
                                      <img
                                        src={supabase.storage.from('profile-images').getPublicUrl(photoUrl).data.publicUrl}
                                        alt={`Foto ${index + 1}`}
                                        className="w-full h-full object-cover rounded-lg"
                                      />
                                      <Button
                                        variant="destructive"
                                        size="icon"
                                        className="absolute top-1 right-1 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                                        onClick={() => handleRemoveGalleryPhoto(profile.id, photoUrl)}
                                      >
                                        <X className="h-3 w-3" />
                                      </Button>
                                    </div>
                                  ))}
                                  {(profile.photos || []).length < 6 && (
                                    <label className="aspect-square border-2 border-dashed rounded-lg flex flex-col items-center justify-center cursor-pointer hover:bg-accent transition-colors">
                                      <Input
                                        type="file"
                                        accept="image/*"
                                        className="hidden"
                                        onChange={(e) => {
                                          const file = e.target.files?.[0];
                                          if (file) handleGalleryUpload(profile.id, file);
                                        }}
                                        disabled={uploadingImages[`${profile.id}-gallery`]}
                                      />
                                      {uploadingImages[`${profile.id}-gallery`] ? (
                                        <p className="text-xs">{t("common.uploadingImage")}</p>
                                      ) : (
                                        <>
                                          <ImageIcon className="h-6 w-6 mb-1 text-muted-foreground" />
                                          <p className="text-xs text-muted-foreground">{t("common.addPhoto")}</p>
                                        </>
                                      )}
                                    </label>
                                  )}
                                </div>
                              </div>

                              {/* Info Base */}
                              <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                  <Label>Nickname</Label>
                                  <Input
                                    value={profile.nickname}
                                    onChange={(e) => {
                                      const updated = { ...profile, nickname: e.target.value };
                                      setProfiles(profiles.map((p) => (p.id === profile.id ? updated : p)));
                                    }}
                                  />
                                </div>
                                <div className="space-y-2">
                                  <Label>Età</Label>
                                  <Input
                                    type="number"
                                    value={profile.age || ""}
                                    onChange={(e) => {
                                      const updated = { ...profile, age: parseInt(e.target.value) || null };
                                      setProfiles(profiles.map((p) => (p.id === profile.id ? updated : p)));
                                    }}
                                  />
                                </div>
                              </div>

                              <div className="space-y-2">
                                <Label>Città</Label>
                                <Input
                                  value={profile.city || ""}
                                  onChange={(e) => {
                                    const updated = { ...profile, city: e.target.value };
                                    setProfiles(profiles.map((p) => (p.id === profile.id ? updated : p)));
                                  }}
                                />
                              </div>

                              {/* Genere */}
                              <div className="space-y-2">
                                <Label>Genere</Label>
                                <Select
                                  value={profile.gender || ""}
                                  onValueChange={(value) => {
                                    const updated = { ...profile, gender: value };
                                    setProfiles(profiles.map((p) => (p.id === profile.id ? updated : p)));
                                  }}
                                >
                                  <SelectTrigger>
                                    <SelectValue placeholder="Seleziona genere">
                                      {profile.gender ? getGenderLabel(profile.gender) : "Seleziona genere"}
                                    </SelectValue>
                                  </SelectTrigger>
                                  <SelectContent className="bg-background z-50">
                                    <SelectItem value="male">Uomo</SelectItem>
                                    <SelectItem value="female">Donna</SelectItem>
                                    <SelectItem value="transgender">Transgender</SelectItem>
                                    <SelectItem value="genderfluid">Genderfluid</SelectItem>
                                    <SelectItem value="non-binary">Non binario</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>

                              {/* Orientamento Sessuale */}
                              <div className="space-y-2">
                                <Label>Orientamento Sessuale</Label>
                                <Select
                                  value={profile.sexual_orientation || ""}
                                  onValueChange={(value) => {
                                    const updated = { ...profile, sexual_orientation: value };
                                    setProfiles(profiles.map((p) => (p.id === profile.id ? updated : p)));
                                  }}
                                >
                                  <SelectTrigger>
                                    <SelectValue placeholder="Seleziona orientamento">
                                      {profile.sexual_orientation ? getOrientationLabel(profile.sexual_orientation) : "Seleziona orientamento"}
                                    </SelectValue>
                                  </SelectTrigger>
                                  <SelectContent className="bg-background z-50">
                                    <SelectItem value="heterosexual">Eterosessuale</SelectItem>
                                    <SelectItem value="homosexual">Omosessuale</SelectItem>
                                    <SelectItem value="bisexual">Bisessuale</SelectItem>
                                    <SelectItem value="pansexual">Pansessuale</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>

                              {/* Stato Relazione */}
                              <div className="space-y-2">
                                <Label>Stato Relazione</Label>
                                <Select
                                  value={profile.relationship_status || ""}
                                  onValueChange={(value) => {
                                    const updated = { ...profile, relationship_status: value };
                                    setProfiles(profiles.map((p) => (p.id === profile.id ? updated : p)));
                                  }}
                                >
                                  <SelectTrigger>
                                    <SelectValue placeholder="Seleziona stato" />
                                  </SelectTrigger>
                                  <SelectContent className="bg-background z-50">
                                    <SelectItem value="single">Single</SelectItem>
                                    <SelectItem value="in_relationship">Fidanzato/a</SelectItem>
                                    <SelectItem value="married">Sposato/a</SelectItem>
                                    <SelectItem value="divorced">Divorziato/a</SelectItem>
                                    <SelectItem value="widowed">Vedovo/a</SelectItem>
                                    <SelectItem value="prefer_not_say">Preferisco non dirlo</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>

                              {/* Cosa Cerchi: stesso campo (relationship_type)
                                  e stesse opzioni del profilo utente e del
                                  ProfileCreator admin, per piena coerenza. */}
                              <div className="space-y-2">
                                <Label>Cosa cerchi</Label>
                                <Select
                                  value={profile.relationship_type || ""}
                                  onValueChange={(value) => {
                                    const updated = { ...profile, relationship_type: value };
                                    setProfiles(profiles.map((p) => (p.id === profile.id ? updated : p)));
                                  }}
                                >
                                  <SelectTrigger>
                                    <SelectValue placeholder="Seleziona cosa cerchi" />
                                  </SelectTrigger>
                                  <SelectContent className="bg-background z-50">
                                    <SelectItem value="serious">Relazione seria</SelectItem>
                                    <SelectItem value="casual">Incontri casuali</SelectItem>
                                    <SelectItem value="friendship">Amicizia</SelectItem>
                                    <SelectItem value="not-sure">Non specificato</SelectItem>
                                    <SelectItem value="prefer-not-say">Preferisco non dirlo</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>

                              {/* Interessi */}
                              <div className="space-y-2">
                                <Label>Interessi (max 4)</Label>
                                <InterestsAutocomplete
                                  selectedInterests={profile.interests || []}
                                  onInterestsChange={(interests) => {
                                    const updated = { ...profile, interests };
                                    setProfiles(profiles.map((p) => (p.id === profile.id ? updated : p)));
                                  }}
                                  maxInterests={4}
                                />
                              </div>

                              {/* Canzoni Preferite */}
                              <div className="space-y-2">
                                <Label>🎵 Canzoni Preferite (max 4)</Label>
                                <p className="text-sm text-muted-foreground mb-2">
                                  Aggiungi le canzoni preferite da Spotify per questo profilo
                                </p>
                                <SpotifySongSelector
                                  selectedSongs={profile.favorite_songs || []}
                                  onSongsChange={(songs) => {
                                    const updated = { ...profile, favorite_songs: songs };
                                    setProfiles(profiles.map((p) => (p.id === profile.id ? updated : p)));
                                  }}
                                  maxSongs={4}
                                />
                              </div>

                              {/* Bio */}
                              <div className="space-y-2">
                                <Label>Bio</Label>
                                <Textarea
                                  value={profile.bio || ""}
                                  onChange={(e) => {
                                    const updated = { ...profile, bio: e.target.value };
                                    setProfiles(profiles.map((p) => (p.id === profile.id ? updated : p)));
                                  }}
                                  rows={3}
                                  placeholder="Scrivi qualcosa su di te..."
                                />
                              </div>

                              {/* Stato Online Manuale */}
                              <div className="space-y-3 p-4 border rounded-lg bg-muted/50">
                                <Label className="text-base font-semibold">Stato Online</Label>
                                <div className="space-y-3">
                                  <div className="flex items-center justify-between">
                                    <div className="space-y-1">
                                      <p className="text-sm font-medium">Modalità Automatica</p>
                                      <p className="text-xs text-muted-foreground">
                                        Stato online basato sull'ultima attività
                                      </p>
                                    </div>
                                    <Switch
                                      checked={profile.manual_online_status === null}
                                      onCheckedChange={(checked) => {
                                        const updated = { ...profile, manual_online_status: checked ? null : false };
                                        setProfiles(profiles.map((p) => (p.id === profile.id ? updated : p)));
                                      }}
                                    />
                                  </div>
                                  {profile.manual_online_status !== null && (
                                    <div className="flex items-center justify-between pt-2 border-t">
                                      <div className="space-y-1">
                                        <p className="text-sm font-medium">Forza Online</p>
                                        <p className="text-xs text-muted-foreground">
                                          {profile.manual_online_status ? "Il profilo appare online" : "Il profilo appare offline"}
                                        </p>
                                      </div>
                                      <Switch
                                        checked={profile.manual_online_status === true}
                                        onCheckedChange={(checked) => {
                                          const updated = { ...profile, manual_online_status: checked };
                                          setProfiles(profiles.map((p) => (p.id === profile.id ? updated : p)));
                                        }}
                                      />
                                    </div>
                                  )}
                                </div>
                              </div>

                              {/* Pulsante Salva — chiude il dialog su successo */}
                              <div className="flex justify-end pt-4 border-t">
                                <Button
                                  onClick={async () => {
                                    const ok = await handleUpdateProfile(profile);
                                    if (ok) setEditingProfileId(null);
                                  }}
                                >
                                  <Save className="h-4 w-4 mr-2" />
                                  Salva Modifiche
                                </Button>
                              </div>
                            </div>
                          </ScrollArea>
                        </DialogContent>
                      </Dialog>

                      {/* Dialog Gestione Likes */}
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button variant="outline" className="flex-1">
                            <Heart className="h-4 w-4 mr-2" />
                            Utenti
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-3xl max-h-[80vh]">
                          <DialogHeader>
                            <DialogTitle>{t("common.manageLikes")} {profile.nickname}</DialogTitle>
                          </DialogHeader>
                          <div className="px-6 pb-3">
                            <div className="relative">
                              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                              <Input
                                type="text"
                                placeholder="Cerca per nickname o nome..."
                                value={likesSearchQuery}
                                onChange={(e) => setLikesSearchQuery(e.target.value)}
                                className="pl-9"
                              />
                            </div>
                          </div>
                          <ScrollArea className="h-[500px] pr-4 px-6">
                            {loadingUsers ? (
                              <p className="text-muted-foreground">{t("common.loadingUsers")}</p>
                            ) : (
                              <div className="space-y-2">
                                {(() => {
                                  const filteredUsers = users.filter((user) => 
                                    (user.nickname || '').toLowerCase().includes(likesSearchQuery.toLowerCase()) ||
                                    (user.full_name || '').toLowerCase().includes(likesSearchQuery.toLowerCase())
                                  );
                                  
                                  if (filteredUsers.length === 0) {
                                    return <p className="text-muted-foreground text-center py-8">Nessun utente trovato</p>;
                                  }
                                  
                                  return filteredUsers.map((user) => {
                                  const isLiked = (profileLikes[profile.id] || []).includes(user.id);
                                  return (
                                    <div 
                                      key={user.id} 
                                      className="flex items-center justify-between p-3 border rounded-lg hover:bg-accent transition-colors"
                                    >
                                      <div className="flex items-center gap-3">
                                        <Avatar className="h-10 w-10">
                                          {user.avatar_url ? (
                                            <AvatarImage 
                                              src={supabase.storage.from('profile-images').getPublicUrl(user.avatar_url).data.publicUrl}
                                            />
                                          ) : null}
                                          <AvatarFallback>{user.nickname[0]?.toUpperCase()}</AvatarFallback>
                                        </Avatar>
                                        <div>
                                          <p className="font-semibold">{user.nickname}</p>
                                          <p className="text-sm text-muted-foreground">
                                            {user.full_name} • {user.age} anni • {user.city}
                                          </p>
                                          {user.bio && (
                                            <p className="text-xs text-muted-foreground mt-1 line-clamp-1">
                                              {user.bio}
                                            </p>
                                          )}
                                        </div>
                                      </div>
                                      <div className="flex gap-2">
                                        <Button
                                          variant={isLiked ? "default" : "outline"}
                                          size="sm"
                                          onClick={() => handleToggleLike(profile.id, user.id)}
                                        >
                                          {isLiked ? "❤️ Rimuovi" : "🤍 Like"}
                                        </Button>
                                        <Button
                                          variant="outline"
                                          size="sm"
                                          onClick={() => {
                                            setSelectedChatProfile({
                                              profileId: profile.id,
                                              profileNickname: profile.nickname,
                                              userId: user.id,
                                              userNickname: user.nickname,
                                            });
                                            setChatDialogOpen(true);
                                          }}
                                        >
                                          <MessageSquare className="h-4 w-4 mr-1" />
                                          Chat
                                        </Button>
                                      </div>
                                    </div>
                                  );
                                });
                                })()}
                              </div>
                            )}
                          </ScrollArea>
                        </DialogContent>
                      </Dialog>
                    </div>
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Admin Chat Dialog */}
      {selectedChatProfile && (
        <AdminChatDialog
          open={chatDialogOpen}
          onOpenChange={(open) => {
            setChatDialogOpen(open);
            if (!open) setSelectedChatProfile(null);
          }}
          adminProfileId={selectedChatProfile.profileId}
          adminNickname={selectedChatProfile.profileNickname}
          userId={selectedChatProfile.userId}
          userNickname={selectedChatProfile.userNickname}
        />
      )}
    </>
  );
};
