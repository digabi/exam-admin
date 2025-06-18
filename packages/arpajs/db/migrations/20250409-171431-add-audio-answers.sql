-- auto-generated definition
create table audio
(
    audio_id    varchar(200)  not null
        primary key,
    content            bytea not null,
    answer_paper_id    integer
        references answer_paper
            on delete cascade,
    audio_created timestamp with time zone default now()
);

comment on table audio is 'Audio vastausten äänitiedostot';