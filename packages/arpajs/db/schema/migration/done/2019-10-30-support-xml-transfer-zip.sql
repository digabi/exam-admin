alter table exam add column title text; -- tässä ei voi aluksi olla not null
-- seuraava rivi kestänee 15-20min ajaa tuotannossa
update exam set title = content->>'title';
-- tuotantodatassa on tapauksia missä content jsonissa ei ole titleä
-- joten näissä title jää nulliksi. Korjataan käsin
update exam set title = '' where title is null;
alter table exam alter column title set not null;

alter table exam alter column content drop not null;
alter table exam alter column content set default null;
alter table exam add column content_xml xml default null;
alter table exam add column grading_structure jsonb default null;
alter table exam add constraint content_xor_content_xml check ((content is null) <> (content_xml is null));
alter table attachment add column metadata jsonb default null;
