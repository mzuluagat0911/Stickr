-- Solo ARS, USD, COP o EUR en publicaciones del mercado.

ALTER TABLE public.market_intentions
DROP CONSTRAINT IF EXISTS market_intentions_currency_check;

ALTER TABLE public.market_intentions
ADD CONSTRAINT market_intentions_currency_check CHECK (
  currency IN ('ARS', 'USD', 'COP', 'EUR')
);
