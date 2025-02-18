BEGIN;

CREATE TABLE oauth_client
(
    oauth_client_id             SERIAL PRIMARY KEY,
    oauth_client_secret         TEXT        NOT NULL,
    oauth_client_user_id        TEXT UNIQUE NOT NULL,
    oauth_client_name           TEXT UNIQUE NOT NULL,
    oauth_client_redirect_uri   TEXT        NOT NULL
);

COMMENT ON TABLE oauth_client IS 'OAuth client details. The oauth_client_redirect_uri must be a absolute HTTPS URI without wildcards, fragments etc.: https://tools.ietf.org/html/rfc6749#section-3.1.2';

CREATE TABLE oauth_authorization_code
(
    oauth_authorization_code_id             SERIAL PRIMARY KEY,
    oauth_client_id                         INTEGER REFERENCES oauth_client (oauth_client_id),
    oauth_authorization_code_value          TEXT        NOT NULL,
    oauth_authorization_code_code_challenge TEXT,
    oauth_authorization_code_valid_until    TIMESTAMPTZ NOT NULL,
    user_account_id                         UUID REFERENCES user_account (user_account_id) ON DELETE CASCADE
);

CREATE TABLE oauth_access_token
(
    oauth_access_token_id          SERIAL PRIMARY KEY,
    oauth_access_token_value       TEXT        NOT NULL,
    oauth_access_token_valid_until TIMESTAMPTZ NOT NULL,
    user_account_id                UUID        NOT NULL REFERENCES user_account (user_account_id),
    oauth_client_id                INTEGER     NOT NULL REFERENCES oauth_client (oauth_client_id) ON DELETE CASCADE
);

CREATE TABLE oauth_refresh_token
(
    oauth_refresh_token_id          SERIAL PRIMARY KEY,
    oauth_refresh_token_value       TEXT        NOT NULL,
    oauth_refresh_token_valid_until TIMESTAMPTZ NOT NULL,
    user_account_id                 UUID        NOT NULL REFERENCES user_account (user_account_id),
    oauth_client_id                 INTEGER     NOT NULL REFERENCES oauth_client (oauth_client_id) ON DELETE CASCADE
);

CREATE TABLE oauth_scope
(
    oauth_scope_id   SERIAL PRIMARY KEY,
    oauth_scope_name TEXT NOT NULL
);

INSERT INTO oauth_scope (oauth_scope_name)
VALUES ('exam:write');

CREATE TABLE oauth_client__scope
(
    oauth_client_id INTEGER NOT NULL REFERENCES oauth_client (oauth_client_id),
    oauth_scope_id  INTEGER NOT NULL REFERENCES oauth_scope (oauth_scope_id) ON DELETE CASCADE,
    UNIQUE (oauth_client_id, oauth_scope_id)
);

CREATE TABLE oauth_authorization_code__scope
(
    oauth_authorization_code_id INTEGER NOT NULL REFERENCES oauth_authorization_code (oauth_authorization_code_id) ON DELETE CASCADE,
    oauth_scope_id              INTEGER NOT NULL REFERENCES oauth_scope (oauth_scope_id) ON DELETE CASCADE,
    UNIQUE (oauth_authorization_code_id, oauth_scope_id)
);

CREATE TABLE oauth_access_token__scope
(
    oauth_access_token_id INTEGER NOT NULL REFERENCES oauth_access_token (oauth_access_token_id) ON DELETE CASCADE,
    oauth_scope_id        INTEGER NOT NULL REFERENCES oauth_scope (oauth_scope_id) ON DELETE CASCADE,
    UNIQUE (oauth_access_token_id, oauth_scope_id)
);

CREATE TABLE oauth_refresh_token__scope
(
    oauth_refresh_token_id INTEGER NOT NULL REFERENCES oauth_refresh_token (oauth_refresh_token_id) ON DELETE CASCADE,
    oauth_scope_id         INTEGER NOT NULL REFERENCES oauth_scope (oauth_scope_id) ON DELETE CASCADE,
    UNIQUE (oauth_refresh_token_id, oauth_scope_id)
);

CREATE TABLE oauth_transaction_details
(
    oauth_transaction_details_id             SERIAL PRIMARY KEY,
    oauth_transaction_details_transaction_id TEXT        NOT NULL,
    oauth_transaction_details_username       TEXT        NOT NULL,
    oauth_transaction_details_client_name    TEXT        NOT NULL,
    oauth_transaction_details_scopes         TEXT[]      NOT NULL,
    oauth_transaction_details_created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE FUNCTION add_oauth_client(oauth_client_user_id_in TEXT, oauth_client_name_in TEXT, oauth_client_secret_in TEXT, oauth_client_redirect_uri_in TEXT) RETURNS INTEGER AS
$$
INSERT INTO oauth_client (oauth_client_user_id, oauth_client_name, oauth_client_secret, oauth_client_redirect_uri)
VALUES (oauth_client_user_id_in, oauth_client_name_in, crypt(oauth_client_secret_in, gen_salt('bf', 8)), oauth_client_redirect_uri_in)
RETURNING oauth_client_id
$$ LANGUAGE sql;

CREATE FUNCTION add_scope_to_oauth_client(oauth_client_name_in TEXT, oauth_scope_name_in TEXT) RETURNS VOID AS
$$
INSERT INTO oauth_client__scope
SELECT oauth_client_id, oauth_scope_id
FROM oauth_client,
     oauth_scope
WHERE oauth_client_name = oauth_client_name_in
  AND oauth_scope_name = oauth_scope_name_in
$$ LANGUAGE sql;

CREATE FUNCTION remove_scope_from_oauth_client(oauth_client_name_in TEXT, oauth_scope_name_in TEXT) RETURNS VOID AS
$$
DELETE
FROM oauth_client__scope
WHERE oauth_client_id = (SELECT oauth_client_id FROM oauth_client WHERE oauth_client_name = oauth_client_name_in)
  AND oauth_scope_id = (SELECT oauth_scope_id FROM oauth_scope WHERE oauth_scope_name = oauth_scope_name_in)
$$ LANGUAGE sql;

CREATE FUNCTION oauth_client_scope_names(oauth_client_name_in TEXT)
    RETURNS TABLE
            (
                oauth_scope_name TEXT
            )
AS
$$
SELECT oauth_scope_name
FROM oauth_scope
         natural join oauth_client__scope
         natural join oauth_client
WHERE oauth_client_name = oauth_client_name_in
$$ LANGUAGE sql;

CREATE FUNCTION extract_origin_from_uri(uri TEXT) RETURNS TEXT AS
$$
SELECT substring(uri, 'https?://[^/]*')
$$
    LANGUAGE sql;

-- COMMIT;
