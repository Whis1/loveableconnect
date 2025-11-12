import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Search, Save, Plus, X, AlertTriangle, CheckCircle2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

interface TerritoryConnection {
  territory_index: number;
  territory_name: string;
  neighbor_indices: number[];
}

export const TerritoryConnectionsManager = () => {
  const [connections, setConnections] = useState<TerritoryConnection[]>([]);
  const [filteredConnections, setFilteredConnections] = useState<TerritoryConnection[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTerritory, setSelectedTerritory] = useState<TerritoryConnection | null>(null);
  const [editingConnections, setEditingConnections] = useState<number[]>([]);
  const [newNeighbor, setNewNeighbor] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);

  useEffect(() => {
    loadConnections();
  }, []);

  useEffect(() => {
    if (searchQuery.trim() === "") {
      setFilteredConnections(connections);
    } else {
      const query = searchQuery.toLowerCase();
      setFilteredConnections(
        connections.filter(
          (c) =>
            c.territory_name.toLowerCase().includes(query) ||
            c.territory_index.toString().includes(query)
        )
      );
    }
  }, [searchQuery, connections]);

  const loadConnections = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("territory_connections")
        .select("*")
        .order("territory_index");

      if (error) throw error;

      setConnections(data || []);
      setFilteredConnections(data || []);
    } catch (error) {
      console.error("Error loading connections:", error);
      toast.error("Errore nel caricamento delle connessioni");
    } finally {
      setLoading(false);
    }
  };

  const openEditDialog = (territory: TerritoryConnection) => {
    setSelectedTerritory(territory);
    setEditingConnections([...territory.neighbor_indices]);
    setNewNeighbor("");
    setValidationErrors([]);
  };

  const closeEditDialog = () => {
    setSelectedTerritory(null);
    setEditingConnections([]);
    setNewNeighbor("");
    setValidationErrors([]);
  };

  const addNeighbor = () => {
    const neighborIndex = parseInt(newNeighbor);
    if (isNaN(neighborIndex)) {
      toast.error("Inserisci un indice valido");
      return;
    }

    if (neighborIndex === selectedTerritory?.territory_index) {
      toast.error("Un territorio non può essere vicino a se stesso");
      return;
    }

    if (neighborIndex < 0 || neighborIndex > 53) {
      toast.error("Indice deve essere tra 0 e 53");
      return;
    }

    if (editingConnections.includes(neighborIndex)) {
      toast.error("Questo vicino è già presente");
      return;
    }

    setEditingConnections([...editingConnections, neighborIndex]);
    setNewNeighbor("");
  };

  const removeNeighbor = (index: number) => {
    setEditingConnections(editingConnections.filter((n) => n !== index));
  };

  const validateConnections = () => {
    const errors: string[] = [];

    if (!selectedTerritory) return errors;

    // Verifica che le connessioni siano bidirezionali
    editingConnections.forEach((neighborIndex) => {
      const neighbor = connections.find((c) => c.territory_index === neighborIndex);
      if (neighbor && !neighbor.neighbor_indices.includes(selectedTerritory.territory_index)) {
        errors.push(
          `⚠️ ${neighbor.territory_name} (${neighborIndex}) non ha ${selectedTerritory.territory_name} come vicino`
        );
      }
    });

    // Verifica connessioni rimosse
    selectedTerritory.neighbor_indices.forEach((oldNeighbor) => {
      if (!editingConnections.includes(oldNeighbor)) {
        const neighbor = connections.find((c) => c.territory_index === oldNeighbor);
        if (neighbor && neighbor.neighbor_indices.includes(selectedTerritory.territory_index)) {
          errors.push(
            `⚠️ Devi rimuovere anche ${selectedTerritory.territory_name} da ${neighbor.territory_name} (${oldNeighbor})`
          );
        }
      }
    });

    setValidationErrors(errors);
    return errors;
  };

  const saveConnections = async () => {
    if (!selectedTerritory) return;

    const errors = validateConnections();
    if (errors.length > 0) {
      toast.error("Correggi gli errori di validazione prima di salvare");
      return;
    }

    try {
      setSaving(true);

      const { error } = await supabase
        .from("territory_connections")
        .update({ neighbor_indices: editingConnections })
        .eq("territory_index", selectedTerritory.territory_index);

      if (error) throw error;

      toast.success("Connessioni salvate con successo!");
      await loadConnections();
      closeEditDialog();
    } catch (error) {
      console.error("Error saving connections:", error);
      toast.error("Errore nel salvataggio delle connessioni");
    } finally {
      setSaving(false);
    }
  };

  const getTerritoryName = (index: number): string => {
    return connections.find((c) => c.territory_index === index)?.territory_name || `Territorio ${index}`;
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="py-8">
          <p className="text-center text-muted-foreground">Caricamento connessioni...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            🗺️ Gestione Connessioni Territori Risiko
          </CardTitle>
          <CardDescription>
            Modifica le connessioni tra i 54 territori del gioco Risiko. Le modifiche saranno applicate a tutte le nuove partite.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Cerca territorio per nome o indice..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8"
              />
            </div>
            <Button variant="outline" onClick={loadConnections}>
              Ricarica
            </Button>
          </div>

          <ScrollArea className="h-[600px] pr-4">
            <div className="space-y-2">
              {filteredConnections.map((territory) => (
                <Card key={territory.territory_index} className="hover:bg-accent/50 transition-colors">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 space-y-2">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline">{territory.territory_index}</Badge>
                          <span className="font-semibold">{territory.territory_name}</span>
                        </div>
                        <div className="flex flex-wrap gap-1">
                          {territory.neighbor_indices.map((neighbor) => (
                            <Badge key={neighbor} variant="secondary" className="text-xs">
                              {neighbor}: {getTerritoryName(neighbor)}
                            </Badge>
                          ))}
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {territory.neighbor_indices.length} vicini
                        </p>
                      </div>
                      <Button size="sm" onClick={() => openEditDialog(territory)}>
                        Modifica
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <Dialog open={!!selectedTerritory} onOpenChange={(open) => !open && closeEditDialog()}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>
              Modifica Connessioni: {selectedTerritory?.territory_name} (#{selectedTerritory?.territory_index})
            </DialogTitle>
          </DialogHeader>

          <ScrollArea className="flex-1 pr-4">
            <div className="space-y-4">
              {/* Add Neighbor */}
              <div className="flex gap-2">
                <Input
                  type="number"
                  placeholder="Indice vicino (0-53)"
                  value={newNeighbor}
                  onChange={(e) => setNewNeighbor(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && addNeighbor()}
                  min={0}
                  max={53}
                />
                <Button onClick={addNeighbor} size="icon">
                  <Plus className="h-4 w-4" />
                </Button>
              </div>

              {/* Current Neighbors */}
              <div className="space-y-2">
                <h4 className="font-semibold text-sm">Vicini attuali ({editingConnections.length}):</h4>
                <div className="space-y-1">
                  {editingConnections.sort((a, b) => a - b).map((neighbor) => (
                    <div
                      key={neighbor}
                      className="flex items-center justify-between p-2 bg-secondary rounded-md"
                    >
                      <div className="flex items-center gap-2">
                        <Badge>{neighbor}</Badge>
                        <span className="text-sm">{getTerritoryName(neighbor)}</span>
                      </div>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => removeNeighbor(neighbor)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                  {editingConnections.length === 0 && (
                    <p className="text-sm text-muted-foreground">Nessun vicino</p>
                  )}
                </div>
              </div>

              {/* Validation */}
              <Button
                variant="outline"
                onClick={validateConnections}
                className="w-full"
              >
                <AlertTriangle className="h-4 w-4 mr-2" />
                Valida Connessioni
              </Button>

              {validationErrors.length > 0 && (
                <div className="space-y-2 p-3 bg-destructive/10 border border-destructive rounded-md">
                  <p className="font-semibold text-sm text-destructive">Errori di validazione:</p>
                  {validationErrors.map((error, i) => (
                    <p key={i} className="text-xs text-destructive">
                      {error}
                    </p>
                  ))}
                </div>
              )}

              {validationErrors.length === 0 && editingConnections.length > 0 && (
                <div className="flex items-center gap-2 p-3 bg-green-500/10 border border-green-500 rounded-md">
                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                  <p className="text-sm text-green-600 dark:text-green-400">
                    Validazione superata! Puoi salvare.
                  </p>
                </div>
              )}
            </div>
          </ScrollArea>

          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button variant="outline" onClick={closeEditDialog}>
              Annulla
            </Button>
            <Button onClick={saveConnections} disabled={saving}>
              <Save className="h-4 w-4 mr-2" />
              {saving ? "Salvataggio..." : "Salva"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};
