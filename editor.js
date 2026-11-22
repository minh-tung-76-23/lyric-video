(() => {
  const C = window.LyricCore;
  const $ = (id) => document.getElementById(id);
  const audio = $('audio'), frame = $('preview'), tapbox = $('tapbox'), list = $('list');
  // Nháp gắn với song.js hiện tại: chép song.js mới vào thì nháp cũ tự bỏ qua
  const sig = [...((window.SONG || {}).source || '')].reduce((h, c) => (h * 31 + c.charCodeAt(0)) | 0, 7);
  const DRAFT = 'lyric-editor-draft:' + sig;

  // ---------- Trạng thái ----------
  let song = null;
  try { song = JSON.parse(localStorage.getItem(DRAFT)); } catch {}
  if (!song) song = structuredClone(window.SONG || {});
  song.taps ||= []; song.ends ||= {}; song.clips ||= [];
  song.audio = 'music/song.mp3';

  $('title').value = song.title || '';
  $('plain').checked = song.plain !== false;
  $('offset').value = song.offset || 0;
  $('source').value = song.source || '';
  $('aspect').value = song.aspect || '4:3';
  const fitPreview = () => {
    const m = (song.aspect || '4:3').match(/^(\d+):(\d+)$/);
    const ar = m ? +m[1] / +m[2] : 16 / 9;
    frame.style.aspectRatio = String(ar);
    frame.style.width = ar < 1 ? 'auto' : '100%';
    frame.style.height = ar < 1 ? '78vh' : '';
  };
  fitPreview();
  $('aspect').onchange = (e) => { song.aspect = e.target.value; fitPreview(); changed(); };
  $('clips').value = song.clips.map((c) => (typeof c === 'string' ? c
    : [c.scene ? 'scene:' + c.scene : c.src, c.at ?? '', c.from || ''].join(' ').trim())).join('\n');

  // Nút bỏ nháp (khi đã chép song.js mới vào thư mục)
  const reset = document.createElement('button');
  reset.textContent = 'Bỏ nháp, nạp lại song.js';
  reset.onclick = () => { try { localStorage.removeItem(DRAFT); } catch {} location.reload(); };
  $('save').after(reset);

  let lines = [], slots = [];   // slots[k] = { li, wi } : lần gõ thứ k ứng với câu li, từ wi
  function recompute() {
    lines = C.parse(song.source);
    slots = [];
    lines.forEach((ln, li) => {
      for (let wi = 0; wi < C.tapsNeeded(ln); wi++) slots.push({ li, wi });
    });
  }

  function changed() {
    recompute();
    try { localStorage.setItem(DRAFT, JSON.stringify(song)); } catch {}
    frame.contentWindow?.postMessage({ type: 'song', song }, '*');
    renderList();
    renderTapbox();
  }

  // ---------- Ô nhập ----------
  $('title').oninput = (e) => { song.title = e.target.value; changed(); };
  $('plain').onchange = (e) => { song.plain = e.target.checked; changed(); };
  $('offset').oninput = (e) => { song.offset = parseFloat(e.target.value) || 0; changed(); };
  $('source').oninput = (e) => { song.source = e.target.value; changed(); };
  $('clips').oninput = (e) => {
    song.clips = e.target.value.split('\n').map((l) => l.trim().split(/\s+/)).filter((p) => p[0])
      // không ghi giây -> để trống, trang tự chia đều
      // "scene:timelapse 5.15" = đoạn hoạt hình vẽ sẵn (timelapse | seasons | storm | snowforest ...)
      .map(([src, at, from]) => ({
        ...(src.startsWith('scene:') ? { scene: src.slice(6) } : { src }),
        ...(at != null && !isNaN(parseFloat(at)) ? { at: parseFloat(at) } : {}),
        ...(from ? { from: parseFloat(from) || 0 } : {}),
      }));
    changed();
  };
  $('file').onchange = (e) => {
    const f = e.target.files[0];
    if (!f) return;
    audio.src = URL.createObjectURL(f);
    $('audioname').textContent = f.name + ' → nhớ chép file này thành music/song.mp3';
  };
  audio.onerror = () => { $('audioname').textContent = 'chưa có music/song.mp3 - chọn file nhạc ở trên'; };

  // ---------- Gõ phím canh giờ ----------
  let tapping = false, idx = 0;
  const fmt = (t) => (t == null ? '--' : t.toFixed(2));

  function startFrom(lineNo) {
    recompute();
    const li = Math.max(0, Math.min(lines.length - 1, lineNo));
    idx = slots.findIndex((s) => s.li === li);
    if (idx < 0) return;
    if (li === 0) { song.taps = []; song.ends = {}; }
    else for (const k of Object.keys(song.ends)) if (+k >= li) delete song.ends[k];
    const prev = song.taps[idx - 1];
    audio.currentTime = li === 0 ? 0 : Math.max(0, (prev ?? song.taps[idx] ?? 0) - 1.5);
    tapping = true;
    document.activeElement?.blur();
    tapbox.classList.add('active');
    audio.play();
    changed();
  }
  $('tapStart').onclick = () => startFrom(0);
  $('tapFrom').onclick = () => startFrom((parseInt($('fromLine').value, 10) || 1) - 1);

  addEventListener('keydown', (e) => {
    if (!tapping) return;
    if (e.target.matches('textarea, input')) return;
    const t = +audio.currentTime.toFixed(3);
    if (e.code === 'Space') {
      e.preventDefault();
      if (idx < slots.length) { song.taps[idx++] = t; changed(); }
      if (idx >= slots.length) stop();
    } else if (e.code === 'Enter') {
      e.preventDefault();
      if (idx > 0) { song.ends[slots[idx - 1].li] = t; changed(); }
    } else if (e.code === 'Backspace') {
      e.preventDefault();
      if (idx > 0) {
        idx--;
        song.taps[idx] = null;
        delete song.ends[slots[idx].li];
        audio.currentTime = Math.max(0, (song.taps[idx - 1] ?? 0) - 1);
        changed();
      }
    } else if (e.code === 'Escape') stop();
  });

  function stop() {
    tapping = false;
    tapbox.classList.remove('active');
    audio.pause();
    renderTapbox();
  }

  // ---------- Hiển thị ----------
  function renderTapbox() {
    if (!tapping) {
      const missing = slots.filter((_, k) => typeof song.taps[k] !== 'number').length;
      tapbox.innerHTML = missing
        ? `Còn <b>${missing}</b> chỗ chưa có giờ. Bấm "Gõ lại từ đầu" rồi nhấn <kbd>Space</kbd> đúng lúc mỗi từ được hát.`
        : `<span class="done">Đã canh giờ đủ ${slots.length} lần gõ.</span> Xem trước bên phải, ổn thì bấm <b>Tải song.js</b>.`;
      return;
    }
    const s = slots[idx];
    if (!s) { tapbox.innerHTML = '<span class="done">Xong!</span>'; return; }
    const ln = lines[s.li];
    const html = ln.words.map((w, wi) => {
      const k = slots.findIndex((x) => x.li === s.li && x.wi === (ln.mode === 'all' ? 0 : wi));
      const cls = ln.mode === 'all'
        ? (k === idx ? 'next' : '')
        : k < idx ? 'done' : k === idx ? 'next' : '';
      return `<span class="${cls}">${w.text}</span>`;
    }).join(' ');
    tapbox.innerHTML = `<div class="muted">câu ${s.li + 1}/${lines.length}${ln.mode === 'all' ? ' · cả câu 1 lần gõ' : ''}</div>${html}`;
  }

  function renderList() {
    const built = C.build(song);
    list.innerHTML = built.map((ln, i) => {
      const miss = ln.words.some((w) => w.t == null);
      return `<div class="${miss ? 'missing' : ''}"><span class="t">${i + 1} · ${fmt(ln.start)}</span><span>${ln.raw.replace(/</g, '&lt;')}</span></div>`;
    }).join('');
  }

  // ---------- Xem trước: editor điều khiển thời gian ----------
  addEventListener('message', (e) => {
    if (e.data?.type === 'ready') frame.contentWindow.postMessage({ type: 'song', song }, '*');
  });
  (function sync() {
    frame.contentWindow?.postMessage({ type: 'time', t: audio.currentTime, playing: !audio.paused }, '*');
    requestAnimationFrame(sync);
  })();

  // ---------- Tải song.js ----------
  $('save').onclick = () => {
    const out = { ...song, taps: song.taps.map((t) => (typeof t === 'number' ? t : null)) };
    const body = JSON.stringify({ ...out, taps: '__TAPS__' }, null, 1)
      .replace('"__TAPS__"', JSON.stringify(out.taps));
    const text = '// Tạo bằng editor.html - mở editor.html để sửa tiếp\nwindow.SONG = ' + body + ';\n';
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([text], { type: 'text/javascript' }));
    a.download = 'song.js';
    a.click();
  };

  changed();
})();
