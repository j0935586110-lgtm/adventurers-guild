// Supabase client
const SUPABASE_URL = 'https://wrwsjlydozfzejixofwm.supabase.co'
const SUPABASE_KEY = 'sb_publishable_ri-Jt8XuWTrnI1RCKuVdMQ_f4LARc7Y'
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY)

let currentUser = null
let currentProfile = null // users table row

// ====== AUTH ======
async function initAuth() {
  const { data: { user } } = await supabase.auth.getUser()
  currentUser = user
  if (user) {
    const { data: profile } = await supabase.from('users').select('*').eq('id', user.id).single()
    currentProfile = profile
  }
  updateUI()
}

function updateUI() {
  const userArea = document.getElementById('userArea')
  const btnLogin = document.getElementById('btnLogin')
  const btnLogout = document.getElementById('btnLogout')
  const btnPost = document.getElementById('btnPost')

  if (currentUser && currentProfile) {
    const name = currentProfile.display_name || currentUser.email?.split('@')[0] || '冒險者'
    userArea.innerHTML = `
      <a href="/profile" class="user-link">👤 ${escHtml(name)}</a>
      <span style="color:#f1c40f;margin-left:4px">💰 ${currentProfile.balance_g_coin || 0}G</span>
    `
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

async function handleLogin() {
  const email = document.getElementById('loginEmail').value
  const password = document.getElementById('loginPassword').value
  const msg = document.getElementById('loginMsg')
  msg.textContent = '登入中...'
  const { data, error } = await supabase.auth.signInWithPassword({ email, password })
  if (error) { msg.textContent = '❌ ' + error.message; return }
  currentUser = data.user
  const { data: profile } = await supabase.from('users').select('*').eq('id', data.user.id).single()
  currentProfile = profile
  closeLoginModal()
  updateUI()
  loadQuests()
}

async function handleSignup() {
  const email = document.getElementById('loginEmail').value
  const password = document.getElementById('loginPassword').value
  const msg = document.getElementById('loginMsg')
  if (!email || !password) { msg.textContent = '請填寫 Email 和密碼'; return }
  if (password.length < 6) { msg.textContent = '密碼至少 6 位'; return }
  msg.textContent = '創建帳號中（送你 100 G幣）...'

  const name = email.split('@')[0]
  const { data, error } = await supabase.auth.signUp({
    email, password,
    options: { data: { name } }
  })
  if (error) { msg.textContent = '❌ ' + error.message; return }

  msg.textContent = '✅ 註冊成功！'
  currentUser = data.user
  // Wait for the trigger to create users row
  await new Promise(r => setTimeout(r, 1000))
  const { data: profile } = await supabase.from('users').select('*').eq('id', data.user.id).single()
  currentProfile = profile
  setTimeout(() => { closeLoginModal(); updateUI(); loadQuests() }, 500)
}

async function handleLogout() {
  await supabase.auth.signOut()
  currentUser = null; currentProfile = null
  updateUI(); loadQuests(); window.location.href = '/'
}

// ====== MODALS ======
function openLoginModal() { document.getElementById('loginModal').style.display = 'flex' }
function closeLoginModal() { document.getElementById('loginModal').style.display = 'none' }
function openPostModal() {
  if (!currentUser) return openLoginModal()
  document.getElementById('postModal').style.display = 'flex'
}
function closeModal() { document.getElementById('postModal').style.display = 'none' }

// ====== QUESTS ======
async function loadQuests(filters = {}) {
  let query = supabase.from('quests').select(`
    *,
    client:users!quests_client_id_fkey(display_name, reputation_points, balance_g_coin),
    adventurer:users!quests_adventurer_id_fkey(display_name, reputation_points)
  `).order('created_at', { ascending: false })

  if (filters.status) query = query.eq('status', filters.status)

  const { data: quests, error } = await query
  const board = document.getElementById('taskBoard')
  if (error) { board.innerHTML = `<div class="loading">載入失敗: ${error.message}</div>`; return }
  if (!quests || quests.length === 0) {
    board.innerHTML = '<div class="loading">🏜️ 尚無任務，來發佈第一個吧！</div>'
  } else {
    board.innerHTML = quests.map(q => questCard(q)).join('')
  }
  const openCount = quests?.filter(q => q.status === 'posted').length || 0
  document.getElementById('statsOpen').innerHTML = `📊 看板上共 <b>${quests?.length || 0}</b> 個任務，其中 <b>${openCount}</b> 個招募中`
}

function questCard(q) {
  const statusMap = {
    posted: '🟢 招募中', accepted: '🟡 進行中', submitted: '📦 待驗收',
    verified: '✅ 已完成', canceled: '⚫ 已取消', disputed: '🔴 爭議中', expired: '⏰ 已過期'
  }
  const catMap = { combat:'⚔️', gathering:'🌿', daily:'📋', magic_tech:'🔮', other:'📦' }
  const isMine = currentProfile && q.client_id === currentProfile.id
  const isTaken = currentProfile && q.adventurer_id === currentProfile.id
  const canTake = currentProfile && q.status === 'posted' && !isMine

  let actionBtn = ''
  if (canTake) actionBtn = `<button class="btn btn-sm btn-primary" onclick="event.stopPropagation();acceptQuest('${q.id}')">⚔️ 接取</button>`
  if (isTaken && q.status === 'accepted') actionBtn = `<span class="badge badge-you">你的任務</span>`
  if (isTaken && q.status === 'submitted') actionBtn = `<span class="badge badge-you">待驗收</span>`
  if (isMine && q.status === 'posted') actionBtn = `<button class="btn btn-sm btn-outline" onclick="event.stopPropagation();cancelQuest('${q.id}')">取消</button>`

  return `
    <div class="task-card" onclick="viewQuest('${q.id}')">
      <div class="task-header">
        <span class="task-status">${statusMap[q.status] || q.status}</span>
        <span>${catMap[q.category] || ''}</span>
      </div>
      <h3 class="task-title">${escHtml(q.title)}</h3>
      <p class="task-desc">${escHtml((q.description || '').substring(0, 100))}</p>
      <div class="task-meta">
        <span>👤 ${escHtml(q.client?.display_name || '未知')}</span>
        <span class="task-budget">💰 ${q.reward_g_coin || 0} G</span>
      </div>
      ${actionBtn}
    </div>
  `
}

async function postQuest(e) {
  e.preventDefault()
  if (!currentProfile) return
  const title = document.getElementById('postTitle').value
  const description = document.getElementById('postDesc').value
  const reward = parseInt(document.getElementById('postReward').value) || 0
  const category = document.getElementById('postCategory').value
  const idempotencyKey = crypto.randomUUID()

  if (currentProfile.balance_g_coin < reward) {
    alert(`G 幣不足！你有 ${currentProfile.balance_g_coin}G，需要 ${reward}G`)
    return
  }

  const { data, error } = await supabase.rpc('create_quest_escrow', {
    p_client_id: currentProfile.id,
    p_idempotency_key: idempotencyKey,
    p_reward: reward,
    p_title: title,
    p_description: description,
    p_category: category
  })

  if (error) { alert('發佈失敗: ' + error.message); return }

  // Refresh profile balance
  const { data: profile } = await supabase.from('users').select('*').eq('id', currentProfile.id).single()
  currentProfile = profile

  closeModal()
  document.getElementById('postForm').reset()
  updateUI()
  loadQuests()
}

async function acceptQuest(questId) {
  if (!currentProfile) return openLoginModal()
  const { error } = await supabase.rpc('accept_quest', {
    p_adventurer_id: currentProfile.id,
    p_quest_id: questId
  })
  if (error) { alert('接取失敗: ' + error.message); return }
  loadQuests()
}

async function cancelQuest(questId) {
  if (!confirm('確定要取消這個任務？G 幣會退回')) return
  const { error } = await supabase.rpc('cancel_quest_escrow', {
    p_client_id: currentProfile.id,
    p_quest_id: questId
  })
  if (error) { alert('取消失敗: ' + error.message); return }
  const { data: profile } = await supabase.from('users').select('*').eq('id', currentProfile.id).single()
  currentProfile = profile
  updateUI()
  loadQuests()
}

function viewQuest(id) { window.location.href = `/task?id=${id}` }

// ====== HELPERS ======
function escHtml(s) {
  if (!s) return ''
  return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;')
}

// ====== EVENTS ======
document.getElementById('btnLogin').addEventListener('click', openLoginModal)
document.getElementById('btnLogout').addEventListener('click', handleLogout)
document.getElementById('btnPost').addEventListener('click', openPostModal)
document.getElementById('filterStatus').addEventListener('change', function() {
  loadQuests({ status: this.value })
})

// ====== INIT ======
initAuth().then(() => loadQuests())
