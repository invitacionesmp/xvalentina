/* ============================================================
   CONFIGURACIÓN DE LA INVITACIÓN
   Todo lo que cambia de una invitación a otra está acá.
   ============================================================ */
window.INVITACION = {
  nombre: "Valentina",
  evento: "Mis XV años",
  tematica: "Prepárate para una noche inolvidable",

  // Fecha y hora de la fiesta (con zona horaria de Argentina, -03:00)
  fechaISO: "2026-11-28T21:00:00-03:00",
  diaSemana: "Sábado",
  dia: "28",
  mes: "Noviembre",
  anio: "2026",
  hora: "21:00 hs",

  lugar: "Salón Los Mellis",
  ciudad: "Corrientes",
  mapa: "https://www.google.com/maps/place/Los+Mellis,+W3400+Corrientes/data=!4m2!3m1!1s0x94456bb90d4ddf35:0xc58dbe1def98e301!18m1!1e1",

  dressCode: "Elegante",
  coloresReservados: [
    { nombre: "Dorado", color: "#d4a937" },
    { nombre: "Amarillo", color: "#f4d03f" }
  ],

  alias: "valenttina.mp12",

  // Confirmación por WhatsApp.
  // Escribí el número con código de país y sin signos. Ej. Argentina: "5493794123456"
  // Si queda vacío, WhatsApp le pide al invitado que elija el contacto.
  whatsapp: "5493795765141",
  confirmarHasta: "25 de noviembre",

  // Música. El archivo está en assets/audio/. "inicio" es el segundo desde el que empieza a sonar.
  // Si cambiás el nombre del MP3, cambialo también acá (si no, no suena).
  playlist: [
    { titulo: "Cielo en la mente", artista: "Emilia", archivo: "assets/audio/musica.mp3", inicio: 9 }
  ],

  frase: [
    "Hay momentos que soñamos durante mucho tiempo y personas que hacen que esos momentos sean aún más especiales.",
    "Hoy comienza una de las etapas más lindas de mi vida, y no imagino vivirla sin compartirla con quienes forman parte de mi historia.",
    "Me encantaría que estés ahí para convertir esta noche en un recuerdo inolvidable."
  ]
};
