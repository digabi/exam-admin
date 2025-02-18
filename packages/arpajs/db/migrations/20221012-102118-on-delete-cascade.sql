alter table score
drop constraint
    score_answer_id_fkey,
add constraint score_answer_id_fkey
    foreign key (answer_id)
        references answer(answer_id)
        on delete cascade;

alter table answer
drop constraint answer_answer_paper_id_fkey,
add constraint answer_answer_paper_id_fkey
    foreign key (answer_paper_id)
        references answer_paper(answer_paper_id)
        on delete cascade;

alter table answer_paper
drop constraint answer_paper_held_exam_uuid_fkey,
add constraint answer_paper_held_exam_uuid_fkey
    foreign key (held_exam_uuid)
        references held_exam(held_exam_uuid)
        on delete cascade;

alter table answer_paper
drop constraint answer_paper_student_uuid_fkey,
add constraint answer_paper_student_uuid_fkey
    foreign key (student_uuid)
        references student(student_uuid)
        on delete cascade;

alter table held_exam
drop constraint held_exam_exam_uuid_fkey,
add constraint held_exam_exam_uuid_fkey
    foreign key (exam_uuid)
        references exam(exam_uuid)
        on delete cascade;

alter table server_environment_held_exam_map
drop constraint
    server_environment_held_exam_map_held_exam_uuid_fkey,
add constraint server_environment_held_exam_map_held_exam_uuid_fkey
    foreign key (held_exam_uuid)
        references held_exam(held_exam_uuid)
        on delete cascade;

alter table server_environment_held_exam_map
drop constraint
    server_environment_held_exam_map_server_environment_id_fkey,
add constraint server_environment_held_exam_map_server_environment_id_fkey
    foreign key (server_environment_id)
        references server_environment(server_environment_id)
        on delete cascade;

alter table attachment
    drop constraint attachment_exam_uuid_fkey,
    add constraint attachment_exam_uuid_fkey
foreign key (exam_uuid)
references exam(exam_uuid)
on delete cascade;

alter table exam
drop constraint exam_user_account_id_fkey,
add constraint exam_user_account_id_fkey
    foreign key (user_account_id)
        references user_account(user_account_id)
        on delete cascade;

