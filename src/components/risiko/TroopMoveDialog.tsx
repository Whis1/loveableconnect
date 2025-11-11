import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, Users, Swords } from "lucide-react";
import troopsIcon from "@/assets/risiko-troops.png";

interface TroopMoveDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  maxTroops: number;
  onConfirm: (amount: number) => void;
}

export const TroopMoveDialog = ({
  open,
  onOpenChange,
  maxTroops,
  onConfirm
}: TroopMoveDialogProps) => {
  const [amount, setAmount] = useState(1);

  const handleConfirm = () => {
    onOpenChange(false); // Close dialog immediately
    setAmount(1);
    onConfirm(amount);
  };

  const increment = () => {
    if (amount < maxTroops) setAmount(amount + 1);
  };

  const decrement = () => {
    if (amount > 1) setAmount(amount - 1);
  };

  const setMin = () => setAmount(1);
  const setMax = () => setAmount(maxTroops);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md bg-gradient-to-b from-background to-muted border-4 border-primary/30">
        <DialogHeader>
          <DialogTitle className="text-center text-2xl font-bold flex items-center justify-center gap-2">
            <Swords className="w-6 h-6 text-primary" />
            Sposta Truppe
            <Swords className="w-6 h-6 text-primary" />
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6 py-6">
          {/* Troop Icon */}
          <div className="flex justify-center">
            <img 
              src={troopsIcon} 
              alt="Truppe" 
              className="w-24 h-24 opacity-80"
            />
          </div>

          {/* Counter Display */}
          <div className="text-center space-y-2">
            <div className="flex items-center justify-center gap-4">
              <Button
                variant="outline"
                size="lg"
                onClick={decrement}
                disabled={amount <= 1}
                className="h-16 w-16 rounded-full border-2 border-primary/50 hover:bg-primary/20 disabled:opacity-30"
              >
                <ChevronLeft className="w-8 h-8" />
              </Button>

              <div className="relative">
                <div className="text-7xl font-bold text-primary drop-shadow-lg">
                  {amount}
                </div>
                <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 whitespace-nowrap">
                  <p className="text-sm text-muted-foreground flex items-center gap-1">
                    <Users className="w-4 h-4" />
                    su {maxTroops} disponibili
                  </p>
                </div>
              </div>

              <Button
                variant="outline"
                size="lg"
                onClick={increment}
                disabled={amount >= maxTroops}
                className="h-16 w-16 rounded-full border-2 border-primary/50 hover:bg-primary/20 disabled:opacity-30"
              >
                <ChevronRight className="w-8 h-8" />
              </Button>
            </div>
          </div>

          {/* Quick Select Buttons */}
          <div className="flex gap-2 justify-center pt-4">
            <Button
              variant="secondary"
              size="sm"
              onClick={setMin}
              className="px-4"
            >
              Min (1)
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={setMax}
              className="px-4"
            >
              Max ({maxTroops})
            </Button>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 pt-2">
            <Button 
              variant="outline" 
              onClick={() => onOpenChange(false)}
              className="flex-1 h-12 text-base"
            >
              Annulla
            </Button>
            <Button 
              onClick={handleConfirm}
              className="flex-1 h-12 text-base bg-primary hover:bg-primary/90"
            >
              Conferma Spostamento
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
