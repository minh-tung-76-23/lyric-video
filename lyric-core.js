// Phần dùng chung cho index.html (trang chạy) và editor.html (công cụ canh giờ).
//
// Cú pháp lời (mỗi dòng 1 câu):
//   [kiểu chế-độ cờ]  chữ chữ chữ{đánh-dấu} ...
// Kiểu câu:  white (mặc định) | red | pink | blue | bluebig | bluehand | redhand
// Chế độ:    add (mặc định, hiện dồn từng từ) | one (chỉ hiện từ đang hát) | all (hiện cả câu 1 lần)
// Cờ:        bigone  = chữ to phía sau thay nhau (mặc định là dồn)
//            bighold = chữ to tắt sau ~0.4s thay vì ở tới hết câu
//            hl      = từ đang hát tô đỏ, từ cũ trở lại trắng
//            hide    = ẩn dòng chữ nhỏ (chỉ còn chữ to / chữ chớp)
// Đánh dấu từ:
//   {red} {pink} {blue} {yellow}            tô màu 1 từ trong câu
//   {big} {big-red} {big-crimson} {big-yellow} {big-pink}   chữ ký to phía sau
//   {flash-pink} {flash-red}                chữ IN HOA to chớp 0.2s, che dòng chữ
// Dòng bắt đầu bằng # là ghi chú.
window.LyricCore = (() => {
  const STYLES = ['white', 'red', 'pink', 'blue', 'bluebig', 'bluehand', 'redhand'];
  const MODES = ['add', 'one', 'all'];
  const FLAGS = ['hide', 'hl', 'bighold'];

  function parse(source) {
    const lines = [];
    for (const raw of (source || '').split('\n')) {
      let s = raw.trim();
      if (!s || s.startsWith('#')) continue;
      const ln = { style: 'white', mode: 'add', bigmode: 'add', hide: false, hl: false, bighold: false };
      const m = s.match(/^\[([^\]]*)\]\s*/);
      if (m) {
        for (const o of m[1].toLowerCase().split(/[\s,]+/)) {
          if (STYLES.includes(o)) ln.style = o;
          else if (MODES.includes(o)) ln.mode = o;
          else if (FLAGS.includes(o)) ln[o] = true;
          else if (o === 'bigone') ln.bigmode = 'one';
        }
        s = s.slice(m[0].length);
      }
      ln.words = s.split(/\s+/).filter(Boolean).map((tok) => {
        const mm = tok.match(/^(.*?)\{([^}]*)\}$/);
        return mm ? { text: mm[1], mark: mm[2].trim().toLowerCase() } : { text: tok, mark: '' };
      });
      ln.raw = raw.trim();
      if (ln.words.length) lines.push(ln);
    }
    return lines;
  }

  // Số lần gõ phím cần cho 1 câu: câu "all" chỉ cần 1 lần
  const tapsNeeded = (ln) => (ln.mode === 'all' ? 1 : ln.words.length);

  // Ghép lời + mốc thời gian -> danh sách câu có thời gian
  function build(song) {
    const lines = parse(song.source);
    const taps = song.taps || [], ends = song.ends || {};
    let k = 0;
    for (const ln of lines) {
      ln.words.forEach((w, j) => {
        const v = taps[k + (ln.mode === 'all' ? 0 : j)];
        w.t = typeof v === 'number' ? v : null;
      });
      k += tapsNeeded(ln);
      ln.start = ln.words[0].t;
    }
    lines.forEach((ln, i) => {
      if (ln.start == null) { ln.end = null; return; }
      const e = ends[i];
      const next = lines.slice(i + 1).find((l) => l.start != null);
      const lastWord = Math.max(...ln.words.map((w) => w.t ?? ln.start));
      ln.end = typeof e === 'number' && e > ln.start ? e : next ? next.start : lastWord + 2.5;
    });
    return lines;
  }

  const plain = (w) => w.normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/đ/g, 'd').replace(/Đ/g, 'D').toLowerCase();

  return { parse, build, tapsNeeded, plain, STYLES, MODES, FLAGS };
})();
