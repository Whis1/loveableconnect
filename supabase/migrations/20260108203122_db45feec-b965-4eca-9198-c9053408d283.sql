-- Aggiorna gli ELO degli admin per essere multipli di 10 (1800, 1810, 1820, ..., 2500)
WITH ranked AS (
  SELECT id, 
         ROW_NUMBER() OVER (ORDER BY created_at) as rn,
         COUNT(*) OVER () as total
  FROM profiles 
  WHERE is_admin_profile = true
)
UPDATE profiles p
SET game_elo = 1800 + (floor((ranked.rn::float / GREATEST(ranked.total, 1)) * 70)::int * 10)
FROM ranked
WHERE p.id = ranked.id;