import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Trophy, Flame } from "lucide-react";

interface RisikoVictoryDialogProps {
  open: boolean;
  winner: 'blue' | 'red' | null;
  userProfile: any;
  onClose: () => void;
}

export const RisikoVictoryDialog = ({
  open,
  winner,
  userProfile,
  onClose
}: RisikoVictoryDialogProps) => {
  const playerWon = winner === 'blue';

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="text-center text-2xl">
            {playerWon ? '🎉 HAI VINTO! 🎉' : '😔 HAI PERSO'}
          </DialogTitle>
        </DialogHeader>

        <div className="flex flex-col items-center gap-4 py-6">
          <Avatar className="w-32 h-32 border-4 border-primary">
            <AvatarImage 
              src={`https://tcmhvrlsaggyuukdscue.supabase.co/storage/v1/object/public/avatars/${userProfile?.avatar_url}`}
              alt={userProfile?.nickname}
            />
            <AvatarFallback className="text-4xl">
              {userProfile?.nickname?.[0]?.toUpperCase()}
            </AvatarFallback>
          </Avatar>

          <h3 className="text-xl font-bold">{userProfile?.nickname}</h3>

          {playerWon ? (
            <div className="text-center space-y-2">
              <div className="flex items-center justify-center gap-2 text-yellow-500">
                <Trophy className="w-6 h-6" />
                <span className="text-lg font-semibold">+20 ELO</span>
              </div>
              <div className="flex items-center justify-center gap-2 text-primary">
                <Flame className="w-6 h-6" />
                <span className="text-lg font-semibold">+6 Crediti</span>
              </div>
            </div>
          ) : (
            <div className="text-center">
              <div className="flex items-center justify-center gap-2 text-muted-foreground">
                <Trophy className="w-6 h-6" />
                <span className="text-lg font-semibold">-10 ELO</span>
              </div>
            </div>
          )}
        </div>

        <Button onClick={onClose} className="w-full">
          Chiudi
        </Button>
      </DialogContent>
    </Dialog>
  );
};
