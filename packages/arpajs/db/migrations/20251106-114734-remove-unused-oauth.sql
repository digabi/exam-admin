BEGIN;

DROP FUNCTION IF EXISTS extract_origin_from_uri(TEXT);
DROP FUNCTION IF EXISTS oauth_client_scope_names(TEXT);
DROP FUNCTION IF EXISTS remove_scope_from_oauth_client(TEXT, TEXT);
DROP FUNCTION IF EXISTS add_scope_to_oauth_client(TEXT, TEXT);
DROP FUNCTION IF EXISTS add_oauth_client(TEXT, TEXT, TEXT, TEXT);

DROP TABLE IF EXISTS oauth_refresh_token__scope;
DROP TABLE IF EXISTS oauth_access_token__scope;
DROP TABLE IF EXISTS oauth_authorization_code__scope;
DROP TABLE IF EXISTS oauth_client__scope;

DROP TABLE IF EXISTS oauth_transaction_details;
DROP TABLE IF EXISTS oauth_refresh_token;
DROP TABLE IF EXISTS oauth_access_token;
DROP TABLE IF EXISTS oauth_authorization_code;
DROP TABLE IF EXISTS oauth_scope;
DROP TABLE IF EXISTS oauth_client;

COMMIT;