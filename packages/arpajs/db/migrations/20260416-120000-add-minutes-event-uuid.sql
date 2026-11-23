-- event_uuid on minutes event tables (for DBs that applied 20260408-120000 before this column existed).

ALTER TABLE minutes_exam_room_event
  ADD COLUMN IF NOT EXISTS event_uuid uuid;

UPDATE minutes_exam_room_event
SET event_uuid = gen_random_uuid()
WHERE event_uuid IS NULL;

ALTER TABLE minutes_exam_room_event
  ALTER COLUMN event_uuid SET NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS minutes_exam_room_event_minutes_session_id_event_uuid_idx
  ON minutes_exam_room_event (minutes_session_id, event_uuid);

ALTER TABLE minutes_student_event
  ADD COLUMN IF NOT EXISTS event_uuid uuid;

UPDATE minutes_student_event
SET event_uuid = gen_random_uuid()
WHERE event_uuid IS NULL;

ALTER TABLE minutes_student_event
  ALTER COLUMN event_uuid SET NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS minutes_student_event_minutes_session_id_event_uuid_idx
  ON minutes_student_event (minutes_session_id, event_uuid);
