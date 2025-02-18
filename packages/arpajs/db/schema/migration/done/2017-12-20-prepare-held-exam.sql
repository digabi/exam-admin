create table held_exam (
  held_exam_uuid    uuid                     default uuid_generate_v4() primary key,
  exam_uuid         uuid references exam (exam_uuid) not null,
  held_exam_created timestamp with time zone default now(),
  answer_emails_sent timestamp with time zone
);

alter table answer_paper add column held_exam_uuid UUID references held_exam(held_exam_uuid);
