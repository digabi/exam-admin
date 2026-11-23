ALTER TABLE held_exam
  ADD COLUMN IF NOT EXISTS minutes_session_id uuid;

CREATE TABLE IF NOT EXISTS minutes_exam_room (
  minutes_exam_room_id serial PRIMARY KEY,
  minutes_session_id uuid NOT NULL,
  exam_room_name text NOT NULL,
  UNIQUE (minutes_session_id, exam_room_name)
);

CREATE TABLE IF NOT EXISTS minutes_exam_room_event (
  minutes_exam_room_event_id serial PRIMARY KEY,
  minutes_session_id uuid NOT NULL,
  exam_room_name text NOT NULL,
  note text NOT NULL,
  event_timestamp timestamptz NOT NULL
);

CREATE TABLE IF NOT EXISTS minutes_student_event (
  minutes_student_event_id serial PRIMARY KEY,
  minutes_session_id uuid NOT NULL,
  student_uuid uuid NOT NULL,
  exam_uuid uuid NOT NULL,
  exam_room_name text,
  note text NOT NULL,
  event_timestamp timestamptz NOT NULL,
  extra_time int
);

CREATE INDEX IF NOT EXISTS minutes_exam_room_session_idx ON minutes_exam_room (minutes_session_id);
CREATE INDEX IF NOT EXISTS minutes_exam_room_event_session_idx ON minutes_exam_room_event (minutes_session_id);
CREATE INDEX IF NOT EXISTS minutes_student_event_session_idx ON minutes_student_event (minutes_session_id);
