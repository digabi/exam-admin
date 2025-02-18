import { init } from './oauth-dialog.js'
import '../../less/oauth.less'
import * as login from './login'
import * as sautils from './sa-utils'

sautils.setupAjax()

init(() => {
  login.show()
})
