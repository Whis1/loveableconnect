import React, { useEffect, useState, useRef } from "react";
import { api } from "../lib/api";
import { useAuth } from "../context/AuthContext";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Sparkles, Send, Heart } from "lucide-react";
import { toast } from "sonner";

export default function Matches() {
  const { user } = useAuth();
  const [matches, setMatches] = useState([]);
  const [active, setActive] = useState(null);
  const [messages, setMessages] = useState([]);
  const [draft, setDraft] = useState("");
  const [loading, setLoading] = useState(true);
  const scrollRef = useRef(null);

  useEffect(() => {
    (async () => {
      try {
        const { data } = await api.get("/matches");
        setMatches(data);
        if (data.length > 0) setActive(data[0]);
      } catch {
        toast.error("Errore nel caricamento delle connessioni");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  useEffect(() => {
    if (!active) return;
    (async () => {
      try {
        const { data } = await api.get(`/messages/${active.match_id}`);
        setMessages(data);
      } catch {
        setMessages([]);
      }
    })();
  }, [active]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  const sendMessage = async (e) => {
    e.preventDefault();
    if (!draft.trim() || !active) return;
    try {
      const { data } = await api.post("/messages", { match_id: active.match_id, content: draft.trim() });
      setMessages((m) => [...m, data]);
      setDraft("");
    } catch {
      toast.error("Errore nell'invio");
    }
  };

  return (
    <div className="mx-auto max-w-6xl px-4 sm:px-6 py-10 lg:py-14" data-testid="matches-page">
      <div className="mb-8">
        <span className="text-overline text-[#E6C998] flex items-center gap-2"><Sparkles className="h-3.5 w-3.5" />Le tue connessioni</span>
        <h1 className="font-[Cormorant_Garamond] text-4xl sm:text-5xl text-[#F0F3F5] mt-2">
          Anime <em className="text-[#E6C998] not-italic">allineate</em>
        </h1>
      </div>

      {loading ? (
        <p className="text-center py-20 text-[#8F9CAE]">Caricamento…</p>
      ) : matches.length === 0 ? (
        <div className="glass rounded-2xl p-12 text-center" data-testid="matches-empty">
          <Heart className="h-12 w-12 text-[#E6C998]/40 mx-auto mb-4" />
          <p className="font-[Cormorant_Garamond] text-2xl text-[#F0F3F5]">Ancora nessuna connessione stellare</p>
          <p className="text-sm text-[#8F9CAE] mt-2">Esplora la bacheca e manda dei bagliori ✦</p>
        </div>
      ) : (
        <div className="grid lg:grid-cols-[320px_1fr] gap-6 h-[70vh] min-h-[500px]">
          {/* Match list */}
          <div className="glass rounded-2xl p-3 overflow-y-auto" data-testid="matches-list">
            {matches.map((m) => {
              const other = m.user;
              const cover = other.picture || other.photos?.[0];
              const isActive = active?.match_id === m.match_id;
              return (
                <button
                  key={m.match_id}
                  onClick={() => setActive(m)}
                  data-testid={`match-item-${m.match_id}`}
                  className={`w-full flex items-center gap-3 p-3 rounded-xl transition-all duration-300 ${
                    isActive ? "bg-[#E6C998]/10 border border-[#E6C998]/30" : "hover:bg-white/5"
                  }`}
                >
                  <div className="h-12 w-12 rounded-full overflow-hidden bg-[#162032] shrink-0">
                    {cover ? <img src={cover} alt={other.name} className="w-full h-full object-cover" /> : <div className="w-full h-full grid place-items-center"><Sparkles className="h-5 w-5 text-[#475B7A]" /></div>}
                  </div>
                  <div className="text-left flex-1 min-w-0">
                    <p className="font-[Cormorant_Garamond] text-lg text-[#F0F3F5] truncate">{other.name}</p>
                    <p className="text-[10px] text-[#E6C998] uppercase tracking-wider">Connessione stellare</p>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Chat */}
          <div className="glass rounded-2xl flex flex-col overflow-hidden">
            {active ? (
              <>
                <div className="px-6 py-4 border-b border-white/10 flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full overflow-hidden bg-[#162032]">
                    {active.user.picture || active.user.photos?.[0] ? (
                      <img src={active.user.picture || active.user.photos[0]} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full grid place-items-center"><Sparkles className="h-4 w-4 text-[#475B7A]" /></div>
                    )}
                  </div>
                  <div>
                    <p className="font-[Cormorant_Garamond] text-xl text-[#F0F3F5]">{active.user.name}</p>
                    {active.user.city && <p className="text-xs text-[#8F9CAE]">{active.user.city}</p>}
                  </div>
                </div>

                <div ref={scrollRef} className="flex-1 overflow-y-auto p-6 space-y-3" data-testid="chat-messages">
                  {messages.length === 0 ? (
                    <p className="text-center text-sm text-[#8F9CAE] mt-10">Le stelle attendono il tuo primo messaggio ✦</p>
                  ) : (
                    messages.map((m) => {
                      const mine = m.from_user === user.user_id;
                      return (
                        <div key={m.message_id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
                          <div className={`max-w-[75%] px-4 py-2.5 rounded-2xl text-sm ${
                            mine
                              ? "bg-[#E6C998] text-[#040710] rounded-br-sm"
                              : "bg-[#162032] text-[#F0F3F5] rounded-bl-sm border border-[#233045]"
                          }`} data-testid={`chat-message-${m.message_id}`}>
                            {m.content}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>

                <form onSubmit={sendMessage} className="p-4 border-t border-white/10 flex gap-2" data-testid="chat-form">
                  <Input
                    data-testid="chat-input"
                    placeholder="Scrivi un messaggio sotto le stelle…"
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    className="h-11 bg-[#162032]/50 border-[#233045] rounded-full"
                  />
                  <Button type="submit" data-testid="chat-send-btn" className="h-11 w-11 rounded-full bg-[#E6C998] text-[#040710] hover:bg-[#E6C998]/90 p-0">
                    <Send className="h-4 w-4" />
                  </Button>
                </form>
              </>
            ) : (
              <div className="flex-1 grid place-items-center text-[#8F9CAE] text-sm">Seleziona una connessione</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
