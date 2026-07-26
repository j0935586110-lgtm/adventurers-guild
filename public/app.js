// Supabase client
const SUPABASE_URL = 'https://wrwsjlydozfzejixofwm.supabase.co'
const SUPABASE_KEY = 'sb_publishable_ri-Jt8XuWTrnI1RCKuVdMQ_f4LARc7Y'
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY)

let currentUser = null

// Check auth state on load
async function initAuth() {
  const { data: { user } } = await supabase.auth.getUser()
  currentUser = user
  updateUI()
}

function updateUI() {
  const userArea = document.getElementById('userArea')
  const btnLogin = document.getElementById('btnLogin')
  const btnLogout = document.getElementById('btnLogout')
  const btnPost = document.getElementById('btnPost')

  if (currentUser) {
    const name = currentUser.user_metadata?.name || currentUser.email?.split('@')[0] || '冒險者'
    userArea.innerHTML = `<a href="/profile" class="user-link">👤 ${name}</a>`
    btnLogin.style.display = 'none'
    btnLogout.style.display = 'inline-block'
    if (btnPost) btnPost.style.display = 'inline-block'
  } else {
    userArea.innerHTML = ''
    btnLogin.style.display = 'inline-block'
    btnLogout.style.display = 'none'
    if (btnPost) btnPost.style.display = 'none'
  }
}

// Modal controls
function openLoginModal() {
  document.getElementById('loginModal').style.display = 'flex'
  document.getElementById('loginMsg').textContent = ''
}

function closeLoginModal() {
  document.getElementById('loginModal').style.display = 'none'
}

function openPostModal() {
  if (!currentUser) return openLoginModal()
  document.getElementById('postModal').style.display = 'flex'
}

function closeModal() {
  document.getElementById('postModal').style.display = 'none'
}

// Auth actions
async function handleLogin() {
  const email = document.getElementById('loginEmail').value
  const password = document.getElementById('loginPassword').value
  const msg = document.getElementById('loginMsg')
  msg.textContent = '登入中...'

  const { data, error } = await supabase.auth.signInWithPassword({ email, password })
  if (error) { msg.textContent = '❌ ' + error.message; return }

  currentUser = data.user
  closeLoginModal()
  updateUI()
  loadTasks()
}

async function handleSignup() {
  const email = document.getElementById('loginEmail').value
  const password = document.getElementById('loginPassword').value
  const msg = document.getElementById('loginMsg')
  if (!email || !password) { msg.textContent = '請填寫 Email 和密碼'; return }
  if (password.length < 6) { msg.textContent = '密碼至少 6 位'; return }
  msg.textContent = '創建帳號中...'

  const name = email.split('@')[0]
  const { data, error } = await supabase.auth.signUp({
    email, password,
    options: { data: { name } }
  })
  if (error) { msg.textContent = '❌ ' + error.message; return }

  msg.textContent = '✅ 註冊成功！自動登入中...'
  currentUser = data.user
  setTimeout(() => {
    closeLoginModal()
    updateUI()
    loadTasks()
  }, 500)
}

async function handleLogout() {
  await supabase.auth.signOut()
  currentUser = null
  updateUI()
  loadTasks()
  window.location.href = '/'
}

// Task operations
async function loadTasks(filters = {}) {
  let query = supabase.from('tasks').select(`
    *,
    poster:profiles!tasks_poster_id_fkey(name, rank, avatar),
    taker:profiles!tasks_taker_id_fkey(name, rank, avatar)
  `).order('created_at', { ascending: false })

  if (filters.status) query = query.eq('status', filters.status)
  if (filters.skill) query = query.contains('skill_tags', [filters.skill])

  const { data: tasks, error } = await query

  const board = document.getElementById('taskBoard')
  if (error) { board.innerHTML = `<div class="loading">載入失敗: ${error.message}</div>`; return }

  if (!tasks || tasks.length === 0) {
    board.innerHTML = '<div class="loading">🏜️ 尚無任務，來發佈第一個吧！</div>'
  } else {
    board.innerHTML = tasks.map(t => taskCard(t)).join('')
  }

  // Update stats
  const openCount = tasks?.filter(t => t.status === 'open').length || 0
  document.getElementById('statsOpen').innerHTML = `📊 看板上共 <b>${tasks?.length || 0}</b> 個任務，其中 <b>${openCount}</b> 個可接取`
}

