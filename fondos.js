// Fondos animados dibujados en canvas. Cada fondo es una fábrica (w, h) => dibujar(ctx, t)
(function () {
  const TAU = Math.PI * 2;
  const al = (a, b) => a + Math.random() * (b - a);
  const rgba = (c, a) => `rgba(${c[0]},${c[1]},${c[2]},${a})`;

  function estrellas(n, w, h) {
    return Array.from({ length: n }, () => ({
      x: Math.random() * w, y: Math.random() * h,
      r: Math.random() < 0.08 ? al(1.2, 2) : al(0.4, 1.1),
      a: al(0.35, 1), v: al(0.6, 2.4), p: al(0, TAU),
    }));
  }
  function pintaEstrellas(c, lista, t, k) {
    c.fillStyle = "#fff";
    for (const s of lista) {
      c.globalAlpha = s.a * k * (0.6 + 0.4 * Math.sin(t * s.v + s.p));
      if (s.r > 1.1) { c.beginPath(); c.arc(s.x, s.y, s.r, 0, TAU); c.fill(); }
      else c.fillRect(s.x, s.y, s.r * 1.6, s.r * 1.6);
    }
    c.globalAlpha = 1;
  }
  // Silueta de cerros: sumas de senos sobre coordenada normalizada
  function cerro(c, w, h, base, amp, k, p, color, dx) {
    c.beginPath();
    c.moveTo(0, h);
    const paso = Math.max(3, w / 180);
    for (let x = 0; x <= w + paso; x += paso) {
      const u = (x + (dx || 0)) / w;
      const y = h * base - (Math.sin(u * k + p) * 0.5 + Math.sin(u * k * 2.7 + p * 1.3) * 0.3 + Math.sin(u * k * 6.3 + p * 0.7) * 0.12 + 0.5) * h * amp;
      c.lineTo(x, y);
    }
    c.lineTo(w, h);
    c.closePath();
    c.fillStyle = color;
    c.fill();
  }
  function lineal(c, x0, y0, x1, y1, paradas) {
    const g = c.createLinearGradient(x0, y0, x1, y1);
    for (const [o, col] of paradas) g.addColorStop(o, col);
    return g;
  }
  function brillo(c, x, y, r, col, a) {
    const g = c.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, rgba(col, a));
    g.addColorStop(1, rgba(col, 0));
    c.fillStyle = g;
    c.beginPath(); c.arc(x, y, r, 0, TAU); c.fill();
  }

  const FONDOS = {
    // Aurora boreal sobre cerros nevados
    aurora: { escala: 0.5, crear(w, h) {
      const est = estrellas(Math.round((w * h) / 1400), w, h * 0.75);
      const cintas = [
        { c: [70, 255, 180], y: 0.42, a: 0.07, k: 7, s: 0.22, g: 0.26, p: 0 },
        { c: [60, 190, 255], y: 0.34, a: 0.06, k: 10, s: -0.16, g: 0.2, p: 2 },
        { c: [170, 110, 255], y: 0.26, a: 0.05, k: 8, s: 0.12, g: 0.16, p: 4 },
      ];
      return (c, t) => {
        c.globalCompositeOperation = "source-over";
        c.fillStyle = lineal(c, 0, 0, 0, h, [[0, "#01030b"], [0.55, "#031326"], [1, "#0a2b3b"]]);
        c.fillRect(0, 0, w, h);
        pintaEstrellas(c, est, t, 0.8);
        c.globalCompositeOperation = "lighter";
        for (const k of cintas) {
          const alto = h * k.g;
          for (let capa = 0; capa < 3; capa++) {
            const pts = [];
            for (let x = -w * 0.05; x <= w * 1.05; x += w / 70) {
              const u = x / w;
              const y = h * k.y + Math.sin(u * k.k + t * k.s + k.p + capa * 0.7) * h * k.a + Math.sin(u * k.k * 2.3 - t * k.s * 1.6 + k.p) * h * k.a * 0.45;
              pts.push([x, y, alto * (0.65 + 0.35 * Math.sin(u * 9 + t * 0.45 + capa * 2))]);
            }
            c.beginPath();
            c.moveTo(pts[0][0], pts[0][1] - pts[0][2]);
            for (const [x, y, a] of pts) c.lineTo(x, y - a);
            for (let i = pts.length - 1; i >= 0; i--) c.lineTo(pts[i][0], pts[i][1]);
            c.closePath();
            c.fillStyle = lineal(c, 0, h * (k.y - k.a) - alto, 0, h * (k.y + k.a), [[0, rgba(k.c, 0)], [0.72, rgba(k.c, 0.16)], [1, rgba(k.c, 0)]]);
            c.fill();
          }
        }
        c.globalCompositeOperation = "source-over";
        cerro(c, w, h, 0.9, 0.14, 5, 1.2, "#0b1d2b", t * 2);
        cerro(c, w, h, 1, 0.12, 7, 3.1, "#050d16", t * 5);
      };
    } },

    // Cielo estrellado que gira despacio, con estrella fugaz
    estrellas: { escala: 1, crear(w, h) {
      const R = Math.hypot(w, h) * 1.25;
      const cx = w * 0.5, cy = h * 1.15;
      const est = Array.from({ length: Math.round((w * h) / 900) }, () => {
        const ang = al(0, TAU), rad = Math.sqrt(Math.random()) * R;
        return { ang, rad, r: Math.random() < 0.06 ? al(1.3, 2.1) : al(0.4, 1.1), a: al(0.3, 1), v: al(0.5, 2.2), p: al(0, TAU) };
      });
      return (c, t) => {
        const g = c.createRadialGradient(cx, h * 1.05, 0, cx, h * 1.05, h * 1.3);
        g.addColorStop(0, "#3b2559"); g.addColorStop(0.35, "#161a44"); g.addColorStop(1, "#02030a");
        c.fillStyle = g; c.fillRect(0, 0, w, h);
        const giro = t * 0.006;
        c.fillStyle = "#fff";
        for (const s of est) {
          const x = cx + Math.cos(s.ang + giro) * s.rad, y = cy + Math.sin(s.ang + giro) * s.rad;
          if (x < -3 || y < -3 || x > w + 3 || y > h + 3) continue;
          c.globalAlpha = s.a * (0.55 + 0.45 * Math.sin(t * s.v + s.p));
          if (s.r > 1.2) { c.beginPath(); c.arc(x, y, s.r, 0, TAU); c.fill(); } else c.fillRect(x, y, s.r * 1.5, s.r * 1.5);
        }
        c.globalAlpha = 1;
        // estrella fugaz cada 7 s
        const ciclo = 7, f = (t % ciclo) / ciclo, n = Math.floor(t / ciclo);
        if (f < 0.14) {
          const q = f / 0.14, sx = w * (0.15 + ((n * 0.37) % 0.6)), sy = h * (0.08 + ((n * 0.23) % 0.25));
          const x = sx + q * w * 0.28, y = sy + q * h * 0.16, largo = w * 0.09;
          const ln = c.createLinearGradient(x, y, x - largo, y - largo * 0.57);
          ln.addColorStop(0, `rgba(255,255,255,${0.9 * (1 - q)})`); ln.addColorStop(1, "rgba(255,255,255,0)");
          c.strokeStyle = ln; c.lineWidth = 1.6; c.beginPath(); c.moveTo(x, y); c.lineTo(x - largo, y - largo * 0.57); c.stroke();
        }
        cerro(c, w, h, 1, 0.1, 4, 0.4, "#04040c", 0);
      };
    } },

    // Amanecer entre montañas, el sol sube poco a poco
    amanecer: { escala: 0.5, crear(w, h) {
      return (c, t) => {
        c.globalCompositeOperation = "source-over";
        c.fillStyle = lineal(c, 0, 0, 0, h, [[0, "#1a2547"], [0.32, "#5a3c70"], [0.58, "#d77566"], [0.76, "#f5c48a"], [1, "#f8dcae"]]);
        c.fillRect(0, 0, w, h);
        const sy = h * 0.68 - Math.min(t, 40) * h * 0.0035, sx = w * 0.5;
        c.globalCompositeOperation = "lighter";
        brillo(c, sx, sy, h * 0.9, [255, 170, 110], 0.28);
        brillo(c, sx, sy, h * 0.28, [255, 220, 160], 0.45);
        c.globalCompositeOperation = "source-over";
        c.fillStyle = "#fff4d6"; c.beginPath(); c.arc(sx, sy, h * 0.055, 0, TAU); c.fill();
        // neblina
        c.fillStyle = lineal(c, 0, h * 0.6, 0, h * 0.85, [[0, "rgba(255,210,170,0)"], [1, "rgba(255,210,170,.25)"]]);
        c.fillRect(0, h * 0.6, w, h * 0.25);
        cerro(c, w, h, 0.86, 0.16, 4, 0.2, "rgba(140,84,108,.85)", t * 1.5);
        cerro(c, w, h, 0.91, 0.14, 6, 2.2, "#6b3f62", t * 3);
        cerro(c, w, h, 0.96, 0.12, 5, 4.1, "#3a2443", t * 6);
        cerro(c, w, h, 1.02, 0.1, 8, 1.7, "#1a1022", t * 10);
      };
    } },

    // Rayos de luz dorada que bajan, con polvo flotando
    rayos: { escala: 0.5, crear(w, h) {
      const ox = w * 0.5, oy = -h * 0.18;
      const rayos = Array.from({ length: 17 }, (_, i) => ({ a: Math.PI * (0.18 + (0.64 * i) / 16) + al(-0.03, 0.03), g: al(0.018, 0.05), p: al(0, TAU), v: al(0.25, 0.6) }));
      const polvo = Array.from({ length: 110 }, () => ({ x: Math.random() * w, y: Math.random() * h, r: al(0.6, 2.2), v: al(4, 14), p: al(0, TAU), a: al(0.2, 0.8) }));
      return (c, t) => {
        c.globalCompositeOperation = "source-over";
        c.fillStyle = lineal(c, 0, 0, 0, h, [[0, "#3b2711"], [0.5, "#1a1008"], [1, "#070403"]]);
        c.fillRect(0, 0, w, h);
        c.globalCompositeOperation = "lighter";
        const L = Math.hypot(w, h) * 1.3;
        for (const r of rayos) {
          const a = r.a + Math.sin(t * 0.07 + r.p) * 0.04;
          const al2 = 0.05 + 0.07 * (0.5 + 0.5 * Math.sin(t * r.v + r.p));
          const g = c.createRadialGradient(ox, oy, 0, ox, oy, L);
          g.addColorStop(0, `rgba(255,222,160,${al2 * 2})`); g.addColorStop(0.55, `rgba(255,200,120,${al2})`); g.addColorStop(1, "rgba(255,190,110,0)");
          c.fillStyle = g;
          c.beginPath(); c.moveTo(ox, oy);
          c.lineTo(ox + Math.cos(a - r.g) * L, oy + Math.sin(a - r.g) * L);
          c.lineTo(ox + Math.cos(a + r.g) * L, oy + Math.sin(a + r.g) * L);
          c.closePath(); c.fill();
        }
        brillo(c, ox, oy, h * 0.75, [255, 214, 150], 0.35);
        for (const d of polvo) {
          const y = (d.y - t * d.v) % h, yy = y < 0 ? y + h : y;
          const x = d.x + Math.sin(t * 0.3 + d.p) * 12;
          c.fillStyle = `rgba(255,226,170,${d.a * (0.5 + 0.5 * Math.sin(t * 1.3 + d.p))})`;
          c.beginPath(); c.arc(x, yy, d.r, 0, TAU); c.fill();
        }
        c.globalCompositeOperation = "source-over";
      };
    } },

    // Luces desenfocadas (bokeh) que flotan
    luces: { escala: 0.4, crear(w, h) {
      const tonos = [[255, 196, 120], [255, 140, 170], [120, 210, 255], [190, 150, 255], [255, 230, 180]];
      const m = Math.max(w, h);
      const ps = Array.from({ length: 46 }, () => ({ x: Math.random() * w, y: Math.random() * h, r: al(0.02, 0.09) * m, c: tonos[Math.floor(Math.random() * tonos.length)], vx: al(-6, 6), vy: al(-9, -2), p: al(0, TAU), a: al(0.18, 0.42) }));
      return (c, t) => {
        c.globalCompositeOperation = "source-over";
        c.fillStyle = lineal(c, 0, 0, w, h, [[0, "#0b1030"], [0.5, "#2a0f3e"], [1, "#3d1427"]]);
        c.fillRect(0, 0, w, h);
        c.globalCompositeOperation = "lighter";
        for (const q of ps) {
          let x = (q.x + q.vx * t) % (w + 2 * q.r); if (x < -q.r) x += w + 2 * q.r;
          let y = (q.y + q.vy * t) % (h + 2 * q.r); if (y < -q.r) y += h + 2 * q.r;
          const a = q.a * (0.65 + 0.35 * Math.sin(t * 0.6 + q.p));
          const g = c.createRadialGradient(x, y, 0, x, y, q.r);
          g.addColorStop(0, rgba(q.c, a)); g.addColorStop(0.75, rgba(q.c, a * 0.7)); g.addColorStop(1, rgba(q.c, 0));
          c.fillStyle = g; c.beginPath(); c.arc(x, y, q.r, 0, TAU); c.fill();
        }
        c.globalCompositeOperation = "source-over";
      };
    } },

    // Mar en calma al atardecer, con reflejo del sol
    mar: { escala: 0.6, crear(w, h) {
      const hz = h * 0.6;
      const brillos = Array.from({ length: 70 }, () => ({ y: Math.pow(Math.random(), 1.6), w: al(0.01, 0.05), o: al(-1, 1), p: al(0, TAU), v: al(1, 3) }));
      return (c, t) => {
        c.globalCompositeOperation = "source-over";
        c.fillStyle = lineal(c, 0, 0, 0, hz, [[0, "#0c1533"], [0.45, "#3a3a73"], [0.8, "#c3708a"], [1, "#f4b48a"]]);
        c.fillRect(0, 0, w, hz);
        c.globalCompositeOperation = "lighter";
        brillo(c, w * 0.5, hz, h * 0.6, [255, 170, 130], 0.3);
        c.globalCompositeOperation = "source-over";
        c.fillStyle = "#ffe8c8"; c.beginPath(); c.arc(w * 0.5, hz - h * 0.035, h * 0.05, Math.PI, 0); c.fill();
        c.fillStyle = lineal(c, 0, hz, 0, h, [[0, "#3c3560"], [0.35, "#1d2148"], [1, "#070b1e"]]);
        c.fillRect(0, hz, w, h - hz);
        // olas
        for (let k = 0; k < 6; k++) {
          const y0 = hz + (h - hz) * (0.08 + k * 0.17), amp = h * (0.004 + k * 0.003), dir = k % 2 ? 1 : -1;
          c.beginPath(); c.moveTo(0, h);
          for (let x = 0; x <= w + 8; x += 8) {
            const u = x / w;
            c.lineTo(x, y0 + Math.sin(u * (14 - k) + t * 0.5 * dir + k) * amp + Math.sin(u * 31 - t * 0.9 + k * 2) * amp * 0.4);
          }
          c.lineTo(w, h); c.closePath();
          c.fillStyle = `rgba(6,10,32,${0.16 + k * 0.05})`; c.fill();
        }
        // reflejo
        c.globalCompositeOperation = "lighter";
        for (const b of brillos) {
          const y = hz + 3 + b.y * (h - hz) * 0.9, ancho = w * b.w * (1 - b.y * 0.5) * (0.6 + 0.4 * Math.sin(t * b.v + b.p));
          const x = w * 0.5 + b.o * w * 0.05 * (0.4 + b.y) + Math.sin(t * 0.8 + b.p) * 6;
          c.fillStyle = `rgba(255,214,170,${0.5 * (1 - b.y) * (0.5 + 0.5 * Math.sin(t * b.v * 1.3 + b.p))})`;
          c.fillRect(x - ancho / 2, y, ancho, Math.max(1, h * 0.003));
        }
        c.globalCompositeOperation = "source-over";
      };
    } },

    // Nebulosa de colores en el espacio
    nebulosa: { escala: 0.5, crear(w, h) {
      const est = estrellas(Math.round((w * h) / 700), w, h);
      const m = Math.max(w, h);
      const nubes = [
        { c: [150, 70, 255], r: 0.55, a: 0.07, b: 0.05, p: 0 },
        { c: [255, 70, 160], r: 0.42, a: 0.05, b: 0.08, p: 2 },
        { c: [40, 150, 255], r: 0.5, a: 0.06, b: 0.04, p: 4 },
        { c: [40, 230, 200], r: 0.34, a: 0.09, b: 0.06, p: 1 },
        { c: [255, 180, 90], r: 0.25, a: 0.08, b: 0.1, p: 5 },
      ];
      return (c, t) => {
        c.globalCompositeOperation = "source-over";
        c.fillStyle = "#03020b"; c.fillRect(0, 0, w, h);
        pintaEstrellas(c, est, t, 0.9);
        c.globalCompositeOperation = "lighter";
        for (const n of nubes) {
          const x = w * (0.5 + 0.32 * Math.sin(t * n.a + n.p)), y = h * (0.5 + 0.28 * Math.cos(t * n.b + n.p * 1.7));
          brillo(c, x, y, m * n.r, n.c, 0.3);
        }
        c.globalCompositeOperation = "source-over";
      };
    } },

    // Luciérnagas en el campo de noche, con luna
    luciernagas: { escala: 0.5, crear(w, h) {
      const m = Math.min(w, h);
      const est = estrellas(Math.round((w * h) / 2500), w, h * 0.5);
      const bichos = Array.from({ length: 70 }, () => ({
        x: Math.random() * w, y: h * al(0.4, 0.97), rx: al(0.02, 0.08) * w, ry: al(0.02, 0.06) * h,
        a: al(0.1, 0.35), b: al(0.1, 0.3), p: al(0, TAU), q: al(0, TAU), v: al(0.8, 2.2), r: al(0.004, 0.009) * m,
      }));
      return (c, t) => {
        c.globalCompositeOperation = "source-over";
        c.fillStyle = lineal(c, 0, 0, 0, h, [[0, "#020611"], [0.5, "#06162a"], [1, "#0c2a24"]]);
        c.fillRect(0, 0, w, h);
        pintaEstrellas(c, est, t, 0.6);
        c.globalCompositeOperation = "lighter";
        brillo(c, w * 0.8, h * 0.18, h * 0.28, [200, 220, 255], 0.18);
        c.globalCompositeOperation = "source-over";
        c.fillStyle = "#eef3ff"; c.beginPath(); c.arc(w * 0.8, h * 0.18, h * 0.035, 0, TAU); c.fill();
        cerro(c, w, h, 0.84, 0.12, 5, 0.8, "#081a1a", t * 1);
        cerro(c, w, h, 0.97, 0.1, 9, 2.4, "#04100e", t * 2);
        c.globalCompositeOperation = "lighter";
        for (const b of bichos) {
          const k = Math.max(0, Math.sin(t * b.v + b.p)), a = k * k;
          if (a < 0.02) continue;
          const x = b.x + Math.sin(t * b.a + b.p) * b.rx, y = b.y + Math.sin(t * b.b + b.q) * b.ry;
          brillo(c, x, y, b.r * 6, [190, 255, 120], 0.35 * a);
          c.fillStyle = `rgba(240,255,190,${0.9 * a})`; c.beginPath(); c.arc(x, y, b.r, 0, TAU); c.fill();
        }
        c.globalCompositeOperation = "source-over";
      };
    } },

    // Nubes que pasan despacio en un cielo de mañana
    nubes: { escala: 0.4, crear(w, h) {
      const nubes = Array.from({ length: 11 }, () => {
        const y = h * al(0.08, 0.78), s = al(0.6, 1.3) * (0.6 + y / h);
        return {
          x: al(-0.2, 1.2) * w, y, v: al(4, 12) * (0.5 + y / h) * (w / 800), a: al(0.35, 0.6),
          partes: Array.from({ length: 6 }, () => ({ dx: al(-0.12, 0.12) * w * s, dy: al(-0.03, 0.03) * h * s, r: al(0.05, 0.1) * w * s })),
        };
      });
      return (c, t) => {
        c.globalCompositeOperation = "source-over";
        c.fillStyle = lineal(c, 0, 0, 0, h, [[0, "#1d3b70"], [0.5, "#4f78b3"], [0.85, "#d9a897"], [1, "#f0c6a6"]]);
        c.fillRect(0, 0, w, h);
        c.globalCompositeOperation = "lighter";
        brillo(c, w * 0.2, h * 0.95, h * 0.9, [255, 190, 140], 0.25);
        c.globalCompositeOperation = "source-over";
        const ancho = w * 1.6;
        for (const n of nubes) {
          const x = ((n.x + w * 0.3 + t * n.v) % ancho) - w * 0.3;
          for (const p of n.partes) {
            const px = x + p.dx, py = n.y + p.dy;
            const g = c.createRadialGradient(px, py, 0, px, py, p.r);
            g.addColorStop(0, `rgba(255,248,240,${n.a})`); g.addColorStop(0.6, `rgba(250,236,228,${n.a * 0.5})`); g.addColorStop(1, "rgba(250,236,228,0)");
            c.fillStyle = g; c.beginPath(); c.arc(px, py, p.r, 0, TAU); c.fill();
          }
        }
      };
    } },
  };

  // Nombre y muestra de color de cada fondo (para el panel)
  window.FONDOS_INFO = {
    estrellas: { nombre: "Estrellitas", color: "linear-gradient(160deg,#02030a,#161a44 60%,#3b2559)" },
    aurora: { nombre: "Aurora", color: "linear-gradient(160deg,#01030b,#0f5f58 55%,#5a3fa0)" },
    amanecer: { nombre: "Amanecer", color: "linear-gradient(180deg,#5a3c70,#d77566 55%,#f5c48a)" },
    rayos: { nombre: "Rayos de luz", color: "linear-gradient(180deg,#8a6430,#2b1a0a 60%,#070403)" },
    luces: { nombre: "Luces", color: "radial-gradient(circle at 30% 40%,#c77dff77,transparent 45%),linear-gradient(135deg,#0b1030,#2a0f3e 50%,#3d1427)" },
    mar: { nombre: "Mar", color: "linear-gradient(180deg,#3a3a73,#c3708a 45%,#1d2148 60%,#070b1e)" },
    nebulosa: { nombre: "Nebulosa", color: "radial-gradient(circle at 35% 45%,#9646ff99,transparent 45%),radial-gradient(circle at 65% 60%,#ff46a077,transparent 45%),#03020b" },
    luciernagas: { nombre: "Luciérnagas", color: "radial-gradient(circle at 40% 62%,#d4ff7a77,transparent 22%),linear-gradient(180deg,#020611,#0c2a24)" },
    nubes: { nombre: "Nubes", color: "linear-gradient(180deg,#1d3b70,#4f78b3 50%,#f0c6a6)" },
  };

  window.FONDOS = FONDOS;
})();
