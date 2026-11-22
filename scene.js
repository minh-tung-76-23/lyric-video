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

    function draw(t, kind, since) {
      const K = KINDS[kind] || KINDS.dark;
      if (W < 2) return;
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
    return { draw, kinds: Object.keys(KINDS) };
  }
  return { create, KINDS };
})();
