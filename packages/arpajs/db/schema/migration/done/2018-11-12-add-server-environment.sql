
create table server_environment (
  server_environment_id serial primary key,
  server_environment_data jsonb not null
);

create table server_environment_held_exam_map (
  server_environment_id int references server_environment(server_environment_id) not null,
  held_exam_uuid uuid references held_exam(held_exam_uuid) not null,
  primary key (server_environment_id, held_exam_uuid)
);
