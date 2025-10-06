CREATE TYPE nsa_findings_status AS enum ('not_generated', 'no_findings', 'has_findings');

ALTER TABLE held_exam
  ADD COLUMN held_exam_nsa_findings_status nsa_findings_status NOT NULL DEFAULT 'no_findings';

ALTER TABLE held_exam
  ALTER COLUMN held_exam_nsa_findings_status SET DEFAULT 'not_generated';
