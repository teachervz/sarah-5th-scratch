/* =====================================================================
   🔄 العرض التزامني + 🏆 المنافسة بين المجموعات (Firebase Realtime Database)
   ---------------------------------------------------------------------
   • المعلمة تفتح:   part2.html?teacher        (وتسجّل الدخول مرة واحدة)
   • الطالبات يفتحن: part2.html                (تختار كل طالبة مجموعتها ثم تتبع المعلمة)
   • رابط خاص لكل مجموعة:  part2.html?team=creative   (الأسماء في TEAMS بالأسفل)
   • لفصلين مختلفين أضيفي رمز الفصل:  ?class=5b
   ما الذي يتزامن؟ الشريحة • التصفيق 👏 • قفل التنقل 🔒 • وضع الشريحة (إجابة ✍️ / متابعة 👀)
                  • نقاط المجموعات 🏆 • لوحة المنافسة • إعلان المجموعة الفائزة
   إذا كانت الإعدادات فارغة أو لا يوجد إنترنت يعمل العرض عادياً بدون مزامنة.
   ===================================================================== */

const SYNC = {
  /* 1) إعدادات مشروع Firebase */
  firebase: {
    apiKey: 'AIzaSyB3FI9LwBd843FULOMD43n-2pfVbHBKNL0',
    authDomain: 'scratch-cecd4.firebaseapp.com',
    databaseURL: 'https://scratch-cecd4-default-rtdb.asia-southeast1.firebasedatabase.app',
    projectId: 'scratch-cecd4',
    storageBucket: 'scratch-cecd4.firebasestorage.app',
    messagingSenderId: '57076453802',
    appId: '1:57076453802:web:9aef5956a895232c579bd3'
  },
  /* 2) رمز الفصل الافتراضي (يمكن تغييره من الرابط بـ ?class=...) */
  session: 'class5',
  /* 3) هل تبدأ الطالبات والتنقل مقفل؟ (يتبعن المعلمة فقط) */
  lockByDefault: true,
  /* 4) ماذا ترى الطالبة على جهازها؟
        شرائح الأسئلة والأنشطة (الأنواع التالية) ← تجيب وتتفاعل على جهازها ✍️
        بقية الشرائح (الشرح) ← شاشة «تابعي الشرح مع المعلمة» 👀
        ولتغيير شريحة بعينها أضيفي في إعدادها:  students: 'answer'  أو  students: 'watch'
        وتستطيع المعلمة تبديل وضع الشريحة الحالية أثناء الحصة من زر 👀/✍️ في شريط التحكم */
  answerTypes: ['quiz', 'mcq', 'tf', 'challenge', 'math', 'fixcode', 'ifsim', 'oplab', 'chat', 'brainstorm', 'traffic', 'ai', 'diff', 'group', 'link'],
  /* 5) المجموعات الأربع المتنافسة (غيّري الاسم أو الرمز أو اللون كما تحبين — لا تغيّري id) */
  teams: [
    { id: 'creative',  name: 'المبدعات',   icon: '💡', color: '#4C97FF' },
    { id: 'genius',    name: 'العبقريات',  icon: '🧠', color: '#9966FF' },
    { id: 'shining',   name: 'المتألقات',  icon: '✨', color: '#FFAB19' },
    { id: 'ambitious', name: 'الطموحات',   icon: '🚀', color: '#3FAE49' }
  ],
  /* 6) نقاط الإجابة الصحيحة من أول محاولة */
  points: 10,
  sdk: 'https://www.gstatic.com/firebasejs/10.12.2/'
};

