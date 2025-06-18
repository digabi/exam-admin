export const fi = {
  rich_text_editor_locale: 'FI',
  class_name: 'fi',
  tab: {
    STYLED: 'Editori',
    RAW: 'Koodi',
    ATTACHMENTS: 'Liitetiedostot',
    QUESTIONPICKER: 'Tehtävän tuonti',
    EXAMPASSWORD: 'Purkukoodi',
    MATERIAL: 'Aineistosivu',
    EXAM: 'Esikatselu'
  },
  error: {
    connection_error: 'Yhteysvirhe. Yritä uudelleen',
    parse_error: 'Muutokset eivät tallennu ennen kuin korjaat virheen tai lataat sivun uudelleen',
    general_error: 'Virhe',
    section_remove_error: 'Osan poisto ei onnistunut',
    question_import_error: 'Tehtävän tuonti epäonnistui',
    too_large: 'Koe on liian iso'
  },
  add_attachments: 'Pudota lisättävät tiedostot tähän tai klikkaa valitaksesi ne.',
  remove: 'Poista',
  rich_text: 'tekstivastaus',
  dragndrop: 'yhdistelytehtävä',
  single_line: 'lyhyt vastaus',
  choice: 'monivalinta',
  dropdown: 'pudotusvalikko',
  recording: 'äänitys',
  attachment: 'tiedosto',
  add_question: 'Lisää tehtävä',
  add_sub_question: 'Lisää alitehtävä / monivalintakysymys',
  add_attachment: 'Lisää aineistosivulle aineisto',
  add_option: 'Lisää vaihtoehto',
  add_dnd_answer_group: 'Lisää osio ja siihen yhdistettävä vastaus',
  add_dnd_extra_answer: 'Lisää väärä vastaus',
  dnd_extra_answers: 'Ylimääräiset väärät vastaukset',
  max_answers: 'Vastausten maksimimäärä',
  restricted: 'Rajoitettu',
  times: 'kuuntelukertaan',
  max: 'enintään',
  characters: 'merkkiin',
  cas_forbidden: 'Estä laskinohjelmat',
  conversion_failed: 'Kokeen esikatselu ei onnistu',
  no_exam_selected: 'Koetta ei valittu',
  add_section: 'Lisää osa',
  reload: 'Lataa sivu uudelleen',
  add_text: 'teksti',
  text_placeholder: 'KORVAA TÄMÄ TEKSTI',
  option_placeholder: 'VAIHTOEHTO',
  move_up: 'Siirrä ylemmäs',
  move_down: 'Siirrä alemmas',
  open_section_properties: 'Osan ominaisuudet',
  saved: 'Tallennettu',
  section_contains_questions: 'Poistaaksesi osan poista ensin kaikki osan alla olevat tehtävät',
  no_sections_found: 'Osaa ei löydy',
  bad_question: 'Tuotavaa tehtävää ei tueta',
  search: {
    own: 'Omat kokeet',
    public: 'Ylioppilaskokeet',
    exam: 'Koe',
    period: 'Tutkintokausi',
    examType: {
      title: 'Koetyyppi',
      normal: 'Tavanomainen',
      visually_impaired: 'Näkövammaisten erityisjärjestelykoe',
      hearing_impaired: 'Ääniaineistoltaan rajoitettu koe'
    },
    language: 'Kieli',
    languages: {
      'fi-FI': 'suomi',
      'sv-FI': 'ruotsi'
    },
    text: 'Hae kokeiden sisällöstä',
    noResults: 'Ei hakutuloksia'
  },

  attachment_retryable: (fileName: string) =>
    `Liitteen ${fileName} tallennus epäonnistui. Yritä hetken kuluttua uudelleen.`,
  attachment_limit_exceeded: (fileName: string) =>
    `Kokeessa on liian paljon liitteitä, liitteen ${fileName} lisäys ei onnistu.`,
  no_attachments: 'Ei liitteitä'
}
