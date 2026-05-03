-- Por selección (48 equipos): posiciones 2–13 del bloque «equipo» pasan de
-- `regular` a `team_photo` para alinear con 1 escudo + 13 equipo + 6 jugadores.

UPDATE public.sticker_catalog
SET type = 'team_photo'
WHERE
  team_code NOT IN ('FWC', 'MUSEUM')
  AND position_in_team >= 2
  AND position_in_team <= 13
  AND type = 'regular';
