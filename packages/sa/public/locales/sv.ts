import { fi } from './fi'

export const sv: typeof fi = {
  sa: {
    app_name: 'Digabi Exam Admin',
    email: 'E-post',
    password: 'Lösenord',
    wrong_credentials: 'Har du glömt lösenordet? Se anvisningarna nedan.',
    wrong_credentials_oauth: 'Kontrollera e-postadressen och lösenordet',
    login: 'Logga in',
    login_header: 'Logga in till tjänsten',
    logout: 'Logga ut',
    cancel: 'Avbryt',
    exams_tab: 'Provuppgifter',
    grading_tab: 'Provprestationer',
    settings_tab: 'Kontoinställningar',
    teachers_tab: 'Lärare',
    create_exam_mex: 'Skapa nytt prov',
    copy_exam: 'Kopiera prov',
    create_old_exam_description:
      'Det går inte att ladda upp prov som skapats med den gamla editorn till provlokalens server.',
    old_editor_warning:
      'Denna editor kommer att tas ur drift den 1.6.2023.<br/> Du kan inte ladda upp prov som skapats med den till provlokalens server. Du kan ändå kopiera proven till nytt prov.',
    old_format_label: 'Gamla provformatet',
    bertta_instruction_url: '#',
    bertta_instruction_label: 'Anvisningar',
    default_exam_title: 'Nytt prov',
    created: 'Skapat',
    exams_of_event: 'Provuppgifter',
    date: 'Datumet',
    edit_exam: 'Redigera',
    edit_exam_disabled_tooltip:
      'För att återanvända provet spara det på din dator med "Exportera provet (.zip)" knappen och hämta in det som ett nytt prov med "För in prov (.zip)" knappen.',
    remove_exam_title: 'Vill du radera provet {{title}}?',
    remove_exam_description: 'Provets svar raderas också.',
    remove_exam: 'Radera',
    exam_incomplete: 'Provet har inga uppgifter eller det finns fel i det. Redigera provet.',
    exam_execution_instructions_title: 'Anvisningar',
    exam_execution_instructions: 'för uppgörande och anordnande av prov',
    exam_execution_instructions_url: '#',
    exam_execution_instructions_help: 'N/A',
    exams: 'Prov',
    download_exam: 'Ladda provuppgifter',
    is_exam_ready_for_download: 'Är provet färdigt att laddas ner?',
    download_locks_exam: 'Genom att välja "Ladda ner" kan du inte längre redigera provet.',
    exams_code: 'Dekrypteringskod: ',
    download: 'Ladda ner',
    exam_code: 'Dekrypteringskod:',
    show_code: 'Visa dekrypteringskod',
    show_security_codes: 'Visa nyckeltalslista',
    export_exam: 'Exportera provet (.zip)',
    import_takes_time: 'Införandet av provet kan ta några minuter.',
    held_exam_name: 'Prov',
    principal: 'rektor',
    teacher: 'lärare',
    import_exam: 'För in prov (.zip)',
    import_attachments: 'Hämta bilagor',
    attachments: 'Bilagor',
    giving_exam: 'Hålla ett prov',
    reusing_exam: 'Återanvändning/<br>delning av prov',
    show_deleted: 'Visa raderade',
    undelete: 'Ångra radering',
    errors: {
      removing_exam_failed: 'Ett fel uppstod vid raderingen av provet, försök på nytt om en stund.',
      load_error: 'Uppgifterna kunde inte laddas, försök på nytt efter ett ögonblick.',
      exam_import: {
        invalid_json: 'Provfilen är skadad. Överför filen och för in provet på nytt.',
        invalid_format: 'Filen innehåller inte ett prov.',
        zip_too_big: 'Filen är för stor.'
      }
    },
    settings: {
      title: 'Inställningar',
      authorized_applications: 'Applikationer med tillåtelse',
      remove_authorization: 'Avlägsna',
      no_authorized_apps: 'Inga applikationer med tillåtelse',

      update_username: {
        change_email_address: 'Byt e-postadress',
        new_email_address: 'Ny e-postadress',
        success: 'E-postadressen har ändrats.',
        error: 'Fel vid byte av e-postadress. Kontrollera adressen.',
        status: {
          ready: 'Vi skickar en bestyrkningslänk till den nya e-postadressen.',
          done: 'Bestyrkningslänken har skickats till den nya e-postadressen.'
        },
        validation_errors: {
          invalid_username: 'Felaktig e-postadress',
          username_exists: 'E-postadressen är redan i bruk',
          empty_password: 'Lösenordet',
          invalid_password: 'Lösenordet matchar inte'
        }
      }
    },
    too_many_exams_warning:
      'Du har över 400 prov. Du kan försnabba laddningen av provlistan genom att radera överflödiga prov.<br>De äldsta proven finns i slutet av provlistan.'
  },
  lapa: {
    title: 'Digabi Exam Admin',
    preview_exam: 'Förhandsgranska provet',
    preview_attachments: 'Förhandsgranska materialfliken',
    back_to_exams: 'Till provhantering',
    exam_editor_instructions:
      'Fyll i provets uppgifter nedan och sammanställ frågorna. I instruktionsfältet kan du skriva instruktioner för provet till studerandena. När du är färdig, klicka på länken "Tillbaka till provhantering".',
    changes_autosaved: 'Alla ändringar sparas automatiskt.',
    exam_language: 'Provets språk',
    exam_languages: {
      'fi-FI': 'Finska',
      'sv-FI': 'Svenska'
    },
    exam_name: 'Provets namn',
    exam_name_required: 'Provets namn kan inte vara tomt.',
    exam_instructions: 'Provinstruktioner',
    exam_not_editable:
      'Detta prov kan inte redigeras. Du kan spara provet på din dator med förra vyns "Exportera provet (.zip)" knapp.',
    xml_exam_not_editable: 'Detta prov kan inte redigeras.',
    questions_and_max_points: 'Frågor och maxpoäng',
    screenshot_expected: 'studeranden kan bifoga en skärmdump till sitt svar',
    saved: 'sparad',
    add_attachments: 'Dra och släpp filerna här eller klicka för att välja dem.',
    attachments_instructions:
      'Det går att lägga en länk till en bilaga i uppgiften genom <code class="small-code no-wrap">&lt;a target="_blank" href="/attachments/bilaga.odt"&gt;Ladda ner&lt;/a&gt;</code> och placera en bild i uppgiften genom <code class="small-code no-wrap">&lt;img src="/attachments/bild.png" /&gt;</code>. Märk, att om man klickar på länken laddas bilagan till studerandens arbetsbord. Detta kan fylla utrymmet för säkerhetskopieringen av filer. Om du har videor som bilagor, är det rekommenderat att inte länka till dem. I stället är det bättre att videorna skådas i spelaren på materialfliken.',
    attachment_name: 'Bilaga',
    attachment_size: 'Storlek',
    attachment_remove: 'Avlägsna',
    total_size: 'Totalt',
    add_question: 'Lägg till fråga med: ',
    add_question_text: 'text',
    add_question_choicegroup: 'flerval',
    add_question_multichoicegap: 'flervalsluckor',
    gap_questions_text: 'Luckuppgiftens text',
    add_gap_at_cursor: 'Tillägg lucka vid kursorn',
    remove_gap: 'Avlägsna luckan',
    gap_popup_header: 'Luckans svarsalternativ',
    assignment: 'Uppgiftsbeskrivning',
    remove_question: 'Avlägsna',
    add_choice: 'Tillägg flerval genom att skriva här',
    add_option: 'Tillägg svarsalternativ genom att skriva här - ordningen lottas separat för varje studerande',
    add_option_short: 'Tillägg svarsalternativ',
    add_separator: 'Tillägg separator mellan flervalen',
    correct_option: 'Rätt',
    choice_options: 'Svarsalternativ',
    question_content_required: 'Frågan kan inte vara tom',
    assignment_required: 'Uppgiftsbeskrivningen kan inte vara tom',
    max: 'Max',
    points: 'p',
    add_section_A_button: 'Lägg till matematikprovets A-del',
    delete_section_A_button: 'Avlägsna matematikprovets A-del',
    section_A: 'A-del (CAS-räknarprogrammen blockerade)',
    section_B: 'B-del (CAS-räknarprogrammen i bruk)',
    note_grading_text_points: '(bedömning med hela poäng)',
    note_grading_choice_points: '(delas med antalet flerval, avrundas vid behov till närmaste heltalspoäng)',
    gap_ie_warning:
      'Internet Explorer -webbläsaren visar inte nödvändigtvis luckuppgifternas radbrytningar rätt, kontrollera provets layout i förhandsvisningen.',
    missing_correct_options_warning: 'I flervalsuppgifter måste minst ett svarsalternativ vara markerat som det rätta.',
    cas_forbid: 'Förhindra bruk av CAS räknare i provet',
    errors: {
      max_score_limits: 'Maximala poäng kan vara 0-99',
      exam_locked: 'Provet kan inte ändras. Provet är låst för överföring till provlokalens server.',
      save_exam_failed: 'Provet kunde inte sparas. Sparande försöks på nytt när du gjort ändringar i provet.',
      exam_not_found: 'Provet hittades inte, kontrollera adressen.',
      exam_loading_failed: 'Provet kunde inte laddas. Försök på nytt om ett ögonblick.',
      attachment_retryable: 'Det gick inte att spara bilagan {{fileName}}. Pröva på nytt om en stund.',
      attachment_limit_exceeded: 'Provet har för många bilagor. Det gick inte att lägga till bilagan {{fileName}}.',
      too_large: 'Provet kunde inte sparas. Provet är för stor'
    }
  },
  arpa: {
    application_name: 'Digabi Exam Admin',
    email: 'E-post',
    send_emails: 'Skicka proven via e-post',
    email_addresses: 'examinander har angett sin e-post',
    emails_sent: 'skickats',
    print: 'Skriv ut',
    return_to_exams: 'Till provhantering',
    score_table: 'Poängtabell',
    student: 'Examinander',
    scored_average: 'Medeltal av bedömda',
    grade: 'Vitsord',
    comment_answer: 'Kommentera svaret',
    remove_comment: 'Avlägsna',
    saved: 'sparad',
    go_to_grading: 'Till bedömning',
    review_instruction: 'Ange helhetsbedömning för examninadernas provprestationer och återlämna proven.',
    print_rest: 'Skriv ut resten av provprestationerna',
    print_all: 'Skriv ut alla provprestationer',
    students_without_email: 'examinander utan e-post',
    annotate: 'Markera',
    remove_annotation: 'Avlägsna',
    question_label: 'Upgift',
    image_label: 'bild',
    enlarge: 'Förstora',
    errors: {
      exam_not_found: 'Provet hittades inte.',
      no_students_and_answers: 'Det finns inga provprestationer.',
      problem: 'Ett fel uppstod i förbindelsen till bedömningstjänsten, försök på nytt efter ett ögonblick.',
      saving_comment_failed: 'Kommentaren kunde inte sparas, försök igen om ett ögonblick.',
      saving_score_failed: 'Poängtalet kunde inte sparas, försök igen om ett ögonblick.',
      saving_grading_text_failed: 'Vitsordet kunde inte sparas, försök igen om ett ögonblick.',
      sending_emails_failed: 'Sändningen av e-post misslyckades, försök igen om ett ögonblick.',
      answers_token_error: 'Prestationen kunde inte hämtas, kontrollera länken.'
    }
  },
  registration: {
    welcome: 'Välkommen till Digabi Exam Admin -tjänsten!',
    registration_prompt:
      'I tjänsten kan du skapa, bedömma och administrera dina prov. Om du ännu inte har registrerat dig, ange din e-postadress i fältet nedan. En registreringslänk skickas till din e-post.',
    forgot_password_prompt:
      'Om du har glömt ditt lösenord eller vill byta det kan du ange din e-postadress i samma fält. Du får då instruktioner via e-post för att återställa ditt lösenord.',
    submit_button: 'Sänd',
    message_sent:
      'Meddelandet har skickats till: {{email}}. Om e-posten inte kommer fram inom skälig tid, kontrollera att du givit rätt e-postadress och beställ ett nytt meddelande med ovanstående knapp. Kontrollera också din e-postläsares arkiv för skräppost.',
    send_error: 'Ett fel uppstod. Försök på nytt om ett ögonblick.',
    invalid_email_error: 'Kontrollera e-postadressen.',
    system_error: 'Systemfel. Försök på nytt om ett ögonblick.',
    email: 'E-post:'
  },
  reg_confirmation: {
    title: 'Registrering till tjänsten / Byte av lösenord',
    confirmation_prompt: 'Ange lösenord för ditt användarnamn {{email}}. Lösenordet måste vara minst 8 tecken.',
    password: 'Lösenord:',
    password_again: 'Lösenord på nytt:',
    loading: 'Laddar...',
    firstname: 'Förnamn:',
    lastname: 'Efternamn:',

    terms_acceptance: "Jag godkänner tjänstens <a href='/licensavtal/' target='_blank'>användarvillkor</a>",
    register: 'Registrera',
    token_error:
      "Fel i bekräftelsen. Kontrollera länken eller <a href='/'>beställ vid behov ett nytt</a> e-postmeddelande.",
    confirmation_error: 'Fel i registreringen. Kontrollera fälten och försök igen.',
    system_error: 'Systemfel. Försök på nytt om ett ögonblick.',
    validation_errors: {
      password: 'Lösenordet måste vara minst 8 tecken',
      password2: 'Lösenorden är inte identiska',
      firstname: 'Förnamnet får inte innehålla specialtecken',
      lastname: 'Efternamnet får inte innehålla specialtecken',
      'terms-acceptance': 'Användarvillkoren måste godkännas'
    }
  },
  footer: {
    contact_details: 'Digabi Exam Admin -stöd',
    meb: '',
    updates: 'Digabi Exam Admin -uppdateringar',
    digabi_terms: 'Licensavtal och dataskyddsbeskrivning',
    copy: '©',
    office_hours: '(vard. 9-15)'
  },
  oauth: {
    consent:
      '<p>Vill du ge webbtjänsten <strong>{{clientName}}</strong> tillgång till ditt konto (<strong>{{username}}</strong>)?</p>',
    consent_scopes: 'Begärda användarrättigheter:',
    consent_notice: 'Godkänn denna begäran endast om den kommer från en pålitlig webbtjänst.',
    consent_error: 'Fel i hanteringen av användarrättigheter.',
    allow: 'Godkänn',
    deny: 'Avböj',
    scopes: {
      'exam:write': 'Webbtjänsten kan lägga till prov på ditt konto'
    }
  }
}
