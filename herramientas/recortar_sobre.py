#!/usr/bin/env python3
"""
Recorta el sobre de la imagen original (piezas-originales/sobre.png) y arma las
piezas para la animación de apertura. Todas salen en assets/img/ como WebP con
transparencia y comparten el mismo lienzo (el sobre, ampliado 2x):

  sobre-fondo.webp          interior del sobre (papel real, más oscuro)
  sobre-frente.webp         bolsillo con la muesca en V (sin la tapa y sin el sello)
  sobre-tapa.webp           tapa por fuera, con sus bordes dorados
  sobre-tapa-interior.webp  tapa por dentro
  sello-lacre.webp          sello de lacre (recorte)

El papel que estaba tapado por el sello se reconstruye con la textura del propio
papel y se vuelven a trazar los bordes dorados hasta la punta de la tapa.

Requiere: python3, numpy, scipy, opencv-python y pillow.
Uso:  python3 herramientas/recortar_sobre.py
      DEBUG_DIR=/ruta python3 herramientas/recortar_sobre.py   (guarda pasos intermedios)
"""
import os, math
import numpy as np, cv2
from scipy import ndimage as ndi
from PIL import Image

AQUI = os.path.dirname(os.path.abspath(__file__))
FUENTE = os.path.join(AQUI, "piezas-originales", "sobre.png")
SALIDA = os.path.join(AQUI, "..", "assets", "img")
DEBUG = os.environ.get("DEBUG_DIR")
X0, X1, Y0, Y1 = 532, 1137, 371, 738        # el sobre dentro de la imagen original
ESC = 2                                      # ampliación
CENTRO_SELLO = (833.0, 583.0)                # aprox., se afina midiendo


def dbg(nombre, arr):
    if DEBUG:
        os.makedirs(DEBUG, exist_ok=True)
        a = arr if arr.dtype == np.uint8 else np.clip(arr, 0, 255).astype(np.uint8)
        if a.ndim == 3 and a.shape[2] == 3:
            a = a[:, :, ::-1]
        cv2.imwrite(os.path.join(DEBUG, nombre), a)


src = cv2.imread(FUENTE)[:, :, ::-1].astype(np.float32)          # RGB
R, G, B = src[..., 0], src[..., 1], src[..., 2]
lum = 0.299 * R + 0.587 * G + 0.114 * B

# ---------------------------------------------------------------- silueta del sobre
base = (lum > 120) & (R > B + 5)
base = ndi.binary_opening(base, iterations=1)
lab, n = ndi.label(base)
tam = ndi.sum(base, lab, range(1, n + 1))
base = lab == (1 + int(np.argmax(tam)))
base = ndi.binary_fill_holes(ndi.binary_closing(base, iterations=3))
blando = np.clip((lum - 60) / 80.0, 0, 1)
borde = ndi.binary_dilation(base, iterations=3)
alfa_full = blando * borde
alfa_full[ndi.binary_erosion(base, iterations=3)] = 1.0
alfa_full = cv2.GaussianBlur(alfa_full, (0, 0), 0.6)

# ---------------------------------------------------------------- sello
v0x, v0y = 740, 495
ventana = (slice(v0y, 680), slice(v0x, 940))
roja = ((R - G) > 40)[ventana]
roja = ndi.binary_closing(roja, iterations=2)
roja = ndi.binary_fill_holes(roja)
disco = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (31, 31)).astype(bool)   # borra lo fino (líneas doradas)
roja = ndi.binary_opening(roja, structure=disco)
lab, n = ndi.label(roja)
tam = ndi.sum(roja, lab, range(1, n + 1))
sello_m = np.zeros(R.shape, bool)
sello_m[ventana] = lab == (1 + int(np.argmax(tam)))
ys, xs = np.where(sello_m)
cx_s, cy_s = xs.mean(), ys.mean()
r_s = max(xs.max() - xs.min(), ys.max() - ys.min()) / 2.0
print(f"sello: centro=({cx_s:.1f},{cy_s:.1f}) radio~{r_s:.1f}")

# ---------------------------------------------------------------- bordes dorados de la tapa
def ajustar_linea(xs_rango, y_pred):
    pts = []
    for x in xs_rango:
        y0 = int(y_pred(x))
        franja = (R - B)[y0 - 12:y0 + 13, x]
        pts.append((x, y0 - 12 + int(np.argmax(franja))))
    pts = np.array(pts, float)
    a, b = np.polyfit(pts[:, 0], pts[:, 1], 1)
    return a, b

