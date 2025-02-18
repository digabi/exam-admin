set client_min_messages = warning;
drop table if exists answer cascade;
drop table if exists answer_paper cascade;
drop table if exists exam cascade;
drop table if exists student_ssn_search cascade;
drop table if exists student_ssn cascade;
drop table if exists student cascade;
drop table if exists score;
drop table if exists screenshots;
drop table if exists attachment;
drop table if exists server_environment_held_exam_map;
drop table if exists server_environment cascade;
drop table if exists held_exam;
drop table if exists user_account cascade;
drop table if exists user_role cascade;
drop table if exists user_school_role cascade;
drop table if exists session cascade;
drop table if exists oauth_client cascade;
drop table if exists oauth_authorization_code cascade;
drop table if exists oauth_access_token cascade;
drop table if exists oauth_refresh_token cascade;
drop table if exists oauth_scope cascade;
drop table if exists oauth_client__scope;
drop table if exists oauth_authorization_code__scope;
drop table if exists oauth_access_token__scope;
drop table if exists oauth_refresh_token__scope;
drop table if exists oauth_transaction_details;
drop table if exists schemaversion;
drop table if exists imported_public_exam;
drop type if exists exam_type;

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

CREATE TABLE oauth_client
(
    oauth_client_id           SERIAL PRIMARY KEY,
    oauth_client_secret       TEXT        NOT NULL,
    oauth_client_user_id      TEXT UNIQUE NOT NULL,
    oauth_client_name         TEXT UNIQUE NOT NULL,
    oauth_client_redirect_uri TEXT        NOT NULL
);

COMMENT ON TABLE oauth_client IS 'OAuth client details. The oauth_client_redirect_uri must be a absolute HTTPS URI without wildcards, fragments etc.: https://tools.ietf.org/html/rfc6749#section-3.1.2';

CREATE TABLE oauth_authorization_code
(
    oauth_authorization_code_id             SERIAL PRIMARY KEY,
    oauth_authorization_code_value          TEXT        NOT NULL,
    oauth_authorization_code_code_challenge TEXT,
    oauth_authorization_code_valid_until    TIMESTAMPTZ NOT NULL,
    user_account_id                         UUID REFERENCES user_account (user_account_id) ON DELETE CASCADE,
    oauth_client_id                         INTEGER REFERENCES oauth_client (oauth_client_id) ON DELETE CASCADE
);

CREATE TABLE oauth_access_token
(
    oauth_access_token_id          SERIAL PRIMARY KEY,
    oauth_access_token_value       TEXT        NOT NULL,
    oauth_access_token_valid_until TIMESTAMPTZ NOT NULL,
    user_account_id                UUID        NOT NULL REFERENCES user_account (user_account_id) ON DELETE CASCADE,
    oauth_client_id                INTEGER     NOT NULL REFERENCES oauth_client (oauth_client_id) ON DELETE CASCADE
);

CREATE TABLE oauth_refresh_token
(
    oauth_refresh_token_id          SERIAL PRIMARY KEY,
    oauth_refresh_token_value       TEXT        NOT NULL,
    oauth_refresh_token_valid_until TIMESTAMPTZ NOT NULL,
    user_account_id                 UUID        NOT NULL REFERENCES user_account (user_account_id) ON DELETE CASCADE,
    oauth_client_id                 INTEGER     NOT NULL REFERENCES oauth_client (oauth_client_id) ON DELETE CASCADE
);

CREATE TABLE oauth_scope
(
    oauth_scope_id   SERIAL PRIMARY KEY,
    oauth_scope_name TEXT NOT NULL UNIQUE
);

INSERT INTO oauth_scope (oauth_scope_name)
VALUES ('exam:write');

CREATE TABLE oauth_client__scope
(
    oauth_client_id INTEGER NOT NULL REFERENCES oauth_client (oauth_client_id) ON DELETE CASCADE,
    oauth_scope_id  INTEGER NOT NULL REFERENCES oauth_scope (oauth_scope_id) ON DELETE CASCADE,
    UNIQUE (oauth_client_id, oauth_scope_id)
);

