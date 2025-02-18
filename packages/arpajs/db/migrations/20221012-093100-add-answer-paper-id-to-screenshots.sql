alter table screenshots add column answer_paper_id int references answer_paper(answer_paper_id) on delete cascade;
alter table screenshots add column screenshot_created timestamp with time zone;
alter table screenshots alter screenshot_created set default now();


