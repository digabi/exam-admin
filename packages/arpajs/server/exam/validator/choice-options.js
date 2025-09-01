import * as L from 'partial.lenses'
import * as V from 'partial.lenses.validation'

const optionsValidateRules = [L.or([L.elems, 'correct']), 'At least one option must be marked correct']

export const choiceOptionsValidateRules = V.propsOr(V.accept, {
  sections: V.arrayId(
    V.keep(
      'id',
      V.propsOr(V.accept, {
        questions: V.arrayId(
          V.cases(
            [
              L.get('choices'),
              V.keep(
                'id',
                V.propsOr(V.accept, {
                  choices: V.arrayId(
                    V.keep(
                      'id',
                      V.propsOr(V.accept, {
                        options: optionsValidateRules
                      })
                    )
                  )
                })
              )
            ],
            [
              L.get('content'),
              V.keep(
                'id',
                V.propsOr(V.accept, {
                  content: V.arrayId(
                    V.cases(
                      [
                        L.get('options'),
                        V.keep(
                          'id',
                          V.propsOr(V.accept, {
                            options: optionsValidateRules
                          })
                        )
                      ],
                      [V.accept]
                    )
                  )
                })
              )
            ],
            [V.accept]
          )
        )
      })
    )
  )
})

export const getChoiceOptionValidationErrors = content => V.errors(choiceOptionsValidateRules, content)
