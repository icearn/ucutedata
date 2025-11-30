CREATE TABLE IF NOT EXISTS kiwisaver_unit_prices (
    id SERIAL PRIMARY KEY,
    provider TEXT NOT NULL,
    scheme TEXT NOT NULL,
    unit_price NUMERIC(18,6) NOT NULL,
    price_date DATE NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(provider, scheme, price_date)
);