CREATE TABLE oauth_authorization_code__scope
(
    oauth_authorization_code_id INTEGER NOT NULL REFERENCES oauth_authorization_code (oauth_authorization_code_id) ON DELETE CASCADE,
    oauth_scope_id              INTEGER NOT NULL REFERENCES oauth_scope (oauth_scope_id) ON DELETE CASCADE,
    UNIQUE (oauth_authorization_code_id, oauth_scope_id)
);

CREATE TABLE oauth_access_token__scope
(
    oauth_access_token_id INTEGER NOT NULL REFERENCES oauth_access_token (oauth_access_token_id) ON DELETE CASCADE,
    oauth_scope_id        INTEGER NOT NULL REFERENCES oauth_scope (oauth_scope_id) ON DELETE CASCADE,
    UNIQUE (oauth_access_token_id, oauth_scope_id)
);

CREATE TABLE oauth_refresh_token__scope
(
    oauth_refresh_token_id INTEGER NOT NULL REFERENCES oauth_refresh_token (oauth_refresh_token_id) ON DELETE CASCADE,
    oauth_scope_id         INTEGER NOT NULL REFERENCES oauth_scope (oauth_scope_id) ON DELETE CASCADE,
    UNIQUE (oauth_refresh_token_id, oauth_scope_id)
);

CREATE TABLE oauth_transaction_details
(
    oauth_transaction_details_id             SERIAL PRIMARY KEY,
    oauth_transaction_details_transaction_id TEXT        NOT NULL,
    oauth_transaction_details_username       TEXT        NOT NULL,
    oauth_transaction_details_client_name    TEXT        NOT NULL,
    oauth_transaction_details_scopes         TEXT[]      NOT NULL,
    oauth_transaction_details_created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE OR REPLACE FUNCTION add_oauth_client(oauth_client_user_id_in TEXT, oauth_client_name_in TEXT, oauth_client_secret_in TEXT, oauth_client_redirect_uri_in TEXT) RETURNS INTEGER AS
$$
INSERT INTO oauth_client (oauth_client_user_id, oauth_client_name, oauth_client_secret, oauth_client_redirect_uri)
VALUES (oauth_client_user_id_in, oauth_client_name_in, crypt(oauth_client_secret_in, gen_salt('bf', 8)), oauth_client_redirect_uri_in)
RETURNING oauth_client_id
$$ LANGUAGE sql;

CREATE OR REPLACE FUNCTION remove_oauth_client(oauth_client_name_in TEXT) RETURNS VOID AS
$$
DELETE
FROM oauth_client
WHERE oauth_client_name = oauth_client_name_in;
$$ LANGUAGE sql;

CREATE OR REPLACE FUNCTION add_scope_to_oauth_client(oauth_client_name_in TEXT, oauth_scope_name_in TEXT) RETURNS VOID AS
$$
INSERT INTO oauth_client__scope
SELECT oauth_client_id, oauth_scope_id
FROM oauth_client,
     oauth_scope
WHERE oauth_client_name = oauth_client_name_in
  AND oauth_scope_name = oauth_scope_name_in
$$ LANGUAGE sql;

CREATE OR REPLACE FUNCTION remove_scope_from_oauth_client(oauth_client_name_in TEXT, oauth_scope_name_in TEXT) RETURNS VOID AS
$$
DELETE
FROM oauth_client__scope
WHERE oauth_client_id = (SELECT oauth_client_id FROM oauth_client WHERE oauth_client_name = oauth_client_name_in)
  AND oauth_scope_id = (SELECT oauth_scope_id FROM oauth_scope WHERE oauth_scope_name = oauth_scope_name_in)
$$ LANGUAGE sql;

CREATE OR REPLACE FUNCTION oauth_client_scope_names(oauth_client_name_in TEXT)
    RETURNS TABLE
            (
                oauth_scope_name TEXT
            )
AS
$$
SELECT oauth_scope_name
FROM oauth_scope
         natural join oauth_client__scope
         natural join oauth_client
WHERE oauth_client_name = oauth_client_name_in
$$ LANGUAGE sql;

CREATE OR REPLACE FUNCTION extract_origin_from_uri(uri TEXT) RETURNS TEXT AS
$$
SELECT substring(uri, 'https?://[^/]*')
$$
    LANGUAGE sql;
set client_min_messages = notice;
