-- SOLO si part1 ya corrió con Success y ves "permission denied" en Intercambio.
-- Si ves "function ... does not exist" → NO uses este archivo; ejecutá 0023-part1-discover.sql primero.

GRANT EXECUTE ON FUNCTION public.discover_collectors_exchange_ranked (uuid, int)
TO authenticated;

GRANT EXECUTE ON FUNCTION public.discover_collectors_exchange_ranked (uuid, int)
TO service_role;

REVOKE ALL ON FUNCTION public.exchange_overlap_detail (uuid)
FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.exchange_overlap_detail (uuid)
TO authenticated;
