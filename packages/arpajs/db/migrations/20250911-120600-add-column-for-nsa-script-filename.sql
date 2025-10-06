ALTER TABLE user_account
    ADD COLUMN user_account_custom_nsa_script_filename VARCHAR(256) DEFAULT NULL;

ALTER TABLE user_account
    DROP COLUMN user_account_use_s3_nsa_scripts;