(function(){
  const cfg = SYNC.firebase;
  if (!cfg || !cfg.apiKey || !cfg.databaseURL) { console.info('المزامنة غير مفعّلة: أضيفي إعدادات Firebase في sync.js'); return; }
  if (typeof go !== 'function' || typeof els === 'undefined') return;

  const qs = new URLSearchParams(location.search);
  const role = qs.has('teacher') ? 'teacher' : 'student';
  const sid = (qs.get('class') || SYNC.session).replace(/[^\w-]/g, '').slice(0, 40) || 'class5';
  const deck = (location.pathname.split('/').pop() || 'index.html').replace(/\.html?$/i, '').replace(/[^\w-]/g, '') || 'index';
  const TEAMS = SYNC.teams, T = id => TEAMS.find(t => t.id === id);
  const baseUrl = () => location.href.split('#')[0].split('?')[0];
  const esc = t => String(t).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

  /* ---------- الواجهة ---------- */
  const css = document.createElement('style');
  css.textContent = `
  #syncChip{display:flex;align-items:center;gap:8px;white-space:nowrap;color:#fff;font-size:22px;font-weight:800;padding:0 10px;font-family:var(--font);direction:rtl}
  #syncChip .dot{width:14px;height:14px;border-radius:50%;background:#FF6B6B;box-shadow:0 0 0 4px rgba(255,107,107,.25);flex:none}
  #syncChip.on .dot{background:#59C059;box-shadow:0 0 0 4px rgba(89,192,89,.3)}
  #syncChip button{white-space:nowrap;height:48px!important;padding:0 16px!important;font-size:21px!important;border-radius:999px;background:rgba(255,255,255,.12)}
  #syncChip button.act{background:#FFBF00;color:#2A1F5C}
  #syncChip .tm{background:var(--tc);border-radius:999px;padding:6px 16px}
  #syChipMode.ans{background:#59C059!important;color:#fff}
  #syncBack{position:absolute;top:22px;right:28px;z-index:60;display:none;background:#855CD6;color:#fff;font-weight:800;font-size:24px;padding:12px 26px;border-radius:999px;box-shadow:0 10px 24px rgba(133,92,214,.35);font-family:var(--font)}
  body.sy-free #syncBack.show{display:block}
  body.sy-lock #btnPrev,body.sy-lock #btnNext{opacity:.3;pointer-events:none}
  .sy-ov{position:absolute;inset:0;z-index:200;background:rgba(30,22,64,.72);display:flex;align-items:center;justify-content:center;font-family:var(--font);direction:rtl}
  .sy-card{background:#fff;border-radius:40px;padding:56px 70px;text-align:center;box-shadow:0 30px 80px rgba(0,0,0,.35);min-width:720px;color:#2A1F5C}
  .sy-card h2{font-family:var(--head);font-size:64px;margin:0 0 10px}
  .sy-card p{font-size:30px;font-weight:600;color:#4A4170;margin:0 0 30px}
  .sy-card input{display:block;width:100%;font:inherit;font-size:30px;padding:16px 24px;border-radius:18px;border:3px solid #DCD4F5;margin:0 0 16px;outline:none;direction:ltr;text-align:left;user-select:text}
  .sy-card input:focus{border-color:#855CD6}
  .sy-card .row{display:flex;gap:16px;justify-content:center;margin-top:10px}
  .sy-card button{font-size:30px;font-weight:800;padding:18px 40px;border-radius:999px;background:#855CD6;color:#fff}
  .sy-card button.ghost{background:#EEE8FB;color:#855CD6}
  .sy-card .err{color:#E35B5B;font-size:24px;font-weight:700;min-height:34px;margin:6px 0 0}
  .sy-big{font-size:150px;line-height:1;margin-bottom:10px}
  .sy-teams{display:grid;grid-template-columns:repeat(4,1fr);gap:26px;margin-top:10px}
  .sy-team{background:var(--tc)!important;color:#fff;border-radius:34px!important;padding:30px 20px!important;display:flex;flex-direction:column;align-items:center;gap:10px;box-shadow:0 12px 0 rgba(0,0,0,.15),0 18px 30px rgba(0,0,0,.15);transition:transform .2s}
  .sy-team:hover{transform:translateY(-8px)}
  .sy-team i{font-style:normal;font-size:96px;line-height:1.1;background:#fff;border-radius:50%;width:150px;height:150px;display:grid;place-items:center}
  .sy-team b{font-size:38px}
  .sy-team small{font-size:22px;opacity:.9;font-weight:700}
  .sy-links{display:flex;flex-direction:column;gap:14px;text-align:start;margin:10px 0 24px}
  .sy-links div{display:flex;align-items:center;gap:14px;font-size:26px;font-weight:800}
  .sy-links code{flex:1;direction:ltr;text-align:left;background:#F4F1FD;border-radius:14px;padding:12px 16px;font-size:20px;color:#4A4170;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;user-select:text}
  .sy-links button{font-size:22px!important;padding:10px 22px!important}
  .sy-links .tg{background:var(--tc);color:#fff;border-radius:999px;padding:6px 16px;min-width:200px;text-align:center}
  #syWatch{position:absolute;inset:0;z-index:45;display:none;align-items:center;justify-content:center;font-family:var(--font);direction:rtl;
    background:radial-gradient(circle at 30% 25%,rgba(180,140,255,.97),rgba(110,70,200,.97) 60%,rgba(70,40,150,.98));backdrop-filter:blur(6px)}
  #syWatch.on{display:flex;animation:syfade .6s}
  @keyframes syfade{from{opacity:0}}
  #syWatch .wc{text-align:center;color:#fff;max-width:1300px;padding:0 60px}
  #syWatch .eyes{font-size:220px;line-height:1;display:inline-block;animation:syeye 3s ease-in-out infinite}
  @keyframes syeye{0%,100%{transform:translateX(0)}30%{transform:translateX(-40px)}60%{transform:translateX(40px)}}
  #syWatch h2{font-family:var(--head);font-size:110px;font-weight:800;margin:20px 0 10px;text-shadow:0 8px 30px rgba(0,0,0,.25)}
  #syWatch p{font-size:40px;font-weight:700;margin:0;opacity:.95}
  #syWatch .tt{display:inline-block;margin-top:34px;background:rgba(255,255,255,.18);border:3px solid rgba(255,255,255,.4);border-radius:999px;padding:14px 40px;font-size:36px;font-weight:800}
  /* لوحة المنافسة */
  #syBoard{position:absolute;inset:0;z-index:190;display:none;align-items:center;justify-content:center;font-family:var(--font);direction:rtl;
    background:radial-gradient(circle at 50% 0%,#5B3FB0,#2A1F5C 70%)}
  #syBoard.on{display:flex;animation:syfade .5s}
  #syBoard .bw{width:1500px;color:#fff}
  #syBoard h2{font-family:var(--head);font-size:92px;font-weight:800;text-align:center;margin:0 0 8px}
  #syBoard .sub{text-align:center;font-size:30px;font-weight:700;opacity:.85;margin:0 0 40px}
  #syBoard .rows{position:relative;height:${4 * 150}px}
  #syBoard .tr{position:absolute;left:0;right:0;height:130px;display:flex;align-items:center;gap:24px;transition:transform .8s cubic-bezier(.3,1.3,.5,1)}
  #syBoard .rk{width:80px;font-size:60px;text-align:center;font-weight:900;flex:none}
  #syBoard .ic{width:118px;height:118px;border-radius:50%;background:#fff;display:grid;place-items:center;font-size:72px;flex:none;box-shadow:0 0 0 8px var(--tc)}
  #syBoard .nm{width:270px;font-size:44px;font-weight:900;flex:none}
  #syBoard .nm small{display:block;font-size:22px;font-weight:700;opacity:.75}
  #syBoard .trk{flex:1;height:70px;background:rgba(255,255,255,.1);border-radius:999px;overflow:hidden}
  #syBoard .fill{display:block;height:100%;width:0;background:linear-gradient(90deg,var(--tc),color-mix(in srgb,var(--tc) 70%,#fff));border-radius:999px;transition:width .9s cubic-bezier(.3,1.2,.5,1);min-width:70px}
  #syBoard .pts{width:150px;font-size:60px;font-weight:900;text-align:center;font-family:var(--mono);flex:none}
  #syBoard .adj{display:flex;gap:8px;flex:none}
  #syBoard .adj button{direction:ltr;unicode-bidi:isolate;width:74px;height:60px;border-radius:18px;background:rgba(255,255,255,.14);color:#fff;font-size:26px;font-weight:900}
  #syBoard .adj button:hover{background:rgba(255,255,255,.28)}
  #syBoard .me{outline:5px solid #FFBF00;outline-offset:8px;border-radius:999px}
  #syBoard .tools{display:flex;gap:18px;justify-content:center;margin-top:36px}
  #syBoard .tools button{font-size:30px;font-weight:800;padding:18px 40px;border-radius:999px;background:rgba(255,255,255,.14);color:#fff}
  #syBoard .tools .win{background:#FFBF00;color:#2A1F5C}
  #syWin{position:absolute;inset:0;z-index:195;display:none;align-items:center;justify-content:center;font-family:var(--font);direction:rtl;background:radial-gradient(circle,rgba(42,31,92,.85),rgba(20,14,46,.95))}
  #syWin.on{display:flex;animation:syfade .5s}
  #syWin .wc{text-align:center;color:#fff}
  #syWin .cr{font-size:160px;line-height:1;animation:syb 1.2s ease-in-out infinite}
  @keyframes syb{50%{transform:translateY(-24px) scale(1.06)}}
  #syWin .tic{width:300px;height:300px;margin:10px auto 20px;border-radius:50%;background:#fff;display:grid;place-items:center;font-size:190px;box-shadow:0 0 0 16px var(--tc),0 0 80px 20px var(--tc)}
  #syWin h2{font-family:var(--head);font-size:120px;font-weight:800;margin:0}
  #syWin p{font-size:44px;font-weight:800;margin:10px 0 0;opacity:.9}
  .sy-plus{position:absolute;z-index:220;font-family:var(--font);font-size:64px;font-weight:900;color:#fff;background:var(--tc);border-radius:999px;padding:10px 34px;box-shadow:0 14px 30px rgba(0,0,0,.25);left:50%;top:44%;transform:translate(-50%,-50%);animation:syplus 1.6s ease-out forwards;pointer-events:none}
  @keyframes syplus{0%{transform:translate(-50%,-50%) scale(.4);opacity:0}20%{transform:translate(-50%,-50%) scale(1.1);opacity:1}70%{opacity:1}100%{transform:translate(-50%,-180%) scale(1);opacity:0}}
  .sy-toast{position:absolute;left:50%;top:40px;transform:translateX(-50%);z-index:230;background:#2A1F5C;color:#fff;font-size:28px;font-weight:800;padding:16px 34px;border-radius:999px;font-family:var(--font);animation:rise .4s;white-space:nowrap}`;
  document.head.appendChild(css);
  const bar = document.getElementById('bar'), stageEl = document.getElementById('stage');
  const chip = document.createElement('span'); chip.id = 'syncChip';
  bar.insertBefore(chip, bar.firstChild);
  const back = document.createElement('button'); back.id = 'syncBack'; back.textContent = '↩ ارجعي إلى شريحة المعلمة';
  stageEl.appendChild(back);
  const toast = t => { const d = document.createElement('div'); d.className = 'sy-toast'; d.textContent = t; stageEl.appendChild(d); setTimeout(() => d.remove(), 2600); };
  const overlay = html => { const o = document.createElement('div'); o.className = 'sy-ov'; o.innerHTML = `<div class="sy-card">${html}</div>`; stageEl.appendChild(o); return o; };
  const copy = (u, msg) => (navigator.clipboard ? navigator.clipboard.writeText(u) : Promise.reject()).then(() => toast(msg || '✔ تم النسخ'), () => prompt('انسخي الرابط:', u));

  /* ---------- وضع الشريحة للطالبات: تجيب ✍️ أو تتابع الشرح 👀 ---------- */
  const defMode = i => { const sl = SLIDES[i] || {}; return sl.students || ((SYNC.answerTypes || []).includes(sl.type) ? 'answer' : 'watch'); };
  const plain = h => { const d = document.createElement('div'); d.innerHTML = h || ''; d.querySelectorAll('small').forEach(x => x.remove()); return d.textContent.trim(); };
  const slideTitle = i => { const sl = SLIDES[i] || {}; return plain(sl.title || sl.term || ''); };

  /* ---------- لوحة المنافسة (تظهر عند المعلمة وعند الطالبات) ---------- */
  const board = document.createElement('div'); board.id = 'syBoard';
  board.innerHTML = `<div class="bw"><h2>🏆 لوحة المنافسة</h2><p class="sub">كل إجابة صحيحة من أول محاولة = ${SYNC.points} نقاط لمجموعتكِ</p>
    <div class="rows">${TEAMS.map(t => `<div class="tr" data-t="${t.id}" style="--tc:${t.color}"><span class="rk"></span><span class="ic">${t.icon}</span>
      <span class="nm">${esc(t.name)}<small class="cnt"></small></span><span class="trk"><i class="fill"></i></span><span class="pts">0</span>
      ${role === 'teacher' ? '<span class="adj"><button data-d="-5">−5</button><button data-d="5">+5</button><button data-d="10">+10</button></span>' : ''}</div>`).join('')}</div>
    <div class="tools">${role === 'teacher' ? '<button class="win">🎉 إعلان المجموعة الفائزة</button><button class="rst">↺ تصفير النقاط</button>' : ''}<button class="cls">✕ إغلاق</button></div></div>`;
  stageEl.appendChild(board);
  const winEl = document.createElement('div'); winEl.id = 'syWin'; stageEl.appendChild(winEl);
  let scores = {}, counts = {};
  const paintBoard = myTeam => {
    const max = Math.max(10, ...TEAMS.map(t => scores[t.id] || 0));
    const order = [...TEAMS].sort((a, b) => (scores[b.id] || 0) - (scores[a.id] || 0));
    const medals = ['🥇', '🥈', '🥉', '4'];
    order.forEach((t, r) => {
      const row = board.querySelector(`.tr[data-t="${t.id}"]`), v = scores[t.id] || 0;
      const rank = order.findIndex(x => (scores[x.id] || 0) === v);
      row.style.transform = `translateY(${r * 150}px)`;
      row.querySelector('.rk').textContent = medals[rank];
      row.querySelector('.fill').style.width = (v / max * 100) + '%';
      row.querySelector('.pts').textContent = v;
      row.querySelector('.cnt').textContent = counts[t.id] !== undefined ? `👧 ${counts[t.id]} متصلة` : '';
      row.querySelector('.ic').classList.toggle('me', t.id === myTeam);
    });
  };
  const winners = () => { const top = Math.max(...TEAMS.map(t => scores[t.id] || 0)); return TEAMS.filter(t => (scores[t.id] || 0) === top); };
  const showWinner = () => {
    const w = winners(), one = w.length === 1, t = w[0];
    winEl.style.setProperty('--tc', one ? t.color : '#FFBF00');
    winEl.innerHTML = `<div class="wc"><div class="cr">👑</div><div class="tic">${one ? t.icon : '🤝'}</div>
      <h2>${one ? 'مجموعة ' + esc(t.name) : 'تعادل رائع!'}</h2><p>${one ? `الفائزة بـ ${scores[t.id] || 0} نقطة 🎉` : w.map(x => x.icon + ' ' + esc(x.name)).join(' • ')}</p></div>`;
    winEl.classList.add('on'); typeof rain === 'function' && rain(); typeof clap === 'function' && setTimeout(() => (typeof _clapLocal === 'function' ? _clapLocal() : 0), 300);
    winEl.onclick = () => winEl.classList.remove('on');
  };
  let _clapLocal = null;

  /* ---------- تحميل مكتبة Firebase ---------- */
  const load = src => new Promise((res, rej) => { const s = document.createElement('script'); s.src = SYNC.sdk + src; s.onload = res; s.onerror = rej; document.head.appendChild(s); });
  chip.innerHTML = '<i class="dot"></i><span>جارٍ الاتصال…</span>';
  load('firebase-app-compat.js')
    .then(() => Promise.all([load('firebase-database-compat.js'), load('firebase-auth-compat.js')]))
    .then(start)
    .catch(() => { chip.innerHTML = '<i class="dot"></i><span>بدون مزامنة (لا يوجد إنترنت)</span>'; });

  function start(){
    firebase.initializeApp(cfg);
    const db = firebase.database(), auth = firebase.auth(), SV = firebase.database.ServerValue;
    const ref = db.ref(`sessions/${sid}/${deck}`);
    db.ref('.info/connected').on('value', s => chip.classList.toggle('on', !!s.val()));

    const _go = go, _clap = clap; _clapLocal = _clap;
    let state = { slide: 0, locked: SYNC.lockByDefault, clap: 0 };
    let ready = false, applying = false;

    if (role === 'teacher'){
      /* ===================== المعلمة ===================== */
      const ovr = {};
      const modeOf = i => ovr[i] || defMode(i);
      const push = extra => { if (ready) ref.child('state').update(Object.assign({ slide: cur, mode: modeOf(cur), at: SV.TIMESTAMP }, extra || {})); };
      go = function(n){ _go(n); push(); paint(); };
      clap = function(){ _clap(); push({ clap: SV.TIMESTAMP }); };
      rebindClap();

      let viewers = 0;
      const paint = () => { if (!ready) return;
        chip.innerHTML = `<i class="dot"></i><span>👩‍🏫 ${sid}</span><span>👧 ${viewers}</span>
          <button class="sy-lk ${state.locked ? 'act' : ''}" title="قفل/فتح تنقل الطالبات">${state.locked ? '🔒 مقفل' : '🔓 حر'}</button>
          <button id="syChipMode" class="${modeOf(cur) === 'answer' ? 'ans' : ''}" title="ماذا ترى الطالبات في هذه الشريحة؟">${modeOf(cur) === 'answer' ? '✍️ تجيب الطالبات' : '👀 متابعة الشرح'}</button>
          <button class="sy-bd" title="لوحة المنافسة">🏆 النقاط</button>
          <button class="sy-ln" title="روابط الطالبات والمجموعات">🔗 الروابط</button>`;
        chip.querySelector('.sy-lk').onclick = () => { state.locked = !state.locked; push({ locked: state.locked }); paint(); toast(state.locked ? '🔒 الطالبات يتبعن شريحتكِ فقط' : '🔓 الطالبات يتنقلن بحرية'); };
        chip.querySelector('#syChipMode').onclick = () => { ovr[cur] = modeOf(cur) === 'answer' ? 'watch' : 'answer'; push(); paint(); toast(modeOf(cur) === 'answer' ? '✍️ الطالبات يجبن على أجهزتهن الآن' : '👀 الطالبات يتابعن شرحكِ'); };
        chip.querySelector('.sy-bd').onclick = () => setBoard(!board.classList.contains('on'));
        chip.querySelector('.sy-ln').onclick = showLinks;
      };
      const setBoard = on => { board.classList.toggle('on', on); push({ board: on }); if (on) paintBoard(); };
      board.querySelector('.cls').onclick = () => setBoard(false);
      board.querySelectorAll('.adj button').forEach(b => b.onclick = () => {
        const id = b.closest('.tr').dataset.t, d = +b.dataset.d;
        ref.child('score/' + id).set(SV.increment(d)); Sound.click && Sound.click();
      });
      board.querySelector('.rst').onclick = () => {
        if (!confirm('تصفير نقاط جميع المجموعات وبدء منافسة جديدة؟')) return;
        ref.child('score').remove(); push({ round: Date.now() }); toast('↺ بدأت منافسة جديدة');
      };
      board.querySelector('.win').onclick = () => { push({ win: SV.TIMESTAMP }); showWinner(); };
      function showLinks(){
        const cls = sid !== SYNC.session ? `class=${sid}&` : '';
        const all = baseUrl() + (cls ? '?' + cls.slice(0, -1) : '');
        const ov = overlay(`<h2>🔗 روابط الطالبات</h2><p>رابط عام تختار فيه كل طالبة مجموعتها، أو رابط خاص لكل مجموعة</p>
          <div class="sy-links"><div><span class="tg" style="--tc:#855CD6">👧 الرابط العام</span><code>${esc(all)}</code><button data-u="${esc(all)}">نسخ</button></div>
          ${TEAMS.map(t => { const u = `${baseUrl()}?${cls}team=${t.id}`; return `<div><span class="tg" style="--tc:${t.color}">${t.icon} ${esc(t.name)}</span><code>${esc(u)}</code><button data-u="${esc(u)}">نسخ</button></div>`; }).join('')}</div>
          <div class="row"><button class="ghost x">إغلاق</button></div>`);
        ov.querySelector('.sy-card').style.width = '1500px';
        ov.querySelectorAll('[data-u]').forEach(b => b.onclick = () => copy(b.dataset.u, '✔ تم نسخ الرابط'));
        ov.querySelector('.x').onclick = () => ov.remove();
      }
      const begin = () => {
        ref.child('state').once('value').then(s => {
          const v = s.val() || {};
          state.locked = v.locked !== undefined ? v.locked : SYNC.lockByDefault;
          ready = true; push({ locked: state.locked, board: false }); paint();
          ref.child('viewers').on('value', vs => {
            viewers = vs.numChildren(); counts = {}; TEAMS.forEach(t => counts[t.id] = 0);
            vs.forEach(c => { const x = c.val(); if (x && x.t && counts[x.t] !== undefined) counts[x.t]++; });
            paint(); paintBoard();
          });
          ref.child('score').on('value', ss => { scores = ss.val() || {}; paintBoard(); });
          toast('✔ متصلة: الطالبات يتبعن عرضكِ الآن');
        }).catch(() => toast('⚠️ لا توجد صلاحية للكتابة: راجعي قواعد قاعدة البيانات'));
      };
      auth.onAuthStateChanged(u => {
        if (u){ begin(); return; }
        const ov = overlay(`<div class="sy-big">👩‍🏫</div><h2>دخول المعلمة</h2><p>سجّلي الدخول ليتبع جهاز كل طالبة عرضكِ</p>
          <input type="email" class="em" placeholder="البريد الإلكتروني"><input type="password" class="pw" placeholder="كلمة المرور">
          <p class="err"></p><div class="row"><button class="in">دخول</button><button class="ghost no">عرض بدون مزامنة</button></div>`);
        const err = ov.querySelector('.err');
        const tryIn = () => auth.signInWithEmailAndPassword(ov.querySelector('.em').value.trim(), ov.querySelector('.pw').value)
          .then(() => ov.remove()).catch(() => { err.textContent = 'البريد أو كلمة المرور غير صحيحة'; });
        ov.querySelector('.in').onclick = tryIn;
        ov.querySelector('.pw').addEventListener('keydown', e => { if (e.key === 'Enter') tryIn(); });
        ov.querySelector('.no').onclick = () => { ov.remove(); chip.innerHTML = '<i class="dot"></i><span>بدون مزامنة</span>'; };
      });
    } else {
      /* ===================== الطالبة ===================== */
      const TKEY = `sy-team-${sid}`;
      let team = T(qs.get('team')) ? qs.get('team') : (() => { try { return localStorage.getItem(TKEY); } catch (e) { return null; } })();
      if (!T(team)) team = null;
      let round = 0;

      /* شاشة «تابعي الشرح» */
      const watch = document.createElement('div'); watch.id = 'syWatch';
      watch.innerHTML = '<div class="wc"><span class="eyes">👀</span><h2>تابعي الشرح مع المعلمة</h2><p>انظري إلى السبورة وأنصتي جيداً… ستجيبين بعد قليل ✍️</p><span class="tt"></span></div>';
      stageEl.appendChild(watch);
      let lastMode = '', lastModeSlide = -1;
      const applyMode = () => {
        const onTeacher = cur === state.slide;
        const mode = onTeacher ? (state.mode || defMode(cur)) : 'answer';
        const show = state.locked && onTeacher && mode === 'watch';
        const t = slideTitle(cur); watch.querySelector('.tt').textContent = t ? '📖 ' + t : ''; watch.querySelector('.tt').style.display = t ? '' : 'none';
        watch.classList.toggle('on', show);
        if (state.locked && onTeacher && mode === 'answer' && (lastMode !== 'answer' || lastModeSlide !== cur) && ready) toast('✍️ دوركِ! أجيبي على جهازكِ');
        lastMode = mode; lastModeSlide = cur;
      };

      /* النقاط: أول محاولة لكل سؤال فقط */
      const AKEY = () => `sy-ans-${sid}-${deck}-${round}`;
      let answered = new Set();
      const loadAns = () => { try { answered = new Set(JSON.parse(localStorage.getItem(AKEY()) || '[]')); } catch (e) { answered = new Set(); } };
      const saveAns = () => { try { localStorage.setItem(AKEY(), JSON.stringify([...answered])); } catch (e) {} };
      loadAns();
      award = (ok, key) => {
        if (!team || !key) return;
        const k = cur + '|' + key;
        if (answered.has(k)) return;
        answered.add(k); saveAns();
        if (ok === true){
          ref.child('score/' + team).set(SV.increment(SYNC.points));
          const t = T(team), d = document.createElement('div'); d.className = 'sy-plus'; d.style.setProperty('--tc', t.color);
          d.textContent = `+${SYNC.points} ${t.icon} ${t.name}`; stageEl.appendChild(d); setTimeout(() => d.remove(), 1700);
        }
      };

      const me = ref.child('viewers').push();
      const presence = () => { if (team) me.set({ t: team, at: SV.TIMESTAMP }); };
      db.ref('.info/connected').on('value', s => { if (s.val()){ me.onDisconnect().remove(); presence(); } });

      go = function(n){
        if (!applying && state.locked){ if (n !== cur) toast('🔒 تابعي مع المعلمة'); return; }
        _go(n); back.classList.toggle('show', cur !== state.slide); applyMode();
      };
      const setChip = () => {
        const t = T(team);
        chip.innerHTML = `<i class="dot"></i>${t ? `<span class="tm" style="--tc:${t.color}">${t.icon} ${esc(t.name)} • ${scores[team] || 0}</span>` : ''}<span>${state.locked ? '🔒 أتابع المعلمة' : '🔓 تنقلي بحرية'}</span>`;
        document.body.classList.toggle('sy-lock', state.locked); document.body.classList.toggle('sy-free', !state.locked);
      };
      back.onclick = () => { applying = true; _go(state.slide); applying = false; back.classList.remove('show'); applyMode(); };
      board.querySelector('.cls').onclick = () => board.classList.remove('on');

      /* شاشة الانضمام واختيار المجموعة */
      const join = id => { team = id; try { localStorage.setItem(TKEY, id); } catch (e) {} presence(); setChip(); paintBoard(team); Sound.ac && Sound.ac(); Sound.success && Sound.success(); };
      const chooser = () => {
        const ov = overlay(`<div class="sy-big">👋</div><h2>أهلاً بكِ في المنافسة!</h2><p>اختاري مجموعتكِ للانضمام إلى عرض المعلمة</p>
          <div class="sy-teams">${TEAMS.map(t => `<button class="sy-team" data-t="${t.id}" style="--tc:${t.color}"><i>${t.icon}</i><b>${esc(t.name)}</b><small>مجموعة ${TEAMS.indexOf(t) + 1}</small></button>`).join('')}</div>`);
        ov.querySelector('.sy-card').style.width = '1500px';
        ov.querySelectorAll('.sy-team').forEach(b => b.onclick = () => { ov.remove(); join(b.dataset.t); toast(`🎉 انضممتِ إلى ${T(team).icon} ${T(team).name}`); });
      };
      if (team){
        const t = T(team);
        const ov = overlay(`<div class="sy-big">${t.icon}</div><h2>مجموعة ${esc(t.name)}</h2><p>اضغطي الزر لتنضمي إلى عرض المعلمة (فصل ${sid})</p>
          <div class="row"><button class="in" style="background:${t.color}">انضمي الآن 🚀</button><button class="ghost ch">تغيير المجموعة</button></div>`);
        ov.querySelector('.in').onclick = () => { ov.remove(); join(team); };
        ov.querySelector('.ch').onclick = () => { ov.remove(); chooser(); };
      } else chooser();

      let lastClap = null, lastWin = null;
      ref.child('score').on('value', ss => { scores = ss.val() || {}; paintBoard(team); setChip(); });
      ref.child('state').on('value', s => {
        const v = s.val(); if (!v) { setChip(); return; }
        const prevSlide = state.slide;
        state.locked = !!v.locked; state.slide = Math.max(0, Math.min(els.length - 1, v.slide | 0)); state.mode = v.mode;
        if ((v.round || 0) !== round){ round = v.round || 0; loadAns(); }
        setChip();
        if (!ready || state.locked || prevSlide !== state.slide){ applying = true; _go(state.slide); applying = false; }
        back.classList.toggle('show', cur !== state.slide);
        applyMode();
        board.classList.toggle('on', !!v.board); if (v.board) paintBoard(team);
        if (v.clap && lastClap !== null && v.clap !== lastClap) _clap();
        lastClap = v.clap || 0;
        if (v.win && lastWin !== null && v.win !== lastWin) showWinner();
        lastWin = v.win || 0;
        ready = true;
      });
    }
  }
  function rebindClap(){
    document.getElementById('btnClap').onclick = () => clap();
    document.querySelectorAll('.clapme').forEach(b => b.onclick = () => clap());
  }
})();
