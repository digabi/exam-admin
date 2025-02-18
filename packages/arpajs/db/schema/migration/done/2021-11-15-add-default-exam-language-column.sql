ALTER TABLE user_account ADD COLUMN user_account_exam_language exam_language not null DEFAULT 'fi-FI';
COMMENT ON COLUMN user_account.user_account_exam_language IS 'Kokeen oletuskieli, jota käytetään monikielisen mex-kokeen valintaan ja uuden kokeen oletuskieleen';
