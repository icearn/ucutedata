CREATE TABLE IF NOT EXISTS kiwisaver_unit_prices (
    id SERIAL PRIMARY KEY,
    provider TEXT NOT NULL,
    scheme TEXT NOT NULL,
    unit_price NUMERIC(18,6) NOT NULL,
    price_date DATE NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(provider, scheme, price_date)
);

CREATE TABLE IF NOT EXISTS kiwisaver_alert_rules (
    id SERIAL PRIMARY KEY,
    user_id TEXT NOT NULL,
    provider TEXT NOT NULL,
    scheme TEXT NOT NULL,
    metric TEXT NOT NULL,
    comparison TEXT NOT NULL,
    target_value NUMERIC(18,6) NOT NULL,
    reference_price NUMERIC(18,6),
    label TEXT,
    channel TEXT NOT NULL DEFAULT 'common_api',
    channel_target TEXT,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    trigger_once BOOLEAN NOT NULL DEFAULT TRUE,
    triggered_at TIMESTAMPTZ,
    last_notified_price_date DATE,
    last_checked_price_date DATE,
    last_checked_value NUMERIC(18,6),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_kiwisaver_alert_rules_active
    ON kiwisaver_alert_rules (is_active, provider, scheme);

CREATE TABLE IF NOT EXISTS kiwisaver_alert_events (
    id SERIAL PRIMARY KEY,
    rule_id INTEGER NOT NULL REFERENCES kiwisaver_alert_rules(id) ON DELETE CASCADE,
    user_id TEXT NOT NULL,
    provider TEXT NOT NULL,
    scheme TEXT NOT NULL,
    price_date DATE NOT NULL,
    observed_unit_price NUMERIC(18,6) NOT NULL,
    observed_value NUMERIC(18,6) NOT NULL,
    message_title TEXT NOT NULL,
    message_body TEXT NOT NULL,
    channel TEXT NOT NULL,
    channel_target TEXT,
    dispatch_status TEXT NOT NULL,
    dispatch_response TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_kiwisaver_alert_events_rule_id
    ON kiwisaver_alert_events (rule_id, created_at DESC);
