// Nền "đi bộ đường đêm" vẽ bằng canvas - dùng khi chưa có clip trong clips/.
// Mỗi cảnh giống 1 đoạn trong video: rừng tuyết, chạng vạng xanh, đèn đường cam, phố tối,
// khu nhà xám, công viên tuyết, chĩa máy xuống đất, tán cây. Vẽ theo thời gian t nên tua (?t=12) vẫn đúng.
window.NightScene = (() => {
  const KINDS = {
    snowforest: { sky: ['#202a24', '#0d120f'], fog: '#2a352e', ground: '#4a504a', road: '#1a1e1b', lamp: '#ffd27a', lampEvery: 22, trees: 1.2, tree: '#0c110e', snow: true, speed: 1.6 },
    dusk:       { sky: ['#4b5b80', '#171d2e'], fog: '#33405e', ground: '#5a5f68', road: '#2a2d34', lamp: '#fff6e0', lampEvery: 20, trees: .5, tree: '#0a0d14', houses: true, speed: 1.4 },
    sodium:     { sky: ['#1c1820', '#0c0a0e'], fog: '#3b2815', ground: '#2c1e12', road: '#463220', lamp: '#ffb347', lampEvery: 15, buildings: 1, lines: '#e0aa3c', speed: 1.7 },
    dark:       { sky: ['#0c0d11', '#050506'], fog: '#17181c', ground: '#121317', road: '#1a1b20', lamp: '#fff7ea', lampEvery: 17, cars: '#0b0c0f', buildings: -1, speed: 1.4 },
    suburb:     { sky: ['#565b66', '#22252c'], fog: '#5e636e', ground: '#33363b', road: '#3d4045', lamp: '#ffffff', lampEvery: 24, cars: '#b8bcc4', houses: true, trees: .6, tree: '#15171c', speed: 1.3 },
    park:       { sky: ['#15171d', '#08090c'], fog: '#1e2027', ground: '#4a4c52', road: '#2e3036', lamp: '#e8ecff', lampEvery: 26, trees: 1.4, birch: true, buildings: 1, snow: true, speed: 1.2 },
    ground:     { sky: ['#15161d', '#0b0b10'], fog: '#15161d', ground: '#24252e', road: '#2a2b35', lamp: '#c8ccff', lampEvery: 40, pitch: -.6, speed: .9 },
    trees:      { sky: ['#0d100c', '#050605'], fog: '#161b13', ground: '#1a1c13', road: '#22241b', lamp: '#ffe9a8', lampEvery: 13, trees: 1.8, tree: '#070906', foliage: true, speed: 1.5 },
  };
  const FAR = 90;

  // ---------- màu ----------
  const rgb = (h) => { const n = parseInt(h.slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; };
  const mix = (a, b, k) => { const A = rgb(a), B = rgb(b); return `rgb(${A.map((v, i) => Math.round(v + (B[i] - v) * k)).join(',')})`; };
  const ramp = (stops, x) => {   // stops: [[vị-trí, '#màu'], ...]
    if (x <= stops[0][0]) return mix(stops[0][1], stops[0][1], 0);
    for (let i = 1; i < stops.length; i++) if (x <= stops[i][0]) {
      const [p0, c0] = stops[i - 1], [p1, c1] = stops[i];
      return mix(c0, c1, (x - p0) / (p1 - p0));
    }
    return mix(stops[stops.length - 1][1], stops[stops.length - 1][1], 0);
  };
  const lerpPts = (pts, x) => {
    if (x <= pts[0][0]) return pts[0][1];
    for (let i = 1; i < pts.length; i++) if (x <= pts[i][0]) {
      const [x0, y0] = pts[i - 1], [x1, y1] = pts[i];
      return y0 + (y1 - y0) * ((x - x0) / (x1 - x0));
    }
    return pts[pts.length - 1][1];
  };
  function glowAt(ctx, x, y, r, color, alpha) {
    if (r < 0.5 || alpha <= 0) return;
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = Math.min(1, alpha);
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, color); g.addColorStop(0.2, color); g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g; ctx.fillRect(x - r, y - r, r * 2, r * 2);
    ctx.restore();
  }
  function skyFill(ctx, W, H, top, bottom, to = H) {
    const g = ctx.createLinearGradient(0, 0, 0, to);
    g.addColorStop(0, top); g.addColorStop(1, bottom);
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  }

  // ---------- Nhân vật: "anh" và "em", mặt thay bằng ảnh (song.js -> "faces") ----------
  const FACES = { anh: null, em: null };
  function setFaces(map) {
    ['anh', 'em'].forEach((k) => {
      FACES[k] = null;
      const src = map && map[k];
      if (!src) return;
      const base = src.replace(/\.(jpe?g|png|webp)$/i, '');
      const tries = [src, base + '.jpg', base + '.jpeg', base + '.png', base + '.webp'].filter((v, i, a) => a.indexOf(v) === i);
      const next = (i) => {
        if (i >= tries.length) return;
        const img = new Image();
        img.onload = () => {
          // ảnh PNG nền trong suốt (vd đầu chibi có tóc) -> vẽ nguyên cả đầu, không cắt tròn
          let full = false;
          try {
            const c = document.createElement('canvas'); c.width = c.height = 16;
            const cx = c.getContext('2d'); cx.drawImage(img, 0, 0, 16, 16);
            full = cx.getImageData(0, 0, 1, 1).data[3] < 10 && cx.getImageData(15, 0, 1, 1).data[3] < 10;
          } catch {}
          img.full = full;
          FACES[k] = img;
        };
        img.onerror = () => next(i + 1);
        img.src = tries[i];
      };
      next(0);
    });
  }
  // Nhân vật kiểu chibi: đầu to, thân ngắn tròn, tay chân mũm mĩm, viền nét kiểu anime.
  // chin = cằm nằm ở bao nhiêu phần chiều cao ảnh đầu chibi (em tóc dài xuống dưới cằm nên nhỏ hơn)
  const LOOK = {
    anh: { skin: '#f7d6c0', hair: '#3a2a24', long: false, top: '#46679b', top2: '#34507c', pants: '#2c3040', shoe: '#5a3c2e', coat: '#f6cc4e', coat2: '#dcaa2c', helmet: '#9fd0ff', helmet2: '#5f8fc4', deco: 'bear', chin: 0.97 },
    em:  { skin: '#f9dfcf', hair: '#3a2620', long: true, top: '#f6aec2', top2: '#e48aa6', pants: '#f9dfcf', shoe: '#9a4e62', dress: true, bow: '#e0405e', coat: '#f7a3be', coat2: '#e07a9c', helmet: '#ffb6d0', helmet2: '#d9779c', deco: 'cat', chin: 0.86 },
  };
  const INK = '#4a3232';
  const ln = (ctx, x1, y1, x2, y2) => { ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke(); };
  const rrect = (ctx, x, y, w, h, r) => { ctx.beginPath(); ctx.roundRect ? ctx.roundRect(x, y, w, h, r) : ctx.rect(x, y, w, h); ctx.fill(); };
  const ink = (ctx, w) => { ctx.strokeStyle = INK; ctx.lineWidth = w; ctx.stroke(); };
  // tay / chân dạng viên nhộng có viền
  function limb(ctx, pts, color, w, lw) {
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    const path = () => { ctx.beginPath(); pts.forEach(([px, py], i) => (i ? ctx.lineTo(px, py) : ctx.moveTo(px, py))); };
    path(); ctx.strokeStyle = INK; ctx.lineWidth = w + lw * 2; ctx.stroke();
    path(); ctx.strokeStyle = color; ctx.lineWidth = w; ctx.stroke();
  }
  function dot(ctx, x, y, r, color, lw) {
    ctx.fillStyle = color; ctx.beginPath(); ctx.arc(x, y, r, 0, 7); ctx.fill(); if (lw) ink(ctx, lw);
  }

  // đầu: chinY = vị trí cằm, size = bề ngang đầu
  function head(ctx, x, chinY, size, who, hood) {
    const L = LOOK[who], img = FACES[who], lw = Math.max(1, size * 0.025);
    if (hood) {   // mũ áo mưa nằm sau đầu
      ctx.fillStyle = hood; ctx.beginPath(); ctx.arc(x, chinY - size * 0.46, size * 0.56, 0, 7); ctx.fill(); ink(ctx, lw);
    }
    if (img && img.full) {   // ảnh đầu chibi có tóc, nền trong suốt
      ctx.drawImage(img, x - size / 2, chinY - size * (L.chin || 0.95), size, size);
      return;
    }
    const r = size * 0.4, cy = chinY - r;
    if (!img && L.long && !hood) {   // 2 lọn tóc dài hai bên
      ctx.fillStyle = L.hair; ctx.beginPath();
      ctx.ellipse(x - r * 0.85, cy + r * 0.7, r * 0.45, r * 1.05, 0.1, 0, 7);
      ctx.ellipse(x + r * 0.85, cy + r * 0.7, r * 0.45, r * 1.05, -0.1, 0, 7);
      ctx.fill();
    }
    ctx.save(); ctx.beginPath(); ctx.arc(x, cy, r, 0, 7);
    if (img) {   // ảnh mặt thường: cắt tròn phần giữa ảnh
      ctx.clip();
      const s = Math.max((2 * r) / img.width, (2 * r) / img.height);
      ctx.drawImage(img, x - (img.width * s) / 2, cy - (img.height * s) / 2, img.width * s, img.height * s);
    } else { ctx.fillStyle = L.skin; ctx.fill(); }
    ctx.restore();
    ctx.beginPath(); ctx.arc(x, cy, r, 0, 7); ink(ctx, lw);
    if (img) return;
    if (!hood) {   // mái tóc
      ctx.fillStyle = L.hair; ctx.beginPath();
      ctx.arc(x, cy, r * 1.06, Math.PI * 0.95, Math.PI * 2.05);
      ctx.lineTo(x + r * 0.9, cy - r * 0.1);
      ctx.quadraticCurveTo(x, cy - r * 0.6, x - r * 0.9, cy - r * 0.1);
      ctx.closePath(); ctx.fill(); ink(ctx, lw);
    }
    // mắt to long lanh + má hồng + miệng
    [-1, 1].forEach((s) => {
      ctx.fillStyle = '#3a2622'; ctx.beginPath(); ctx.ellipse(x + s * r * 0.38, cy + r * 0.15, r * 0.13, r * 0.18, 0, 0, 7); ctx.fill();
      dot(ctx, x + s * r * 0.38 - r * 0.04, cy + r * 0.08, r * 0.05, '#fff');
      ctx.fillStyle = '#ff9fb1aa'; ctx.beginPath(); ctx.ellipse(x + s * r * 0.62, cy + r * 0.45, r * 0.17, r * 0.09, 0, 0, 7); ctx.fill();
    });
    ctx.strokeStyle = '#8a4040'; ctx.lineWidth = lw;
    ctx.beginPath(); ctx.arc(x, cy + r * 0.42, r * 0.13, 0.15 * Math.PI, 0.85 * Math.PI); ctx.stroke();
  }

  function bouquet(ctx, x, y, s) {
    const lw = Math.max(1, s * 0.05);
    ctx.fillStyle = '#6fae5a';
    [[-0.55, -0.55], [0.6, -0.5], [0, -0.95]].forEach(([dx, dy]) => { ctx.beginPath(); ctx.ellipse(x + dx * s, y + dy * s, s * 0.26, s * 0.13, dx, 0, 7); ctx.fill(); });
    [['#ff5a78', -0.32, -0.72], ['#ffb3c8', 0.32, -0.78], ['#fff3f6', 0, -1.05], ['#ff5a78', 0.16, -0.48], ['#ffb3c8', -0.2, -0.42]].forEach(([c, dx, dy]) => {
      dot(ctx, x + dx * s, y + dy * s, s * 0.25, c, lw);
      dot(ctx, x + dx * s, y + dy * s, s * 0.08, '#ffffffaa');
    });
    ctx.fillStyle = '#f1dfbd'; ctx.beginPath();   // giấy gói
    ctx.moveTo(x - s * 0.6, y - s * 0.45); ctx.lineTo(x + s * 0.6, y - s * 0.45); ctx.lineTo(x, y + s * 0.75); ctx.closePath(); ctx.fill(); ink(ctx, lw);
    dot(ctx, x, y + s * 0.02, s * 0.12, '#e0405e', lw);   // nơ
  }

  // thân trên: áo khoác (anh) / váy (em) / áo mưa; trả về vị trí vai
  function torso(ctx, x, sh, bottom, h, L, coat, lw) {
    if (coat) {        // áo mưa trùm, xoè dưới
      ctx.fillStyle = coat; ctx.beginPath();
      ctx.moveTo(x - h * 0.1, sh);
      ctx.quadraticCurveTo(x - h * 0.16, bottom - h * 0.1, x - h * 0.21, bottom);
      ctx.quadraticCurveTo(x, bottom + h * 0.035, x + h * 0.21, bottom);
      ctx.quadraticCurveTo(x + h * 0.16, bottom - h * 0.1, x + h * 0.1, sh);
      ctx.closePath(); ctx.fill(); ink(ctx, lw);
      [0.08, 0.16].forEach((k) => dot(ctx, x, sh + h * k, h * 0.014, L.coat2));
      ctx.strokeStyle = '#ffffff70'; ctx.lineWidth = h * 0.014;
      ln(ctx, x - h * 0.05, sh + h * 0.05, x - h * 0.1, bottom - h * 0.04);   // vệt bóng nước
    } else if (L.dress) {   // váy xoè có cổ trắng + nơ
      ctx.fillStyle = L.top; ctx.beginPath();
      ctx.moveTo(x - h * 0.09, sh); ctx.lineTo(x + h * 0.09, sh);
      ctx.lineTo(x + h * 0.1, sh + h * 0.12);
      ctx.quadraticCurveTo(x + h * 0.2, bottom - h * 0.02, x + h * 0.19, bottom);
      for (let k = 4; k >= 0; k--) ctx.quadraticCurveTo(x - h * 0.19 + (k + 0.5) * h * 0.076, bottom + h * 0.03, x - h * 0.19 + k * h * 0.076, bottom);
      ctx.quadraticCurveTo(x - h * 0.2, bottom - h * 0.02, x - h * 0.1, sh + h * 0.12);
      ctx.closePath(); ctx.fill(); ink(ctx, lw);
      ctx.fillStyle = L.top2; ctx.fillRect(x - h * 0.1, sh + h * 0.11, h * 0.2, h * 0.02);   // eo
      ctx.fillStyle = '#fff'; ctx.beginPath();
      ctx.ellipse(x - h * 0.035, sh + h * 0.012, h * 0.045, h * 0.025, 0.4, 0, 7);
      ctx.ellipse(x + h * 0.035, sh + h * 0.012, h * 0.045, h * 0.025, -0.4, 0, 7); ctx.fill(); ink(ctx, lw * 0.8);
      dot(ctx, x - h * 0.02, sh + h * 0.035, h * 0.018, L.bow); dot(ctx, x + h * 0.02, sh + h * 0.035, h * 0.018, L.bow);
    } else {           // áo khoác có cổ áo phông trắng
      ctx.fillStyle = L.top; rrect(ctx, x - h * 0.12, sh, h * 0.24, bottom - sh, h * 0.06); ink(ctx, lw);
      ctx.fillStyle = '#fff'; ctx.beginPath();
      ctx.moveTo(x - h * 0.045, sh); ctx.lineTo(x + h * 0.045, sh); ctx.lineTo(x, sh + h * 0.07); ctx.closePath(); ctx.fill();
      ctx.strokeStyle = L.top2; ctx.lineWidth = lw; ln(ctx, x, sh + h * 0.07, x, bottom - h * 0.01);
    }
  }

  // người đứng: y = chân, h = chiều cao, o.dir = hướng (1 phải, -1 trái), o.arm = 'down'|'flowers'|'hold'|'umbrella', o.coat = áo mưa
  // trả về vị trí bàn tay phía trước (để cầm ô)
  function standing(ctx, x, y, h, who, o = {}) {
    const L = LOOK[who], dir = o.dir || 1, coat = o.coat ? L.coat : null, lw = Math.max(1, h * 0.011);
    const chin = y - h * 0.5, sh = chin + h * 0.025, hip = y - h * 0.19, size = h * 0.5;
    ctx.save();
    [-1, 1].forEach((s) => {   // chân ngắn + giày tròn
      ctx.fillStyle = coat ? '#3a3f50' : L.pants;
      rrect(ctx, x + s * h * 0.055 - h * 0.036, hip - h * 0.03, h * 0.072, h * 0.21, h * 0.034); ink(ctx, lw);
      ctx.fillStyle = L.shoe; ctx.beginPath(); ctx.ellipse(x + s * h * 0.062, y - h * 0.014, h * 0.052, h * 0.027, 0, 0, 7); ctx.fill(); ink(ctx, lw);
    });
    const armC = coat || L.top, aw = h * 0.07;
    // tay sau
    limb(ctx, [[x - dir * h * 0.1, sh + h * 0.04], [x - dir * h * 0.14, hip - h * 0.04]], armC, aw, lw);
    torso(ctx, x, sh, coat ? y - h * 0.1 : L.dress ? y - h * 0.17 : hip + h * 0.02, h, L, coat, lw);
    dot(ctx, x - dir * h * 0.14, hip - h * 0.04, h * 0.036, L.skin, lw);
    // tay trước
    let hand;
    if (o.arm === 'flowers') hand = [x + dir * h * 0.19, sh + h * 0.12];
    else if (o.arm === 'umbrella') hand = [x + dir * h * 0.15, sh - h * 0.05];
    else if (o.arm === 'hold') hand = [x + dir * h * 0.18, hip - h * 0.05];
    else hand = [x + dir * h * 0.14, hip - h * 0.04];
    const elbow = [x + dir * h * 0.15, sh + h * 0.08];
    limb(ctx, o.arm === 'umbrella' ? [[x + dir * h * 0.1, sh + h * 0.04], elbow, hand] : [[x + dir * h * 0.1, sh + h * 0.04], hand], armC, aw, lw);
    head(ctx, x, chin + h * 0.01, size, who, coat);
    if (o.arm === 'flowers') bouquet(ctx, hand[0] + dir * h * 0.02, hand[1] - h * 0.01, h * 0.12);
    dot(ctx, hand[0], hand[1], h * 0.036, L.skin, lw);
    ctx.restore();
    return { x: hand[0], y: hand[1] };
  }

  // mũ bảo hiểm kiểu chibi: tròn bóng, màu pastel, viền trắng, tai mèo (em) / tai gấu (anh) + sticker
  function helmet(ctx, x, chinY, size, L) {
    const R = size * 0.5, cy = chinY - size * 0.57, lw = Math.max(1, size * 0.022);
    const col = L.helmet, dark = L.helmet2;
    ctx.save(); ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    // quai + khoá nhỏ dưới cằm
    ctx.strokeStyle = dark; ctx.lineWidth = Math.max(1, size * 0.024);
    ctx.beginPath();   // quai chạy dọc theo má rồi vòng dưới cằm, không chéo qua mặt
    ctx.moveTo(x - size * 0.37, cy + R * 0.15); ctx.lineTo(x - size * 0.3, chinY - size * 0.1);
    ctx.quadraticCurveTo(x - size * 0.2, chinY + size * 0.02, x, chinY + size * 0.015);
    ctx.quadraticCurveTo(x + size * 0.2, chinY + size * 0.02, x + size * 0.3, chinY - size * 0.1);
    ctx.lineTo(x + size * 0.37, cy + R * 0.15); ctx.stroke();
    ctx.fillStyle = '#fff'; rrect(ctx, x - size * 0.03, chinY - size * 0.015, size * 0.06, size * 0.04, size * 0.012); ink(ctx, lw * 0.7);
    // tai (vẽ trước để nằm sau vỏ mũ)
    [-1, 1].forEach((s) => {
      const ex = x + s * R * 0.62, ey = cy - R * 0.78;
      if (L.deco === 'cat') {
        ctx.fillStyle = col; ctx.beginPath();
        ctx.moveTo(ex - s * R * 0.3, ey + R * 0.25); ctx.lineTo(ex + s * R * 0.05, ey - R * 0.38); ctx.lineTo(ex + s * R * 0.32, ey + R * 0.12);
        ctx.closePath(); ctx.fill(); ink(ctx, lw);
        ctx.fillStyle = '#fff0f5'; ctx.beginPath();
        ctx.moveTo(ex - s * R * 0.14, ey + R * 0.12); ctx.lineTo(ex + s * R * 0.05, ey - R * 0.2); ctx.lineTo(ex + s * R * 0.18, ey + R * 0.06);
        ctx.closePath(); ctx.fill();
      } else {
        dot(ctx, ex, ey, R * 0.24, col, lw);
        dot(ctx, ex, ey, R * 0.12, '#eaf4ff');
      }
    });
    // vỏ mũ tròn bóng
    ctx.fillStyle = col; ctx.beginPath();
    ctx.arc(x, cy, R, Math.PI * 1.02, Math.PI * 1.98);
    ctx.quadraticCurveTo(x + R * 1.02, cy + R * 0.2, x + R * 0.92, cy + R * 0.22);
    ctx.quadraticCurveTo(x, cy + R * 0.08, x - R * 0.92, cy + R * 0.22);
    ctx.quadraticCurveTo(x - R * 1.02, cy + R * 0.2, x - R, cy);
    ctx.closePath(); ctx.fill(); ink(ctx, lw);
    // viền trắng mềm ở mép
    ctx.strokeStyle = '#ffffff'; ctx.lineWidth = R * 0.13;
    ctx.beginPath(); ctx.moveTo(x - R * 0.86, cy + R * 0.14); ctx.quadraticCurveTo(x, cy + R * 0.0, x + R * 0.86, cy + R * 0.14); ctx.stroke();
    // bóng sáng kiểu bong bóng
    ctx.fillStyle = '#ffffffb0'; ctx.beginPath(); ctx.ellipse(x - R * 0.42, cy - R * 0.55, R * 0.24, R * 0.12, -0.6, 0, 7); ctx.fill();
    dot(ctx, x - R * 0.12, cy - R * 0.74, R * 0.05, '#ffffffc0');
    // sticker
    const sx = x + (L.deco === 'cat' ? -0.5 : 0.45) * R, sy = cy - R * 0.38, k = R * 0.2;   // em ngồi sau: dán bên trái cho khỏi bị che
    if (L.deco === 'cat') {   // trái tim
      ctx.fillStyle = '#ff5c86'; ctx.beginPath();
      ctx.moveTo(sx, sy + k * 0.9);
      ctx.bezierCurveTo(sx - k * 1.4, sy, sx - k * 0.8, sy - k * 1.1, sx, sy - k * 0.4);
      ctx.bezierCurveTo(sx + k * 0.8, sy - k * 1.1, sx + k * 1.4, sy, sx, sy + k * 0.9);
      ctx.fill(); ink(ctx, lw * 0.7);
      dot(ctx, sx - k * 0.4, sy - k * 0.35, k * 0.18, '#ffffffcc');
    } else {                  // ngôi sao
      ctx.fillStyle = '#ffd84d'; ctx.beginPath();
      for (let i = 0; i < 10; i++) {
        const a = -Math.PI / 2 + (i * Math.PI) / 5, rr = i % 2 ? k * 0.45 : k;
        i ? ctx.lineTo(sx + Math.cos(a) * rr, sy + Math.sin(a) * rr) : ctx.moveTo(sx + Math.cos(a) * rr, sy + Math.sin(a) * rr);
      }
      ctx.closePath(); ctx.fill(); ink(ctx, lw * 0.7);
    }
    ctx.restore();
  }

  // người ngồi xe: hip = điểm ngồi, foot = chỗ để chân, reach = chỗ tay với tới
  function rider(ctx, x, hip, h, who, foot, reach) {
    const L = LOOK[who], lw = Math.max(1, h * 0.011), chin = hip - h * 0.27, sh = chin + h * 0.025;
    ctx.save();
    limb(ctx, [[x, hip - h * 0.02], [foot[0] - h * 0.02, hip + h * 0.01], [foot[0], foot[1] - h * 0.02]], L.pants === L.skin ? L.top : L.pants, h * 0.08, lw);
    ctx.fillStyle = L.shoe; ctx.beginPath(); ctx.ellipse(foot[0] + h * 0.02, foot[1], h * 0.05, h * 0.026, 0, 0, 7); ctx.fill(); ink(ctx, lw);
    ctx.fillStyle = L.top; rrect(ctx, x - h * 0.11, sh, h * 0.22, hip - sh + h * 0.02, h * 0.06); ink(ctx, lw);
    if (L.dress) { ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.ellipse(x, sh + h * 0.012, h * 0.06, h * 0.025, 0, 0, 7); ctx.fill(); }
    else { ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.moveTo(x - h * 0.04, sh); ctx.lineTo(x + h * 0.04, sh); ctx.lineTo(x, sh + h * 0.06); ctx.closePath(); ctx.fill(); }
    limb(ctx, [[x + h * 0.05, sh + h * 0.05], [(x + reach[0]) / 2, sh + h * 0.12], reach], L.top, h * 0.07, lw);
    dot(ctx, reach[0], reach[1], h * 0.034, L.skin, lw);
    head(ctx, x, chin + h * 0.01, h * 0.5, who);
    helmet(ctx, x, chin + h * 0.01, h * 0.5, L);   // đi xe phải đội mũ bảo hiểm
    ctx.restore();
  }

  // xe máy (tay ga) chạy sang phải, chở anh lái + em ngồi sau
  function motorbike(ctx, x, wy, Lb, t, night) {
    const rw = Lb * 0.16, x1 = x - Lb * 0.36, x2 = x + Lb * 0.36, seatY = wy - rw * 2.05;
    ctx.save(); ctx.lineCap = 'round';
    ctx.fillStyle = '#00000055'; ctx.beginPath(); ctx.ellipse(x, wy + rw * 0.05, Lb * 0.55, rw * 0.22, 0, 0, 7); ctx.fill();
    // đèn pha chiếu xuống đường
    if (night > 0.1) {
      const hx = x + Lb * 0.34, hy = wy - rw * 2.4;
      const g = ctx.createLinearGradient(hx, 0, hx + Lb * 1.2, 0);
      g.addColorStop(0, `rgba(255,240,200,${0.35 * night})`); g.addColorStop(1, 'rgba(255,240,200,0)');
      ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(hx, hy); ctx.lineTo(hx + Lb * 1.2, wy - rw * 0.2); ctx.lineTo(hx + Lb * 1.2, wy + rw * 0.4); ctx.closePath(); ctx.fill();
    }
    [x1, x2].forEach((wx) => {   // bánh xe quay
      ctx.fillStyle = '#0a0b0e'; ctx.beginPath(); ctx.arc(wx, wy - rw, rw, 0, 7); ctx.fill();
      ctx.fillStyle = '#6a707c'; ctx.beginPath(); ctx.arc(wx, wy - rw, rw * 0.5, 0, 7); ctx.fill();
      ctx.strokeStyle = '#2a2d34'; ctx.lineWidth = Math.max(1, rw * 0.1);
      for (let k = 0; k < 3; k++) { const a = t * 14 + (k * Math.PI) / 3; ln(ctx, wx - Math.cos(a) * rw * 0.5, wy - rw - Math.sin(a) * rw * 0.5, wx + Math.cos(a) * rw * 0.5, wy - rw + Math.sin(a) * rw * 0.5); }
    });
    // thân xe
    ctx.fillStyle = '#b8243c';
    ctx.beginPath(); ctx.ellipse(x - Lb * 0.2, wy - rw * 1.35, Lb * 0.25, rw * 0.72, 0, 0, 7); ctx.fill();
    ctx.fillStyle = '#1a1b20'; rrect(ctx, x - Lb * 0.4, seatY - rw * 0.15, Lb * 0.45, rw * 0.42, rw * 0.2);
    ctx.fillStyle = '#2a2b31'; ctx.fillRect(x - Lb * 0.05, wy - rw * 0.95, Lb * 0.28, rw * 0.3);
    ctx.fillStyle = '#ff3b3b'; ctx.beginPath(); ctx.arc(x - Lb * 0.44, wy - rw * 1.45, rw * 0.13, 0, 7); ctx.fill();
    // người ngồi: em sau, anh trước
    const hR = Lb * 0.78;
    rider(ctx, x - Lb * 0.27, seatY, hR * 0.95, 'em', [x - Lb * 0.12, wy - rw * 0.95], [x - Lb * 0.05, seatY - hR * 0.13]);
    rider(ctx, x - Lb * 0.03, seatY, hR, 'anh', [x + Lb * 0.16, wy - rw * 0.95], [x + Lb * 0.21, wy - rw * 3.15]);
    // yếm trước + phuộc + tay lái + đèn
    ctx.strokeStyle = '#1a1b20'; ctx.lineWidth = Math.max(2, rw * 0.22);
    ln(ctx, x2, wy - rw, x + Lb * 0.29, wy - rw * 3.0);
    ln(ctx, x + Lb * 0.29, wy - rw * 3.1, x + Lb * 0.2, wy - rw * 3.2);
    ctx.fillStyle = '#b8243c'; ctx.beginPath();
    ctx.moveTo(x + Lb * 0.2, wy - rw * 0.65); ctx.lineTo(x + Lb * 0.31, wy - rw * 0.65);
    ctx.lineTo(x + Lb * 0.35, wy - rw * 2.85); ctx.lineTo(x + Lb * 0.24, wy - rw * 2.7); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#fff6d8'; ctx.beginPath(); ctx.arc(x + Lb * 0.34, wy - rw * 2.4, rw * 0.2, 0, 7); ctx.fill();
    ctx.restore();
    glowAt(ctx, x + Lb * 0.34, wy - rw * 2.4, rw * (1.2 + 2.5 * night), '#fff1c8', 0.5 + 0.4 * night);
  }

  // ---------- Các đoạn hoạt hình riêng (dùng trong "clips": { "scene": "..." }) ----------
  const SPECIAL = {
    // "một ngày hai mươi tư tiếng trôi mau": ngày-đêm quay vòng, mây chạy, phố lên đèn, vệt đèn xe
    timelapse(ctx, W, H, t, since, len) {
      const p = (since / Math.max(1.2, len) + 0.2) % 1;   // 1 vòng ngày-đêm trong cả đoạn
      const sunH = Math.sin(p * Math.PI * 2);
      const night = Math.max(0, Math.min(1, -sunH * 2.5 + 0.2));
      skyFill(ctx, W, H,
        ramp([[-1, '#04061a'], [-0.2, '#0b1238'], [0.02, '#40306a'], [0.25, '#3c74c4'], [1, '#2a7ad8']], sunH),
        ramp([[-1, '#0a0f26'], [-0.2, '#22204a'], [0.02, '#f3925f'], [0.3, '#a6d0f2'], [1, '#c4e4ff']], sunH), H * 0.8);
      // sao
      ctx.fillStyle = '#fff';
      for (let i = 0; i < 140; i++) {
        ctx.globalAlpha = night * (0.3 + 0.7 * hash(i, 2)) * (0.6 + 0.4 * Math.sin(t * 6 + i));
        ctx.fillRect(hash(i, 1) * W, hash(i, 3) * H * 0.7, 1.4, 1.4);
      }
      ctx.globalAlpha = 1;
      // mặt trời + mặt trăng quay quanh
      const cx = W / 2, cy = H * 0.8, R = Math.max(W, H) * 0.5, a = Math.PI + p * Math.PI * 2;
      const sx = cx + R * Math.cos(a), sy = cy + R * Math.sin(a);
      glowAt(ctx, sx, sy, W * 0.16, sunH < 0.25 ? '#ffb070' : '#fff1c2', 0.75);
      ctx.fillStyle = '#fff6dc'; ctx.beginPath(); ctx.arc(sx, sy, W * 0.03, 0, 7); ctx.fill();
      const mx = cx - R * Math.cos(a), my = cy - R * Math.sin(a);
      glowAt(ctx, mx, my, W * 0.08, '#cfd8ff', 0.35 * night);
      ctx.fillStyle = '#f1efe4'; ctx.beginPath(); ctx.arc(mx, my, W * 0.022, 0, 7); ctx.fill();
      ctx.fillStyle = ramp([[-1, '#0b1238'], [1, '#2a7ad8']], sunH);
      ctx.beginPath(); ctx.arc(mx + W * 0.009, my - W * 0.007, W * 0.019, 0, 7); ctx.fill();
      // mây chạy nhanh
      const cloud = ramp([[-1, '#1a1f3a'], [0, '#f2a27c'], [0.3, '#ffffff'], [1, '#ffffff']], sunH);
      ctx.fillStyle = cloud;
      for (let i = 0; i < 7; i++) {
        const span = W * 1.6;
        const x = ((hash(i, 4) * span + since * W * (0.6 + hash(i, 5) * 0.8)) % span) - W * 0.3;
        const y = H * (0.08 + hash(i, 6) * 0.38), s = W * (0.05 + hash(i, 7) * 0.06);
        ctx.globalAlpha = 0.35 + 0.35 * (1 - night);
        for (let j = 0; j < 4; j++) { ctx.beginPath(); ctx.ellipse(x + j * s * 0.7, y + Math.sin(j * 2) * s * 0.15, s, s * 0.45, 0, 0, 7); ctx.fill(); }
      }
      ctx.globalAlpha = 1;
      // phố: nhà cao tầng, đêm thì cửa sổ bật tắt liên tục
      const ground = H * 0.8;
      const bcol = mix('#1e2738', '#05060c', night);
      let x = -W * 0.02, k = 0;
      while (x < W) {
        const bw = W * (0.045 + hash(k, 8) * 0.06), bh = H * (0.1 + hash(k, 9) * 0.3);
        ctx.fillStyle = bcol; ctx.fillRect(x, ground - bh, bw - 2, bh);
        if (night > 0.05) {
          ctx.fillStyle = '#ffd27a';
          const step = Math.max(6, W * 0.012), tick = Math.floor(since * 7);
          for (let wy = ground - bh + step; wy < ground - step; wy += step * 1.5)
            for (let wx = x + step * 0.6; wx < x + bw - step; wx += step * 1.3) {
              if (hash(wx * 0.37 + tick, wy * 0.11) > 0.45) continue;
              ctx.globalAlpha = night * 0.85;
              ctx.fillRect(wx, wy, step * 0.55, step * 0.7);
            }
          ctx.globalAlpha = 1;
        }
        x += bw; k++;
      }
      // đường + vệt đèn xe phơi sáng
      ctx.fillStyle = mix('#2b313d', '#07080c', night); ctx.fillRect(0, ground, W, H - ground);
      ctx.globalCompositeOperation = 'lighter';
      for (let i = 0; i < 18; i++) {
        const dir = i % 2 ? 1 : -1, sp = W * (1.8 + hash(i, 10) * 1.8);
        let px = ((hash(i, 11) * W * 1.6 + since * sp) % (W * 1.6)) - W * 0.3;
        if (dir < 0) px = W - px;
        const y = ground + (H - ground) * (dir > 0 ? 0.35 : 0.6) + hash(i, 12) * 4;
        const g = ctx.createLinearGradient(px - dir * W * 0.3, 0, px, 0);
        const c = dir > 0 ? '255,70,60' : '255,240,210';
        g.addColorStop(0, `rgba(${c},0)`); g.addColorStop(1, `rgba(${c},${0.25 + 0.6 * night})`);
        ctx.fillStyle = g; ctx.fillRect(Math.min(px, px - dir * W * 0.3), y, W * 0.3, Math.max(2, H * 0.005));
      }
      ctx.globalCompositeOperation = 'source-over';
      // đôi mình chở nhau chạy ngang phố
      const prog = Math.min(1, since / Math.max(1.2, len));
      const bx = W * (0.1 + 0.6 * prog), bwy = ground + (H - ground) * 0.82 + Math.sin(t * 18) * H * 0.002;
      ctx.filter = `brightness(${1 - night * 0.35})`;
      motorbike(ctx, bx, bwy, Math.min(W * 0.24, H * 0.32), t, night);
      ctx.filter = 'none';
    },

    // "dù rạng đông sang, xuân tan, hạ đơn lá thu vàng": bình minh -> xuân (hoa rơi) -> hạ -> thu (lá vàng)
    seasons(ctx, W, H, t, since, len) {
      const s = since * (5.4 / Math.max(1, len));       // chuẩn hoá theo đoạn 5.4s trong bài
      const v = lerpPts([[0, 0], [1.9, 1], [2.6, 1], [3.4, 2], [4.2, 2], [4.6, 3], [99, 3]], s);
      skyFill(ctx, W, H,
        ramp([[0, '#151838'], [0.5, '#3d3a78'], [1, '#9cc6ee'], [2, '#3d8ee0'], [3, '#b8603a']], v),
        ramp([[0, '#2a2550'], [0.5, '#ff9a6b'], [1, '#fbd5df'], [2, '#c2e7ff'], [3, '#f7c27a']], v), H * 0.75);
      // sao lúc còn tối
      ctx.fillStyle = '#fff';
      for (let i = 0; i < 90; i++) { ctx.globalAlpha = Math.max(0, 1 - v * 1.6) * hash(i, 2); ctx.fillRect(hash(i, 1) * W, hash(i, 3) * H * 0.6, 1.4, 1.4); }
      ctx.globalAlpha = 1;
      // mặt trời mọc lên rồi hạ thấp lúc thu
      const sunY = H * lerpPts([[0, 0.8], [1, 0.42], [2, 0.18], [3, 0.4]], v), sunX = W * lerpPts([[0, 0.3], [2, 0.5], [3, 0.7]], v);
      glowAt(ctx, sunX, sunY, W * 0.22, ramp([[0, '#ff8a4a'], [1, '#ffd9a0'], [2, '#fff6d8'], [3, '#ffb35a']], v), 0.8);
      ctx.fillStyle = '#fff4d6'; ctx.beginPath(); ctx.arc(sunX, sunY, W * 0.035, 0, 7); ctx.fill();
      // đồi 2 lớp
      const hill = (base, amp, freq, color, ph) => {
        ctx.fillStyle = color; ctx.beginPath(); ctx.moveTo(0, H);
        for (let x = 0; x <= W; x += W / 40) ctx.lineTo(x, H * base - Math.sin(x / W * freq + ph) * H * amp);
        ctx.lineTo(W, H); ctx.fill();
      };
      hill(0.74, 0.05, 5, ramp([[0, '#14162a'], [1, '#8bb48a'], [2, '#4e9a52'], [3, '#b5793e']], v), 0.5);
      const lit = `brightness(${0.45 + 0.55 * Math.min(1, v)})`;
      // anh cầm bó hoa trên đỉnh đồi
      const ax = W * 0.2, ay = H * 0.74 - Math.sin((ax / W) * 5 + 0.5) * H * 0.05;
      ctx.filter = lit; standing(ctx, ax, ay, H * 0.15, 'anh', { dir: 1, arm: 'flowers' }); ctx.filter = 'none';
      hill(0.84, 0.04, 7, ramp([[0, '#0c0e1c'], [1, '#6a9c66'], [2, '#2f7d3b'], [3, '#94572a']], v), 2);
      // cây bên phải
      const tx = W * 0.8, ty = H * 0.84;
      ctx.strokeStyle = '#3a2618'; ctx.lineWidth = W * 0.014; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(tx, ty); ctx.lineTo(tx, ty - H * 0.3);
      ctx.moveTo(tx, ty - H * 0.18); ctx.lineTo(tx - W * 0.07, ty - H * 0.32);
      ctx.moveTo(tx, ty - H * 0.22); ctx.lineTo(tx + W * 0.06, ty - H * 0.34); ctx.stroke();
      const leaf = ramp([[0, '#1a1c2a'], [1, '#f6b8cc'], [2, '#2e7a36'], [3, '#e07b2c']], v);
      ctx.fillStyle = leaf;
      [[0, -0.36, 0.1], [-0.07, -0.33, 0.07], [0.07, -0.35, 0.075], [-0.03, -0.42, 0.07], [0.04, -0.28, 0.06]].forEach(([dx, dy, r]) => {
        ctx.beginPath(); ctx.arc(tx + dx * W, ty + dy * H, r * W, 0, 7); ctx.fill();
      });
      // em đứng dưới gốc cây, nhìn về phía anh
      const ex = W * 0.72, ey = H * 0.84 - Math.sin((ex / W) * 7 + 2) * H * 0.04 + H * 0.01;
      ctx.filter = lit; standing(ctx, ex, ey, H * 0.22, 'em', { dir: -1 }); ctx.filter = 'none';
      // hạt rơi: cánh hoa (xuân) / đom đóm (hạ) / lá vàng (thu)
      const wSpring = Math.max(0, 1 - Math.abs(v - 1) * 1.4), wSummer = Math.max(0, 1 - Math.abs(v - 2) * 1.4), wFall = Math.max(0, Math.min(1, (v - 2.3) * 1.5));
      for (let i = 0; i < 80; i++) {
        const sp = 0.4 + hash(i, 5);
        const x = ((hash(i, 1) * W * 1.2 + since * W * 0.12 * sp + Math.sin(t * 1.5 + i) * W * 0.03) % (W * 1.2)) - W * 0.1;
        const y = (hash(i, 2) * H + since * H * 0.18 * sp) % H;
        const rot = t * (1 + hash(i, 6)) + i;
        if (wSpring > 0.02) { ctx.globalAlpha = wSpring * 0.85; ctx.fillStyle = '#ffc2d4'; ctx.beginPath(); ctx.ellipse(x, y, W * 0.007, W * 0.004, rot, 0, 7); ctx.fill(); }
        if (wFall > 0.02) { ctx.globalAlpha = wFall * 0.9; ctx.fillStyle = i % 3 ? '#e8892c' : '#c9541f'; ctx.beginPath(); ctx.ellipse(x, y, W * 0.01, W * 0.005, rot, 0, 7); ctx.fill(); }
        if (wSummer > 0.02 && i < 40) glowAt(ctx, (hash(i, 7) * W + Math.sin(t + i) * 20), H * (0.55 + hash(i, 8) * 0.35) + Math.cos(t * 1.3 + i) * 10, W * 0.012, '#fff3a0', wSummer * (0.5 + 0.5 * Math.sin(t * 5 + i)));
      }
      ctx.globalAlpha = 1;
    },

    // "dù cho lắm bão giông kéo đến": mưa xiên, mây đen, sấm chớp
    storm(ctx, W, H, t, since) {
      skyFill(ctx, W, H, '#0b0f17', '#1c2331');
      // mây đen trôi
      ctx.fillStyle = '#05070b';
      for (let i = 0; i < 9; i++) {
        const x = ((hash(i, 1) * W * 1.4 + since * W * 0.08) % (W * 1.4)) - W * 0.2, y = H * (0.02 + hash(i, 2) * 0.2), s = W * (0.12 + hash(i, 3) * 0.1);
        ctx.globalAlpha = 0.7; ctx.beginPath(); ctx.ellipse(x, y, s, s * 0.4, 0, 0, 7); ctx.fill();
      }
      ctx.globalAlpha = 1;
      // chớp
      const strikes = [0.5, 1.25, 1.45, 2.1];
      let flash = 0, bolt = -1;
      strikes.forEach((ti, k) => { if (since >= ti) { flash = Math.max(flash, Math.exp(-(since - ti) * 10)); if (since - ti < 0.12) bolt = k; } });
      if (bolt >= 0) {
        ctx.strokeStyle = '#eef3ff'; ctx.lineWidth = Math.max(2, W * 0.003); ctx.shadowColor = '#9fb8ff'; ctx.shadowBlur = 20;
        let bx = W * (0.2 + hash(bolt, 9) * 0.6), by = 0;
        ctx.beginPath(); ctx.moveTo(bx, by);
        for (let j = 0; j < 9; j++) { bx += (hash(bolt, j) - 0.5) * W * 0.08; by += H * 0.08; ctx.lineTo(bx, by); }
        ctx.stroke(); ctx.shadowBlur = 0;
      }
      // đèn đường trong mưa
      const lx = W * 0.22, ly = H * 0.38;
      ctx.strokeStyle = '#05070b'; ctx.lineWidth = W * 0.008;
      ctx.beginPath(); ctx.moveTo(lx, H); ctx.lineTo(lx, ly); ctx.lineTo(lx + W * 0.04, ly); ctx.stroke();
      glowAt(ctx, lx + W * 0.04, ly + 4, W * 0.18, '#ffd49a', 0.45);
      // mặt đất ướt phản chiếu
      ctx.fillStyle = '#0a0d14'; ctx.fillRect(0, H * 0.82, W, H * 0.18);
      glowAt(ctx, lx + W * 0.04, H * 0.9, W * 0.12, '#ffd49a', 0.15);
      // hai người mặc áo mưa đứng dưới đèn, anh cầm ô che cho em
      const ph = H * 0.3, p1 = lx + W * 0.06, feet = H * 0.89;
      const lit = `brightness(${0.8 + flash * 0.6})`;
      ctx.filter = lit;
      const handA = standing(ctx, p1, feet, ph, 'anh', { dir: 1, arm: 'umbrella', coat: true });
      standing(ctx, p1 + ph * 0.4, feet, ph * 0.93, 'em', { dir: -1, arm: 'hold', coat: true });
      ctx.filter = 'none';
      glowAt(ctx, lx + W * 0.06, H * 0.6, W * 0.12, '#ffd49a', 0.12);
      // vị trí ô: tay anh -> tán ô nghiêng sang em
      const handX = handA.x, handY = handA.y;
      const ux = p1 + ph * 0.26, uy = feet - ph * 1.08, ur = ph * 0.38, tilt = 0.16;
      // mưa xiên
      ctx.strokeStyle = '#a9bddb'; ctx.lineWidth = Math.max(1, W / 900);
      for (let i = 0; i < 260; i++) {
        const sp = 0.7 + hash(i, 4) * 0.6, L = H * 0.05 * sp;
        const y = (hash(i, 5) * H * 1.2 + since * H * 2.4 * sp) % (H * 1.2) - H * 0.1;
        const x = (hash(i, 6) * W * 1.2 + y * 0.25) % (W * 1.2) - W * 0.1;
        if (x > ux - ur * 1.05 && x < ux + ur * 1.1 && y > uy - ur * 0.6 && y < feet) continue;   // dưới tán ô không có mưa
        ctx.globalAlpha = 0.18 + 0.3 * hash(i, 7);
        ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + L * 0.25, y + L); ctx.stroke();
      }
      ctx.globalAlpha = 1;
      // cái ô
      ctx.filter = lit;
      ctx.save(); ctx.lineCap = 'round';
      ctx.strokeStyle = '#2a2420'; ctx.lineWidth = Math.max(1.5, ph * 0.014);
      ln(ctx, handX, handY + ph * 0.05, ux, uy);                                 // cán ô
      ctx.beginPath(); ctx.arc(handX + ph * 0.02, handY + ph * 0.05, ph * 0.02, 0, Math.PI); ctx.stroke();  // móc cán
      ctx.translate(ux, uy); ctx.rotate(tilt);
      const g = ctx.createLinearGradient(-ur, -ur, ur, 0);
      g.addColorStop(0, '#e2445a'); g.addColorStop(1, '#8e1426');
      ctx.fillStyle = g; ctx.beginPath();
      ctx.arc(0, 0, ur, Math.PI, 0);
      const n = 5;   // mép ô lượn sóng
      for (let k = n - 1; k >= 0; k--) {
        const x0 = -ur + (2 * ur * k) / n, xm = x0 + ur / n;
        ctx.quadraticCurveTo(xm, -ur * 0.14, x0, 0);
      }
      ctx.closePath(); ctx.fill();
      ctx.strokeStyle = '#6e0f1e'; ctx.lineWidth = Math.max(1, ph * 0.006);
      for (let k = 0; k <= n; k++) ln(ctx, 0, -ur, -ur + (2 * ur * k) / n, 0);   // nan ô
      ctx.strokeStyle = '#ffffff40'; ctx.lineWidth = Math.max(1, ph * 0.01);
      ctx.beginPath(); ctx.arc(0, 0, ur * 0.82, Math.PI * 1.15, Math.PI * 1.45); ctx.stroke();  // ánh bóng
      ctx.strokeStyle = '#2a2420'; ctx.lineWidth = Math.max(1.5, ph * 0.012);
      ln(ctx, 0, -ur, 0, -ur * 1.15);                                             // chóp ô
      // giọt nước nhỏ từ mép ô
      ctx.fillStyle = '#b9cbe6';
      for (let k = 0; k <= n; k++) {
        const dx = -ur + (2 * ur * k) / n, dy = ((since * 1.6 + hash(k, 3)) % 1) * ph * 0.5;
        ctx.globalAlpha = 0.7 * (1 - dy / (ph * 0.5));
        ctx.beginPath(); ctx.ellipse(dx, dy + ph * 0.02, ph * 0.005, ph * 0.012, 0, 0, 7); ctx.fill();
      }
      ctx.restore();
      ctx.filter = 'none';
      // màn trắng lúc chớp
      ctx.globalAlpha = flash * 0.55; ctx.fillStyle = '#dfe8ff'; ctx.fillRect(0, 0, W, H);
      ctx.globalAlpha = 1;
    },
  };
  const hash = (a, b) => { const x = Math.sin(a * 127.1 + b * 311.7) * 43758.5453; return x - Math.floor(x); };
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

  function create(canvas) {
    const ctx = canvas.getContext('2d');
    let W = 0, H = 0;
    function resize() {
      const r = canvas.getBoundingClientRect();
      const s = Math.min(window.devicePixelRatio || 1, 1.5);
      W = canvas.width = Math.max(1, Math.round(r.width * s));
      H = canvas.height = Math.max(1, Math.round(r.height * s));
    }
    if (window.ResizeObserver) new ResizeObserver(resize).observe(canvas);
    else addEventListener('resize', resize);
    resize();

    function draw(t, kind, since, len) {
      if (W < 2) return;
      ctx.globalCompositeOperation = 'source-over';
      ctx.globalAlpha = 1;
      if (SPECIAL[kind]) return SPECIAL[kind](ctx, W, H, t, since, len || 3);
      const K = KINDS[kind] || KINDS.dark;
      const camZ = since * K.speed + 7;
      const bob = Math.sin(since * 5.5) * H * 0.004;
      const y0 = H * (0.46 + (K.pitch || 0)) + bob;
      const f = Math.max(W, H * 0.75) * 0.8, eye = 1.6;   // khung dọc vẫn giữ góc nhìn như khung ngang
      const cx = W / 2 + Math.sin(since * 0.6) * W * 0.012;
      const P = (X, Y, z) => [cx + (X * f) / z, y0 + ((eye - Y) * f) / z];
      const fade = (z) => clamp(1.15 - z / (FAR * 0.75), 0, 1);

      // trời
      ctx.globalCompositeOperation = 'source-over';
      ctx.globalAlpha = 1;
      let g = ctx.createLinearGradient(0, 0, 0, Math.max(2, y0));
      g.addColorStop(0, K.sky[1]); g.addColorStop(0.55, K.sky[0]); g.addColorStop(1, K.fog);
      ctx.fillStyle = g; ctx.fillRect(0, 0, W, Math.max(0, y0) + 1);
      // đất
      g = ctx.createLinearGradient(0, Math.max(0, y0), 0, H);
      g.addColorStop(0, K.fog); g.addColorStop(1, K.ground);
      ctx.fillStyle = g; ctx.fillRect(0, Math.max(0, y0), W, H);
      // mặt đường
      poly([P(-3.2, 0, 0.5), P(3.2, 0, 0.5), P(3.2, 0, FAR), P(-3.2, 0, FAR)], K.road, 0.9);
      if (K.lines) {
        poly([P(-3, 0, 0.5), P(-2.85, 0, 0.5), P(-2.85, 0, FAR), P(-3, 0, FAR)], K.lines, 0.55);
        for (let k = Math.floor(camZ / 5); k < (camZ + FAR) / 5; k++) {
          const z1 = k * 5 - camZ, z2 = z1 + 2.2;
          if (z2 < 0.6) continue;
          poly([P(-0.07, 0, Math.max(0.6, z1)), P(0.07, 0, Math.max(0.6, z1)), P(0.07, 0, z2), P(-0.07, 0, z2)], K.lines, 0.6 * fade(z1));
        }
      }
      // hạt sạn / tuyết trên mặt đất cho có cảm giác đang đi
      ctx.fillStyle = K.snow ? '#d9ddd6' : '#ffffff';
      for (let k = Math.floor(camZ / 0.8); k < (camZ + 25) / 0.8; k++) {
        const z = k * 0.8 - camZ;
        if (z < 0.7) continue;
        for (let j = 0; j < 4; j++) {
          const [x, y] = P(-6 + hash(k, j) * 12, 0, z + hash(j, k) * 0.8);
          ctx.globalAlpha = (K.snow ? 0.22 : 0.06) * fade(z * 3);
          ctx.fillRect(x, y, Math.max(1, (0.03 * f) / z), Math.max(1, (0.015 * f) / z));
        }
      }

      // vật thể: gom lại rồi vẽ từ xa tới gần
      const objs = [];
      const each = (step, fn) => {
        for (let k = Math.floor(camZ / step); k <= (camZ + FAR) / step; k++) {
          const z = k * step - camZ;
          if (z > 0.8) fn(k, z);
        }
      };
      each(K.lampEvery, (k, z) => objs.push({ z, d: () => lamp(k, z) }));
      if (K.trees) each(3, (k, z) => [-1, 1].forEach((s) => { if (hash(k, s + 7) < K.trees * 0.55) objs.push({ z: z + hash(s, k), d: () => tree(k, z + hash(s, k), s) }); }));
      if (K.houses) each(13, (k, z) => { const s = hash(k, 3) < .5 ? -1 : 1; objs.push({ z, d: () => house(k, z, s) }); });
      if (K.buildings) each(32, (k, z) => objs.push({ z, d: () => building(k, z, K.buildings) }));
      if (K.cars) each(7, (k, z) => [-1, 1].forEach((s) => { if (hash(k, s + 11) < 0.5) objs.push({ z, d: () => car(k, z, s) }); }));
      objs.sort((a, b) => b.z - a.z).forEach((o) => o.d());

      // tuyết rơi
      if (K.snow) {
        ctx.fillStyle = '#ffffff';
        for (let i = 0; i < 110; i++) {
          const sp = 0.5 + hash(i, 3);
          const x = ((hash(i, 1) * W + Math.sin(t * 0.8 + i) * W * 0.02) % W + W) % W;
          const y = (hash(i, 2) * H + t * H * 0.07 * sp) % H;
          ctx.globalAlpha = 0.25 + 0.35 * hash(i, 4);
          ctx.beginPath(); ctx.arc(x, y, (0.6 + sp) * W / 900, 0, 7); ctx.fill();
        }
      }
      // tán lá lấp lánh phía trên
      if (K.foliage) {
        g = ctx.createLinearGradient(0, 0, 0, H * 0.5);
        g.addColorStop(0, '#030403'); g.addColorStop(1, '#03040300');
        ctx.globalAlpha = 1; ctx.fillStyle = g; ctx.fillRect(0, 0, W, H * 0.5);
        ctx.globalCompositeOperation = 'lighter';
        ctx.fillStyle = '#e8f0d8';
        for (let i = 0; i < 90; i++) {
          const a = Math.pow(Math.max(0, Math.sin(t * 7 + i * 2.3)), 6);
          if (a < 0.05) continue;
          const x = ((hash(i, 5) * W - since * W * 0.05 * (1 + hash(i, 6))) % W + W) % W;
          ctx.globalAlpha = a * 0.8;
          ctx.fillRect(x, hash(i, 7) * H * 0.42, W * 0.006, W * 0.004);
        }
      }
      ctx.globalCompositeOperation = 'source-over';
      ctx.globalAlpha = 1;

      // ---------- các hàm vẽ ----------
      function poly(pts, color, alpha = 1) {
        ctx.globalAlpha = alpha; ctx.fillStyle = color;
        ctx.beginPath(); pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y))); ctx.closePath(); ctx.fill();
      }
      function glow(x, y, r, color, alpha) {
        if (r < 0.5 || alpha <= 0) return;
        ctx.globalCompositeOperation = 'lighter';
        ctx.globalAlpha = alpha;
        const gg = ctx.createRadialGradient(x, y, 0, x, y, r);
        gg.addColorStop(0, color); gg.addColorStop(0.08, color); gg.addColorStop(0.25, color + '55'); gg.addColorStop(1, color + '00');
        ctx.fillStyle = gg; ctx.fillRect(x - r, y - r, r * 2, r * 2);
        ctx.globalCompositeOperation = 'source-over';
      }
      function lamp(k, z) {
        const s = k % 2 ? 1 : -1, X = s * 3.8, a = fade(z);
        const [bx, by] = P(X, 0, z), [tx, ty] = P(X, 6.2, z), [lx, ly] = P(X - s * 0.9, 6, z);
        ctx.globalAlpha = a; ctx.strokeStyle = '#08090b'; ctx.lineWidth = Math.max(1, (0.13 * f) / z);
        ctx.beginPath(); ctx.moveTo(bx, by); ctx.lineTo(tx, ty); ctx.lineTo(lx, ly); ctx.stroke();
        // vũng sáng dưới đất
        const [px, py] = P(X - s * 1.2, 0, z);
        ctx.save(); ctx.translate(px, py); ctx.scale(1, 0.28);
        glow(0, 0, (5 * f) / z, K.lamp, 0.16 * a);
        ctx.restore();
        // bóng đèn + quầng
        glow(lx, ly, Math.max(W * 0.035, (3.2 * f) / z), K.lamp, a);
        glow(lx, ly, Math.max(W * 0.012, (0.9 * f) / z), '#ffffff', a);   // lõi trắng chói như video
        glow(lx, ly, Math.max(W * 0.09, (10 * f) / z), K.lamp, 0.28 * a);
      }
      function tree(k, z, s) {
        const X = s * (4.6 + hash(k, s) * 8), Ht = 6 + hash(s, k) * 7, a = fade(z);
        const [bx, by] = P(X, 0, z), [tx, ty] = P(X, Ht, z);
        ctx.globalAlpha = a;
        if (K.birch) {
          ctx.strokeStyle = '#8d8e88'; ctx.lineWidth = Math.max(1, (0.22 * f) / z);
          ctx.beginPath(); ctx.moveTo(bx, by); ctx.lineTo(tx, ty - (6 * f) / z); ctx.stroke();
          ctx.strokeStyle = '#1a1b1d'; ctx.lineWidth = Math.max(1, (0.1 * f) / z);
          ctx.beginPath(); ctx.moveTo(bx + (0.25 * f) / z, by); ctx.lineTo(tx + (0.25 * f) / z, ty - (6 * f) / z); ctx.stroke();
          return;
        }
        ctx.strokeStyle = K.tree; ctx.lineWidth = Math.max(1, (0.3 * f) / z);
        ctx.beginPath(); ctx.moveTo(bx, by); ctx.lineTo(tx, ty); ctx.stroke();
        const [cxx, cyy] = P(X, Ht * 0.68, z);
        ctx.fillStyle = K.tree;
        ctx.beginPath(); ctx.ellipse(cxx, cyy, ((1.8 + hash(k, 9)) * f) / z, ((Ht * 0.42) * f) / z, 0, 0, 7); ctx.fill();
        if (K.snow) { // tuyết đọng trên tán, ánh đèn hắt lên
          ctx.fillStyle = '#c9c2a6';
          for (let i = 0; i < 14; i++) {
            ctx.globalAlpha = a * 0.35 * hash(i, k);
            const ex = cxx + (hash(i, k + 1) - 0.5) * (3 * f) / z, ey = cyy + (hash(k + 1, i) - 0.6) * (Ht * 0.7 * f) / z;
            ctx.fillRect(ex, ey, Math.max(1, (0.18 * f) / z), Math.max(1, (0.08 * f) / z));
          }
        }
      }
      function house(k, z, s) {
        const X = s * (11 + hash(k, 4) * 5), L = 8, Hh = 4.5, a = fade(z) * 0.95;
        poly([P(X, 0, z), P(X, Hh, z), P(X, Hh, z + L), P(X, 0, z + L)], '#14161b', a);
        poly([P(X, Hh, z), P(X, Hh + 3, z + L / 2), P(X, Hh, z + L)], '#0e1014', a);
        [2, 5.5].forEach((wz, i) => {
          if (hash(k, i + 20) < 0.45) return;
          poly([P(X, 1.6, z + wz), P(X, 3, z + wz), P(X, 3, z + wz + 1.2), P(X, 1.6, z + wz + 1.2)], '#ffd08a', a * 0.75);
        });
      }
      function building(k, z, s) {
        const X = s * 9.5, L = 26, Hb = 15, a = fade(z);
        poly([P(X, 0, z), P(X, Hb, z), P(X, Hb, z + L), P(X, 0, z + L)], '#121318', a);
        for (let c = 0; c < 8; c++) for (let r = 0; r < 5; r++) {
          if (hash(k * 13 + c, r) > 0.3) continue;
          const wz = z + 1 + c * 3, wy = 2 + r * 2.6;
          poly([P(X, wy, wz), P(X, wy + 1.2, wz), P(X, wy + 1.2, wz + 1.4), P(X, wy, wz + 1.4)], '#f6c77a', a * 0.7);
        }
      }
      function car(k, z, s) {
        const X = s * 2.7, a = fade(z);
        const col = K.cars;
        poly([P(X - 0.9, 0.2, z), P(X + 0.9, 0.2, z), P(X + 0.9, 1.0, z), P(X + 0.6, 1.45, z + 0.8), P(X - 0.6, 1.45, z + 0.8), P(X - 0.9, 1.0, z)], col, a);
        const inner = X - s * 0.9;
        poly([P(inner, 0.2, z), P(inner, 1.0, z), P(inner, 1.0, z + 4), P(inner, 0.2, z + 4)], col, a * 0.9);
        // phản chiếu đèn trên thân xe
        const [hx, hy] = P(inner, 0.95, z + 1.5);
        glow(hx, hy, Math.max(2, (0.35 * f) / z), '#ffffff', 0.5 * a);
      }
    }
    return { draw, setFaces, kinds: [...Object.keys(KINDS), ...Object.keys(SPECIAL)] };
  }
  // parts: các hàm vẽ nhân vật/hiệu ứng, dùng lại khi tạo ảnh minh hoạ
  return { create, KINDS, parts: { standing, head, bouquet, glowAt, skyFill, hash, ramp, mix, setFaces, FACES } };
})();
