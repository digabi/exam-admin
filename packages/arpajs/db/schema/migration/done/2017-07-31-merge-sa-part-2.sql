
alter table exam add column user_account_id UUID; --references user_account(user_account_id);
alter table exam add column creation_date timestamp with time zone; --not null default now();
alter table exam add column deletion_date timestamp with time zone;

create index exam_user_account_id_idx on exam(user_account_id);

