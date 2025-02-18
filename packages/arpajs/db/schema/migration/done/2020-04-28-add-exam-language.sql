CREATE TYPE exam_language AS ENUM ('fi-FI', 'sv-FI');

ALTER TABLE exam ADD COLUMN exam_language exam_language DEFAULT 'fi-FI';