izq = ajustar_linea(range(600, 735, 3), lambda x: 375 + 0.826 * (x - 535))
der = ajustar_linea(range(935, 1085, 3), lambda x: 375 + 0.80 * (1135 - x))
# la derecha baja hacia la izquierda: reajusto con pendiente negativa
pts = []
for x in range(935, 1085, 3):
    y0 = int(375 + 0.80 * (1135 - x))
    franja = (R - B)[y0 - 12:y0 + 13, x]
    pts.append((x, y0 - 12 + int(np.argmax(franja))))
pts = np.array(pts, float)
der = tuple(np.polyfit(pts[:, 0], pts[:, 1], 1))
ax = (der[1] - izq[1]) / (izq[0] - der[0])
ay = izq[0] * ax + izq[1]
print(f"punta de la tapa (apice) en la imagen original: ({ax:.1f},{ay:.1f})")

# ---------------------------------------------------------------- reconstruir el papel bajo el sello
lienzo = src.copy()
desplazado = np.roll(sello_m, 16, axis=0)                                   # la sombra cae hacia abajo
hueco = ndi.binary_dilation(sello_m, iterations=int(r_s * 0.30) + 4) | ndi.binary_dilation(desplazado, iterations=int(r_s * 0.34) + 4)
hueco_u8 = (hueco * 255).astype(np.uint8)
relleno = cv2.inpaint(np.clip(src, 0, 255).astype(np.uint8), hueco_u8, 9, cv2.INPAINT_TELEA).astype(np.float32)

# textura del papel: zona limpia de referencia (solo para medir la intensidad del grano)
px0, px1, py0, py1 = 700, 960, 400, 470           # zona limpia de la tapa
parche = src[py0:py1, px0:px1]
alta = parche - cv2.GaussianBlur(parche, (0, 0), 5)
grano_std = float(alta.std())
print("intensidad del grano del papel:", round(grano_std, 2))

def ruido_papel(h, w, semilla, std):
    rng = np.random.default_rng(semilla)
    total = np.zeros((h, w), np.float32)
    for sigma, peso_b in ((0.7, 1.0), (1.8, 0.9), (5.0, 0.6)):
        b = cv2.GaussianBlur(rng.standard_normal((h, w)).astype(np.float32), (0, 0), sigma)
        total += peso_b * b / (b.std() + 1e-6)
    total *= std / (total.std() + 1e-6)
    return total[..., None] * np.array([1.0, 0.97, 0.9], np.float32)[None, None, :]

peso = cv2.GaussianBlur(hueco.astype(np.float32), (0, 0), 2.0)[..., None]
relleno_tex = relleno + ruido_papel(*src.shape[:2], 11, grano_std) * 1.0
limpio = src * (1 - peso) + np.clip(relleno_tex, 0, 255) * peso

