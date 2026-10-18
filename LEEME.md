# Invitación XV de Valentina

Invitación web hecha con HTML, CSS y JavaScript puros. No necesita instalar nada.

## Cómo verla
- Abrí `index.html` con doble clic, o
- En VS Code, con la extensión **Live Server**: clic derecho en `index.html` → *Open with Live Server*.

Para revisar el diseño sin el sobre de entrada: `index.html?directo`

## Estructura
```
index.html            Página principal
css/style.css         Colores, tipografías y diseño
js/config.js          TODOS los datos de la invitación (editar acá)
js/main.js            Sobre que se abre, calendario, alias, WhatsApp y destellos en los botones
js/magia.js           Partículas mágicas (destellos y pétalos)
js/petalo-guia.js     Pétalo que se desprende de la rosa y cae hasta el final de la página
js/petalos.js         Pétalos y polvo dorado de fondo (se dibuja a 30 cuadros/s y solo con la invitación abierta)
js/reproductor.js     Música: play/pausa, anterior, siguiente, barra, aleatorio, repetir, volumen
js/cuenta.js          Cuenta regresiva
assets/audio/         Música (MP3)
assets/fonts/         Tipografías incluidas (funciona sin internet)
assets/img/           Rosa con cúpula (solo .webp), piezas del sobre (recortadas de tu imagen), sello y favicon
herramientas/         Scripts opcionales y tus piezas originales (piezas-originales/)
                        recortar_sobre.py  vuelve a generar las piezas del sobre desde piezas-originales/sobre.png
                        procesar_rosa.py   vuelve a generar la rosa desde piezas-originales/Rosa.png (necesita opencv-python)
```

## Música
La canción es `assets/audio/musica.mp3` y empieza en el segundo 9.
Está definida en `js/config.js`, en `playlist`:
```js
{ titulo: "Cielo en la mente", artista: "Emilia", archivo: "assets/audio/musica.mp3", inicio: 9 }
```
- Si cambiás el nombre del archivo, cambialo también en `archivo`; si no, no suena.
- `inicio` es el segundo desde el que arranca. La barra y el tiempo cuentan desde ahí.
- El archivo original era en realidad un M4A con extensión .mp3. Lo convertí a MP3 verdadero para que suene en cualquier navegador. El original quedó en `herramientas/piezas-originales/musica-original.m4a`.
- Si agregás más canciones a la lista, anterior, siguiente y aleatorio empiezan a cambiar de tema.

## Lo que falta completar (js/config.js)
**WhatsApp**: poné el número en `whatsapp`, con código de país y sin signos (Argentina: `5493794123456`). Mientras esté vacío, WhatsApp le pide al invitado que elija el contacto.

## Datos cargados
- Salón Los Mellis, Corrientes · sábado 28 de noviembre de 2026 · 21:00 hs
- Dress code: elegante · colores reservados: dorado y amarillo
- Alias: valenttina.mp12 · confirmar hasta el 25 de noviembre

## Cómo publicarla (gratis)
- **Netlify Drop**: entrá a app.netlify.com/drop y arrastrá toda la carpeta.
- **GitHub Pages**: subí la carpeta a un repositorio y activá Pages.

Después compartí el link por WhatsApp.

## Optimización para celulares (cambios hechos)
- Se quitó el sobre que flotaba y el latido del sello: ahora el sobre está quieto hasta que se toca.
- Se eliminaron las estrellas blancas que titilaban por toda la página y sobre el nombre (js/destellos.js).
- Se quitó `backdrop-filter` (desenfoque de fondo) de reproductor, cuenta regresiva, ventanas y botón flotante.
- El fondo ya no usa `background-attachment: fixed` (repintaba todo en cada scroll).
- El dorado del texto ya no se anima, y el nombre ya no cambia su resplandor en cada cuadro.
- Resplandores del sobre, la carta, la rosa y el nombre: degradados fijos en vez de blur/drop-shadow animados.
- Pétalos de fondo: menos cantidad, 30 cuadros/s y pausados mientras el sobre está cerrado.
- Pétalo guía: al posarse al final de la página deja de animarse.
- Se borró rosa-cupula.png (el .webp se usa directo).

## Corrección del "movimiento de pantalla" (2.ª ronda)
La causa era el halo dorado detrás del nombre (`.nombre-wrap::before`): pulsaba con `scale()` y se salía unos píxeles del
borde de la pantalla, así que el navegador del celular re-encajaba toda la página una y otra vez. Ahora:
- el halo queda dentro de su caja y solo cambia de opacidad;
- las estrellitas del sobre (`titilar`) y la salida del sobre ya no usan `scale()` sobre capas de pantalla completa;
- `.invitacion` tiene `overflow-x:clip` como seguro extra.
