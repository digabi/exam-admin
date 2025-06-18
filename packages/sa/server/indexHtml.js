export const markup = (isSuperuser = false) => `<!DOCTYPE html>
<html translate="no">

<head>
  <meta charset="utf-8">
  <title data-i18n="sa.app_name"></title>
  <link rel="stylesheet" type="text/css" href="/dist/index.css">
  <meta name="google" content="notranslate" />
</head>

<body>
  <div id="pagebanner">
  </div>

  <!--[if lt IE 9]>
<div>
  <p>Valitettavasti käyttämäsi selain ei ole tällä hetkellä tuettu. Sähköistä asiointia voi käyttää vain 11.0 tai sitä uudemmilla Internet Explorerin versiolla.</p>
  <p>Tyvärr stöder tjänsten för tillfället inte din webbläsare. Studentexamensnämndens e-tjänster kan användas endast med 11.0 eller nyare versioner av Internet Explorer.</p>
  <p>Muita tuettuja selaimia / övriga webbläsare med stöd: <a href=\\"https://www.mozilla.org/fi/firefox/new/\\">Firefox</a>, <a href=\\"http://www.google.com/chrome/\\">Chrome</a></p>
</div>
<![endif]-->

  <div id="page-loading-spinner"></div>

  <div id="notifications" class="notification-bar">
    <div class="notification-text"></div>
    <a class="notification-close">&times;</a>
  </div>

  <div id="page-content" class="content">
    <div id="tab-bar">
      <a id="exams-link" href="/school/exams" data-i18n="sa.exams_tab"></a>
      <a id="grading-link" href="/school/grading" data-i18n="sa.grading_tab"></a>
      <a id="settings-link" href="/school/settings" data-i18n="sa.settings_tab"></a>
      ${isSuperuser ? '<a id="admin-link" href="/admin">Admin</a>' : ''}
    </div>

    <div id="exam-wizard">
      <div id="exam-export" class="tab"></div>
      <div id="exam-settings-tab" class="tab"></div>
    </div>
  </div>

  <div id="footer" class="footer"></div>

<script src="/mathjax/MathJax.js?delayStartupUntil=configured"></script>
<script src="/dist/index-bundle.js"></script>
</body>

</html>
`
