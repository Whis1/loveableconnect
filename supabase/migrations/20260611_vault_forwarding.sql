-- ============================================================
-- INOLTRO AUTOMATICO AL DATA VAULT (sito archivio permanente)
-- Ogni voce creata in:
--   - admin_credit_actions  (Cronologia crediti/like/abbonamenti, 24h)
--   - admin_user_actions    (Cronologia Azioni: ban, eliminazioni, inbox)
--   - support_ratings       (Valutazioni Assistenze, al momento dell'invio)
-- viene spedita via HTTP al sito Data Vault, dove resta salvata
-- per sempre, identica a com'e' scritta qui.
-- L'inoltro e' asincrono (pg_net) e non blocca MAI l'azione originale:
-- se il Vault e' giu' o non configurato, il sito funziona come prima.
-- ============================================================

-- Estensione per chiamate HTTP asincrone dal database.
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Configurazione (URL di ingest + chiave). Riga unica. RLS attiva e
-- NESSUNA policy: invisibile e immodificabile dai client del sito;
-- ci arrivano solo SQL editor, service role e le funzioni qui sotto.
CREATE TABLE IF NOT EXISTS public.vault_forward_config (
  id int PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  ingest_url text,
  api_key text,
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.vault_forward_config ENABLE ROW LEVEL SECURITY;
INSERT INTO public.vault_forward_config (id) VALUES (1) ON CONFLICT (id) DO NOTHING;

-- Funzione di inoltro: se la config non e' compilata non fa nulla.
CREATE OR REPLACE FUNCTION public.forward_to_vault(p_category text, p_payload jsonb)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  cfg record;
BEGIN
  SELECT ingest_url, api_key INTO cfg
  FROM public.vault_forward_config WHERE id = 1;

  IF cfg.ingest_url IS NULL OR cfg.ingest_url = ''
     OR cfg.api_key IS NULL OR cfg.api_key = '' THEN
    RETURN;
  END IF;

  PERFORM net.http_post(
    url := cfg.ingest_url,
    body := jsonb_build_object(
      'source',   'loveableconnect',
      'category', p_category,
      'payload',  p_payload
    ),
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-api-key',    cfg.api_key
    )
  );
EXCEPTION WHEN OTHERS THEN
  -- L'inoltro non deve mai far fallire l'azione che l'ha generato.
  NULL;
END;
$$;

-- 1) Cronologia crediti/like/abbonamenti: inoltro a ogni nuova voce.
CREATE OR REPLACE FUNCTION public.trg_forward_credit_action()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  PERFORM public.forward_to_vault('cronologia_crediti', to_jsonb(NEW));
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS forward_credit_action ON public.admin_credit_actions;
CREATE TRIGGER forward_credit_action
AFTER INSERT ON public.admin_credit_actions
FOR EACH ROW EXECUTE FUNCTION public.trg_forward_credit_action();

-- 2) Cronologia Azioni (ban, eliminazioni, messaggi inbox): idem.
--    Per i messaggi inbox la voce viene arricchita con i premi allegati
--    (reward_credits / reward_likes) e il numero di destinatari, letti
--    dalle righe inbox_messages dello stesso batch: la cronologia da sola
--    registra solo il testo del messaggio.
CREATE OR REPLACE FUNCTION public.trg_forward_user_action()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  extra jsonb := '{}'::jsonb;
  v_credits int;
  v_likes int;
  v_destinatari int;
BEGIN
  IF NEW.batch_id IS NOT NULL THEN
    SELECT MAX(reward_credits), MAX(reward_likes), COUNT(*)
      INTO v_credits, v_likes, v_destinatari
      FROM public.inbox_messages
     WHERE batch_id::text = NEW.batch_id::text;
    IF COALESCE(v_destinatari, 0) > 0 THEN
      extra := jsonb_build_object(
        'reward_credits', COALESCE(v_credits, 0),
        'reward_likes',   COALESCE(v_likes, 0),
        'destinatari',    v_destinatari
      );
    END IF;
  END IF;
  PERFORM public.forward_to_vault('cronologia_azioni', to_jsonb(NEW) || extra);
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS forward_user_action ON public.admin_user_actions;
CREATE TRIGGER forward_user_action
AFTER INSERT ON public.admin_user_actions
FOR EACH ROW EXECUTE FUNCTION public.trg_forward_user_action();

-- 3) Valutazioni Assistenze: inoltro SOLO quando l'utente invia davvero
--    la valutazione (submitted_at passa da NULL a valorizzato).
CREATE OR REPLACE FUNCTION public.trg_forward_support_rating()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.submitted_at IS NOT NULL AND OLD.submitted_at IS NULL THEN
    PERFORM public.forward_to_vault('valutazione_assistenza', to_jsonb(NEW));
  END IF;
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS forward_support_rating ON public.support_ratings;
CREATE TRIGGER forward_support_rating
AFTER UPDATE ON public.support_ratings
FOR EACH ROW EXECUTE FUNCTION public.trg_forward_support_rating();

-- ============================================================
-- DA ESEGUIRE A PARTE quando il Data Vault e' pronto (URL noto):
--
-- UPDATE public.vault_forward_config
-- SET ingest_url = 'https://IL-TUO-PROGETTO.supabase.co/functions/v1/vault-ingest',
--     api_key    = 'LA_INGEST_API_KEY',
--     updated_at = now()
-- WHERE id = 1;
-- ============================================================
