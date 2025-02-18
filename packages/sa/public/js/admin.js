const POST = { method: 'POST' }

async function updateOutput({ elements: { output } }, fetchResponse) {
  const text = await fetchResponse.text()
  output.classList.remove('loading')
  output.innerHTML = text
}

function loading({ elements: { output } }) {
  output.innerHTML = ''
  output.classList.add('loading')
}

async function submitImpersonation(e) {
  e.preventDefault()
  const res = await fetch(`/admin-api/impersonate/${this.elements.impersonate.value}`, POST)
  res.ok ? document.location.assign('/') : void updateOutput(this, res)
}

async function submitToken(e) {
  e.preventDefault()
  const res = await fetch(`/admin-api/answers/${this.elements.token.value}/debug`)
  void updateOutput(this, res)
}

async function submitChangeUsername(e) {
  e.preventDefault()
  const res = await fetch(`/admin-api/change-username/${this.elements.from.value}/${this.elements.to.value}`, POST)
  void updateOutput(this, res)
}

async function submitMoveExams(e) {
  e.preventDefault()
  const res = await fetch(`/admin-api/move-exams/${this.elements.from.value}/${this.elements.to.value}`, POST)
  void updateOutput(this, res)
}

async function submitPruneExams(e) {
  e.preventDefault()
  loading(this)
  const res = await fetch(
    `/admin-api/prune-deleted-exams-for-user/${this.elements.username.value}/${this.elements.dateuntil.value}`,
    POST
  )
  void updateOutput(this, res)
}

window.onload = function () {
  document.getElementById('impersonate-form').addEventListener('submit', submitImpersonation)
  document.getElementById('token-form').addEventListener('submit', submitToken)
  document.getElementById('change-username-form').addEventListener('submit', submitChangeUsername)
  document.getElementById('move-exams-form').addEventListener('submit', submitMoveExams)
  document.getElementById('prune-exams-for-user').addEventListener('submit', submitPruneExams)
}
