set client_min_messages = warning;
drop table if exists answer cascade;
drop table if exists answer_paper cascade;
drop table if exists exam cascade;
drop table if exists student_ssn_search cascade;
drop table if exists student_ssn cascade;
drop table if exists student cascade;
drop table if exists score;
drop table if exists screenshots;
drop table if exists audio;
drop table if exists attachment;
drop table if exists server_environment_held_exam_map;
drop table if exists server_environment cascade;
drop table if exists held_exam;
drop table if exists user_account cascade;
drop table if exists user_role cascade;
drop table if exists user_school_role cascade;
drop table if exists session cascade;
drop table if exists schemaversion;
drop table if exists imported_public_exam;
drop type if exists exam_type;
drop type if exists nsa_findings_status;

create table student
(
    student_uuid UUID primary key,
    first_names  varchar(100) not null,
    last_name    varchar(100) not null,
    email        varchar(254)
);

drop type if exists exam_language;
create type exam_language as enum ('fi-FI', 'sv-FI');

create table user_account
(
    user_account_id          UUID         not null default uuid_generate_v4() primary key,
    user_account_username    varchar(254) not null unique,
    user_account_details     jsonb                 default '{}'::jsonb,
    user_account_passwd      varchar(60),
    user_account_mex_opt_out boolean      not null default false,
    token                    UUID,
    token_created            timestamp,
    user_account_exam_language exam_language not null DEFAULT 'fi-FI'
);
COMMENT ON COLUMN user_account.user_account_exam_language IS 'Kokeen oletuskieli, jota käytetään monikielisen mex-kokeen valintaan ja uuden kokeen oletuskieleen';


create table exam
(
    exam_uuid                     UUID                     not null default uuid_generate_v4() primary key,
    exam_language                 exam_language            not null default 'fi-FI',
    content                       json                              default null,
    content_xml                   xml                               default null,
    grading_structure             jsonb                             default null,
    title                         text                     not null,
    locked                        boolean                  not null default false,
    password                      varchar(100)             not null,
    attachments_filename          varchar,
    accessible                    boolean                           default false,
    content_valid                 boolean                  not null,
    attachments_migration_started timestamp with time zone,
    user_account_id               UUID references user_account (user_account_id) ON DELETE CASCADE,
    creation_date                 timestamp with time zone not null default now(),
    deletion_date                 timestamp with time zone,
    constraint content_xor_content_xml CHECK ((content is null) <> (content_xml is null))
);

create index exam_user_account_id_idx on exam (user_account_id);

create table held_exam
(
    held_exam_uuid          UUID                                      default uuid_generate_v4() primary key,
    exam_uuid               uuid references exam (exam_uuid) not null,
    held_exam_created       timestamp with time zone                  default now(),
    answer_emails_sent      timestamp with time zone,
    held_exam_deletion_date timestamp with time zone,
    held_exam_type          text                             not null default 'json',
    held_exam_ktp_version   text
);

create table answer_paper
(
    answer_paper_id serial primary key,
    held_exam_uuid  UUID references held_exam (held_exam_uuid) not null,
    student_uuid    UUID references student (student_uuid)     not null,
    created         timestamp with time zone,
    exam_started    timestamp,
    grading_text    varchar(100),
  external_computer_allowed boolean not null default false
);

create table answer
(
    answer_id       serial primary key,
    answer_paper_id int references answer_paper (answer_paper_id) not null,
    answer_content  json                                          not null,
    question_id     int                                           not null
);

create table screenshots
(
    screenshot_uuid UUID primary key,
    content         bytea not null
);

create table score
(
    score_id    serial primary key,
    answer_id   int references answer (answer_id) not null,
    score_value int,
    comment     text,
    update_time timestamp,
    metadata    json
);

create table attachment
(
    exam_uuid    uuid not null references exam (exam_uuid) on delete cascade,
    display_name text                             not null,
    storage_key  text                             not null,
    metadata     jsonb default null,
    size         int                              not null,
    mime_type    text,
    constraint display_name_unique_per_exam unique (exam_uuid, display_name),
    constraint size_positive check (size > 0)
);

create table server_environment
(
    server_environment_id   serial primary key,
    server_environment_data jsonb not null
);

create table server_environment_held_exam_map
(
    server_environment_id int references server_environment (server_environment_id) not null,
    held_exam_uuid        uuid references held_exam (held_exam_uuid)                not null,
    primary key (server_environment_id, held_exam_uuid)
);

create unique index answer_score_unique on score (answer_id);

create unique index answer_unique on answer (answer_paper_id, question_id);
create unique index answer_paper_unique on answer_paper (student_uuid, held_exam_uuid);

create index answer_paper_held_exam_uuid ON answer_paper (held_exam_uuid);

-- needed for connect-pg-simple
create table session
(
    sid    VARCHAR      NOT NULL PRIMARY KEY,
    sess   JSONB        NOT NULL,
    expire TIMESTAMP(6) NOT NULL
);
