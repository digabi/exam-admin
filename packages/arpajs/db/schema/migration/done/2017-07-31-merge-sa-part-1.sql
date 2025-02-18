drop table student_ssn;
drop table student_ssn_search;

create table user_account(
  user_account_id UUID not null default uuid_generate_v4() primary key,
  user_account_username varchar(254) not null unique,
  user_account_details jsonb default '{}'::jsonb,
  user_account_passwd varchar(60),
  token UUID,
  token_created timestamp
);

alter table answer_paper drop column school_id;

-- needed for connect-pg-simple
create table session (
  sid  VARCHAR NOT NULL PRIMARY KEY,
  sess JSONB   NOT NULL,
  expire TIMESTAMP(6) NOT NULL
);

