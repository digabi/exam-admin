import fi from './fi'

const sv: typeof fi = {
  sa: {
    logout: 'Logga ut',
    import_answers_instructions:
      'Efter avslutat prov spara provprestationerna från provlokalens server på ett vanligt USB-minne. Fäst USB-minnet vid din dator och klicka "För in provprestationer".',
    import_answers: 'För in provprestationer',
    answer_upload_takes_time: 'Införandet av svaren kan pågå i tiotals sekunder',
    answers_uploaded: {
      title: 'Införda provprestationer:',
      no_registration_one: 'Obs! Anmälningsdata fattas för {{count}} provprestation.',
      no_registration_other: 'Obs! Anmälningsdata fattas för {{count}} provprestationer.',
      close: 'Stäng',
      unknown_school: 'Okänt gymnasium',
      answers_uploaded_already: 'OBS! Innehåller provprestationer som redan laddats upp tidigare',
      answers_uploaded_to_deleted_instructions:
        'Provprestationerna visas då provet återställs. Provet kan återställas på följande sätt:<br/>- Gå till fliken Provuppgifter<br/>- Välj "Visa raderade"<br/>- Välj "Ångra radering" för provet ifråga',
      answers_visibility_info: 'Obs! Endast redigeraren av provet kan se prestationerna'
    },
    held_exams: 'Genomförda prov',
    info_text:
      'Gymnasiet ska markera den preliminära bedömningen klar för minst 30 % av svaren senast på den första utsatta dagen.',
    students: 'Examinander',
    held_exam_name: 'Prov',
    held_answers: 'Svar att bedöma',
    pre_grading: 'Preliminärt bedömda svar',
    pre_grading_answers_graded: 'Svar bedömda',
    pre_grading_answers_finished: 'Bedömningar markerade klara',
    recommended_deadline: 'Följande utsatta dag',
    still_to_be_finished: 'Ännu att markeras som klar',
    gradings: 'bedömningar',
    today: 'Idag',
    late: 'Försenad',
    pregrading_ready: 'Bedömningen klar',
    nothing_to_grade: 'Inget at bedömma',
    held_exam_grade: 'Bedöm',
    held_exam_submitted: 'Granska svaren',
    errors: {
      grading_started: 'Prestationerna har redan införts.',
      exam_meb: 'Den valda filen innehåller provfrågor. Välj filen som innehåller provsvaren.',
      incorrect_exam: 'Provet som svaren tillhör hittades inte. Uppladdningen misslyckades.',
      exam_structure_not_imported: 'Provprestationer till detta prov kan inte ännu införas, försök på nytt senare.',
      incorrect_answer_package:
        'Du försökte ladda upp provprestationer som inte hör till ett prov vid detta examenstillfälle. Kontrollera att du har valt rätt fil.',
      invalid_file: 'Det finns inte provprestationer i den uppladdade filen, införandet misslyckades.',
      no_answer_papers: 'Det finns inte provprestationer i den uppladdade filen.',
      answer_upload_failed: 'Införandet av provprestationerna misslyckades. Försök på nytt om en stund.',
      load_error:
        '<p>Uppgifterna kunde inte laddas.</p><p>Prova ladda om sidan.</p><p>Om felet återuppstår, logga ut ur tjänsten.</p>',
      answers_fetch_error: 'Prestationen kunde inte hämtas, kontrollera adressen.',
      answers_missing_xml_error: 'Visning av prestationer från äldre prov i JSON-format stöds inte.'
    },
    yo: {
      exam_date: 'Provdagen',
      school_anon_code: 'Gymnasiekod'
    },
    pregrading: {
      no_access: 'Inga rättigheter för bedömning',
      exam_with_no_grader: 'Ingen bedömare',
      answer_moved_to_censoring: 'Bedömningen markerad klar',
      can_still_be_reverted_with_no_quarantine: 'Svaret kan återtas till bedömning.',
      can_still_be_reverted:
        'Svaret kan återtas till bedömning inom {{waitingForCensorHours}} timmar efter att bedömningen markerats klar.',
      revert_pregrading_finished: 'Återta',
      censor_waiting_period_passed: 'Bedömningen kan inte längre ändras.',
      mark_gradings_finished: 'Markera färdigt bedömda',
      you_can_mark_just_this_finished: 'Om du önskar kan du markera att bedömningen av denna uppgift är klar',
      mark_finished: 'Bedömningen klar',
      nb: 'Obs!',
      not_graded_by_you: 'Du har inte bedömt denna uppgift.',
      all_graded_by_me: 'Markera alla jag bedömt',
      chosen_rows_columns: 'Markera valda rader / kolumner',
      also_those_graded_by_others: 'Markera även uppgifter bedömda av andra',
      shall_be_marked_finished: 'Markera bedömningen klar för {{count}} uppgifter?',
      no_quarantine_infotext: '',
      quarantine_infotext:
        'Uppgifterna du markerat klara går vidare till den slutliga bedömningen efter {{waitingForCensorHours}} timmar. Efter detta kan du inte längre ändra bedömningen.',
      you_are_about_to_mark_others_gradings: 'Du markerar även andra lärares bedömning klar.',
      mark_finished_n: 'Markera {{count}} bedömda uppgifter klara',
      just_marked_finished_n: 'Bedömningen av {{count}} uppgifter markerades klara!',
      cancel: 'Ångra',
      close: 'Stäng',
      only_visible_to_teacher:
        'Anteckningarna för denna uppgiftstyp behandlas som bedömarens anteckningar och visas inte för examinanden.'
    },
    answer_search: {
      search_answers: 'Sök svar...',
      close_answer_search: 'Stäng svarsökning',
      search_answers_title: 'Sök bland svar',
      question_nr: 'Uppgift',
      any_question_nr: 'Alla',
      free_text_search: 'Sök i svaren',
      comment_search: 'Sök i anteckningar',
      score_search: 'Sök med poäng',
      search_term_placeholder: 'Sökord...',
      add_search_term_or_score: 'Begränsa sökningen med sökord eller poäng.',
      search_among_graded_by_you: 'Sök bland de svar du bedömt',
      search_among_graded_by_many: 'Sök bland alla svar som bedömts klart av andra eller tredje censor',
      searching: 'Söker...',
      n_results: 'svar',
      with_search_term: 'som innehåller',
      with_search_term_in_notes: 'som innehåller i anteckningarna',
      with_score: 'med poäng',
      between: ' mellan ',
      and: 'och ',
      collapse_answer: 'Minska',
      expand_whole_answer: 'Visa',
      show_in_score_table: 'Visa i poängtabellen',
      question_abbr: 'Uppg.',
      limited_results: '. Endast {{count}} resultat visas. Precisera sökningen vid behov.'
    },
    censor: {
      loading: 'Laddar...'
    },
    productive: {
      page_instructions: 'Börja bedömningen genom att klicka på poängcellen',
      answer_title: 'Svar',
      count_title: 'Antal',
      scores_title: 'Poäng',
      censor_title: 'Bedömare',
      hide_handled: 'Dölj behandlade'
    },
    unmapped_students: {
      title: 'Följande provprestationer saknade en anmälan',
      name: 'Namn',
      ssn: 'Personbeteckning',
      exam: 'Prov',
      instructions:
        'Om provprestationen inte ska bedömas (t.ex. övervakare), behöver ni inte göra något. I annat fall gör en ansökan om ändring av anmälningsuppgifter genom SEN:s <a target="_blank" href="http://hakemukset.ylioppilastutkinto.fi/">e-tjänst</a>'
    },
    held_remove_exam_title: 'Vill du radera provprestationerna?',
    held_return: 'Återlämna',
    held_remove_exam: 'Radera',
    show_deleted: 'Visa raderade',
    undelete: 'Ångra radering'
  },
  arpa: {
    return_to_exams: 'Till provhantering',
    score_table: 'Poängtabell',
    scored_average: 'Medeltal',
    points_suffix: 'p',
    question: 'Fråga',
    comment_answer: 'Gör anteckning',
    comment: 'Anteckningar',
    comment_suffix_teacher: '(visas endast för lärare)',
    comment_suffix_censor: '(visas endast för censorer)',
    remove_comment: 'Avlägsna',
    saved: 'sparad',
    grading_instruction: 'Påbörja bedömningen med att klicka på en cell.',
    waiting_period_no_quarantine: 'Bedömningen av provet har markerats klar i sin helhet {{timestamp}}.',
    waiting_period:
      'Den preliminära bedömningen av provet har markerats klar i sin helhet {{timestamp}}. Poängen för den prelimnära bedömningen kan laddas ned {{waitingForCensorHours}} timmar efter detta.',
    question_label: 'Upgift',
    toggle_pregrading_scores: 'Visa poängtabell för den preliminära bedömningen',
    show_pregrading: 'Visa tidigare bedömningar',
    not_graded: 'Ej bedömd',
    show_pregrading_all: 'Visa alla bedömningar',
    exam_and_hvp: 'Provet och BGS...',
    show_all_inspections: 'Visa färdiga',
    show_annotations: 'Visa lärarens antekningar',
    full_screen: 'Fullskärmsläge',
    exit_full_screen: 'Lämna fullskärmsläget',
    view_exam: 'Provet',
    view_attachments: 'Materialet',
    view_hvp: 'Preliminära BGS',
    view_final_hvp: 'BGS',
    help: {
      title: 'Navigering i poängtabellen',
      left_right: 'Gå till föregående eller följande uppgift eller deluppgift',
      left_right_alt: 'Gå till föregående eller följande obedömda uppgift eller deluppgift',
      up_down: 'Gå till följande examinand (går vid behov till följande gymnasium om censor)',
      up_down_alt: 'Gå till följande obedömda examinand (går vid behov till följande gymnasium om censor)',
      esc: 'Hoppa från svaret till poängrutan eller tillbaka',
      click_question:
        'Genom att klicka på uppgiftens nummer kommer du till uppgiftens eller deluppgiftens första obedömda svar',
      edit_comment: 'Skapa eller modifiera kommentar',
      link_title: 'Bedömningstjänstens anvisningar för lärare',
      link_href:
        'https://www.ylioppilastutkinto.fi/sv/webbtjanster/anmalan-till-examen-och-bedomning-av-provprestationer/anvandarinstruktion'
    },
    pregrading_export: {
      prefix: 'Bedömningen av alla svar har markerats klar. Du kan ladda ned din bedömning',
      csv_link: 'som en poängtabell',
      csv_suffix: 'för ett kalkylprogram, eller',
      json_link: 'JSON-fil',
      json_suffix: 'för uppladdning i andra program',
      disqualified:
        'Du kan inte ladda ned resultaten från den preliminärä bedömningen eftersom du är jävig i förhållande till en eller fler examinander vid ditt gymnasie och får därför inte behandla deras uppgifter.'
    },
    pregrading_abbr: 'prel.',
    autograded_short_title: 'AB',
    autograded_tooltip: 'Automatiskt bedömda',
    scoreheader_tooltip: 'Gå till det första obedömda svaret',
    exam_copy_download: 'Ladda ned provprestationen',
    skip_pregrading:
      '<h4>Ska den preliminära bedömningen göras av nämnden?</h4><p>Provprestationerna granskas och bedöms preliminärt av en lärare i ämnet i fråga som utses av anordnaren av gymnasieutbildning (L 502/2019, 18 §). Om utbildningsanordnaren inte kan utse en lärare i ämnet i fråga som kan bedöma prestationen, markerar rektor här att den preliminära bedömningen görs av Studentexamensnämnden i samband med den slutliga bedömningen.</p>',
    skip_pregrading_button: 'Ska bedömas av nämnden',
    skip_pregrading_revert:
      'Den preliminära bedömningen av prestationen för examinand {{studentAnonIdentifierOrName}} görs av lärare vid gymnasiet',
    skip_pregrading_button_revert: 'Återta för bedömning',
    censor: {
      pregrading_not_ready: 'Den preliminära bedömningen är inte färdig',
      needs: 'Behöver',
      handled: 'Behandlad',
      ask_for_approval: 'Behandlad',
      approve: 'Godkänn',
      reject: 'Förkasta',
      cancel_handled: 'Ångra',
      cancel_approve: 'Ångra',
      approved: 'Godkänd',
      needs_second: 'Kräver 2. c.',
      needs_third: 'Kräver 3. c.',
      waiting_for_second: 'Inväntar 2. s.',
      waiting_for_third: 'Inväntar 3. c.',
      needs_first_approval: 'Kräver godkännande av 1. c.',
      needs_second_approval: 'Kräver godkännande av 2. c.',
      needs_both_approvals: 'Kräver godkännande av 1. c. och 2. c.',
      cancel_button: 'Ångra',
      short: 'c',
      inspector_abbr: 'ompr.',
      mark_student_to_2nd_round_label:
        'Markera att alla examinand {{studentAnonIdentifierOrName}} uppgifter behöver 2. censor ',
      mark_student_to_2nd_round_button: 'Markera',
      hide_score_difference: 'Dölj accentuering',
      show_score_difference: 'Visa accentuering'
    },
    errors: {
      exam_not_found: 'Provet hittades inte.',
      reload_page: 'Uppdatera',
      problem: 'Ett fel uppstod i förbindelsen till bedömningstjänsten.',
      saving_comment_failed: 'Kommentaren kunde inte sparas.',
      saving_score_failed: 'Poängtalet kunde inte sparas.',
      saving_metadata_failed: 'Markeringen kunde inte sparas.',
      saving_skip_pregrading_failed: 'Markeringen kunde inte sparas.',
      reload_page_to_continue: 'Uppdatera sidan för att fortsätta arbeta.',
      try_again: 'Försök på nytt.',
      close: 'Stäng'
    },
    exam_language_filter: {
      both: 'Båda språken',
      fi: 'Finska',
      sv: 'Svenska'
    }
  }
}

export default sv
