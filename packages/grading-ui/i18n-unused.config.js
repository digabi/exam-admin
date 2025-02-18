/** @type {import('i18n-unused').RunOptions} */
module.exports = {
  localesPath: 'src/locales',
  localesExtensions: ['ts'],
  localeNameResolver: new RegExp(`([a-z]{2})\\.ts`),
  srcPath: 'src',
  translationKeyMatcher:
    /(?:t|translate)(?:\?\.)?\(\s*["'`]?([\s\S]+?)["'`]?\s*(?:\)|,)|i18nKey="([\s\S]+?)"|data-i18n="([\s\S]+?)"|<T\s*(?:params={.*})?\s*>\s*([\s\S]+?)\s*<\/T>/gi
}
/*
translationKeyMatcher is designed to match the following patterns has been tested with the following lines:
t('key');
translate('autumn')
t('key', { ns: 'ns2' }); 
translate('key', { ns: 'ns2' }); 
t(`translation.key`, { variable: x })
t("1.basic.doublequotes.string")
t?.("2.basic.doublequotes.string.with.optional.chaining")
t('3.basic.singlequotes.string')
t?.('4.basic.singlequotes.string.with.optional.chaining')
t(\`5.basic.backtick.string\`)
t?.(\`6.basic.backtick.string.with.optional.chaining\`)
const multilineString = \`abc \${t(
"7.multiline.string",
)}\`;
<Element i18nKey="9.i18nKey.string">
<span className="field-description" data-i18n="sa.email"></span>

<T>sa.import_answers</T>

<T>
sa.import_answers
</T>

<T>
    sa.import_answers
</T>


<T params={{ period: d.lastPeriod }}>examination_phase.inclusion_expires</T>

<T params={{ period: d.lastPeriod }}>
    examination_phase.inclusion_expires
</T>

<T 
params={{ period: d.lastPeriod }}
>
    examination_phase.inclusion_expires
</T>
*/
