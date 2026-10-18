/* ============================================================
   EL PÉTALO GUÍA
   Se desprende de la rosa apenas aparece la invitación y cae, sin parar,
   hasta el final de la página. Su posición depende del TIEMPO, no del scroll:
   si el invitado se queda quieto, sigue cayendo; si baja rápido, lo
   encuentra más abajo; al llegar al final se posa y descansa ahí.

   API:  PetaloGuia.soltar()   (lo llama main.js al mostrar la invitación)
   ============================================================ */
(function () {
  var nodo = document.getElementById("petalo-guia");
  var giro = nodo && nodo.querySelector(".petalo-guia__giro");
  if (!nodo || !giro) return;
  var reducir = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  var PREPARACION = 1100;   // ms que tiembla en la flor antes de soltarse
  var TAU = 1.3;            // segundos en llegar a la velocidad de caída
  var estado = "quieto";    // quieto | colgado | cayendo | posado
  var inicio = 0, x0 = 0, y0 = 0;
  var altoDoc = 0, ultimoMedido = 0, ultimaChispa = 0;
  var posadoEn = 0, posadoX = 0, posadoY = 0, aterrizo = 0;
  var semilla = Math.random() * 6.28;

  function posicionFlor() {
    var img = document.getElementById("rosa-img");
    var r = img.getBoundingClientRect();
    var f = (img.getAttribute("data-flor") || "50,35").split(",");
    return {
      x: r.left + r.width * parseFloat(f[0]) / 100 + window.pageXOffset,
      y: r.top + r.height * parseFloat(f[1]) / 100 + window.pageYOffset
    };
  }

  function medirDoc(ahora) {
    if (ahora - ultimoMedido < 400 && altoDoc) return;
    ultimoMedido = ahora;
    altoDoc = Math.max(document.documentElement.scrollHeight, document.body.scrollHeight);
  }

  function escala() { return window.innerWidth < 600 ? .62 : .85; }

  function poner(x, y, rotZ, rotX, rotY, esc, brillo) {
    nodo.style.transform = "translate3d(" + (x - 22).toFixed(1) + "px," + (y - 29).toFixed(1) + "px,0)";
    giro.style.transform = "perspective(520px) rotateZ(" + rotZ.toFixed(1) + "deg) rotateX(" + rotX.toFixed(1) +
      "deg) rotateY(" + rotY.toFixed(1) + "deg) scale(" + esc.toFixed(3) + ")";
  }

  function enPantalla(x, y) {
    var vx = x - window.pageXOffset, vy = y - window.pageYOffset;
    return vx > -30 && vx < window.innerWidth + 30 && vy > -30 && vy < window.innerHeight + 30 ? { x: vx, y: vy } : null;
  }

  function cuadro(ahora) {
    medirDoc(ahora);
    var esc = escala();
    var seg = (ahora - inicio) / 1000;

    if (estado === "colgado") {
      var f = posicionFlor(); x0 = f.x; y0 = f.y;
      var tr = Math.sin(seg * 24) * Math.min(1, seg / .6) * 3;
      poner(x0 + tr * .5, y0 + Math.abs(tr) * .4, tr * 2, 20, 0, esc * Math.min(1, .5 + seg * .6), 1);
      if (seg * 1000 >= PREPARACION) { estado = "cayendo"; inicio = ahora; seg = 0; var p = enPantalla(x0, y0); if (p && window.Magia) window.Magia.explotar(p.x, p.y, { n: 16, fuerza: .55, onda: false }); }
      requestAnimationFrame(cuadro); return;
    }

    if (estado === "cayendo") {
      // velocidad de caída: pausada, proporcional a la pantalla
      var vT = Math.max(78, Math.min(window.innerHeight * .13, 130));
      var dist = vT * (seg - TAU * (1 - Math.exp(-seg / TAU)));
      var objetivo = altoDoc - 78;           // fondo de la página
      var y = y0 + dist;
      // balanceo lateral como una hoja; crece al ganar velocidad
      var amp = Math.min(window.innerWidth * .2, 78) * Math.min(1, seg / 2.2);
      var w1 = seg * .95 + semilla;
      var x = x0 + amp * Math.sin(w1) + amp * .35 * Math.sin(w1 * 2.3 + 1.1);
      var minX = 22, maxX = window.innerWidth - 22;
      x = Math.max(minX, Math.min(maxX, x));
      var rotZ = 34 * Math.cos(w1) + 10 * Math.sin(w1 * 2.3);
      var rotX = 62 * Math.sin(seg * 1.9 + semilla);
      var rotY = 38 * Math.sin(seg * 1.35 + 2);

      if (y >= objetivo) {                    // llegó al final: se posa
        estado = "posado"; posadoEn = ahora; posadoX = x; posadoY = objetivo;
        var pa = enPantalla(posadoX, posadoY);
        if (pa && window.Magia) window.Magia.explotar(pa.x, pa.y, { n: 34, fuerza: .8 });
        requestAnimationFrame(cuadro); return;
      }
      poner(x, y, rotZ, rotX, rotY, esc, 1);

      // estela de chispas mientras se ve en pantalla
      if (ahora - ultimaChispa > 260 && window.Magia) {
        var pv = enPantalla(x, y);
        if (pv) { window.Magia.chispas(pv.x, pv.y + 6, 1); ultimaChispa = ahora; }
      }
      requestAnimationFrame(cuadro); return;
    }

    if (estado === "posado") {
      // descansa: se inclina hasta quedar casi plano y respira con un brillo suave
      var k = Math.min(1, (ahora - posadoEn) / 1100), e = 1 - Math.pow(1 - k, 3);
      var yy = altoDoc - 78;
      poner(posadoX, yy + 8 * e, 18 * e, 62 + 10 * e, 8 * e, esc, 1);
      if (k < 1) requestAnimationFrame(cuadro);   // al terminar de posarse el bucle se detiene
      return;
    }
  }

  function soltar() {
    if (estado !== "quieto") return;
    nodo.hidden = false;
    if (reducir) {          // sin movimiento: el pétalo ya está posado al final de la página
      estado = "posado"; inicio = performance.now(); medirDoc(inicio + 999);
      posadoX = window.innerWidth * .62; posadoEn = inicio - 5000;
      requestAnimationFrame(cuadro); return;
    }
    estado = "colgado"; inicio = performance.now();
    var f = posicionFlor(); x0 = f.x; y0 = f.y;
    poner(x0, y0, 0, 20, 0, .4, 1);
    requestAnimationFrame(cuadro);
  }

  // si cambia el tamaño de la pantalla estando posado, lo reubica una sola vez
  window.addEventListener("resize", function () {
    if (estado !== "posado") return;
    altoDoc = 0;
    requestAnimationFrame(function (t) { posadoEn = t - 5000; cuadro(t); });
  });

  window.PetaloGuia = { soltar: soltar };
})();
