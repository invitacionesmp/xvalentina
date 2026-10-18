/* Reproductor completo: reproducir/pausar, anterior, siguiente, barra de avance,
   aleatorio, repetir (no / lista / una), volumen y silencio. */
(function () {
  var cfg = window.INVITACION;
  var lista = cfg.playlist || [];
  var audio = document.getElementById("audio");
  if (!audio || !lista.length) return;

  var $ = function (id) { return document.getElementById(id); };
  var el = {
    estado: $("r-estado"), titulo: $("r-titulo"), artista: $("r-artista"),
    actual: $("r-actual"), total: $("r-total"), progreso: $("r-progreso"),
    play: $("r-play"), prev: $("r-anterior"), next: $("r-siguiente"),
    mezclar: $("r-mezclar"), repetir: $("r-repetir"),
    silencio: $("r-silencio"), volumen: $("r-volumen"), flotante: $("flotante")
  };

  var indice = 0;          // canción actual (posición en la lista)
  var inicioSeg = 0;       // segundo desde el que suena la canción actual
  var orden = [];          // orden de reproducción
  var pos = 0;             // posición dentro de "orden"
  var aleatorio = false;
  var repetir = "off";     // off | all | one
  var inicio = false;      // ya se reprodujo alguna vez

  function aviso(txt) { if (window.mostrarAviso) window.mostrarAviso(txt); }

  function formato(s) {
    if (!isFinite(s)) return "0:00";
    s = Math.max(0, Math.floor(s));
    return Math.floor(s / 60) + ":" + String(s % 60).padStart(2, "0");
  }

  function pintarRango(r) {
    var p = (r.value - r.min) / (r.max - r.min) * 100;
    r.style.setProperty("--p", p + "%");
  }

  function armarOrden() {
    orden = lista.map(function (_, i) { return i; });
    if (aleatorio) {
      for (var i = orden.length - 1; i > 0; i--) {
        var j = Math.floor(Math.random() * (i + 1));
        var t = orden[i]; orden[i] = orden[j]; orden[j] = t;
      }
      var a = orden.indexOf(indice); orden.splice(a, 1); orden.unshift(indice);
      pos = 0;
    } else {
      pos = indice;
    }
  }

  function cargar(i, reproducir) {
    indice = i;
    var c = lista[i];
    inicioSeg = c.inicio || 0;
    audio.src = c.archivo;
    try { audio.currentTime = inicioSeg; } catch (e) { /* se ajusta al cargar los datos */ }
    el.titulo.textContent = c.titulo;
    el.artista.textContent = c.artista || "";
    el.progreso.value = 0; pintarRango(el.progreso);
    el.actual.textContent = "0:00"; el.total.textContent = "0:00";
    if ("mediaSession" in navigator && window.MediaMetadata) {
      navigator.mediaSession.metadata = new MediaMetadata({ title: c.titulo, artist: c.artista || "", album: "XV años · " + cfg.nombre });
    }
    if (reproducir) reproducirYa();
  }

  function reproducirYa() {
    var p = audio.play();
    if (p && p.catch) p.catch(function (e) {
      if (e && e.name === "NotAllowedError") { aviso("Tocá play para escuchar la música"); }
      else { aviso("No se pudo reproducir. Revisá el archivo de audio."); }
    });
  }

  function alternar() { if (audio.paused) reproducirYa(); else audio.pause(); }

  function siguiente(manual) {
    if (pos < orden.length - 1) { pos++; }
    else if (repetir === "all" || manual) { if (aleatorio) armarOrdenDesde(); pos = 0; }
    else { audio.pause(); audio.currentTime = inicioSeg; return; }
    cargar(orden[pos], true);
  }
  function armarOrdenDesde() {
    var ultima = orden[orden.length - 1];
    armarOrden();
    if (orden.length > 1 && orden[0] === ultima) { var t = orden[0]; orden[0] = orden[1]; orden[1] = t; }
  }

  function anterior() {
    if (audio.currentTime - inicioSeg > 3) { audio.currentTime = inicioSeg; return; }
    pos = pos > 0 ? pos - 1 : orden.length - 1;
    cargar(orden[pos], !audio.paused || inicio);
  }

  /* --- eventos del audio --- */
  // La barra y los tiempos cuentan desde "inicioSeg": 0:00 es el segundo configurado.
  function largo() { return Math.max(0, (audio.duration || 0) - inicioSeg); }
  function totales() { el.total.textContent = formato(largo()); }
  audio.addEventListener("loadedmetadata", function () {
    if (audio.currentTime < inicioSeg) audio.currentTime = inicioSeg;
    totales();
  });
  audio.addEventListener("durationchange", totales);
  audio.addEventListener("timeupdate", function () {
    if (!isFinite(audio.duration) || !largo()) return;
    if (audio.currentTime < inicioSeg - .25) { audio.currentTime = inicioSeg; return; }
    var rel = Math.max(0, audio.currentTime - inicioSeg);
    el.actual.textContent = formato(rel);
    el.progreso.value = Math.round(rel / largo() * 1000);
    pintarRango(el.progreso);
  });
  audio.addEventListener("play", function () {
    inicio = true;
    if (audio.currentTime < inicioSeg - .25) audio.currentTime = inicioSeg;
    document.body.dataset.sonando = "true";
    el.play.setAttribute("aria-label", "Pausar");
    el.flotante.setAttribute("aria-label", "Pausar música");
    el.estado.textContent = "Sonando ahora";
  });
  audio.addEventListener("pause", function () {
    document.body.dataset.sonando = "false";
    el.play.setAttribute("aria-label", "Reproducir");
    el.flotante.setAttribute("aria-label", "Reproducir música");
    if (inicio) el.estado.textContent = "En pausa";
  });
  audio.addEventListener("ended", function () {
    if (repetir === "one") { audio.currentTime = inicioSeg; reproducirYa(); }
    else siguiente(false);
  });
  audio.addEventListener("error", function () {
    document.body.dataset.sonando = "false";
    el.estado.textContent = "No se encontró el archivo de música";
  });

  /* --- controles --- */
  el.play.addEventListener("click", alternar);
  el.flotante.addEventListener("click", alternar);
  el.next.addEventListener("click", function () { siguiente(true); });
  el.prev.addEventListener("click", anterior);

  el.progreso.addEventListener("input", function () {
    pintarRango(el.progreso);
    if (isFinite(audio.duration) && largo()) {
      audio.currentTime = inicioSeg + el.progreso.value / 1000 * largo();
      el.actual.textContent = formato(audio.currentTime - inicioSeg);
    }
  });

  el.mezclar.addEventListener("click", function () {
    aleatorio = !aleatorio;
    el.mezclar.setAttribute("aria-pressed", String(aleatorio));
    el.mezclar.setAttribute("aria-label", aleatorio ? "Orden aleatorio: activado" : "Orden aleatorio: desactivado");
    armarOrden();
    aviso(aleatorio ? "Orden aleatorio activado" : "Orden aleatorio desactivado");
  });

  var etiquetasRepetir = { off: "Repetir: desactivado", all: "Repetir: toda la lista", one: "Repetir: una canción" };
  el.repetir.addEventListener("click", function () {
    repetir = repetir === "off" ? "all" : repetir === "all" ? "one" : "off";
    el.repetir.dataset.modo = repetir;
    el.repetir.setAttribute("aria-label", etiquetasRepetir[repetir]);
    aviso(etiquetasRepetir[repetir]);
  });

  function actualizarVolumen() {
    audio.volume = el.volumen.value / 100;
    audio.muted = audio.volume === 0 ? true : false;
    document.body.dataset.silencio = String(audio.muted);
    pintarRango(el.volumen);
  }
  el.volumen.addEventListener("input", function () { actualizarVolumen(); });
  el.silencio.addEventListener("click", function () {
    if (audio.muted || audio.volume === 0) {
      if (el.volumen.value === "0") el.volumen.value = 60;
      audio.muted = false; audio.volume = el.volumen.value / 100;
    } else { audio.muted = true; }
    document.body.dataset.silencio = String(audio.muted);
    el.silencio.setAttribute("aria-label", audio.muted ? "Activar sonido" : "Silenciar");
    pintarRango(el.volumen);
  });

  /* --- pantalla de bloqueo del celular --- */
  if ("mediaSession" in navigator) {
    try {
      navigator.mediaSession.setActionHandler("play", reproducirYa);
      navigator.mediaSession.setActionHandler("pause", function () { audio.pause(); });
      navigator.mediaSession.setActionHandler("previoustrack", anterior);
      navigator.mediaSession.setActionHandler("nexttrack", function () { siguiente(true); });
    } catch (e) { /* no soportado */ }
  }

  armarOrden();
  cargar(0, false);
  audio.volume = el.volumen.value / 100;
  pintarRango(el.volumen);
  document.body.dataset.sonando = "false";
  document.body.dataset.silencio = "false";

  window.Reproductor = {
    reproducir: reproducirYa,
    pausar: function () { audio.pause(); },
    alternar: alternar
  };
})();
