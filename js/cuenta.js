/* Cuenta regresiva hasta la fiesta */
(function () {
  var cfg = window.INVITACION;
  var objetivo = new Date(cfg.fechaISO).getTime();
  var $ = function (id) { return document.getElementById(id); };
  var e = { d: $("c-dias"), h: $("c-horas"), m: $("c-min"), s: $("c-seg"), msg: $("c-mensaje") };
  var grilla = document.querySelector(".cuenta__grilla");
  var titulo = document.querySelector(".cuenta__titulo");
  var previo = {};

  function poner(nodo, valor, clave) {
    if (previo[clave] === valor) return;
    previo[clave] = valor;
    nodo.textContent = valor;
    if (clave === "s") { nodo.classList.remove("tic"); void nodo.offsetWidth; nodo.classList.add("tic"); }
  }
  function dos(n) { return String(n).padStart(2, "0"); }

  function actualizar() {
    var resto = objetivo - Date.now();
    if (resto <= 0) {
      grilla.hidden = true; titulo.hidden = true; e.msg.hidden = false;
      e.msg.textContent = resto > -12 * 3600 * 1000
        ? "¡Hoy es la gran noche!"
        : "Gracias por ser parte de esta noche";
      return;
    }
    var s = Math.floor(resto / 1000);
    poner(e.d, String(Math.floor(s / 86400)), "d");
    poner(e.h, dos(Math.floor(s % 86400 / 3600)), "h");
    poner(e.m, dos(Math.floor(s % 3600 / 60)), "m");
    poner(e.s, dos(s % 60), "s");
  }

  actualizar();
  setInterval(actualizar, 1000);
})();
