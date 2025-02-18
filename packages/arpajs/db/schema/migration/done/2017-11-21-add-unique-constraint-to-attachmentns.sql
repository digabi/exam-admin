alter table attachment add constraint display_name_unique_per_exam unique(exam_uuid, display_name);

