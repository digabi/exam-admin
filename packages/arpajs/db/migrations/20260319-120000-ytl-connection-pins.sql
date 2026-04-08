CREATE TABLE IF NOT EXISTS ytl_connection_pin (
    ytl_connection_pin_code            text        NOT NULL,
    ytl_connection_pin_user_account_id uuid        NOT NULL REFERENCES user_account(user_account_id) ON DELETE CASCADE,
    ytl_connection_pin_created_at      timestamptz NOT NULL DEFAULT now(),
    PRIMARY KEY (ytl_connection_pin_code, ytl_connection_pin_user_account_id)
);
