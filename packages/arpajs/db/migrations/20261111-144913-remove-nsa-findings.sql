ALTER TABLE held_exam DROP COLUMN IF EXISTS held_exam_nsa_findings_status;

DROP TYPE IF EXISTS nsa_findings_status;
