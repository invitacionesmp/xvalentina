/* ============================================================
   MAGIA: destellos, polvo de estrellas y pétalos que saltan
   al tocar los botones, al abrir el sobre y alrededor del pétalo guía.

   Un solo canvas (#magia) por encima de todo, que no recibe clics.
   El bucle de animación se duerme solo cuando no hay nada que dibujar.

   API:
     Magia.explotar(x, y, { n, fuerza, petalos, onda, colores })
     Magia.chispas(x, y, n)               pocas chispas sueltas (estela)
     Magia.cielo(true|false)              estrellitas que titilan de fondo
     Magia.desdeElemento(el, opciones)    explota desde el centro de un elemento
   ============================================================ */
(function () {
  var canvas = document.getElementById("magia");
  if (!canvas || !canvas.getContext) return;
  var ctx = canvas.getContext("2d");
  var reducir = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  var w = 0, h = 0, dpr = 1;
  var parts = [], ondas = [];
  var cieloActivo = false, cieloAcum = 0;
  var corriendo = false, ultimo = 0;
  var MAX = 300;

  var DORADOS = ["#fff6d1", "#ffe08a", "#e7c872", "#ffd34d", "#ffffff"];
  var ROSAS = ["#ff7a9a", "#ffb3c6", "#ff4f7b"];

  function medir() {
    dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    w = window.innerWidth; h = window.innerHeight;
    canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  medir();
  window.addEventListener("resize", medir);

  function azar(a, b) { return a + Math.random() * (b - a); }
  function elegir(l) { return l[Math.floor(Math.random() * l.length)]; }

  /* ---------- sprites prearmados (más rápido que sombras en cada cuadro) ---------- */
  var sprites = {};
  function sprite(tipo, color) {
    var k = tipo + color;
    if (sprites[k]) return sprites[k];
    var s = 64, c = document.createElement("canvas");
    c.width = c.height = s;
    var g = c.getContext("2d"), m = s / 2;
    var halo = g.createRadialGradient(m, m, 0, m, m, m);
    halo.addColorStop(0, color); halo.addColorStop(.18, color);
    halo.addColorStop(.5, "rgba(255,230,160,.18)"); halo.addColorStop(1, "rgba(255,230,160,0)");
    if (tipo === "estrella") {
      g.globalAlpha = .55; g.fillStyle = halo; g.fillRect(0, 0, s, s); g.globalAlpha = 1;
      // estrella de 4 puntas con lados curvos
      g.fillStyle = color; g.beginPath();
      var R = m * .95, r = m * .09;
      g.moveTo(m, m - R);
      g.quadraticCurveTo(m + r, m - r, m + R, m);
      g.quadraticCurveTo(m + r, m + r, m, m + R);
      g.quadraticCurveTo(m - r, m + r, m - R, m);
      g.quadraticCurveTo(m - r, m - r, m, m - R);
      g.fill();
      g.fillStyle = "#fff"; g.beginPath(); g.arc(m, m, m * .1, 0, 6.283); g.fill();
    } else { // polvo
      g.fillStyle = halo; g.fillRect(0, 0, s, s);
    }
    sprites[k] = c; return c;
  }

  DORADOS.concat(ROSAS).forEach(function (c) { sprite("estrella", c); sprite("polvo", c); });

  /* ---------- creación de partículas ---------- */
  function nueva(p) { if (parts.length < MAX) parts.push(p); }

  function explotar(x, y, o) {
    if (reducir) return;
    o = o || {};
    var n = o.n || 36, f = o.fuerza || 1, colores = o.colores || DORADOS;
    var i;
    for (i = 0; i < n; i++) {
      var ang = azar(0, 6.283), vel = azar(50, 300) * f;
      var estrella = Math.random() < .62;
      nueva({
        t: estrella ? "estrella" : "polvo", c: elegir(colores),
        x: x, y: y, vx: Math.cos(ang) * vel, vy: Math.sin(ang) * vel - azar(10, 70) * f,
        g: azar(80, 190), fr: azar(.9, .96),
        tam: (estrella ? azar(10, 26) : azar(6, 15)) * (0.8 + f * .25),
        rot: azar(0, 6.283), vrot: azar(-3, 3),
        vida: 1, dec: azar(.55, 1.15), tw: azar(6, 14), fase: azar(0, 6.283)
      });
    }
    for (i = 0; i < (o.petalos || 0); i++) {
      var a2 = azar(-3.3, .15), v2 = azar(90, 300) * f;
      nueva({
        t: "petalo", c: elegir(["#d41747", "#a80f37", "#ff2a5f", "#e0264f"]),
        x: x, y: y, vx: Math.cos(a2) * v2, vy: Math.sin(a2) * v2 - 40,
        g: azar(120, 210), fr: .965, tam: azar(9, 16),
        rot: azar(0, 6.283), vrot: azar(-4, 4), volteo: azar(0, 6.283), vvol: azar(3, 7),
        vida: 1, dec: azar(.35, .6)
      });
    }
    if (o.onda !== false) {
      ondas.push({ x: x, y: y, r: 6, max: (o.radioOnda || 70 + 70 * f), a: .75 });
    }
    arrancar();
  }

  function chispas(x, y, n) {
    if (reducir) return;
    for (var i = 0; i < (n || 2); i++) {
      nueva({
        t: Math.random() < .5 ? "estrella" : "polvo", c: elegir(DORADOS),
        x: x + azar(-8, 8), y: y + azar(-8, 8), vx: azar(-22, 22), vy: azar(-16, 24),
        g: 20, fr: .96, tam: azar(6, 13), rot: azar(0, 6.283), vrot: azar(-2, 2),
        vida: 1, dec: azar(1, 1.7), tw: azar(8, 14), fase: azar(0, 6.283)
      });
    }
    arrancar();
  }

  function cielo(on) {
    cieloActivo = !!on && !reducir;
    if (cieloActivo) arrancar();
  }

  function desdeElemento(el, o) {
    if (!el) return;
    var r = el.getBoundingClientRect();
    explotar(r.left + r.width / 2, r.top + r.height / 2, o);
  }

  /* ---------- dibujo ---------- */
  function dibujarPetalo(p) {
    ctx.save();
    ctx.translate(p.x, p.y); ctx.rotate(p.rot);
    ctx.scale(1, Math.max(.2, Math.abs(Math.cos(p.volteo))));
    var s = p.tam / 17; ctx.scale(s, s);
    ctx.globalAlpha = Math.min(1, p.vida * 1.4);
    ctx.fillStyle = p.c;
    ctx.beginPath(); ctx.moveTo(0, 0);
    ctx.bezierCurveTo(-10, -2, -14, -13, -2, -17);
    ctx.bezierCurveTo(11, -18, 13, -6, 0, 0);
    ctx.fill();
    ctx.restore();
  }

  function cuadro(ahora) {
    var dt = Math.min((ahora - ultimo) / 1000, .05); ultimo = ahora;
    ctx.clearRect(0, 0, w, h);

    if (cieloActivo) {
      cieloAcum += dt;
      while (cieloAcum > .34) {
        cieloAcum -= .34;
        nueva({
          t: Math.random() < .75 ? "estrella" : "polvo", c: elegir(DORADOS),
          x: azar(0, w), y: azar(0, h), vx: azar(-5, 5), vy: azar(-12, -2), g: 0, fr: 1,
          tam: azar(7, 20), rot: azar(-.2, .2), vrot: 0, vida: 1, dec: azar(.3, .55),
          tw: 0, fase: 0, cielo: true
        });
      }
    }

    ctx.globalCompositeOperation = "lighter";
    var i, p;
    for (i = ondas.length - 1; i >= 0; i--) {
      var o = ondas[i];
      o.r += (o.max - o.r) * dt * 4.2; o.a -= dt * 1.5;
      if (o.a <= 0) { ondas.splice(i, 1); continue; }
      ctx.globalAlpha = o.a; ctx.strokeStyle = "#ffe9a8"; ctx.lineWidth = 2 * o.a + .5;
      ctx.beginPath(); ctx.arc(o.x, o.y, o.r, 0, 6.283); ctx.stroke();
    }

    for (i = parts.length - 1; i >= 0; i--) {
      p = parts[i];
      p.vida -= p.dec * dt;
      if (p.vida <= 0) { parts.splice(i, 1); continue; }
      p.vx *= p.fr; p.vy = p.vy * p.fr + p.g * dt;
      p.x += p.vx * dt; p.y += p.vy * dt; p.rot += p.vrot * dt;
      if (p.t === "petalo") {
        p.volteo += p.vvol * dt;
        ctx.globalCompositeOperation = "source-over"; dibujarPetalo(p);
        ctx.globalCompositeOperation = "lighter";
        continue;
      }
      var vivo = p.cielo ? Math.sin(Math.min(1, (1 - p.vida)) * Math.PI) : p.vida;
      var titila = p.tw ? .72 + .28 * Math.sin(p.fase += p.tw * dt) : 1;
      var tam = p.tam * (p.cielo ? .55 + .45 * vivo : .4 + .6 * p.vida);
      ctx.globalAlpha = Math.max(0, Math.min(1, vivo * titila));
      var img = sprite(p.t, p.c);
      if (p.t === "estrella") {
        var co = Math.cos(p.rot) * dpr, si = Math.sin(p.rot) * dpr;
        ctx.setTransform(co, si, -si, co, p.x * dpr, p.y * dpr);
        ctx.drawImage(img, -tam, -tam, tam * 2, tam * 2);
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      } else {
        ctx.drawImage(img, p.x - tam, p.y - tam, tam * 2, tam * 2);
      }
    }
    ctx.globalCompositeOperation = "source-over"; ctx.globalAlpha = 1;

    if (parts.length || ondas.length || cieloActivo) requestAnimationFrame(cuadro);
    else corriendo = false;
  }

  function arrancar() {
    if (corriendo) return;
    corriendo = true; ultimo = performance.now();
    requestAnimationFrame(cuadro);
  }

  window.Magia = { explotar: explotar, chispas: chispas, cielo: cielo, desdeElemento: desdeElemento, colores: { dorados: DORADOS, rosas: ROSAS } };
})();
