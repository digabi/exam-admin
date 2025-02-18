CREATE TABLE imported_public_exam
(
  exam_uuid UUID REFERENCES exam (exam_uuid) ON DELETE CASCADE,
  file_key  varchar(80) NOT NULL,
  skipped_exam BOOLEAN DEFAULT FALSE
);

COMMENT ON COLUMN imported_public_exam.skipped_exam
  IS 'Koetta ei tuotu oma abittiin. Todennäköisesti se on json koe, jota ei tueta';