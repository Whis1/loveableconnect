-- 📛 Consenti agli utenti autenticati di leggere i display_name degli admin
--
-- Motivazione: lato utente nella chat di supporto mostriamo
-- "Nome admin - Supporto Clienti" sui messaggi di risposta. Senza questa
-- policy, la query SELECT su user_roles veniva bloccata da RLS e l'utente
-- vedeva solo "Supporto Clienti" generico.
--
-- Esposizione: solo le righe con role='admin' diventano leggibili. L'admin
-- è di per sé una figura "pubblica" della piattaforma (l'utente già la vede
-- nei messaggi), quindi non è un'info sensibile.

DROP POLICY IF EXISTS "Authenticated can read admin user_roles" ON public.user_roles;
CREATE POLICY "Authenticated can read admin user_roles"
  ON public.user_roles
  FOR SELECT
  TO authenticated
  USING (role = 'admin');
