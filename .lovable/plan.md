

## Fix: Pulsante Chat non risponde / aperture multiple

### Problema
`handleChat` (riga 277) non ha nessun guard contro click multipli. Ogni click lancia query async indipendenti (match check, session, premium check) senza bloccare i click successivi. Risultato:
- Nessun feedback immediato al click
- Spammando si accumulano richieste parallele
- Dopo minuti tutte risolvono insieme, aprendo pannelli multipli

### Soluzione
Aggiungere un guard `isCreatingChat` all'inizio di `handleChat` (non solo in `handleConfirmChat`) e impostarlo immediatamente al primo click.

### Modifiche

**`src/components/ProfileGridCard.tsx`**

1. In `handleChat`, aggiungere come prima riga dopo `e.stopPropagation()`:
   ```typescript
   if (isCreatingChat) return;
   setIsCreatingChat(true);
   ```

2. Aggiungere `setIsCreatingChat(false)` in tutti i percorsi di uscita di `handleChat`:
   - Dopo `navigate(...)` (riga 289)
   - Dopo `setShowChatConfirmation(true)` (riga 313)
   - In un blocco `catch` per gestire errori

3. Nel bottone Chat nel JSX, aggiungere `disabled={isCreatingChat}` e mostrare uno spinner/stato di caricamento quando `isCreatingChat` è true

Questo garantisce che un solo click venga processato alla volta, con feedback visivo immediato (bottone disabilitato).

