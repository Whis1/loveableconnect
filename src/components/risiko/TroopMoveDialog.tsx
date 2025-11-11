import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";

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
    onConfirm(amount);
    setAmount(1);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Seleziona quantità di truppe da spostare</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          <div className="text-center">
            <p className="text-4xl font-bold">{amount}</p>
            <p className="text-sm text-muted-foreground">truppe su {maxTroops} disponibili</p>
          </div>
          
          <Slider
            value={[amount]}
            onValueChange={(values) => setAmount(values[0])}
            min={1}
            max={maxTroops}
            step={1}
            className="w-full"
          />
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Annulla
          </Button>
          <Button onClick={handleConfirm}>
            Conferma
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
