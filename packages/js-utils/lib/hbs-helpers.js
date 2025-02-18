import * as Handlebars from 'handlebars/runtime'

Handlebars.registerHelper('inc', value => parseInt(value, 10) + 1)
Handlebars.registerHelper('json', obj => JSON.stringify(obj))
