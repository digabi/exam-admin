CREATE TABLE IF NOT EXISTS ytl_connection_key (
    ytl_connection_key_value           bytea       PRIMARY KEY,
    ytl_connection_key_id              SERIAL      UNIQUE,
    ytl_connection_key_user_account_id uuid        NOT NULL REFERENCES user_account(user_account_id) ON DELETE CASCADE,
    ytl_connection_key_expires_at      timestamptz NOT NULL,
    ytl_connection_key_created_at      timestamptz NOT NULL DEFAULT now()
);
