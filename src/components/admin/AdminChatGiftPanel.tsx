import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Coins, Gift, Infinity as InfinityIcon, Loader2 } from "lucide-react";
import { CHAT_GIFTS, type ChatGift } from "@/lib/chatGifts";
import { GIFT_IMAGES } from "@/lib/giftImages";

interface AdminChatGiftPanelProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  matchId: string;
  adminProfileId: string;
  receiverId: string;
  receiverNickname: string;
}

// 🎁 Pannello regali della chat ADMIN (/admin/profiles): invio ILLIMITATO,
// nessun saldo da scalare. L'utente reale riceve i crediti del valore del
// regalo e la bolla animata appare in chat per entrambi.
export const AdminChatGiftPanel = ({
  open,
  onOpenChange,
  matchId,
  adminProfileId,
  receiverId,
  receiverNickname,
}: AdminChatGiftPanelProps) => {
  const { toast } = useToast();
  const [sendingId, setSendingId] = useState<string | null>(null);

  const handleSend = async (gift: ChatGift) => {
    if (sendingId) return;
    setSendingId(gift.id);
    try {
      const { error } = await (supabase as any).rpc("admin_send_chat_gift", {
        p_match_id: matchId,
        p_admin_id: adminProfileId,
        p_receiver: receiverId,
        p_gift_id: gift.id,
      });
      if (error) throw error;
      toast({
        title: `${gift.emoji} Regalo inviato!`,
        description: `${receiverNickname} riceve ${gift.name} (+${gift.cost} crediti).`,
      });
      onOpenChange(false);
    } catch (e: any) {
      console.error("Errore regalo admin:", e);
      toast({
        title: "Errore",
        description: `Invio non riuscito${e?.message ? ` (${e.message})` : ""}.`,
        variant: "destructive",
      });
    } finally {
      setSendingId(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Gift className="h-5 w-5 text-primary" />
            <span className="bg-gradient-to-r from-pink-500 via-fuchsia-500 to-purple-500 bg-clip-text text-transparent font-extrabold">
              Regala a {receiverNickname}
            </span>
          </DialogTitle>
          <DialogDescription className="text-xs">
            Il regalo appare in chat e {receiverNickname} riceve i crediti del suo valore.
          </DialogDescription>
        </DialogHeader>

        {/* Invio illimitato (admin) */}
        <div className="flex items-center justify-between rounded-xl border border-amber-400/40 bg-gradient-to-r from-amber-500/10 to-pink-500/10 px-3 py-2">
          <span className="text-sm font-semibold inline-flex items-center gap-1.5">
            <Coins className="h-4 w-4 text-amber-400" /> Crediti regalo
          </span>
          <span className="inline-flex items-center gap-1 text-lg font-black text-amber-300">
            <InfinityIcon className="h-5 w-5" /> Illimitati
          </span>
        </div>

        <div className="grid grid-cols-2 gap-2">
          {CHAT_GIFTS.map((gift) => (
            <button
              key={gift.id}
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
              <span className="mt-0.5 inline-flex items-center gap-1 rounded-full bg-amber-500/15 px-2 py-0.5 text-[11px] font-bold text-amber-300">
                <Coins className="h-3 w-3" /> {gift.cost}
              </span>
            </button>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
};
