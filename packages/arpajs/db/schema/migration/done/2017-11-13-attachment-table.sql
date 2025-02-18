create table attachment (
  exam_uuid UUID references exam(exam_uuid) not null,
  display_name text not null,
  storage_key text not null,
  size int not null,
  mime_type text
);

alter table exam add column attachments_migration_started timestamp with time zone;

