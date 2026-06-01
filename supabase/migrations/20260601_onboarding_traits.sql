-- 🧭 Onboarding al primo accesso: preferenze "chi cerchi" + tratti di
-- personalità (per il futuro matching di "Tenta il Destino").
--
-- Aggiunge a public.profiles:
--   - onboarding_completed : flag, true quando l'utente ha completato il pannello
--   - destiny_traits        : JSON con le risposte personalità (id domanda -> risposta)
--
-- Sicuro e idempotente. Da eseguire nel SQL Editor di Lovable Cloud.

alter table public.profiles
  add column if not exists onboarding_completed boolean not null default false;

alter table public.profiles
  add column if not exists destiny_traits jsonb;

-- Indice GIN per poter cercare/filtrare in futuro per tratti (Tenta il Destino).
create index if not exists idx_profiles_destiny_traits
  on public.profiles using gin (destiny_traits);
