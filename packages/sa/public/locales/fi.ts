export const fi = {
  sa: {
    app_name: 'Digabi Exam Admin',
    email: 'Sähköpostiosoite',
    password: 'Salasana',
    wrong_credentials: 'Unohditko salasanasi? Katso ohje alta.',
    wrong_credentials_oauth: 'Tarkista sähköpostiosoite ja salasana',
    login: 'Kirjaudu',
    login_header: 'Kirjaudu palveluun',
    logout: 'Kirjaudu ulos',
    cancel: 'Peruuta',
    exams_tab: 'Koetehtävät',
    grading_tab: 'Koesuoritukset',
    settings_tab: 'Tilin asetukset',
    teachers_tab: 'Opettajat',
    create_exam_mex: 'Luo uusi koe',
    copy_exam: 'Kopioi koe',
    create_old_exam_description: 'Vanhalla editorilla laadittua koetta ei voi ladata koetilan palvelimelle.',
    old_editor_warning:
      'Tämä editori tulee poistumaan käytöstä 1.6.2023.<br/> Et voi ladata tällä editorilla tehtyjä kokeita koetilan palvelimelle, mutta voit kopioda kokeen uudeksi kokeeksi.',
    old_format_label: 'Vanha koemuoto',
    bertta_instruction_url: '#',
    bertta_instruction_label: 'Ohjeet',
    default_exam_title: 'Uusi koe',
    created: 'Luotu',
    exams_of_event: 'Koetehtävät',
    date: 'Päivämäärä',
    edit_exam: 'Muokkaa',
    edit_exam_disabled_tooltip:
      'Uudelleenkäyttääksesi koetta tallenna se "siirrä koe (.zip)" -painikkeella tietokoneellesi ja hae se "tuo koe.zip" -painikkeella uudeksi kokeeksi.',
    remove_exam_title: 'Haluatko poistaa kokeen {{title}}?',
    remove_exam_description: 'Kokeeseen liittyvät vastaukset poistetaan samalla.',
    remove_exam: 'Poista',
    exam_incomplete: 'Kokeessa ei ole tehtäviä tai sen tiedoissa on virheitä. Korjaa koe muokkaamalla sitä.',
    exam_execution_instructions_title: 'Ohjeita',
    exam_execution_instructions: 'kokeen laatimiseen ja järjestämiseen',
    exam_execution_instructions_url: '#',
    exam_execution_instructions_help: 'N/A',
    exams: 'Kokeet',
    download_exam: 'Lataa koetehtävät',
    is_exam_ready_for_download: 'Onko koe valmis ladattavaksi?',
    download_locks_exam: 'Valitsemalla "Lataa" et voi enää muokata koetta.',
    exams_code: 'Kokeen purkukoodi: ',
    download: 'Lataa',
    exam_code: 'Purkukoodi:',
    show_code: 'Näytä purkukoodi',
    show_security_codes: 'Näytä avainlukulista',
    export_exam: 'Siirrä koe (.zip)',
    import_takes_time: 'Kokeen tuonti voi kestää joitakin minuutteja.',
    held_exam_name: 'Koe',
    principal: 'rehtori',
    teacher: 'opettaja',
    import_exam: 'Tuo koe (.zip)',
    import_attachments: 'Tuo liitteet (.zip)',
    attachments: 'Liitetiedostot',
    giving_exam: 'Kokeen pitäminen',
    reusing_exam: 'Uudelleenkäyttö/<br>kokeen jakaminen',
    show_deleted: 'Näytä poistetut',
    undelete: 'Peruuta poisto',
    errors: {
      removing_exam_failed: 'Kokeen poistossa tapahtui virhe, yritä hetken kuluttua uudelleen.',
      load_error: 'Tietojen latauksessa tapahtui virhe, yritä hetken kuluttua uudelleen.',
      exam_import: {
        invalid_json: 'Koetiedosto on rikki. Siirrä ja tuo koe uudelleen.',
        invalid_format: 'Tiedosto ei sisällä koetta.',
        zip_too_big: 'Tiedosto on liian suuri.'
      }
    },
    settings: {
      title: 'Asetukset',
      authorized_applications: 'Valtuutetut sovellukset',
      remove_authorization: 'Poista',
      no_authorized_apps: 'Ei valtuutuksia',
      update_username: {
        change_email_address: 'Vaihda sähköpostiosoite',
        new_email_address: 'Uusi sähköpostiosoite',
        success: 'Sähköpostiosoite on vaihdettu.',
        error: 'Virhe vaihdettaessa sähköpostiosoitetta, tarkista osoite.',
        status: {
          ready: 'Lähetämme vahvistuslinkin uuteen sähköpostiosoitteeseen.',
          done: 'Vahvistuslinkki lähetetty uuteen sähköpostiosoitteeseen.'
        },
        validation_errors: {
          invalid_username: 'Virheellinen sähköpostiosoite',
          username_exists: 'Sähköpostiosoite on jo käytössä',
          empty_password: 'Syötä salasana',
          invalid_password: 'Salasana ei täsmää'
        }
      }
    },
    too_many_exams_warning:
      'Sinulla on yli 400 koetta. Poistamalla ylimääräisiä kokeita nopeutat koelistauksen latautumista.<br>Vanhimmat kokeet näkyvät koelistauksen lopussa.'
  },
  lapa: {
    title: 'Digabi Exam Admin',
    preview_exam: 'Esikatsele koetta',
    preview_attachments: 'Esikatsele aineistovälilehteä',
    back_to_exams: 'Kokeiden hallintaan',
    exam_editor_instructions:
      'Täytä alle kokeen tiedot ja laadi kysymykset. Ohjeeseen voit kirjoittaa opiskelijoille kokeeseen vastaamisessa tarvittavia ohjeita. Kun olet valmis, klikkaa "Palaa kokeiden hallintaan" -linkkiä.',
    changes_autosaved: 'Kaikki muutokset tallentuvat automaattisesti.',
    exam_language: 'Kokeen kieli',
    exam_languages: {
      'fi-FI': 'Suomi',
      'sv-FI': 'Ruotsi'
    },
    exam_name: 'Kokeen nimi',
    exam_name_required: 'Kokeen nimi ei voi olla tyhjä.',
    exam_instructions: 'Kokeen ohje',
    exam_not_editable:
      'Tätä koetta ei voi muokata. Voit tallentaa kokeen tietokoneellesi edellisen näytön "siirrä koe (.zip)" -painikkeella.',
    xml_exam_not_editable: 'Tätä koetta ei voi muokata.',
    questions_and_max_points: 'Kysymykset ja maksimipisteet',
    screenshot_expected: 'opiskelija voi liittää kuvankaappauksen vastaukseensa',
    saved: 'tallennettu',
    add_attachments: 'Pudota lisättävät tiedostot tähän tai klikkaa valitaksesi ne.',
    attachments_instructions: 'N/A',
    attachment_name: 'Liite',
    attachment_size: 'Koko',
    attachment_remove: 'Poista',
    total_size: 'Yhteensä',
    add_question: 'Lisää kysymys: ',
    add_question_text: 'teksti',
    add_question_choicegroup: 'monivalinta',
    add_question_multichoicegap: 'aukkomonivalinta',
    gap_questions_text: 'Aukkotehtävän teksti',
    add_gap_at_cursor: 'Lisää aukko kursorin kohdalle',
    remove_gap: 'Poista aukko',
    gap_popup_header: 'Aukon vastausvaihtoehdot',
    assignment: 'Tehtävänanto',
    remove_question: 'Poista',
    add_choice: 'Lisää monivalinta kirjoittamalla tähän',
    add_option: 'Lisää vastausvaihtoehto kirjoittamalla tähän - järjestys arvotaan erikseen kullekin opiskelijalle',
    add_option_short: 'Lisää vastausvaihtoehto',
    add_separator: 'Lisää erotin monivalintojen väliin',
    correct_option: 'Oikea',
    choice_options: 'Vastausvaihtoehto',
    question_content_required: 'Kysymys ei voi olla tyhjä',
    assignment_required: 'Tehtävänanto ei voi olla tyhjä',
    max: 'Max',
    points: 'p',
    add_section_A_button: 'Lisää matematiikan kokeen A-osa',
    delete_section_A_button: 'Poista matematiikan kokeen A-osa',
    section_A: 'A-osa (CAS-laskinohjelmat estetty)',
    section_B: 'B-osa (CAS-laskinohjelmat käytettävissä)',
    note_grading_text_points: '(arviointi vain kokonaisilla pisteillä)',
    note_grading_choice_points:
      '(jaetaan monivalintojen määrällä, pyöristetään tarvittaessa lähimpään kokonaispistemäärään)',
    gap_ie_warning:
      'Internet Explorer -selaimella aukkotehtävän rivinvaihdot eivät välttämättä näy oikein, tarkista kokeen ulkoasu esikatselusta.',
    missing_correct_options_warning:
      'Monivalintatehtävissä pitää vähintään yhden vastausvaihtoehdon olla merkitty oikeaksi.',
    cas_forbid: 'Estä CAS-laskinohjelmien käyttö kokeessa',
    errors: {
      max_score_limits: 'Maksimipistemäärä voi olla 0-99',
      exam_locked: 'Kokeeseen ei voi tehdä muutoksia. Koe on lukittu koetilan palvelimelle siirtoa varten.',
      save_exam_failed:
        'Kokeen tallennus epäonnistui. Tallennusta yritetään uudelleen, kun olet tehnyt muutoksia kokeeseen.',
      exam_not_found: 'Koetta ei löytynyt, tarkista osoite.',
      exam_loading_failed: 'Kokeen lataus epäonnistui. Yritä hetken kuluttua uudelleen.',
      attachment_retryable: 'Liitteen {{fileName}} tallennus epäonnistui. Yritä hetken kuluttua uudelleen.',
      attachment_limit_exceeded: 'Kokeessa on liian paljon liitteitä, liitteen {{fileName}} lisäys ei onnistu.',
      too_large: 'Kokeen tallennus epäonnistui. Koe on liian suuri'
    }
  },
  arpa: {
    application_name: 'Digabi Exam Admin',
    email: 'Sähköposti',
    send_emails: 'Lähetä kokeet sähköposteihin',
    email_addresses: 'kokelasta on antanut sähköpostinsa',
    emails_sent: 'lähetetty',
    print: 'Tulosta',
    return_to_exams: 'Kokeiden hallintaan',
    score_table: 'Pistetaulukko',
    student: 'Kokelas',
    scored_average: 'Arvioitujen keskiarvo',
    grade: 'Arvosana',
    comment_answer: 'Kommentoi vastausta',
    remove_comment: 'Poista',
    saved: 'tallennettu',
    review_instruction: 'Anna kokonaisarvio kokelaan koesuorituksille ja palauta kokeet.',
    go_to_grading: 'Suoritusten arviointiin',
    print_rest: 'Tulosta loput koesuoritukset',
    print_all: 'Tulosta kaikki koesuoritukset',
    students_without_email: 'kokelasta ilman sähköpostia',
    annotate: 'Merkitse',
    remove_annotation: 'Poista',
    question_label: 'Tehtävä',
    image_label: 'kuva',
    enlarge: 'Suurenna',
    errors: {
      exam_not_found: 'Haettua koetta ei löytynyt.',
      no_students_and_answers: 'Koesuorituksia ei löytynyt.',
      problem: 'Yhteydessä arviointipalveluun tapahtui virhe, yritä hetken kuluttua uudelleen.',
      saving_comment_failed: 'Kommenttia ei pystytty tallentamaan, koeta hetken kuluttua uudelleen.',
      saving_score_failed: 'Pistemäärää ei pystytty tallentamaan, koeta hetken kuluttua uudelleen.',
      saving_grading_text_failed: 'Arvosanaa ei pystytty tallentamaan, koeta hetken kuluttua uudelleen.',
      sending_emails_failed: 'Sähköpostien lähetys epäonnistui, yritä hetken kuluttua uudelleen.',
      answers_token_error: 'Virhe suorituksen hakemisessa, tarkista linkki.'
    }
  },
  registration: {
    welcome: 'Tervetuloa Digabi Exam Admin -palveluun!',
    registration_prompt:
      'Palvelussa voit luoda, arvioida ja hallinnoida kokeitasi. Jos et ole vielä rekisteröitynyt, syötä sähköpostiosoitteesi alla olevaan kenttään. Rekisteröintilinkki lähetetään sähköpostiisi.',
    forgot_password_prompt:
      'Jos olet unohtanut salasanasi tai haluat vaihtaa sen, syötä sähköpostiosoitteesi samaan kenttään. Saat sähköpostiisi ohjeet salasanan vaihtamiseen.',
    submit_button: 'Lähetä',
    message_sent:
      'Viesti on lähetetty osoitteeseen: {{email}}. Mikäli sähköposti ei kohtuullisen ajan kuluessa ole saapunut, tarkista että olet antanut sähköpostiosoitteesi oikein ja pyydä uusi viesti yllä olevasta napista. Tarkista myös sähköpostiohjelmasi roskapostikansio.',
    send_error: 'Tapahtui virhe, yritä hetken kuluttua uudelleen.',
    invalid_email_error: 'Tarkista sähköpostiosoite.',
    system_error: 'Järjestelmävirhe. Yritä hetken kuluttua uudelleen.',
    email: 'Sähköposti:'
  },
  reg_confirmation: {
    title: 'Rekisteröityminen palveluun / Salasanan vaihto',
    confirmation_prompt: 'Anna salasana käyttäjätunnuksellesi {{email}}. Salasanan tulee olla vähintään 8 merkkiä.',
    password: 'Salasana:',
    password_again: 'Salasana uudelleen:',
    loading: 'Ladataan...',
    firstname: 'Etunimi:',
    lastname: 'Sukunimi:',
    terms_acceptance: "Hyväksyn palvelun <a href='/kayttoehdot/' target='_blank'>käyttöehdot</a>",
    register: 'Rekisteröidy',
    token_error: "Virhe vahvistamisessa. Tarkista linkki tai <a href='/'>tilaa tarvittaessa uusi</a> sähköposti.",
    confirmation_error: 'Virhe rekisteröinnissä, tarkista kentät ja yritä uudelleen.',
    system_error: 'Järjestelmävirhe. Yritä hetken kuluttua uudelleen.',
    validation_errors: {
      password: 'Salasanan tulee olla vähintään 8 merkkiä',
      password2: 'Salasanat eivät täsmää',
      firstname: 'Etunimi ei saa sisältää erikoismerkkejä',
      lastname: 'Sukunimi ei saa sisältää erikoismerkkejä',
      'terms-acceptance': 'Käyttöehdot on hyväksyttävä'
    }
  },
  footer: {
    contact_details: 'Digabi Exam Admin -tuki',
    meb: '',
    updates: 'Digabi Exam Admin -päivitykset',
    digabi_terms: 'Käyttöehdot ja tietosuojaseloste',
    copy: '©',
    office_hours: '(ark. 9-15)'
  },
  oauth: {
    consent:
      '<p>Haluatko myöntää verkkopalvelulle <strong>"{{clientName}}"</strong> pääsyn tunnuksellesi (<strong>{{username}}</strong>)?</p>',
    consent_scopes: 'Haetut käyttöoikeudet:',
    consent_notice: 'Hyväksy tämä pyyntö vain luotettavilta verkkopalveluilta.',
    consent_error: 'Virhe käyttöoikeuden käsittelyssä.',
    allow: 'Hyväksy',
    deny: 'Estä',
    scopes: {
      'exam:write': 'Verkkopalvelu voi lisätä tilillesi kokeita.'
    }
  }
}
