# Stelle — Sito di Incontri Magico

## Original problem statement
"creami un sito di incontri innovativo magico, dove le persone si iscrivono sia normalmente, sia tramite google accesso, un sito di incontri con bacheca dove ci sono tutti i profili, una home dove si può modificare il proprio profilo, qualcosa di stupendo"

## User choices (Feb 2026)
- Auth: Emergent-managed Google Auth + email/password JWT
- Match system: like + match reciproci + chat base
- Foto: object storage / URL immagine (chosen: URL-based for MVP)
- Stile: etereo/sognante (cielo stellato, oro)
- Filtri bacheca: età, genere, città, interessi

## Architecture
- Backend: FastAPI + Motor + MongoDB. Sessione cookie httpOnly condivisa per email/password e Google. Collezioni: users, user_sessions, likes, matches, messages.
- Frontend: React + shadcn/ui + Tailwind. Tema scuro celestiale (#040710 background, #E6C998 oro stellare). Font: Cormorant Garamond + Outfit.
- Routes: `/` (landing+auth), `/dashboard`, `/bacheca`, `/matches`. AuthCallback su hash `#session_id=...`.

## Implemented (Feb 2026)
- Email/password register + login con bcrypt, sessione 7 giorni
- Emergent Google OAuth completo (frontend redirect + backend session-data exchange)
- CRUD profilo: nome, età, genere, città, bio, interessi, foto multiple via URL
- Bacheca con filtri età/genere/città/interesse + grid magica
- Like/match system (reciprocità → match document)
- Chat base tra match (messaggi persistenti in MongoDB)
- UI italiana, starfield CSS animato, glassmorphism, gold glow
- data-testid completi su tutti gli elementi interattivi

## Backlog
- P1: Upload foto via Emergent Object Storage (attualmente solo URL)
- P1: Notifiche real-time per nuovi messaggi/match (websocket o polling)
- P2: Visite al profilo / "chi mi ha visto"
- P2: Boost / superlike / verifica profilo
- P2: Geolocalizzazione automatica città
- P2: Onboarding multi-step alla registrazione
