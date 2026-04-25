import React, { useState, useEffect, useCallback } from "react";
import { api } from "../lib/api";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Button } from "../components/ui/button";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "../components/ui/select";
import { Badge } from "../components/ui/badge";
import { Dialog, DialogContent } from "../components/ui/dialog";
import { Heart, MapPin, Sparkles, Filter, X } from "lucide-react";
import { toast } from "sonner";

const INTERESTS = [
  "arte", "musica", "viaggi", "cinema", "libri", "yoga", "cucina", "fotografia",
  "natura", "astrologia", "danza", "teatro", "trekking", "vino", "caffè", "scrittura"
];

export default function Bacheca() {
  const [users, setUsers] = useState([]);
  const [filters, setFilters] = useState({ min_age: "", max_age: "", gender: "", city: "", interest: "" });
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [matchModal, setMatchModal] = useState(null);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const params = {};
      if (filters.min_age) params.min_age = filters.min_age;
      if (filters.max_age) params.max_age = filters.max_age;
      if (filters.gender) params.gender = filters.gender;
      if (filters.city) params.city = filters.city;
      if (filters.interest) params.interest = filters.interest;
      const { data } = await api.get("/users", { params });
      setUsers(data);
    } catch {
      toast.error("Impossibile caricare la bacheca");
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => { fetchUsers(); }, [fetchUsers]);

  const handleLike = async (target) => {
    try {
      const { data } = await api.post("/likes", { target_user_id: target.user_id });
      if (data.match) {
        setMatchModal(data.with);
      } else {
        toast.success(`Hai inviato un bagliore a ${target.name} ✦`);
      }
    } catch {
      toast.error("Errore nell'invio del like");
    }
  };

  const resetFilters = () => setFilters({ min_age: "", max_age: "", gender: "", city: "", interest: "" });

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 py-10 lg:py-14" data-testid="bacheca-page">
      <div className="mb-8">
        <span className="text-overline text-[#E6C998] flex items-center gap-2"><Sparkles className="h-3.5 w-3.5" />Bacheca celeste</span>
        <h1 className="font-[Cormorant_Garamond] text-4xl sm:text-5xl text-[#F0F3F5] mt-2">
          Anime in <em className="text-[#E6C998] not-italic">orbita</em>
        </h1>
      </div>

      {/* Filters */}
      <div className="glass rounded-2xl p-5 mb-8" data-testid="filters-panel">
        <div className="flex items-center gap-2 mb-4 text-[#8F9CAE]">
          <Filter className="h-4 w-4" />
          <span className="text-xs uppercase tracking-wider">Filtri</span>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <div>
            <Label className="text-[10px] text-[#8F9CAE] uppercase tracking-wider">Età min</Label>
            <Input type="number" min="18" data-testid="filter-min-age" value={filters.min_age} onChange={(e) => setFilters({ ...filters, min_age: e.target.value })} className="h-10 mt-1 bg-[#162032]/50 border-[#233045] rounded-lg" />
          </div>
          <div>
            <Label className="text-[10px] text-[#8F9CAE] uppercase tracking-wider">Età max</Label>
            <Input type="number" max="99" data-testid="filter-max-age" value={filters.max_age} onChange={(e) => setFilters({ ...filters, max_age: e.target.value })} className="h-10 mt-1 bg-[#162032]/50 border-[#233045] rounded-lg" />
          </div>
          <div>
            <Label className="text-[10px] text-[#8F9CAE] uppercase tracking-wider">Genere</Label>
            <Select value={filters.gender || undefined} onValueChange={(v) => setFilters({ ...filters, gender: v })}>
              <SelectTrigger data-testid="filter-gender" className="h-10 mt-1 bg-[#162032]/50 border-[#233045] rounded-lg">
                <SelectValue placeholder="Tutti" />
              </SelectTrigger>
              <SelectContent className="bg-[#0D1526] border-[#233045] text-[#F0F3F5]">
                <SelectItem value="donna">Donna</SelectItem>
                <SelectItem value="uomo">Uomo</SelectItem>
                <SelectItem value="non-binary">Non-binary</SelectItem>
                <SelectItem value="altro">Altro</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-[10px] text-[#8F9CAE] uppercase tracking-wider">Città</Label>
            <Input data-testid="filter-city" value={filters.city} onChange={(e) => setFilters({ ...filters, city: e.target.value })} className="h-10 mt-1 bg-[#162032]/50 border-[#233045] rounded-lg" />
          </div>
          <div>
            <Label className="text-[10px] text-[#8F9CAE] uppercase tracking-wider">Interesse</Label>
            <Select value={filters.interest || undefined} onValueChange={(v) => setFilters({ ...filters, interest: v })}>
              <SelectTrigger data-testid="filter-interest" className="h-10 mt-1 bg-[#162032]/50 border-[#233045] rounded-lg">
                <SelectValue placeholder="Tutti" />
              </SelectTrigger>
              <SelectContent className="bg-[#0D1526] border-[#233045] text-[#F0F3F5] max-h-64">
                {INTERESTS.map((i) => <SelectItem key={i} value={i}>{i}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-end">
            <Button onClick={resetFilters} variant="outline" data-testid="filter-reset-btn" className="h-10 w-full rounded-lg border-[#233045] text-[#8F9CAE] hover:text-[#F0F3F5] bg-transparent hover:bg-white/5">
              <X className="h-3.5 w-3.5 mr-1" /> Pulisci
            </Button>
          </div>
        </div>
      </div>

      {/* Grid */}
      {loading ? (
        <div className="text-center py-20 text-[#8F9CAE]" data-testid="bacheca-loading">Allineamento delle stelle…</div>
      ) : users.length === 0 ? (
        <div className="text-center py-20 text-[#8F9CAE]" data-testid="bacheca-empty">
          Nessun profilo corrisponde. Prova ad ampliare i filtri ✦
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6" data-testid="bacheca-grid">
          {users.map((u) => (
            <ProfileCard key={u.user_id} user={u} onLike={handleLike} onClick={() => setSelected(u)} />
          ))}
        </div>
      )}

      {/* Profile detail */}
      <Dialog open={!!selected} onOpenChange={(open) => !open && setSelected(null)}>
        <DialogContent className="max-w-2xl bg-[#0D1526] border-[#233045] text-[#F0F3F5] p-0 overflow-hidden" data-testid="profile-detail-modal">
          {selected && <ProfileDetail user={selected} onLike={() => { handleLike(selected); setSelected(null); }} />}
        </DialogContent>
      </Dialog>

      {/* Match modal */}
      <Dialog open={!!matchModal} onOpenChange={(open) => !open && setMatchModal(null)}>
        <DialogContent className="max-w-md bg-[#0D1526] border-[#E6C998]/40 text-[#F0F3F5] text-center p-10" data-testid="match-modal">
          {matchModal && (
            <>
              <Sparkles className="h-12 w-12 mx-auto text-[#E6C998] animate-twinkle" />
              <h2 className="font-[Cormorant_Garamond] text-4xl mt-4">Connessione Stellare</h2>
              <p className="text-[#8F9CAE] mt-2">Tu e <span className="text-[#E6C998]">{matchModal.name}</span> vi siete trovati ✦</p>
              <div className="flex gap-3 mt-6">
                <Button variant="outline" onClick={() => setMatchModal(null)} data-testid="match-continue-btn" className="flex-1 rounded-full border-[#233045] bg-transparent text-[#F0F3F5]">
                  Continua a esplorare
                </Button>
                <Button onClick={() => { setMatchModal(null); window.location.href = "/matches"; }} data-testid="match-chat-btn" className="flex-1 rounded-full bg-[#E6C998] text-[#040710] hover:bg-[#E6C998]/90">
                  Scrivi ora
                </Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function ProfileCard({ user, onLike, onClick }) {
  const cover = user.picture || user.photos?.[0];
  return (
    <div className="group relative rounded-2xl overflow-hidden glass cursor-pointer transition-all duration-500 hover:-translate-y-1 hover:shadow-[0_0_30px_rgba(230,201,152,0.15)]" data-testid={`profile-card-${user.user_id}`}>
      <div className="aspect-[4/5] overflow-hidden bg-[#162032]" onClick={onClick}>
        {cover ? (
          <img src={cover} alt={user.name} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" />
        ) : (
          <div className="w-full h-full grid place-items-center text-[#475B7A]"><Sparkles className="h-12 w-12" /></div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-[#040710] via-[#040710]/40 to-transparent pointer-events-none" />
      </div>
      <div className="absolute bottom-0 left-0 right-0 p-5">
        <h3 className="font-[Cormorant_Garamond] text-2xl text-[#F0F3F5]" data-testid={`profile-card-name-${user.user_id}`}>
          {user.name}{user.age ? `, ${user.age}` : ""}
        </h3>
        {user.city && (
          <p className="text-xs text-[#E6C998] flex items-center gap-1 mt-0.5">
            <MapPin className="h-3 w-3" /> {user.city}
          </p>
        )}
        {user.interests?.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-2">
            {user.interests.slice(0, 3).map((i) => (
              <Badge key={i} variant="outline" className="border-white/20 text-[#F0F3F5]/80 bg-black/30 text-[10px]">{i}</Badge>
            ))}
          </div>
        )}
      </div>
      <button
        onClick={(e) => { e.stopPropagation(); onLike(user); }}
        data-testid={`profile-card-like-${user.user_id}`}
        className="absolute top-3 right-3 h-10 w-10 rounded-full bg-[#E6C998] text-[#040710] grid place-items-center opacity-0 group-hover:opacity-100 transition-all duration-300 hover:scale-110"
      >
        <Heart className="h-4 w-4 fill-current" />
      </button>
    </div>
  );
}

function ProfileDetail({ user, onLike }) {
  const photos = user.picture ? [user.picture, ...(user.photos || [])] : (user.photos || []);
  const [active, setActive] = useState(0);
  return (
    <div className="grid sm:grid-cols-[1fr_1fr] max-h-[80vh] overflow-y-auto">
      <div className="relative aspect-square sm:aspect-auto bg-[#162032]">
        {photos[active] ? (
          <img src={photos[active]} alt={user.name} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full grid place-items-center text-[#475B7A]"><Sparkles className="h-16 w-16" /></div>
        )}
        {photos.length > 1 && (
          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5">
            {photos.map((_, i) => (
              <button key={i} onClick={() => setActive(i)} className={`h-1.5 rounded-full transition-all ${i === active ? "w-6 bg-[#E6C998]" : "w-1.5 bg-white/40"}`} />
            ))}
          </div>
        )}
      </div>
      <div className="p-6 sm:p-8 space-y-5">
        <div>
          <h2 className="font-[Cormorant_Garamond] text-3xl text-[#F0F3F5]">{user.name}{user.age ? `, ${user.age}` : ""}</h2>
          {user.city && <p className="text-sm text-[#E6C998] flex items-center gap-1 mt-1"><MapPin className="h-3.5 w-3.5" />{user.city}</p>}
        </div>
        {user.bio && <p className="text-sm text-[#8F9CAE] leading-relaxed">{user.bio}</p>}
        {user.interests?.length > 0 && (
          <div>
            <p className="text-overline text-[#8F9CAE] mb-2">Interessi</p>
            <div className="flex flex-wrap gap-1.5">
              {user.interests.map((i) => (
                <Badge key={i} variant="outline" className="border-[#E6C998]/30 text-[#E6C998] bg-transparent">{i}</Badge>
              ))}
            </div>
          </div>
        )}
        <Button
          data-testid="profile-detail-like-btn"
          onClick={onLike}
          className="w-full h-12 rounded-full bg-[#E6C998] text-[#040710] hover:bg-[#E6C998]/90 gold-glow font-medium gap-2"
        >
          <Heart className="h-4 w-4 fill-current" /> Manda un bagliore
        </Button>
      </div>
    </div>
  );
}
