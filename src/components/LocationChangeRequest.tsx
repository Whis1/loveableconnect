import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { MapPin, MessageCircle, AlertCircle } from "lucide-react";
import { PlacesAutocomplete } from "@/components/PlacesAutocomplete";
import { useTranslation } from "react-i18next";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface LocationChangeRequestProps {
  currentCity?: string;
  onRequestSubmit: (city: string, latitude: number, longitude: number) => void;
}

export const LocationChangeRequest = ({ currentCity, onRequestSubmit }: LocationChangeRequestProps) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [selectedCity, setSelectedCity] = useState("");
  const [coordinates, setCoordinates] = useState<{ lat: number; lng: number } | null>(null);

  const handleCityChange = (city: string, lat?: number, lng?: number) => {
    setSelectedCity(city);
    if (lat !== undefined && lng !== undefined) {
      setCoordinates({ lat, lng });
    }
  };

  const handleSubmitRequest = () => {
    if (selectedCity && coordinates) {
      onRequestSubmit(selectedCity, coordinates.lat, coordinates.lng);
      // Navigazione gestita dal parent con lo state corretto
    }
  };

  return (
    <Card className="max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MapPin className="h-5 w-5 text-primary" />
          Richiesta Cambio Location
        </CardTitle>
        <CardDescription>
          La tua location attuale è bloccata. Invia una richiesta al supporto per modificarla.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            <strong>Location attuale:</strong> {currentCity || "Non impostata"}
          </AlertDescription>
        </Alert>

        <div className="space-y-2">
          <label className="text-sm font-medium">Nuova Location</label>
          <PlacesAutocomplete
            value={selectedCity}
            onChange={handleCityChange}
            placeholder="Cerca la tua nuova città..."
          />
        </div>

        {selectedCity && (
          <Alert className="bg-green-50 dark:bg-green-950 border-green-200 dark:border-green-800">
            <MapPin className="h-4 w-4 text-green-600 dark:text-green-400" />
            <AlertDescription className="text-green-800 dark:text-green-200">
              Nuova location selezionata: <strong>{selectedCity}</strong>
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
            disabled={!selectedCity || !coordinates}
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
