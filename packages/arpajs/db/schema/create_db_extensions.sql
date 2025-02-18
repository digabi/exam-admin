-- This file needs to be run with enough privileges to create/drop casts & extensions (e.g. postgres user)
set client_min_messages = warning;

drop cast if exists (character varying as json);

create extension if not exists "uuid-ossp";
create cast (character varying as json) without function as implicit;

drop extension if exists "pgcrypto";
create extension if not exists "pgcrypto";
set client_min_messages = notice;
