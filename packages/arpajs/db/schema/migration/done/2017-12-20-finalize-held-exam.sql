alter table held_exam alter column held_exam_uuid set not null;
alter table answer_paper drop column exam_uuid;
alter table exam drop column answer_emails_sent;

drop index answer_paper_unique;
create unique index answer_paper_unique on answer_paper(student_uuid, held_exam_uuid);

drop index answer_paper_exam_uuid;
create index answer_paper_held_exam_uuid ON answer_paper (held_exam_uuid);
