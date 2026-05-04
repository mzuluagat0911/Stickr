-- Ranuras intro FWC: alinear position_in_team con sticker_number (0-based).
UPDATE sticker_catalog
SET position_in_team = sticker_number - 1
WHERE team_code = 'FWC'
  AND sticker_number >= 1
  AND sticker_number <= 20;
