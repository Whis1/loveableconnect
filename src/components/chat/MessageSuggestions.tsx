import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Sparkles } from "lucide-react";

interface MessageSuggestionsProps {
  onSuggestionSelect: (message: string) => void;
  onDismiss: () => void;
}

const neutralSuggestions = [
  "Qual è il tuo cibo preferito?",
  "Hai programmi per oggi?",
  "Se potessi viaggiare, dove andresti?",
  "Qual è la cosa più folle che tu abbia mai fatto?"
];

const boldSuggestions = [
  "Che belle gambe... A che ora aprono?",
  "Saresti disponibile per divertirci un po'?",
  "Perché non ci beviamo qualcosa e vediamo come finisce la serata?",
  "Qual è la tua fantasia più frequente?"
];

export const MessageSuggestions = ({ onSuggestionSelect, onDismiss }: MessageSuggestionsProps) => {
  const [selectedMode, setSelectedMode] = useState<'neutral' | 'bold' | null>(null);

  const handleSuggestionClick = (suggestion: string) => {
    onSuggestionSelect(suggestion);
    onDismiss();
  };

  return (
    <div className="mb-4 animate-in slide-in-from-bottom-5 duration-300">
      <Card className="p-4 bg-gradient-to-br from-primary/5 via-purple-50/50 to-pink-50/50 dark:from-primary/10 dark:via-purple-900/20 dark:to-pink-900/20 border-primary/20 shadow-lg">
        {!selectedMode ? (
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-sm font-medium text-foreground/80 mb-3">
              <Sparkles className="h-4 w-4 text-primary" />
              <span>Vuoi un aiuto per spezzare il ghiaccio?</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <Button
                onClick={() => setSelectedMode('neutral')}
                variant="outline"
                className="h-auto py-3 px-4 bg-blue-500/10 hover:bg-blue-500/20 border-blue-500/30 text-blue-700 dark:text-blue-300 hover:border-blue-500/50 transition-all duration-200 flex items-center justify-center gap-2 animate-[scale-slow_4s_ease-in-out_infinite]"
              >
                <span className="text-2xl">😇</span>
                <span className="font-medium">Rispondi in modo neutro</span>
              </Button>
              <Button
                onClick={() => setSelectedMode('bold')}
                variant="outline"
                className="h-auto py-3 px-4 bg-red-500/10 hover:bg-red-500/20 border-red-500/30 text-red-700 dark:text-red-300 hover:border-red-500/50 transition-all duration-200 flex items-center justify-center gap-2 animate-[scale-slow_4s_ease-in-out_2s_infinite]"
              >
                <span className="text-2xl">😈</span>
                <span className="font-medium">Rispondi in modo spinto</span>
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2 text-sm font-medium">
                <span className="text-2xl">{selectedMode === 'neutral' ? '😇' : '😈'}</span>
                <span className="text-foreground/80">
                  {selectedMode === 'neutral' ? 'Suggerimenti neutri' : 'Suggerimenti spinti'}
                </span>
              </div>
              <Button
                onClick={() => setSelectedMode(null)}
                variant="ghost"
                size="sm"
                className="h-7 text-xs hover:bg-background/50"
              >
                Indietro
              </Button>
            </div>
            <div className="grid gap-2">
              {(selectedMode === 'neutral' ? neutralSuggestions : boldSuggestions).map((suggestion, index) => (
                <Button
                  key={index}
                  onClick={() => handleSuggestionClick(suggestion)}
                  variant="outline"
                  className="h-auto py-3 px-4 text-left justify-start bg-background/50 hover:bg-background border-primary/20 hover:border-primary/40 hover:shadow-md transition-all duration-200 whitespace-normal text-sm"
                >
                  {suggestion}
                </Button>
              ))}
            </div>
          </div>
        )}
      </Card>
    </div>
  );
};
