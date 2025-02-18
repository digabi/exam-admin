DROP INDEX user_account_user_account_username_key;

CREATE INDEX user_account_user_account_username_key
  ON user_account (lower(user_account_username));