/* Ambiente de fondo: pétalos que caen despacio y polvo de estrellas que sube.
   Va detrás del contenido. Los destellos al tocar botones están en magia.js. */
(function () {
  var canvas = document.getElementById("petalos");
  if (!canvas || !canvas.getContext) return;
  var ctx = canvas.getContext("2d");
  var reducir = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var w = 0, h = 0, dpr = 1, petalos = [], polvo = [], ultimo = 0;

  function medir() {
    dpr = 1;   // fondo suave: no hace falta más resolución
    w = window.innerWidth; h = window.innerHeight;
    canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  function azar(a, b) { return a + Math.random() * (b - a); }

  function nuevoPetalo(arriba) {
    return {
      x: azar(0, w), y: arriba ? azar(-60, -10) : azar(-60, h),
      t: azar(10, 21), vy: azar(20, 46), vx: azar(-9, 9),
      fase: azar(0, 6.28), balanceo: azar(12, 30),
      giro: azar(0, 6.28), vgiro: azar(-1.6, 1.6), volteo: azar(0, 6.28), vvolteo: azar(1.2, 2.8),
      color: ["#d41747", "#a80f37", "#ff2a5f", "#8e1031", "#e0264f"][Math.floor(azar(0, 5))],
      alfa: azar(.5, .88)
    };
  }
  function nuevoPolvo() {
    return {
      x: azar(0, w), y: azar(0, h), r: azar(.9, 2.4), vy: azar(-16, -5),
      fase: azar(0, 6.28), vel: azar(1.2, 3), estrella: false,
      color: Math.random() < .8 ? "#fff3c4" : "#ffd1dc"
    };
  }

  function iniciar() {
    medir();
    var n = w < 600 ? 9 : 16, d = w < 600 ? 22 : 40;
    petalos = []; polvo = [];
    for (var i = 0; i < n; i++) petalos.push(nuevoPetalo(false));
    for (var j = 0; j < d; j++) polvo.push(nuevoPolvo());
  }

  function estrella(x, y, r, rot, color, a) {
    ctx.save(); ctx.translate(x, y); ctx.rotate(rot);
    ctx.globalAlpha = a; ctx.fillStyle = color;
    ctx.beginPath();
    var R = r * 2.6, k = r * .35;
    ctx.moveTo(0, -R); ctx.quadraticCurveTo(k, -k, R, 0); ctx.quadraticCurveTo(k, k, 0, R);
    ctx.quadraticCurveTo(-k, k, -R, 0); ctx.quadraticCurveTo(-k, -k, 0, -R);
    ctx.fill(); ctx.restore();
  }

  function petalo(p) {
    ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.giro);
    ctx.scale(1, Math.max(.2, Math.abs(Math.cos(p.volteo))));
    var s = p.t / 20; ctx.scale(s, s);
    ctx.globalAlpha = p.alfa; ctx.fillStyle = p.color;
    ctx.beginPath(); ctx.moveTo(0, 0);
    ctx.bezierCurveTo(-10, -2, -14, -13, -2, -17);
    ctx.bezierCurveTo(11, -18, 13, -6, 0, 0);
    ctx.fill(); ctx.restore();
  }

  function cuadro(ahora) {
    // mientras el sobre está cerrado el fondo no se ve: no dibujamos nada
    if (document.body.classList.contains("bloqueado")) { ultimo = ahora; requestAnimationFrame(cuadro); return; }
    // 30 cuadros por segundo alcanzan de sobra para pétalos lentos
    if (ahora - ultimo < 30) { requestAnimationFrame(cuadro); return; }
    var dt = Math.min((ahora - ultimo) / 1000, .05); ultimo = ahora;
    ctx.clearRect(0, 0, w, h);
    var i, d, p, a;
    for (i = 0; i < polvo.length; i++) {
      d = polvo[i]; d.fase += dt * d.vel; d.y += d.vy * dt;
      if (d.y < -10) { d.y = h + 10; d.x = azar(0, w); }
      a = .15 + .75 * Math.max(0, Math.sin(d.fase));
      if (d.estrella && a > .5) estrella(d.x, d.y, d.r, d.fase * .3, d.color, a);
      else { ctx.globalAlpha = a; ctx.fillStyle = d.color; ctx.beginPath(); ctx.arc(d.x, d.y, d.r, 0, 6.283); ctx.fill(); }
    }
    for (i = 0; i < petalos.length; i++) {
      p = petalos[i];
      p.y += p.vy * dt; p.fase += dt * 1.1;
      p.x += (p.vx + Math.sin(p.fase) * p.balanceo) * dt;
      p.giro += p.vgiro * dt; p.volteo += p.vvolteo * dt;
      if (p.y > h + 35 || p.x < -50 || p.x > w + 50) petalos[i] = nuevoPetalo(true);
      petalo(p);
    }
    ctx.globalAlpha = 1;
    requestAnimationFrame(cuadro);
  }

  iniciar();
  window.addEventListener("resize", function () { var a = w; medir(); if (Math.abs(a - w) > 80) iniciar(); });

  if (reducir) {
    ctx.fillStyle = "#fff3c4";
    polvo.forEach(function (d) { ctx.globalAlpha = .45; ctx.beginPath(); ctx.arc(d.x, d.y, d.r, 0, 6.283); ctx.fill(); });
    return;
  }
  requestAnimationFrame(function (t) { ultimo = t; cuadro(t); });
})();
