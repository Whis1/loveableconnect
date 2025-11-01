import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar, MessageCircle, AlertCircle } from "lucide-react";
import { useTranslation } from "@/hooks/useTranslation";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface BirthdateChangeRequestProps {
  currentBirthdate?: string;
  onRequestSubmit: (birthdate: string) => void;
}

export const BirthdateChangeRequest = ({ currentBirthdate, onRequestSubmit }: BirthdateChangeRequestProps) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [birthDay, setBirthDay] = useState("");
  const [birthMonth, setBirthMonth] = useState("");
  const [birthYear, setBirthYear] = useState("");

  const handleSubmitRequest = () => {
    if (birthDay && birthMonth && birthYear) {
      const newBirthdate = `${birthYear}-${birthMonth.padStart(2, '0')}-${birthDay.padStart(2, '0')}`;
      onRequestSubmit(newBirthdate);
      // Navigazione gestita dal parent con lo state corretto
    }
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return "Non impostata";
    const date = new Date(dateString);
    return date.toLocaleDateString('it-IT');
  };

  const isFormValid = birthDay && birthMonth && birthYear;

  return (
    <Card className="max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calendar className="h-5 w-5 text-primary" />
          Richiesta Cambio Data di Nascita
        </CardTitle>
        <CardDescription>
          La tua data di nascita è bloccata. Invia una richiesta al supporto per modificarla.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            <strong>Data di nascita attuale:</strong> {formatDate(currentBirthdate || "")}
          </AlertDescription>
        </Alert>

        <div className="space-y-2">
          <label className="text-sm font-medium">Nuova Data di Nascita</label>
          <div className="grid grid-cols-3 gap-2">
            <Select value={birthDay} onValueChange={setBirthDay}>
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
            
            <Select value={birthMonth} onValueChange={setBirthMonth}>
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
            
            <Select value={birthYear} onValueChange={setBirthYear}>
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
        </div>

        {isFormValid && (
          <Alert className="bg-green-50 dark:bg-green-950 border-green-200 dark:border-green-800">
            <Calendar className="h-4 w-4 text-green-600 dark:text-green-400" />
            <AlertDescription className="text-green-800 dark:text-green-200">
              Nuova data di nascita: <strong>{birthDay}/{birthMonth}/{birthYear}</strong>
            </AlertDescription>
          </Alert>
        )}

        <div className="flex gap-3 pt-4">
          <Button
            variant="outline"
            onClick={() => navigate(-1)}
            className="flex-1"
          >
            Annulla
          </Button>
          <Button
            onClick={handleSubmitRequest}
            disabled={!isFormValid}
            className="flex-1"
          >
            <MessageCircle className="h-4 w-4 mr-2" />
            Invia Richiesta
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};