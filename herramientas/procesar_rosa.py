#!/usr/bin/env python3
"""
Recorta la cúpula con la rosa (Rosa.png) y le saca el fondo de estrellas,
para que flote sobre la página sin ningún rectángulo.

Cómo funciona: el fondo original es un degradado azul oscuro casi uniforme.
Se estima ese fondo fila por fila (mirando los bordes de la imagen) y se
calcula cuánto se aleja cada píxel de él. Lo que no se aleja (vidrio, aire)
queda transparente; lo que sí (rosa, oro, destellos) queda opaco. Así el
vidrio conserva sus reflejos y deja ver el fondo de la página.

Además se recorta con la silueta exacta de la cúpula, así no queda ningún halo
ni resplandor del fondo original alrededor del vidrio.

Requiere: python3, numpy, scipy, opencv-python y pillow.
Uso:  python3 herramientas/procesar_rosa.py [Rosa.png] [salida_sin_extension]
"""
import os, sys
import numpy as np
import cv2
from PIL import Image
from scipy.ndimage import gaussian_filter, gaussian_filter1d, distance_transform_edt

AQUI = os.path.dirname(os.path.abspath(__file__))
ENTRADA = sys.argv[1] if len(sys.argv) > 1 else os.path.join(AQUI, "piezas-originales", "Rosa.png")
SALIDA = sys.argv[2] if len(sys.argv) > 2 else os.path.join(AQUI, "..", "assets", "img", "rosa-cupula")

D0, D1 = 9.0, 40.0          # umbrales de distancia al fondo (transparente -> opaco)

img = np.asarray(Image.open(ENTRADA).convert("RGB")).astype(np.float32)
H, W, _ = img.shape

# 1) fondo estimado: mediana de las franjas laterales, fila por fila
izq = gaussian_filter1d(np.median(img[:, 14:120], axis=1), 6, axis=0)
der = gaussian_filter1d(np.median(img[:, W - 120:W - 14], axis=1), 6, axis=0)
t = np.clip((np.arange(W) - 67) / (W - 134), 0, 1)[None, :, None]
fondo = izq[:, None, :] * (1 - t) + der[:, None, :] * t

# 2) silueta de la cúpula (coordenadas de la imagen original), dibujada con suavizado
SS = 4
def silueta(margen=0):
    m = np.zeros((H * SS, W * SS), np.uint8)
    f = lambda v: int(round(v * SS))
    cx, a, b, yc = 537.7, 221 + margen, 220 + margen, 597
    cv2.ellipse(m, (f(cx), f(yc)), (f(a), f(b)), 0, 180, 360, 255, -1, cv2.LINE_AA)
    cv2.rectangle(m, (f(cx - a), f(yc)), (f(cx + a), f(1175)), 255, -1)
    cv2.circle(m, (f(541), f(326)), f(33 + margen), 255, -1, cv2.LINE_AA)
    cv2.fillPoly(m, [np.array([[f(514 - margen), f(340)], [f(568 + margen), f(340)], [f(570 + margen), f(356)],
        [f(594 + margen), f(378 + margen)], [f(594 + margen), f(386)], [f(488 - margen), f(386)],
        [f(488 - margen), f(378 + margen)], [f(512 - margen), f(356)]], np.int32)], 255)
    cv2.ellipse(m, (f(538), f(1160)), (f(248 + margen), f(24 + margen)), 0, 0, 360, 255, -1, cv2.LINE_AA)
    cv2.rectangle(m, (f(290 - margen), f(1160)), (f(786 + margen), f(1214)), 255, -1)
    cv2.ellipse(m, (f(538), f(1214)), (f(248 + margen), f(30 + margen)), 0, 0, 180, 255, -1, cv2.LINE_AA)
    return cv2.resize(m, (W, H), interpolation=cv2.INTER_AREA).astype(np.float32) / 255
S0, S3 = silueta(0), silueta(3)

# 3) el resplandor que rodea la cúpula en la imagen original se estima y se resta
#    del fondo (también hacia adentro), para que no cuente como contenido
dmin = distance_transform_edt(S0 < 0.5)
din = distance_transform_edt(S0 >= 0.5)
anillo = ((dmin > 2) & (dmin < 90)).astype(np.float32)
halo = np.clip(img - fondo, 0, None)
SIG = 22
num = np.stack([gaussian_filter(halo[..., c] * anillo, SIG) for c in range(3)], -1)
den = gaussian_filter(anillo, SIG)[..., None]
hf = num / np.maximum(den, 1e-4)
fondo2 = fondo + hf * (np.exp(-din / 38.0)[..., None] * (S0[..., None] > 0.5))

# 4) transparencia según qué tanto se aleja del fondo, limitada a la silueta
dist = gaussian_filter(np.sqrt(((img - fondo2) ** 2).sum(axis=2)), 0.7)
a = np.clip((dist - D0) / (D1 - D0), 0, 1)
a = a * a * (3 - 2 * a)
a *= gaussian_filter(S3, 0.9)

# 5) color sin el fondo mezclado
af = np.maximum(a, 1e-3)[..., None]
col = np.clip(np.where(a[..., None] > 0.02, (img - (1 - a[..., None]) * fondo2) / af, img), 0, 255)

rgba = np.dstack([col, a * 255]).astype(np.uint8)
im = Image.fromarray(rgba, "RGBA")
caja = im.getchannel("A").point(lambda v: 255 if v > 4 else 0).getbbox()
pad = 10
caja = (max(caja[0] - pad, 0), max(caja[1] - pad, 0), min(caja[2] + pad, W), min(caja[3] + pad, H))
im = im.crop(caja)
im.save(SALIDA + ".png", optimize=True)
im.save(SALIDA + ".webp", quality=92, method=6)
print("recorte", caja, "tamaño", im.size)
print("posición aproximada de la flor (x%, y%):",
      round((545 - caja[0]) / im.width * 100, 1), round((600 - caja[1]) / im.height * 100, 1))
