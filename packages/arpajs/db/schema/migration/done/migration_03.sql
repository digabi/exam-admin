create table student_ssn (
  student_ssn_id serial primary key,
  student_ssn_encrypted bytea not null unique,
  student_uuid UUID references student(student_uuid) not null
);

create table student_ssn_search (
  student_ssn_id serial primary key,
  student_ssn_search varchar(11) not null unique,
  student_uuid_encrypted bytea not null
);
