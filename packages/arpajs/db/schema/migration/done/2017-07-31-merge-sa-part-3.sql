alter table exam add constraint user_account_fkey foreign key(user_account_id) references user_account(user_account_id);
alter table exam alter column creation_date set default now();
update exam set creation_date = now() where creation_date is null;
alter table exam alter column creation_date set not null;



