/* Arma la invitación con los datos de config.js y maneja el sobre mágico,
   sonidos de cristal (Web Audio API), destellos en los botones, scroll-reveal,
   calendario y WhatsApp. */
   (function () {
    var cfg = window.INVITACION;
    var $ = function (id) { return document.getElementById(id); };
  
    /* ---------- Sintetizador de Sonido Mágico (Web Audio API) ---------- */
    var audioCtx = null;
    function obtenerAudioCtx() {
      if (!audioCtx) {
        var AudioContext = window.AudioContext || window.webkitAudioContext;
        if (AudioContext) audioCtx = new AudioContext();
      }
      if (audioCtx && audioCtx.state === "suspended") audioCtx.resume();
      return audioCtx;
    }
  
    /* Sonido al abrir el sobre: ruptura suave de lacre + arpa de cristal encantada */
    function sonarHechizoApertura() {
      try {
        var ctx = obtenerAudioCtx();
        if (!ctx) return;
        var ahora = ctx.currentTime;
  
        // 1. Sello de lacre abriéndose (pulso cálido grave)
        var oscSello = ctx.createOscillator();
        var gainSello = ctx.createGain();
        oscSello.type = "triangle";
        oscSello.frequency.setValueAtTime(170, ahora);
        oscSello.frequency.exponentialRampToValueAtTime(52, ahora + 0.16);
        gainSello.gain.setValueAtTime(0.26, ahora);
        gainSello.gain.exponentialRampToValueAtTime(0.001, ahora + 0.16);
        oscSello.connect(gainSello);
        gainSello.connect(ctx.destination);
        oscSello.start(ahora);
        oscSello.stop(ahora + 0.17);
  
        // 2. Glissando mágico de cuento de hadas (Acorde Mayor Novena brillante)
        var notas = [523.25, 659.25, 783.99, 987.77, 1046.50, 1318.51, 1567.98, 2093.00, 2637.02];
        notas.forEach(function (frec, idx) {
          var t = ahora + 0.1 + idx * 0.085;
  
          // Tono principal de campana de cristal
          var osc = ctx.createOscillator();
          var gain = ctx.createGain();
          osc.type = "sine";
          osc.frequency.setValueAtTime(frec, t);
  
          gain.gain.setValueAtTime(0.0001, t);
          gain.gain.linearRampToValueAtTime(0.11 / Math.sqrt(idx * 0.35 + 1), t + 0.025);
          gain.gain.exponentialRampToValueAtTime(0.0001, t + 1.9);
  
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(t);
          osc.stop(t + 1.95);
  
          // Armónico estelar superior
          var oscBrillo = ctx.createOscillator();
          var gainBrillo = ctx.createGain();
          oscBrillo.type = "triangle";
          oscBrillo.frequency.setValueAtTime(frec * 2, t);
  
          gainBrillo.gain.setValueAtTime(0.0001, t);
          gainBrillo.gain.linearRampToValueAtTime(0.03, t + 0.015);
          gainBrillo.gain.exponentialRampToValueAtTime(0.0001, t + 0.85);
  
          oscBrillo.connect(gainBrillo);
          gainBrillo.connect(ctx.destination);
          oscBrillo.start(t);
          oscBrillo.stop(t + 0.9);
        });
      } catch (e) {}
    }
  
    /* Tintineo mágico corto para botones (copiar alias / agendar) */
    function sonarTintineo() {
      try {
        var ctx = obtenerAudioCtx();
        if (!ctx) return;
        var ahora = ctx.currentTime;
        [1046.5, 1318.5, 1567.98].forEach(function (f, i) {
          var t = ahora + i * 0.06;
          var osc = ctx.createOscillator();
          var gain = ctx.createGain();
          osc.type = "sine";
          osc.frequency.setValueAtTime(f, t);
          gain.gain.setValueAtTime(0.001, t);
          gain.gain.linearRampToValueAtTime(0.07, t + 0.015);
          gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.55);
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(t);
          osc.stop(t + 0.6);
        });
      } catch (e) {}
    }
  
    /* ---------- Aviso emergente ---------- */
    var aviso = $("aviso"), tAviso;
    window.mostrarAviso = function (txt) {
      aviso.textContent = txt;
      aviso.classList.add("visible");
      clearTimeout(tAviso);
      tAviso = setTimeout(function () { aviso.classList.remove("visible"); }, 2400);
    };
  
    /* ---------- Datos en pantalla ---------- */
    document.title = cfg.nombre + " · " + cfg.evento;
    document.querySelectorAll(".sobre__nombre,.portada__nombre,.pie__firma").forEach(function (n) { n.textContent = cfg.nombre; });
    document.querySelector(".portada__tema").textContent = cfg.tematica;
    $("frase-1").textContent = cfg.frase[0];
    $("frase-2").textContent = cfg.frase[1];
    $("frase-3").textContent = cfg.frase[2];
    $("f-semana").textContent = cfg.diaSemana;
    $("f-dia").textContent = cfg.dia;
    $("f-mes").textContent = cfg.mes;
    $("f-anio").textContent = cfg.anio;
    $("l-lugar").textContent = cfg.lugar;
    $("l-ciudad").textContent = cfg.ciudad;
    $("l-hora").textContent = cfg.hora;
    $("l-mapa").href = cfg.mapa;
    $("d-code").textContent = cfg.dressCode;
    $("alias-texto").textContent = cfg.alias;
    $("c-plazo").textContent = "Tenés tiempo hasta el " + cfg.confirmarHasta + " para confirmar";
  
    var muestras = $("muestras");
    cfg.coloresReservados.forEach(function (c) {
      var s = document.createElement("span");
      s.className = "muestra"; s.style.setProperty("--c", c.color);
      s.setAttribute("role", "listitem"); s.setAttribute("aria-label", c.nombre); s.title = c.nombre;
      muestras.appendChild(s);
    });
  
    /* ---------- Agregar al calendario (.ics) ---------- */
    function fechaICS(ms) { return new Date(ms).toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, ""); }
    $("l-calendario").addEventListener("click", function () {
      sonarTintineo();
      var ini = new Date(cfg.fechaISO).getTime(), fin = ini + 5 * 3600 * 1000;
      var ics = [
        "BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Invitacion XV//ES", "CALSCALE:GREGORIAN", "BEGIN:VEVENT",
        "UID:xv-" + cfg.nombre.toLowerCase() + "-" + ini + "@invitacion",
        "DTSTAMP:" + fechaICS(Date.now()), "DTSTART:" + fechaICS(ini), "DTEND:" + fechaICS(fin),
        "SUMMARY:XV años de " + cfg.nombre,
        "LOCATION:" + cfg.lugar + "\\, " + cfg.ciudad,
        "DESCRIPTION:" + cfg.tematica + ". Dress code: " + cfg.dressCode + ". Mapa: " + cfg.mapa.split("?")[0],
        "BEGIN:VALARM", "TRIGGER:-P1D", "ACTION:DISPLAY", "DESCRIPTION:Mañana son los XV de " + cfg.nombre, "END:VALARM",
        "END:VEVENT", "END:VCALENDAR"
      ].join("\r\n");
      var url = URL.createObjectURL(new Blob([ics], { type: "text/calendar;charset=utf-8" }));
      var a = document.createElement("a");
      a.href = url; a.download = "xv-" + cfg.nombre.toLowerCase() + ".ics";
      document.body.appendChild(a); a.click(); a.remove();
      setTimeout(function () { URL.revokeObjectURL(url); }, 4000);
      window.mostrarAviso("✨ Evento listo para tu calendario");
    });
  
    /* ---------- Copiar alias ---------- */
    $("alias-btn").addEventListener("click", function (e) {
      sonarTintineo();
      var txt = cfg.alias;
      function ok() { window.mostrarAviso("✨ Alias copiado al portapapeles"); }
      function plan_b() {
        var t = document.createElement("textarea");
        t.value = txt; t.setAttribute("readonly", ""); t.style.cssText = "position:fixed;opacity:0";
        document.body.appendChild(t); t.select();
        try { document.execCommand("copy"); ok(); } catch (err) { window.mostrarAviso("Alias: " + txt); }
        t.remove();
      }
      if (navigator.clipboard && window.isSecureContext) navigator.clipboard.writeText(txt).then(ok, plan_b);
      else plan_b();
    });
  
    /* ---------- Confirmar por WhatsApp ---------- */
    // Abre directo el chat del número de config.js (cfg.whatsapp).
    // Si el invitado escribió nombre y apellido, van en el mensaje; si no, sale solo la confirmación.
    var nombreInput = $("c-nombre"), wa = $("c-wa");
    var numWA = String(cfg.whatsapp || "").replace(/\D/g, "");

    function mensajeWA() {
      var quien = nombreInput.value.replace(/\s+/g, " ").trim();
      return "¡Hola! " + (quien ? "Soy " + quien + " y confirmo" : "Confirmo") +
        " mi asistencia a los XV de " + cfg.nombre + " el " + cfg.dia + " de " + cfg.mes.toLowerCase() + ". 🌹";
    }
    function linkWeb() { return "https://wa.me/" + numWA + "?text=" + encodeURIComponent(mensajeWA()); }
    function linkApp() { return "whatsapp://send?phone=" + numWA + "&text=" + encodeURIComponent(mensajeWA()); }
    function actualizarWA() { wa.href = linkWeb(); }

    nombreInput.addEventListener("input", actualizarWA);
    nombreInput.addEventListener("change", actualizarWA);
    actualizarWA();

    wa.addEventListener("click", function (e) {
      actualizarWA();                       // toma el nombre tal como está en este momento (autocompletar, pegar...)
      if (!/Android|iPhone|iPad|iPod/i.test(navigator.userAgent)) return;   // en computadora: enlace normal
      // En celular se abre la app de WhatsApp directo en el chat, sin pasar por la página intermedia.
      e.preventDefault();
      var web = linkWeb(), listo = false;
      function salio() { listo = true; }
      document.addEventListener("visibilitychange", salio, { once: true });
      window.addEventListener("pagehide", salio, { once: true });
      // Si la app no se abrió (no está instalada), cae al enlace web normal.
      setTimeout(function () { if (!listo) window.location.href = web; }, 1600);
      window.location.href = linkApp();
    });

    /* ---------- Animaciones al hacer Scroll (Scroll Reveal) ---------- */
    function iniciarScrollReveal() {
      var bloques = document.querySelectorAll(
        ".portada, .frase, .fecha, .cuenta, .ventana, .confirmar, .pie"
      );
      if (!("IntersectionObserver" in window)) {
        bloques.forEach(function (b) { b.classList.add("en-vista"); });
        return;
      }
      var obs = new IntersectionObserver(function (entradas) {
        entradas.forEach(function (en) {
          if (en.isIntersecting) {
            en.target.classList.add("en-vista");
            obs.unobserve(en.target);
          }
        });
      }, { threshold: 0.16, rootMargin: "0px 0px -30px 0px" });
  
      bloques.forEach(function (b) {
        b.classList.add("revelar-bloque");
        obs.observe(b);
      });
    }
  
    /* ---------- Destellos al tocar cualquier botón ---------- */
    var BOTONES = "button, a.boton, .ctl, .alias, .flotante";
    document.addEventListener("click", function (e) {
      if (!window.Magia) return;
      var b = e.target.closest ? e.target.closest(BOTONES) : null;
      if (!b || b.id === "abrir") return;          // el sobre tiene su propia secuencia
      var x = e.clientX, y = e.clientY;
      if (e.detail === 0 || (!x && !y)) {           // activado con teclado: desde el centro del botón
        var r = b.getBoundingClientRect();
        x = r.left + r.width / 2; y = r.top + r.height / 2;
      }
      var cfgMagia = { n: 26, fuerza: .8 };                                   // controles chicos
      if (b.id === "r-play" || b.id === "flotante") cfgMagia = { n: 46, fuerza: 1.05 };
      if (b.id === "c-wa") cfgMagia = { n: 66, fuerza: 1.25, petalos: 9, colores: Magia.colores.dorados.concat(Magia.colores.rosas) };
      if (b.id === "l-mapa" || b.id === "l-calendario" || b.id === "alias-btn") cfgMagia = { n: 40, fuerza: .95 };
      window.Magia.explotar(x, y, cfgMagia);
    }, true);

    /* ---------- Sobre: se rompe el sello, se abre la tapa y sale la carta ---------- */
    var sobre = $("sobre"), invitacion = $("invitacion"), abierto = false;
    var rapido = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    // Estrellitas que titilan alrededor del sobre mientras espera
    if (window.Magia) window.Magia.cielo(true);

    function centro(el) {
      var r = el.getBoundingClientRect();
      return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
    }

    function mostrarInvitacion(inmediato) {
      sobre.classList.add("saliendo");
      invitacion.classList.add("visible");
      invitacion.removeAttribute("aria-hidden");
      $("flotante").hidden = false;
      vigilarReproductor();
      iniciarScrollReveal();
      window.scrollTo(0, 0);
      if (window.Magia) window.Magia.cielo(false);

      if (!inmediato && window.Magia) {
        setTimeout(function () {
          window.Magia.explotar(window.innerWidth / 2, window.innerHeight * 0.3, { n: 64, fuerza: 1.1, onda: true });
        }, 450);
      }
      // El pétalo se desprende de la rosa y cae hasta el final de la página
      setTimeout(function () { if (window.PetaloGuia) window.PetaloGuia.soltar(); }, inmediato ? 400 : 1300);

      setTimeout(function () {
        document.body.classList.remove("bloqueado");
        sobre.hidden = true;
      }, inmediato ? 0 : 1500);
    }

    function vigilarReproductor() {
      var f = $("flotante");
      if (!("IntersectionObserver" in window)) return;
      new IntersectionObserver(function (en) {
        f.classList.toggle("oculto", en[0].isIntersecting);
      }, { threshold: 0.35 }).observe($("reproductor"));
    }

    function abrir() {
      if (abierto) return;
      abierto = true;
      var T = rapido ? 0.35 : 1;                       // con "reducir movimiento" todo es más corto
      sobre.classList.add("abierto");                   // 1) sello se rompe y la tapa se abre

      // La música arranca YA, dentro del toque (los celulares solo lo permiten así)
      if (window.Reproductor) window.Reproductor.reproducir();
      sonarHechizoApertura();

      var sello = $("sello");
      if (window.Magia && sello) {
        var c = centro(sello);
        window.Magia.explotar(c.x, c.y, { n: 78, fuerza: 1.15, petalos: 12, radioOnda: 160 });
      }

      setTimeout(function () {                          // 2) la carta sube
        sobre.classList.add("carta-arriba");
        if (window.Magia) {
          var cj = centro(document.querySelector(".caja"));
          window.Magia.explotar(cj.x, cj.y - 70, { n: 40, fuerza: .9, onda: false });
        }
      }, 950 * T);

      setTimeout(function () {                          // 3) destello sobre la carta
        if (window.Magia) {
          var cc = centro(document.querySelector(".carta"));
          window.Magia.explotar(cc.x, cc.y, { n: 56, fuerza: 1, radioOnda: 130 });
        }
      }, 2300 * T);

      setTimeout(function () { mostrarInvitacion(false); }, 2900 * T);   // 4) entra la invitación
    }

    $("abrir").addEventListener("click", abrir);

    if (/[?&]directo/.test(location.search)) {
      abierto = true;
      mostrarInvitacion(true);
    }
  })();