function taskCard(t) {
  const rankBadge = rankBadgeHtml(t.poster?.rank || 'F')
  const statusText = { open: '🟢 可接取', in_progress: '🟡 進行中', completed: '✅ 已完成', disputed: '🔴 爭議中', cancelled: '⚫ 已取消' }
  const diffStars = '⭐'.repeat(t.difficulty || 1)
  const skills = (t.skill_tags || []).map(s => `<span class="tag">${s}</span>`).join('')
  const isMine = currentUser && t.poster_id === currentUser.id
  const isTaken = currentUser && t.taker_id === currentUser.id
  const canTake = currentUser && t.status === 'open' && !isMine

  return `
    <div class="task-card" onclick="viewTask('${t.id}')">
      <div class="task-header">
        <span class="task-status">${statusText[t.status] || t.status}</span>
        <span class="task-diff">${diffStars}</span>
      </div>
      <h3 class="task-title">${escHtml(t.title)}</h3>
      <p class="task-desc">${escHtml((t.description || '').substring(0, 120))}</p>
      <div class="task-meta">
        <span class="task-poster">${rankBadge} ${escHtml(t.poster?.name || '未知')}</span>
        <span class="task-budget">💰 ${t.budget || 0}</span>
      </div>
      <div class="task-skills">${skills}</div>
      ${canTake ? `<button class="btn btn-sm btn-primary" onclick="event.stopPropagation();takeTask('${t.id}')">⚔️ 接取任務</button>` : ''}
      ${isTaken && t.status === 'in_progress' ? `<span class="badge badge-you">你的任務</span>` : ''}
    </div>
  `
}

function rankBadgeHtml(rank) {
  const colors = { S:'#ffd700', A:'#e74c3c', B:'#e67e22', C:'#2ecc71', D:'#3498db', E:'#9b59b6', F:'#95a5a6' }
  return `<span class="rank-badge" style="background:${colors[rank]||'#95a5a6'}">${rank}</span>`
}

async function takeTask(taskId) {
  if (!currentUser) return openLoginModal()
  const { error } = await supabase.from('tasks')
    .update({ taker_id: currentUser.id, status: 'in_progress', updated_at: new Date().toISOString() })
    .eq('id', taskId)
  if (error) { alert('接取失敗: ' + error.message); return }
  loadTasks()
}

async function postTask(e) {
  e.preventDefault()
  if (!currentUser) return

  const title = document.getElementById('postTitle').value
  const description = document.getElementById('postDesc').value
  const budget = parseInt(document.getElementById('postBudget').value) || 0
  const skills = document.getElementById('postSkills').value.split(',').map(s => s.trim()).filter(Boolean)
  const difficulty = parseInt(document.getElementById('postDifficulty').value)
  const deadline = document.getElementById('postDeadline').value || null

  const { error } = await supabase.from('tasks').insert({
    title, description, budget, poster_id: currentUser.id,
    skill_tags: skills, difficulty,
    deadline: deadline ? new Date(deadline).toISOString() : null
  })
  if (error) { alert('發佈失敗: ' + error.message); return }

  closeModal()
  document.getElementById('postForm').reset()
  loadTasks()
}

function viewTask(id) {
  window.location.href = `/task?id=${id}`
}

function escHtml(s) {
  if (!s) return ''
  return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;')
}

// Event listeners
document.getElementById('btnLogin').addEventListener('click', openLoginModal)
document.getElementById('btnLogout').addEventListener('click', handleLogout)
document.getElementById('btnPost').addEventListener('click', openPostModal)

document.getElementById('filterStatus').addEventListener('change', function() {
  loadTasks({ status: this.value })
})
document.getElementById('filterSkill').addEventListener('change', function() {
  loadTasks({ skill: this.value })
})

// Init
initAuth().then(() => loadTasks())
