-- Por selección (48 equipos): 1 = escudo, 13 = foto grupal, 2–12 y 14–20 = jugadores.
-- Corrige 0015 (había puesto team_photo en position_in_team 2–13).

UPDATE public.sticker_catalog sc
SET type = CASE
  WHEN (sc.sticker_number - 21) % 20 = 0 THEN 'team_crest'
  WHEN (sc.sticker_number - 21) % 20 = 12 THEN 'team_photo'
  ELSE 'regular'
END
WHERE sc.album_edition = 'PR-International'
  AND sc.sticker_number >= 21
  AND sc.sticker_number < 981
  AND sc.team_code NOT IN ('FWC', 'MUSEUM');