# volver a trazar los bordes dorados dentro del hueco con los colores reales de la línea
def trazar_linea(img, a, b, x_ini, x_fin):
    """Dibuja la línea (y = a*x + b) desde x_ini hasta la punta, suavizada con 4x de resolución."""
    d = np.array([1.0, a]); d /= np.linalg.norm(d)
    n_ = np.array([-d[1], d[0]])                      # normal: apunta hacia el cuerpo del sobre
    sentido = 1 if x_fin > x_ini else -1
    est = [x_ini - sentido * k for k in range(10, 40, 3)]

    def color(off):
        c = []
        for xe in est:
            p = np.array([xe, a * xe + b]) + n_ * off
            c.append(cv2.getRectSubPix(img, (1, 1), (float(p[0]), float(p[1])))[0, 0])
        return np.median(np.array(c), axis=0)

    tiras = [(-2.6, 2.0, color(-2.6)), (0.0, 3.2, color(0.0)), (2.6, 2.0, color(2.6))]
    x_min, x_max = min(x_ini, x_fin) - 20, max(x_ini, x_fin) + 20
    y_min, y_max = int(min(a * x_min + b, a * x_max + b)) - 20, int(max(a * x_min + b, a * x_max + b)) + 20
    SS4 = 4
    hh_, ww_ = (y_max - y_min) * SS4, int(x_max - x_min) * SS4
    capa = np.zeros((hh_, ww_, 3), np.float32); cobertura = np.zeros((hh_, ww_), np.float32)
    sombra = np.zeros((hh_, ww_), np.float32)
    x = x_ini
    while (x - x_fin) * sentido < 0:
        centro = np.array([x, a * x + b])
        for off, ancho, col in tiras:
            p = centro + n_ * off
            q = (int(round((p[0] - x_min) * SS4)), int(round((p[1] - y_min) * SS4)))
            cv2.circle(capa, q, int(round(ancho * SS4 / 2)), [float(v) for v in col], -1, cv2.LINE_8)
            cv2.circle(cobertura, q, int(round(ancho * SS4 / 2)), 1.0, -1, cv2.LINE_8)
        ps = centro + n_ * 6.0
        cv2.circle(sombra, (int(round((ps[0] - x_min) * SS4)), int(round((ps[1] - y_min) * SS4))), 5 * SS4, 1.0, -1)
        x += sentido * 0.25
    capa_r = cv2.resize(capa, (ww_ // SS4, hh_ // SS4), interpolation=cv2.INTER_AREA)
    cob_r = cv2.resize(cobertura, (ww_ // SS4, hh_ // SS4), interpolation=cv2.INTER_AREA)
    som_r = cv2.GaussianBlur(cv2.resize(sombra, (ww_ // SS4, hh_ // SS4), interpolation=cv2.INTER_AREA), (0, 0), 2.0)
    capa_r = capa_r / np.maximum(cob_r[..., None], 1e-3)
    out = img.copy()
    y0_, x0_ = y_min, int(x_min)
    reg = out[y0_:y0_ + cob_r.shape[0], x0_:x0_ + cob_r.shape[1]]
    # solo dentro del hueco (afuera ya está la línea original) y con una sombra suave del lado del cuerpo
    h_reg = hueco[y0_:y0_ + cob_r.shape[0], x0_:x0_ + cob_r.shape[1]].astype(np.float32)
    h_reg = cv2.GaussianBlur(h_reg, (0, 0), 1.2)
    sombra_w = (som_r * 0.16 * h_reg)[..., None]
    reg[:] = reg * (1 - sombra_w) + np.array([120, 85, 55], np.float32) * sombra_w
    w_ = (np.clip(cob_r, 0, 1) * h_reg)[..., None]
    reg[:] = reg * (1 - w_) + capa_r * w_
    return out

def entra_en_hueco(a, b, desde, hacia):
    x = desde
    paso = 1 if hacia > desde else -1
    while (hacia - x) * paso > 0:
        y = a * x + b
        if hueco[int(round(y)), int(round(x))]:
            return x
        x += paso
    return hacia

xi = entra_en_hueco(*izq, 700, ax)
xd = entra_en_hueco(*der, 970, ax)
limpio = trazar_linea(limpio, izq[0], izq[1], xi, ax)
limpio = trazar_linea(limpio, der[0], der[1], xd, ax)
dbg("limpio.png", limpio)

# ---------------------------------------------------------------- recorte y ampliación
def recortar(arr):
    return arr[Y0:Y1, X0:X1]

def ampliar(rgb, alfa):
    h, w = alfa.shape
    rgb2 = cv2.resize(rgb, (w * ESC, h * ESC), interpolation=cv2.INTER_LANCZOS4)
    al2 = cv2.resize(alfa, (w * ESC, h * ESC), interpolation=cv2.INTER_CUBIC)
    suave = cv2.GaussianBlur(rgb2, (0, 0), 1.2)
    rgb2 = np.clip(rgb2 + 0.55 * (rgb2 - suave), 0, 255)          # un poco de nitidez
    return rgb2, np.clip(al2, 0, 1)

def guardar(nombre, rgb, alfa):
    out = np.dstack([np.clip(rgb, 0, 255).astype(np.uint8), (np.clip(alfa, 0, 1) * 255).astype(np.uint8)])
    Image.fromarray(out, "RGBA").save(os.path.join(SALIDA, nombre), "WEBP", quality=93, alpha_quality=100, method=6)
    print("ok", nombre, os.path.getsize(os.path.join(SALIDA, nombre)) // 1024, "KB", out.shape[1], "x", out.shape[0])

sil = recortar(alfa_full)                       # silueta del sobre
env = recortar(limpio)                          # sobre limpio, sin sello
H, W = sil.shape
SS = 4                                          # supersampling para bordes de polígono

def poligono(puntos):
    m = np.zeros((H * SS, W * SS), np.uint8)
    pts = (np.array(puntos) * SS).astype(np.int32)
    cv2.fillPoly(m, [pts], 255, lineType=cv2.LINE_AA)
    return cv2.resize(m, (W, H), interpolation=cv2.INTER_AREA).astype(np.float32) / 255

# vértices de la tapa en coordenadas del recorte; los bordes se corren "d" px hacia afuera
ax_c, ay_c = ax - X0, ay - Y0
izq_c = (izq[0], izq[1] + izq[0] * X0 - Y0)
der_c = (der[0], der[1] + der[0] * X0 - Y0)

def triangulo(d):
    # cada borde se desplaza d px en dirección normal (hacia el cuerpo), se recalcula la punta
    def desplazar(linea):
        a, b = linea
        return a, b + d * math.sqrt(1 + a * a)
    la, lb = desplazar(izq_c)
    ra, rb = desplazar(der_c)
    px = (rb - lb) / (la - ra)
    py = la * px + lb
    return [(-30, la * -30 + lb), (W + 30, ra * (W + 30) + rb), (px, py)] if False else \
           [(-40, -40), (W + 40, -40), (W + 40, ra * (W + 40) + rb), (px, py), (-40, la * -40 + lb)]

tapa_m = poligono(triangulo(+4))                 # incluye todo el borde dorado
cuerpo_m = 1 - poligono(triangulo(+1))           # la muesca en V del bolsillo
dbg("tapa_mask.png", (tapa_m * 255).astype(np.uint8))
alto_tapa = int(math.ceil(max(np.where(tapa_m > 0.02)[0]) + 2))
print("alto de la tapa (px originales):", alto_tapa, "de", H)

# ---------- frente y tapa por fuera
a_frente = sil * cuerpo_m
a_tapa = (sil * tapa_m)[:alto_tapa]
r, a = ampliar(env, a_frente);                    guardar("sobre-frente.webp", r, a)
r, a = ampliar(env[:alto_tapa], a_tapa);          guardar("sobre-tapa.webp", r, a)

# ---------- papel interior
muestra = np.median(src[py0:py1, px0:px1].reshape(-1, 3), axis=0)
print("color del papel:", muestra.round(0))
mos = ruido_papel(H, W, 5, grano_std)
yy, xx = np.mgrid[0:H, 0:W].astype(np.float32)

def papel_interior(factor, sombra_arriba):
    col = (muestra * np.array([factor, factor * 0.985, factor * 0.95]))[None, None, :]
    img = np.repeat(np.repeat(col, H, 0), W, 1) + mos * 0.9
    sombra = 1 - sombra_arriba * np.clip(1 - yy / (H * 0.62), 0, 1) ** 1.4
    borde = np.minimum.reduce([xx, W - 1 - xx, yy, H - 1 - yy])
    vineta = 1 - 0.10 * np.clip(1 - borde / 38.0, 0, 1) ** 1.5
    return img * (sombra * vineta)[..., None]

fondo = papel_interior(0.86, 0.24)
r, a = ampliar(fondo, sil);                       guardar("sobre-fondo.webp", r, a)

tapa_in = papel_interior(0.92, 0.0)
# aclara hacia la punta y oscurece suavemente junto al pliegue superior
grad = (0.90 + 0.12 * np.clip(yy / max(alto_tapa, 1), 0, 1))[..., None]
tapa_in = tapa_in * grad
r, a = ampliar(tapa_in[:alto_tapa], (sil * poligono(triangulo(+2)))[:alto_tapa]);  guardar("sobre-tapa-interior.webp", r, a)

# ---------- sello
rad = int(r_s) + 14
sx, sy = int(round(cx_s)), int(round(cy_s))
crop = slice(sy - rad, sy + rad), slice(sx - rad, sx + rad)
m_s = sello_m.astype(np.float32)
m_s = cv2.GaussianBlur(ndi.binary_erosion(sello_m, iterations=1).astype(np.float32), (0, 0), 0.8)
rgb_s, al_s = ampliar(src[crop], m_s[crop])
guardar("sello-lacre.webp", rgb_s, al_s)

# ---------- geometría para el CSS
print("\n--- DATOS PARA EL CSS ---")
print(f"lienzo: {W * ESC} x {H * ESC}  (relación {W / H:.4f})")
print(f"alto de la tapa: {alto_tapa / H * 100:.2f}%")
print(f"sello: centro x={(cx_s - X0) / W * 100:.2f}%  y={(cy_s - Y0) / H * 100:.2f}%  ancho={2 * rad / W * 100:.2f}%")
print(f"punta de la tapa: y={(ay - Y0) / H * 100:.2f}%")
