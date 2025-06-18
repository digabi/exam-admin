const fi = {
  sa: {
    logout: 'Kirjaudu ulos',
    import_answers_instructions:
      'Kokeen päätyttyä tallenna koesuoritukset koetilan palvelimelta tavalliselle USB-muistille. Kiinnitä USB-muisti omaan koneeseesi ja klikkaa "Tuo koesuoritukset".',
    import_answers: 'Tuo koesuoritukset',
    answer_upload_takes_time: 'Koesuoritusten tuonti voi kestää kymmeniä sekunteja.',
    answers_uploaded: {
      title: 'Tuodut koesuoritukset:',
      no_registration_one: 'Huom! {{count}} koesuorituksen ilmoittautumistiedot puuttuvat.',
      no_registration_other: 'Huom! {{count}} koesuorituksen ilmoittautumistiedot puuttuvat.',
      close: 'Sulje',
      unknown_school: 'Tuntematon lukio',
      answers_uploaded_to_deleted_instructions:
        'Koesuoritukset tulevat näkyviin, kun koe palautetaan. Kokeiden palauttaminen tapahtuu seuraavasti:<br/>- Siirry Koetehtävät -välilehdelle<br/>- Valitse "Näytä poistetut"<br/>- Valitse palautettavan kokeen kohdalla "Peruuta poisto"',
      answers_uploaded_already: 'HUOM! Sisältää jo aikaisemmin tuotuja koesuorituksia',
      answers_visibility_info: 'HUOM! Suoritukset näkyvät vain kyseisen kokeen laatijalle'
    },
    held_exams: 'Pidetyt kokeet',
    info_text:
      'Lukion on merkittävä valmiiksi vähintään 30 % vastausten alustavasta arvostelusta ensimmäiseen määräpäivään mennessä.',
    students: 'Kokelaita',
    held_exam_name: 'Koe',
    held_answers: 'Arvosteltavia vastauksia',
    pre_grading: 'Alustavasti arvosteltuja vastauksia',
    pre_grading_answers_graded: 'Vastauksia arvosteltu',
    pre_grading_answers_finished: 'Arvosteluja merkitty valmiiksi',
    recommended_deadline: 'Seuraava määräpäivä',
    still_to_be_finished: 'Merkittävä valmiiksi vielä',
    gradings: 'arvostelua',
    today: 'Tänään',
    late: 'Myöhässä',
    pregrading_ready: 'Arvostelu valmis',
    nothing_to_grade: 'Ei arvosteltavaa',
    held_exam_grade: 'Arvostele',
    held_exam_submitted: 'Tarkastele vastauksia',
    errors: {
      grading_started: 'Koesuoritukset on jo tuotu.',
      exam_meb: 'Ladattu tiedosto sisältää koetehtäviä. Valitse koesuoritukset sisältävä tiedosto.',
      incorrect_exam: 'Koetta, johon vastaukset liittyvät, ei löydy. Lataus epäonnistui.',
      exam_structure_not_imported: 'Koesuorituksia tähän kokeeseen ei voi vielä tuoda, yritä myöhemmin uudestaan.',
      incorrect_answer_package:
        'Yrität siirtää tutkintopalveluun koesuorituksia, jotka eivät kuulu tämän tutkintokerran kokeeseen. Varmista, että koesuorituspaketti on oikea.',
      invalid_file: 'Ladattu tiedosto ei sisällä koesuorituksia, lataus epäonnistui.',
      no_answer_papers: 'Ladattu tiedosto ei sisällä koesuorituksia.',
      answer_upload_failed: 'Koesuoritusten lataaminen epäonnistui. Yritä hetken kuluttua uudelleen.',
      load_error:
        '<p>Tietojen latauksessa tapahtui virhe.</p><p>Yritä päivittää sivu.</p><p>Jos ilmoitus tulee uudestaan, kirjaudu ulos palvelusta.</p>',
      answers_fetch_error: 'Virhe suorituksen hakemisessa, tarkista osoite.',
      answers_missing_xml_error: 'Vanhojen JSON-muotoisten kokeiden suoritusten näyttämistä ei tueta.'
    },
    yo: {
      exam_date: 'Koepäivä',
      school_anon_code: 'Lukiokoodi'
    },
    pregrading: {
      no_access: 'Ei oikeuksia arvostella',
      exam_with_no_grader: 'Ei arvostelijaa',
      answer_moved_to_censoring: 'Tämän vastauksen arvostelu on merkitty valmiiksi',
      can_still_be_reverted_with_no_quarantine: 'Arvostelun voi palauttaa muokattavaksi.',
      can_still_be_reverted:
        'Arvostelun voi palauttaa muokattavaksi {{waitingForCensorHours}} tunnin ajan valmiiksi merkitsemisen jälkeen.',
      revert_pregrading_finished: 'Palauta',
      censor_waiting_period_passed: 'Arvostelua ei voi enää muuttaa.',
      mark_gradings_finished: 'Merkitse arvosteluja valmiiksi',
      you_can_mark_just_this_finished: 'Voit halutessasi merkitä arvostelun valmiiksi vain tälle vastaukselle',
      mark_finished: 'Merkitse valmiiksi',
      nb: 'Huom.!',
      not_graded_by_you: 'Tämä ei ole sinun arvostelemasi vastaus.',
      all_graded_by_me: 'Kaikki arvostelemani',
      chosen_rows_columns: 'Valitut rivit / sarakkeet',
      also_those_graded_by_others: 'Myös muiden arvostelemat',
      shall_be_marked_finished: 'Merkitäänkö valmiiksi {{count}} arvostelua?',
      no_quarantine_infotext: '',
      quarantine_infotext:
        'Valmiiksi merkitsemäsi arvostelut siirtyvät lopulliseen arvosteluun {{waitingForCensorHours}} tunnin kuluttua. Tämän jälkeen et voi enää muuttaa arvostelua.',
      you_are_about_to_mark_others_gradings: 'Olet merkitsemässä valmiiksi myös muiden opettajien arvosteluja.',
      mark_finished_n: 'Merkitse valmiiksi {{count}} arvostelua',
      just_marked_finished_n: '{{count}} arvostelua merkittiin valmiiksi!',
      cancel: 'Peruuta',
      close: 'Sulje',
      only_visible_to_teacher:
        'Tämän tehtävätyypin muistiinpanot käsitellään arvostelijan muistiinpanoina, eivätkä ne näy kokelaalle.'
    },
    answer_search: {
      search_answers: 'Hae vastauksia...',
      close_answer_search: 'Sulje vastaushaku',
      search_answers_title: 'Hae vastauksia',
      question_nr: 'Tehtävä',
      any_question_nr: 'Kaikki',
      free_text_search: 'Hae vastauksista',
      comment_search: 'Hae muistiinpanoista',
      search_term_placeholder: 'Hakusana...',
      score_search: 'Hae pisteillä',
      add_search_term_or_score: 'Rajaa hakua vähintään hakusanalla tai pisteillä.',
      search_among_graded_by_you: 'Hae arvostelemistasi vastauksista',
      search_among_graded_by_many: 'Hae kaikista käsitellyistä 2- ja 3-sensoroiduista vastauksista',
      searching: 'Haetaan...',
      n_results: 'vastausta',
      with_search_term: 'joissa esiintyy',
      with_search_term_in_notes: 'joiden muistiinpanoissa esiintyy',
      with_score: 'joiden pisteet ovat',
      between: ' välillä ',
      and: 'ja ',
      collapse_answer: 'Pienennä',
      expand_whole_answer: 'Näytä',
      show_in_score_table: 'Näytä pistetaulukossa',
      question_abbr: 'Teht.',
      limited_results: '. Näytetään vain {{count}} tulosta. Tarkenna hakua tarvittaessa.'
    },
    censor: {
      loading: 'Ladataan...'
    },
    productive: {
      page_instructions: 'Aloita arvostelu klikkaamalla pistesolua',
      answer_title: 'Vastaus',
      count_title: 'Määrä',
      scores_title: 'Pisteet',
      censor_title: 'Arvostelija',
      hide_handled: 'Piilota käsitellyt'
    },
    unmapped_students: {
      title: 'Seuraaville koesuorituksille ei löytynyt ilmoittautumista',
      name: 'Nimi',
      ssn: 'Henkilötunnus',
      exam: 'Koe',
      instructions:
        'Jos koesuoritusta ei tarvitse arvostella (esim. valvoja), teidän ei tarvitse tehdä mitään. Muussa tapauksessa tehkää ilmoittautumistietojen muutoshakemus YTL:n <a target="_blank" href="http://hakemukset.ylioppilastutkinto.fi/">sähköisen asiointipalvelun</a> kautta. '
    },
    held_remove_exam_title: 'Haluatko poistaa koesuoritukset?',
    held_return: 'Palauta',
    held_remove_exam: 'Poista',
    show_deleted: 'Näytä poistetut',
    undelete: 'Peruuta poisto'
  },
  arpa: {
    return_to_exams: 'Kokeiden hallintaan',
    score_table: 'Pistetaulukko',
    scored_average: 'Keskiarvo',
    points_suffix: 'p',
    question: 'Kysymys',
    comment_answer: 'Lisää muistiinpano',
    comment: 'Muistiinpanot',
    comment_suffix_teacher: '(näkyy ainoastaan opettajille)',
    comment_suffix_censor: '(näkyy ainoastaan sensoreille)',
    remove_comment: 'Poista',
    saved: 'tallennettu',
    grading_instruction: 'Aloita arviointi klikkaamalla jotain solua.',
    waiting_period_no_quarantine: 'Kokeen arvostelu on merkitty valmiiksi kokonaisuudessaan {{timestamp}}.',
    waiting_period:
      'Kokeen alustava arvostelu on merkitty valmiiksi kokonaisuudessaan {{timestamp}}. Kokeen alustavan arvostelun pisteet tulevat ladattavaksi {{waitingForCensorHours}} tuntia tämän jälkeen.',
    question_label: 'Tehtävä',
    toggle_pregrading_scores: 'Näytä alustavan arvostelun pistetaulukko',
    show_pregrading: 'Näytä aiemmat arvostelut',
    not_graded: 'Ei arvosteltu',
    show_pregrading_all: 'Näytä kaikki arvostelut',
    show_all_inspections: 'Näytä valmiit',
    exam_and_hvp: 'Koe ja HVP:t...',
    show_annotations: 'Näytä opettajan merkinnät',
    full_screen: 'Kokoruututila',
    exit_full_screen: 'Poistu kokoruututilasta',
    view_exam: 'Koe',
    view_attachments: 'Liitteet',
    view_hvp: 'Alustavat HVP:t',
    view_final_hvp: 'HVP:t',
    help: {
      title: 'Navigointi pistetaulukossa',
      left_right: 'Siirry edelliseen tai seuraavaan tehtävään tai osioon',
      left_right_alt: 'Siirry edelliseen tai seuraavaan arvostelemattomaan tehtävään tai osioon',
      up_down: 'Siirry edelliseen tai seuraavaan kokelaaseen (sensoreilla vaihtuu lukio tarvittaessa)',
      up_down_alt:
        'Siirry edelliseen tai seuraavaan arvostelemattomaan kokelaaseen (sensoreilla vaihtuu lukio tarvittaessa)',
      esc: 'Siirry vastauksesta pistesoluun tai toisinpäin',
      click_question:
        'Sensorina tehtävänumeroa napsauttamalla pääset tehtävän tai osion ensimmäiseen arvostelematta olevaan vastaukseen',
      edit_comment: 'Luo kommentti tai muokkaa sitä',
      link_title: 'Arvostelupalvelun käyttöohje opettajille',
      link_href:
        'https://www.ylioppilastutkinto.fi/fi/asiointipalvelut/ilmoittatumiset-tutkintoon-ja-koesuoritusten-arvostelu/arvostelupalvelun'
    },
    pregrading_export: {
      prefix: 'Kaikkien vastausten arvostelut on merkitty valmiiksi. Voit ladata arvostelusi',
      csv_link: 'pistetaulukkona',
      csv_suffix: 'taulukko-ohjelmaan, tai',
      json_link: 'JSON-tiedostona',
      json_suffix: 'muihin järjestelmiin vientiä varten',
      disqualified:
        'Et pysty lataamaan alustavan arvostelun tuloksia, koska olet esteellinen käsittelemään joidenkin kokelaiden tietoja lukiossasi.'
    },
    pregrading_abbr: 'alust.',
    autograded_short_title: 'AA',
    autograded_tooltip: 'Automaattisesti arvosteltavat',
    scoreheader_tooltip: 'Siirry ensimmäiseen arvostelemattomaan vastaukseen',
    exam_copy_download: 'Lataa koesuoritus',
    skip_pregrading:
      '<h4>Merkitäänkö alustava arvostelu lautakunnan suoritettavaksi?</h4><p>Koesuoritukset tarkastaa ja arvostelee alustavasti lukiokoulutuksen järjestäjän osoittama asianomaisen aineen opettaja (L 502/2019, 18 §). Jos koulutuksen järjestäjä ei pysty osoittamaan kyseisen oppiaineen opettajaa, joka voisi arvostella suorituksen, rehtori merkitsee tästä, että alustava arvostelu tehdään Ylioppilastutkintolautakunnassa lopullisen arvostelun yhteydessä.</p>',
    skip_pregrading_button: 'Merkitse lautakunnan arvosteltavaksi',
    skip_pregrading_revert:
      'Lukion opettaja suorittaa kokelaan {{studentAnonIdentifierOrName}} suorituksen alustavan arvostelun',
    skip_pregrading_button_revert: 'Palauta suoritus arvosteltavaksi',
    censor: {
      pregrading_not_ready: 'Alustava arvostelu ei ole vielä valmis',
      needs: 'Tarvitsee',
      handled: 'Käsitelty',
      ask_for_approval: 'Käsitelty',
      approve: 'Hyväksy',
      reject: 'Hylkää',
      cancel_handled: 'Peru',
      cancel_approve: 'Peru',
      approved: 'Hyväksytty',
      needs_second: 'Tarvitsee 2.s.',
      needs_third: 'Tarvitsee 3.s.',
      waiting_for_second: 'Odottaa 2.s.',
      waiting_for_third: 'Odottaa 3.s.',
      needs_first_approval: 'Tarvitsee 1.s. hyväksynnän',
      needs_second_approval: 'Tarvitsee 2.s. hyväksynnän',
      needs_both_approvals: 'Tarvitsee 1.s. ja 2.s. hyväksynnät',
      cancel_button: 'Peru',
      short: 's.',
      inspector_abbr: 'ov',
      mark_student_to_2nd_round_label:
        'Merkitse kokelaan {{studentAnonIdentifierOrName}} kaikki tehtävät 2-sensoroitavaksi ',
      mark_student_to_2nd_round_button: 'Merkitse',
      hide_score_difference: 'Piilota korostus',
      show_score_difference: 'Näytä korostus'
    },
    errors: {
      exam_not_found: 'Haettua koetta ei löytynyt.',
      reload_page: 'Päivitä',
      problem: 'Yhteydessä arviointipalveluun tapahtui virhe.',
      saving_comment_failed: 'Kommenttia ei pystytty tallentamaan.',
      saving_score_failed: 'Pistemäärää ei pystytty tallentamaan.',
      saving_metadata_failed: 'Merkintää ei pystytty tallentamaan.',
      saving_skip_pregrading_failed: 'Merkintää ei pystytty tallentamaan.',
      reload_page_to_continue: 'Päivitä sivu jatkaaksesi työskentelyä.',
      try_again: 'Yritä uudelleen.',
      close: 'Sulje'
    },
    exam_language_filter: {
      both: 'Molemmat kielet',
      fi: 'Suomi',
      sv: 'Ruotsi'
    }
  }
}

export default fi
