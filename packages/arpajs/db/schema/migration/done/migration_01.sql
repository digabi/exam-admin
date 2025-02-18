alter table exam add accessible boolean default false;

alter table answer alter column answer_id type integer;
alter table answer_paper alter column answer_paper_id type integer;
alter table score alter column score_id type integer;

