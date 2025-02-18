-- This can be run when we can trust that the answers from KTP include the student_uuid
alter table student alter column student_uuid drop default;
