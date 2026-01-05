-- Generate unique ELOs for all admin profiles (1800-2500, evenly distributed)
WITH ranked AS (
  SELECT id, 
         ROW_NUMBER() OVER (ORDER BY created_at) as rn,
         COUNT(*) OVER () as total
  FROM profiles 
  WHERE is_admin_profile = true
)
UPDATE profiles p
SET game_elo = 1800 + floor((ranked.rn::float / GREATEST(ranked.total, 1)) * 700)::int + floor(random() * 30)::int
FROM ranked
WHERE p.id = ranked.id;