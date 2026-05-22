-- Diagnóstico: ¿existe la función de Intercambio? (solo lectura)
SELECT
  p.proname AS name,
  pg_get_function_identity_arguments(p.oid) AS args,
  pg_get_function_result(p.oid) AS returns
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public'
  AND p.proname IN (
    'discover_collectors_exchange_ranked',
    'exchange_overlap_detail'
  )
ORDER BY p.proname;
