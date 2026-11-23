(() => {
  const C = window.LyricCore;
  const $ = (id) => document.getElementById(id);
  const audio = $('audio'), lyric = $('lyric'), clipsEl = $('clips'), startBtn = $('start');

  const qs = new URLSearchParams(location.search);
  const EMBED = qs.has('embed');                 // nằm trong editor.html, editor điều khiển thời gian
  const FIXED = qs.has('t') ? parseFloat(qs.get('t')) : null;   // index.html?t=12 xem 1 khoảnh khắc

  let song = null, lines = [], clips = [], show = (w) => w;

  // ---------- Nạp bài ----------
  function load(s, audioUrl) {
    song = s;
    lines = C.build(s);
    show = s.plain === false ? (w) => w : C.plain;
    document.title = s.title || 'Lyrics';
    if (!EMBED) audio.src = audioUrl || s.audio || 'music/song.mp3';
    applyAspect(qs.get('ratio') || s.aspect || '4:3');
    // ảnh mặt cho nhân vật trong hoạt hình; ?face=anime -> dùng faces/anh-anime.*, faces/em-anime.*
    const fv = qs.get('face');
    const faces = fv && s.faces
      ? Object.fromEntries(Object.entries(s.faces).map(([k, p]) => [k, p.replace(/(\.[a-z]+)?$/i, `-${fv}$1`)]))
      : s.faces;
    scene?.setFaces(faces);
    buildClips(s.clips || []);
    curLine = -2; curClip = -2;
    render(now());
  }

  // ---------- Khung hình: "4:3" | "16:9" | "9:16" | "full" (phủ kín màn hình) ----------
  const stage = $('stage');
  let aspectMode = '4:3';
  function applyAspect(a) {
    aspectMode = String(a).trim().toLowerCase();
    const m = aspectMode.match(/^(\d+(?:\.\d+)?)\s*[:/x]\s*(\d+(?:\.\d+)?)$/);
    stage.classList.toggle('full', !m);
    if (m) stage.style.setProperty('--ar', (+m[1] / +m[2]).toFixed(4));
    updatePortrait();
  }
  function updatePortrait() {
    const r = stage.getBoundingClientRect();
    stage.classList.toggle('portrait', r.height > r.width * 1.05);
  }
  addEventListener('resize', updatePortrait);

  // ---------- Clip / ảnh nền (cắt thẳng, không mờ dần - giống video) ----------
  function buildClips(list) {
    clipsEl.innerHTML = '';
    const items = list.map((c) => (typeof c === 'string' ? { src: c } : { ...c }));
    // Ảnh/clip không ghi giờ -> tự chia: đủ 8 cái thì khớp 8 mốc cắt cảnh của video, còn lại chia đều cả bài
    const auto = items.filter((c) => c.at == null);
    if (auto.length) {
      const cuts = (song.scenes || []).map((s) => s[0]);
      const dur = Math.max(1, ...lines.map((l) => l.end || 0));
      auto.forEach((c, i) => { c.at = auto.length === cuts.length ? cuts[i] : (i * dur) / auto.length; });
    }
    clips = items
      .sort((a, b) => a.at - b.at)
      .map((c) => {
        // { "scene": "timelapse" } = đoạn hoạt hình vẽ bằng canvas (scene.js), không cần file
        if (c.scene) return { ...c, at: c.at || 0, el: null, vid: false };
        const vid = /\.(mp4|webm|mov)$/i.test(c.src);
        const el = document.createElement(vid ? 'video' : 'div');
        el.className = 'clip' + (vid ? '' : ' img');
        const item = { ...c, at: c.at || 0, from: c.from || 0, el, vid, missing: false };
        if (vid) {
          Object.assign(el, { src: c.src, muted: true, loop: true, playsInline: true, preload: 'auto' });
          el.onerror = () => { item.missing = true; };
        } else loadImage(item);
        clipsEl.appendChild(el);
        return item;
      });
    clips.forEach((c, k) => { c.len = (clips[k + 1]?.at ?? songLen()) - c.at; });
  }

  // Thử .jpg rồi .jpeg .png .webp; không có file thì dùng nền đêm vẽ sẵn thay vào chỗ đó
  function loadImage(item) {
    const base = item.src.replace(/\.(jpe?g|png|webp|gif)$/i, '');
    const tries = [item.src, ...['.jpg', '.jpeg', '.png', '.webp', '.JPG', '.PNG'].map((e) => base + e)]
      .filter((v, i, a) => a.indexOf(v) === i);
    const next = (k) => {
      if (k >= tries.length) { item.missing = true; return; }
      const img = new Image();
      img.onload = () => {
        item.el.style.backgroundImage = `url("${tries[k]}")`;
        // ảnh PNG nền trong suốt -> đè lên nền động (nền vẫn chạy phía sau)
        try {
          const c = document.createElement('canvas'); c.width = c.height = 16;
          const x = c.getContext('2d'); x.drawImage(img, 0, 0, 16, 16);
          const a = (px, py) => x.getImageData(px, py, 1, 1).data[3];
          item.overlay = a(0, 0) < 10 && a(15, 0) < 10 && a(0, 15) < 10 && a(15, 15) < 10;
        } catch { item.overlay = false; }
        item.el.classList.toggle('overlay', item.overlay);
      };
      img.onerror = () => next(k + 1);
      img.src = tries[k];
    };
    next(0);
  }
  const songLen = () => Math.max(1, ...lines.map((l) => l.end || 0));

  let curClip = -2;
  function renderClip(t, playing) {
    let i = -1;
    clips.forEach((c, k) => { if (t >= c.at) i = k; });
    if (i < 0 && clips.length) i = 0;
    if (i !== curClip) {
      clips[curClip]?.el?.classList.remove('on');
      if (clips[curClip]?.vid) clips[curClip].el.pause();
      curClip = i;
      const c = clips[i];
      if (c?.el) {
        c.el.classList.add('on');
        if (c.vid) { try { c.el.currentTime = c.from + Math.max(0, t - c.at); } catch {} }
      }
    }
    const c = clips[curClip];
    if (c?.vid) {
      if (playing && c.el.paused) c.el.play().catch(() => {});
      if (!playing && !c.el.paused) c.el.pause();
      if (!playing) { try { c.el.currentTime = c.from + Math.max(0, t - c.at); } catch {} }
    }
  }

  // ---------- Lời ----------
  let curLine = -2, words = [], bigs = [];

  function lineAt(t) {
    let found = -1;
    lines.forEach((ln, i) => { if (ln.start != null && t >= ln.start && t < ln.end) found = i; });
    return found;
  }

  const INLINE = ['red', 'pink', 'blue', 'yellow'];
  const FLASH = 0.22;          // chữ IN HOA chớp bao lâu (giây)
  const BIGHOLD = 0.4;         // [bighold]: chữ to tắt sau bao lâu
  const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);
  const clean = (s) => s.replace(/^[*"'“”,.;:]+|[*"'“”,.;:]+$/g, '');
  let flashes = [];

  function buildLine(i) {
    lyric.innerHTML = '';        // cắt thẳng sang câu mới
    lyric.classList.remove('flashing');
    words = []; bigs = []; flashes = [];
    if (i < 0) return;
    const ln = lines[i];

    const bigRow = document.createElement('div');
    bigRow.className = 'bigrow';
    const row = document.createElement('div');
    row.className = `line s-${ln.style}` + (ln.hide ? ' hidden' : '');

    ln.words.forEach((w) => {
      const s = document.createElement('span');
      s.className = 'w' + (INLINE.includes(w.mark) ? ' ' + w.mark : '');
      s.textContent = show(w.text);
      row.appendChild(s);
      words.push({ el: s, t: w.t });
      const color = w.mark.split('-')[1] || 'white';
      if (w.mark.startsWith('big')) {
        const b = document.createElement('span');
        b.className = 'big b-' + color;
        const p = clean(show(w.text));
        b.textContent = color === 'yellow' ? p : cap(p);   // "long lanh" vàng giữ chữ thường như video
        bigRow.appendChild(b);
        bigs.push({ el: b, t: w.t });
      }
      if (w.mark.startsWith('flash')) {
        const fl = document.createElement('div');
        fl.className = 'flash f-' + color;
        fl.textContent = clean(show(w.text)).toUpperCase();
        lyric.appendChild(fl);
        flashes.push({ el: fl, t: w.t });
      }
    });
    lyric.append(bigRow, row);
  }

  function render(t, playing = false) {
    const i = lineAt(t);
    if (i !== curLine) { curLine = i; buildLine(i); }
    if (i >= 0) {
      const ln = lines[i];
      let last = -1;
      words.forEach((w, k) => { if (w.t != null && t >= w.t) last = k; });
      words.forEach((w, k) => {
        const on = ln.mode === 'all' ? true : ln.mode === 'one' ? k === last : k <= last;
        w.el.classList.toggle('on', on);
        w.el.classList.toggle('cur', ln.hl && k === last);
      });
      let lastBig = -1;
      bigs.forEach((b, k) => { if (b.t != null && t >= b.t) lastBig = k; });
      const bigAlive = !ln.bighold || (lastBig >= 0 && t < bigs[lastBig].t + BIGHOLD);
      bigs.forEach((b, k) => b.el.classList.toggle('on', bigAlive && (ln.bigmode === 'one' ? k === lastBig : k <= lastBig)));
      let flashing = false;
      flashes.forEach((f) => {
        const on = f.t != null && t >= f.t && t < f.t + FLASH;
        f.el.classList.toggle('on', on);
        flashing ||= on;
      });
      lyric.classList.toggle('flashing', flashing);
    }
    renderClip(t, playing);
    renderScene(t);
  }

  // ---------- Nền vẽ bằng canvas khi chưa có clip ----------
  const scene = window.NightScene ? window.NightScene.create($('bg')) : null;
  const bgEl = $('bg');
  function renderScene(t) {
    if (!scene) return;
    const c = clips[curClip];
    // đang là ảnh/clip có file -> tắt canvas cho nhẹ máy
    const useCanvas = !c || c.scene || c.missing || c.overlay;   // ảnh trong suốt: canvas vẫn vẽ phía sau
    bgEl.style.visibility = useCanvas ? 'visible' : 'hidden';
    if (!useCanvas) return;
    if (c?.scene) return scene.draw(t, c.scene, t - c.at, c.len);
    const list = song.scenes || [[0, 'snowforest']];
    let cur = list[0];
    for (const s of list) if (t >= s[0]) cur = s;
    scene.draw(t, cur[1], t - cur[0]);
  }

  // ---------- Đồng hồ ----------
  // Có nhạc: theo audio. Chưa có file nhạc: chạy đồng hồ riêng để vẫn xem được.
  let extT = 0, extPlaying = false, clock = null;
  const clockT = () => (clock.paused ? clock.at : (performance.now() - clock.t0) / 1000);
  const now = () => FIXED ?? (EMBED ? extT : clock ? clockT() : audio.currentTime) + (song?.offset || 0);
  const isPlaying = () => (EMBED ? extPlaying : clock ? !clock.paused : !audio.paused);
  const songEnd = () => Math.max(0, ...lines.map((l) => l.end || 0)) + 1;

  function loop() {
    if (!song) return requestAnimationFrame(loop);
    // đang mở thư (nhạc chưa phát) -> chưa hiện lời, tránh chữ "EM" hiện trước
    const t = opening ? -1 : now();
    render(t, isPlaying());
    if (clock && !clock.paused && t > songEnd()) finish();
    requestAnimationFrame(loop);
  }

  function finish() {
    clock = null;
    curLine = -2; buildLine(-1);
    startBtn.classList.remove('open', 'hide');
  }

  // Bấm lá thư: thư mở xong -> màn mờ hết -> rồi mới phát nhạc (không mất đoạn đầu)
  const OPEN_MS = 1500;  // nắp lật + thư nhô lên + tim bay (khớp transition trong style.css)
  const FADE_MS = 600;   // màn lá thư mờ đi (#start transition .6s)
  let opening = false;
  startBtn.addEventListener('click', () => {
    if (opening) return;
    opening = true;
    // mở khoá âm thanh ngay trong cú chạm, tắt tiếng (iOS chỉ cho play() lúc đang chạm)
    audio.muted = true;
    const unlock = audio.play();
    unlock?.then(() => audio.pause()).catch(() => {});
    startBtn.classList.add('open');
    setTimeout(() => startBtn.classList.add('hide'), OPEN_MS);
    setTimeout(async () => {
      try { await unlock; } catch {}
      audio.pause();
      audio.muted = false;
      audio.currentTime = song.start || 0;
      audio.play().catch(() => {
        // không có music/song.mp3 -> chạy không nhạc
        clock = { t0: performance.now() - (song.start || 0) * 1000, paused: false };
        $('nomusic').hidden = false;
      });
      opening = false;
    }, OPEN_MS + FADE_MS);
  });
  $('stage').addEventListener('click', () => {
    if (!startBtn.classList.contains('hide') || EMBED) return;
    if (clock) {
      if (clock.paused) { clock.t0 = performance.now() - clock.at * 1000; clock.paused = false; }
      else { clock.at = clockT(); clock.paused = true; }
      return;
    }
    audio.paused ? audio.play() : audio.pause();
  });
  audio.addEventListener('ended', finish);

  // ---------- Khởi động ----------
  if (EMBED) {
    startBtn.remove();
    addEventListener('message', (e) => {
      const d = e.data || {};
      if (d.type === 'song') load(d.song);
      if (d.type === 'time') { extT = d.t; extPlaying = d.playing; }
    });
    parent.postMessage({ type: 'ready' }, '*');
  } else {
    load(window.SONG);
    if (FIXED != null) { startBtn.style.transition = 'none'; startBtn.classList.add('hide'); }
  }
  requestAnimationFrame(loop);
})();
