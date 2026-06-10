import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useToast } from "@/hooks/use-toast";
import { Coins, Gift, Loader2 } from "lucide-react";
import { CHAT_GIFTS, GIFT_PACKS, type ChatGift } from "@/lib/chatGifts";
import { GIFT_IMAGES } from "@/lib/giftImages";

interface ChatGiftPanelProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  matchId: string;
  receiverId: string;
  receiverNickname: string;
}

// 🎁 Pannello regali della chat: mostra il saldo CREDITI REGALO (separato dal
// saldo normale), il catalogo delle emoji con prezzo, e l'acquisto dei
// pacchetti in euro. Il ricevente incassa il costo del regalo in crediti
// normali e vede l'emoji animata in chat.
export const ChatGiftPanel = ({
  open,
  onOpenChange,
  matchId,
  receiverId,
  receiverNickname,
}: ChatGiftPanelProps) => {
  const { toast } = useToast();
  const [balance, setBalance] = useState<number | null>(null);
  const [sendingId, setSendingId] = useState<string | null>(null);
  const [buyingPack, setBuyingPack] = useState<string | null>(null);
  // Regalo cliccato senza saldo sufficiente: apre il popover di acquisto
  // ancorato alla card dell'emoji (niente toast invasivo).
  const [insufficientGiftId, setInsufficientGiftId] = useState<string | null>(null);

  // Saldo crediti regalo: letto a ogni apertura del pannello.
  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || cancelled) return;
      const { data } = await (supabase as any)
        .from("user_credits")
        .select("gift_credits")
        .eq("user_id", user.id)
        .maybeSingle();
      if (!cancelled) setBalance((data as any)?.gift_credits ?? 0);
    })();
    return () => {
      cancelled = true;
    };
  }, [open]);

  const handleSend = async (gift: ChatGift) => {
    if (sendingId) return;
    if (balance !== null && balance < gift.cost) {
      setInsufficientGiftId(gift.id);
      return;
    }
    setSendingId(gift.id);
    try {
      const { data, error } = await (supabase as any).rpc("send_chat_gift", {
        p_match_id: matchId,
        p_receiver: receiverId,
        p_gift_id: gift.id,
      });
      if (error) throw error;
      const row = Array.isArray(data) ? data[0] : data;
      if (!row?.success) {
        if (row?.error === "INSUFFICIENT") {
          setBalance(row?.new_gift_balance ?? 0);
          setInsufficientGiftId(gift.id);
        } else if (row?.error === "NO_MATCH") {
          toast({ title: "Errore", description: "Potete scambiarvi regali solo se siete in match.", variant: "destructive" });
        } else {
          toast({ title: "Errore", description: `Invio del regalo non riuscito (${row?.error || "sconosciuto"}). Riprova.`, variant: "destructive" });
        }
        return;
      }
      setBalance(row.new_gift_balance ?? 0);
      toast({
        title: `${gift.emoji} Regalo inviato!`,
        description: `Hai regalato ${gift.name} a ${receiverNickname} (+${gift.cost} crediti per lei/lui).`,
      });
      onOpenChange(false);
    } catch (e: any) {
      console.error("Errore invio regalo:", e);
      toast({
        title: "Errore",
        description: `Invio del regalo non riuscito${e?.message ? ` (${e.message})` : ""}. Riprova.`,
        variant: "destructive",
      });
    } finally {
      setSendingId(null);
    }
  };

  const handleBuy = async (packId: string) => {
    if (buyingPack) return;
    setBuyingPack(packId);
    try {
      const { data, error } = await supabase.functions.invoke("create-gift-credits-payment", {
        body: { pack: packId },
      });
      if (error) throw error;
      if (data?.url) window.location.href = data.url;
      else throw new Error("URL di pagamento mancante");
    } catch (e) {
      console.error("Errore acquisto crediti regalo:", e);
      toast({ title: "Errore", description: "Impossibile avviare il pagamento. Riprova.", variant: "destructive" });
      setBuyingPack(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Gift className="h-5 w-5 text-primary" />
            <span className="bg-gradient-to-r from-pink-500 via-fuchsia-500 to-purple-500 bg-clip-text text-transparent font-extrabold">
              Fai un regalo a {receiverNickname}
            </span>
          </DialogTitle>
          <DialogDescription className="text-xs">
            Il regalo appare in chat e {receiverNickname} riceve i crediti nel suo saldo in base al valore del regalo.
          </DialogDescription>
        </DialogHeader>

        {/* Saldo crediti regalo */}
        <div className="flex items-center justify-between rounded-xl border border-amber-400/40 bg-gradient-to-r from-amber-500/10 to-pink-500/10 px-3 py-2">
          <span className="text-sm font-semibold inline-flex items-center gap-1.5">
            <Coins className="h-4 w-4 text-amber-400" /> Crediti regalo
          </span>
          <span className="text-lg font-black text-amber-300">
            {balance === null ? "…" : balance}
          </span>
        </div>

        {/* Catalogo regali */}
        <div className="grid grid-cols-2 gap-2">
          {CHAT_GIFTS.map((gift) => (
            <Popover
              key={gift.id}
              open={insufficientGiftId === gift.id}
              onOpenChange={(o) => {
                if (!o) setInsufficientGiftId(null);
              }}
            >
              <PopoverTrigger asChild>
                <button
                  type="button"
                  disabled={sendingId !== null}
                  onClick={() => handleSend(gift)}
                  className="group flex flex-col items-center gap-1 rounded-xl border border-purple-500/25 bg-gradient-to-br from-purple-500/[0.08] to-fuchsia-500/[0.05] p-3 text-center transition-all hover:border-pink-400/60 hover:bg-pink-500/10 active:scale-[0.97] disabled:opacity-60"
                >
                  <span className="flex h-12 w-12 items-center justify-center transition-transform group-hover:scale-110">
                    {sendingId === gift.id ? (
                      <Loader2 className="h-7 w-7 animate-spin text-pink-400" />
                    ) : GIFT_IMAGES[gift.id] ? (
                      <img
                        src={GIFT_IMAGES[gift.id]}
                        alt={gift.name}
                        draggable={false}
                        className="h-12 w-12 object-contain drop-shadow-[0_2px_6px_rgba(0,0,0,0.45)]"
                      />
                    ) : (
                      <span className="text-3xl leading-none">{gift.emoji}</span>
                    )}
                  </span>
                  <span className="text-sm font-bold">{gift.name}</span>
                  <span className="text-[10px] text-muted-foreground leading-tight">{gift.description}</span>
                  <span className="mt-0.5 inline-flex items-center gap-1 rounded-full bg-amber-500/15 px-2 py-0.5 text-[11px] font-bold text-amber-300">
                    <Coins className="h-3 w-3" /> {gift.cost}
                  </span>
                </button>
              </PopoverTrigger>
              {/* 💡 Saldo insufficiente: popover ancorato all'emoji cliccata,
                  con acquisto diretto del pacchetto adatto. */}
              <PopoverContent
                side="top"
                align="center"
                className="w-60 rounded-xl border-pink-500/40 bg-gradient-to-br from-[#2a1640] via-[#1d1226] to-[#241433] p-3 shadow-[0_8px_30px_-8px_rgba(244,114,182,0.5)]"
              >
                <p className="mb-2 text-center text-sm font-bold bg-gradient-to-r from-pink-300 via-fuchsia-300 to-amber-300 bg-clip-text text-transparent">
                  Crediti regalo insufficienti
                </p>
                <div className="grid gap-1.5">
                  {GIFT_PACKS.map((pack) => (
                    <Button
                      key={pack.id}
                      size="sm"
                      disabled={buyingPack !== null}
                      onClick={() => handleBuy(pack.id)}
                      className="h-9 justify-between bg-gradient-to-r from-amber-500/90 to-pink-500/90 text-white font-semibold hover:from-amber-500 hover:to-pink-500"
                    >
                      <span>
                        {buyingPack === pack.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          `Acquista ${pack.credits} crediti`
                        )}
                      </span>
                      <span className="text-xs opacity-90">{pack.priceLabel}</span>
                    </Button>
                  ))}
                </div>
              </PopoverContent>
            </Popover>
          ))}
        </div>

        {/* Acquisto pacchetti */}
        <div className="space-y-2 border-t border-border/50 pt-3">
          <p className="text-xs font-semibold text-muted-foreground">Ricarica crediti regalo</p>
          <div className="grid grid-cols-2 gap-2">
            {GIFT_PACKS.map((pack) => (
              <Button
                key={pack.id}
                variant="outline"
                disabled={buyingPack !== null}
                onClick={() => handleBuy(pack.id)}
                className="h-auto flex-col gap-0.5 py-2.5 border-amber-400/40 bg-amber-500/5 hover:bg-amber-500/15"
              >
                <span className="font-black text-amber-300">
                  {buyingPack === pack.id ? <Loader2 className="h-4 w-4 animate-spin" /> : `${pack.credits} crediti`}
                </span>
                <span className="text-xs text-muted-foreground">{pack.priceLabel}</span>
              </Button>
            ))}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
