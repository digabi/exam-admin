CREATE TYPE exam_type AS enum ('normal','visually-impaired','hearing-impaired');

ALTER TABLE exam ADD COLUMN exam_code VARCHAR(3);
ALTER TABLE exam ADD COLUMN exam_period VARCHAR(5);
ALTER TABLE exam ADD COLUMN exam_type exam_type;

CREATE UNIQUE INDEX unique_exam_code_date_when_public_exam
  ON exam (exam_code, exam_period, exam_language, exam_type)
  WHERE user_account_id IS NULL;
