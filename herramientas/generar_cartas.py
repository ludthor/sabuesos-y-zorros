#!/usr/bin/env python3
"""Genera el kit imprimible de Sabuesos y Zorros (línea gráfica «pop geométrico»).

Uso (desde la raíz del repositorio):
    python3 herramientas/generar_cartas.py [cartas/cartas.csv] [imprimir]

Produce:
    SyZ-Beta2-imprimible.pdf   portada + frentes + dorsos (impresión a una cara)
    SyZ-Beta2-doble-cara.pdf   frentes con su dorso intercalado (impresión a doble cara)

Requiere reportlab (ver requirements.txt) y la carpeta «fuentes» del repositorio
con Bricolage Grotesque (licencia SIL OFL 1.1).

Código: licencia MIT. Contenido del juego: CC BY 4.0. Autor: Ariel Ortiz Beltrán.
"""
import csv
import os
import sys

from reportlab.lib.colors import Color, HexColor
from reportlab.lib.enums import TA_LEFT
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.units import mm
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.pdfgen import canvas
from reportlab.platypus import Paragraph

AQUI = os.path.dirname(os.path.abspath(__file__))
RAIZ = os.path.dirname(AQUI)
FUENTES = next(p for p in (os.path.join(RAIZ, "fuentes"), os.path.join(AQUI, "fuentes")) if os.path.isdir(p))
pdfmetrics.registerFont(TTFont("Bric", os.path.join(FUENTES, "Bricolage-400.ttf")))
pdfmetrics.registerFont(TTFont("BricSemi", os.path.join(FUENTES, "Bricolage-600.ttf")))
pdfmetrics.registerFont(TTFont("BricBold", os.path.join(FUENTES, "Bricolage-800.ttf")))
pdfmetrics.registerFontFamily("Bric", normal="Bric", bold="BricBold", italic="Bric", boldItalic="BricBold")

VERSION = "Beta 2"
CREDITO = "CC BY 4.0 · Ariel Ortiz Beltrán"

# ---------- paleta ----------
CREMA = HexColor("#FFF4E6")
TINTA = HexColor("#141414")
TEXTO = HexColor("#2B2520")
AZUL = HexColor("#2747D6")
NARANJA = HexColor("#FF6A2B")
AMARILLO = HexColor("#FFC93C")
NOTA = HexColor("#6B5E50")
CORTE = HexColor("#BDB6AC")

# ---------- geometría: 63 x 88 mm, rejilla 3 x 3 en A4 ----------
CW, CH = 63 * mm, 88 * mm
S = CW / 298.0  # 1 px del diseño de referencia (298 x 416) en puntos
PW, PH = A4
COLS, ROWS = 3, 3
MX = (PW - COLS * CW) / 2
MY = (PH - ROWS * CH) / 2

# ---------- ilustraciones (polígonos en un lienzo 0-100) ----------
SABUESO = [
    ("66,74 76,58 78,40 92,96 64,96", "#3555E3"),
    ("30,28 40,18 70,22 78,40 60,48 38,40", "#2747D6"),
    ("30,28 38,40 34,52 12,50 8,40 14,32", "#4A68F0"),
    ("12,50 34,52 30,60 17,58", "#1C35A8"),
    ("56,26 72,30 76,58 66,74 56,62 52,40", "#13277D"),
    ("6,37 13,35 14,43 7,45", "#141414"),
    ("39,29 46,28 44,33", "#FFF4E6"),
]
SABUESO_MONO = [
    ("66,74 76,58 78,40 92,96 64,96", ("#FFF4E6", 0.55)),
    ("30,28 40,18 70,22 78,40 60,48 38,40", ("#FFF4E6", 1.0)),
    ("30,28 38,40 34,52 12,50 8,40 14,32", ("#FFF4E6", 0.82)),
    ("12,50 34,52 30,60 17,58", ("#FFF4E6", 0.62)),
    ("56,26 72,30 76,58 66,74 56,62 52,40", ("#FFF4E6", 0.40)),
    ("6,37 13,35 14,43 7,45", "#141414"),
    ("39,29 46,28 44,33", "#141414"),
]
ZORRO = [
    ("18,10 38,38 22,44", "#FF8A50"),
    ("82,10 62,38 78,44", "#E2531A"),
    ("22,17 33,36 25,40", "#141414"),
    ("78,17 67,36 75,40", "#141414"),
    ("22,44 38,38 50,46 50,62 30,58", "#FF7A3D"),
    ("78,44 62,38 50,46 50,62 70,58", "#F0601F"),
    ("22,44 30,58 50,88 14,56", "#FFFFFF"),
    ("78,44 70,58 50,88 86,56", "#F2DFC6"),
    ("30,58 50,62 50,88", "#FFE9D2"),
    ("70,58 50,62 50,88", "#EBD3B5"),
    ("46,83 54,83 50,89", "#141414"),
    ("33,50 41,52 34,55", "#141414"),
    ("67,50 59,52 66,55", "#141414"),
]
ZORRO_MONO = [
    ("18,10 38,38 22,44", ("#FFF4E6", 0.80)),
    ("82,10 62,38 78,44", ("#FFF4E6", 0.55)),
    ("22,17 33,36 25,40", "#141414"),
    ("78,17 67,36 75,40", "#141414"),
    ("22,44 38,38 50,46 50,62 30,58", ("#FFF4E6", 0.70)),
    ("78,44 62,38 50,46 50,62 70,58", ("#FFF4E6", 0.50)),
    ("22,44 30,58 50,88 14,56", ("#FFF4E6", 1.0)),
    ("78,44 70,58 50,88 86,56", ("#FFF4E6", 0.85)),
    ("30,58 50,62 50,88", ("#FFF4E6", 0.95)),
    ("70,58 50,62 50,88", ("#FFF4E6", 0.75)),
    ("46,83 54,83 50,89", "#141414"),
    ("33,50 41,52 34,55", "#141414"),
    ("67,50 59,52 66,55", "#141414"),
]
BANDERA = [
    ("26,10 32,10 32,96 26,96", "#141414"),
    ("32,10 88,28 32,46", "#141414"),
]

ESTILO = {
    "cacería": {"color": AZUL, "chip_fg": CREMA, "etiqueta": "CACERÍA", "id_color": AZUL},
    "supervivencia": {"color": NARANJA, "chip_fg": TINTA, "etiqueta": "SUPERVIVENCIA", "id_color": HexColor("#B8410F")},
    "rol": {"color": TINTA, "chip_fg": CREMA, "etiqueta": "ROL DEL TRIBUNAL", "id_color": TINTA},
    "rúbrica": {"color": TINTA, "chip_fg": CREMA, "etiqueta": "RÚBRICA", "id_color": TINTA},
}


def color(spec):
    if isinstance(spec, tuple):
        base = HexColor(spec[0])
        return Color(base.red, base.green, base.blue, alpha=spec[1])
    return HexColor(spec)


# ---------- utilidades de dibujo en unidades del diseño ----------

class Carta:
    """Traduce coordenadas del diseño (px desde la esquina superior izquierda) a puntos."""

    def __init__(self, c, x, y):
        self.c, self.x, self.y = c, x, y

    def X(self, dx):
        return self.x + dx * S

    def Y(self, dy):
        return self.y + CH - dy * S

    def ilustracion(self, poligonos, left, top, size):
        c = self.c
        for pts, spec in poligonos:
            coords = [tuple(float(v) for v in p.split(",")) for p in pts.split()]
            path = c.beginPath()
            for i, (u, v) in enumerate(coords):
                px = self.X(left + u / 100.0 * size)
                py = self.Y(top + v / 100.0 * size)
                if i == 0:
                    path.moveTo(px, py)
                else:
                    path.lineTo(px, py)
            path.close()
            c.setFillColor(color(spec))
            c.drawPath(path, stroke=0, fill=1)

    def chip(self, texto, dx, dy, bg, fg, size=12):
        c = self.c
        fs = size * S
        espacio = 1.5 * S
        ancho = c.stringWidth(texto, "BricBold", fs) + espacio * (len(texto) - 1)
        pad_x, alto = 12 * S, (size + 14) * S
        c.setFillColor(bg)
        c.roundRect(self.X(dx), self.Y(dy) - alto, ancho + 2 * pad_x, alto, alto / 2, stroke=0, fill=1)
        t = c.beginText(self.X(dx) + pad_x, self.Y(dy) - alto / 2 - fs * 0.36)
        t.setFont("BricBold", fs)
        t.setCharSpace(espacio)
        t.setFillColor(fg)
        t.textOut(texto)
        t.setCharSpace(0)
        c.drawText(t)
        return ancho + 2 * pad_x, alto

    def marca(self, letra, dx, dy):
        c = self.c
        r = 11 * S
        c.setFillColor(TINTA)
        c.circle(self.X(dx) + r, self.Y(dy) - r, r, stroke=0, fill=1)
        c.setFillColor(CREMA)
        c.setFont("BricBold", 11 * S)
        c.drawCentredString(self.X(dx) + r, self.Y(dy) - r - 3.6 * S, letra)
        return 2 * r


def ajustar(texto, fuente, tam, leading, ancho, alto_max, minimo, color_txt):
    """Devuelve el Paragraph más grande que cabe en ancho x alto_max."""
    while True:
        st = ParagraphStyle("p", fontName=fuente, fontSize=tam, leading=tam * leading,
                            textColor=color_txt, alignment=TA_LEFT, splitLongWords=0)
        p = Paragraph(texto, st)
        _, h = p.wrap(ancho, 10000)
        if (h <= alto_max and p.minWidth() <= ancho) or tam <= minimo:
            return p, h
        tam -= 0.3


def recorte(c, x, y):
    p = c.beginPath()
    p.rect(x, y, CW, CH)
    c.clipPath(p, stroke=0, fill=0)


# ---------- frentes ----------

def frente_accion(c, x, y, carta):
    est = ESTILO[carta["tipo"]]
    k = Carta(c, x, y)
    c.saveState()
    recorte(c, x, y)
    c.setFillColor(CREMA)
    c.rect(x, y, CW, CH, stroke=0, fill=1)
    # marco interior (tolera cortes imprecisos)
    c.setStrokeColor(est["color"])
    c.setLineWidth(3 * S)
    c.roundRect(k.X(11), k.Y(405), (298 - 22) * S, (416 - 22) * S, 14 * S, stroke=1, fill=0)
    # ilustración que rompe el marco
    tipo = carta["tipo"]
    if tipo == "cacería":
        k.ilustracion(SABUESO, 298 + 58 - 210, -46, 210)
    elif tipo == "supervivencia":
        k.ilustracion(ZORRO, 298 + 44 - 190, -40, 190)
    elif tipo == "rol":
        c.setFillColor(TINTA)
        c.circle(k.X(262), k.Y(36), 74 * S, stroke=0, fill=1)
        c.setStrokeColor(CREMA)
        c.setLineWidth(4 * S)
        c.circle(k.X(262), k.Y(36), 50 * S, stroke=1, fill=0)
        c.setFillColor(NARANJA)
        c.circle(k.X(262), k.Y(36), 22 * S, stroke=0, fill=1)
    elif tipo == "rúbrica":
        c.setStrokeColor(TINTA)
        c.setLineWidth(22 * S)
        c.setLineCap(1)
        c.setLineJoin(1)
        p = c.beginPath()
        p.moveTo(k.X(196), k.Y(52))
        p.lineTo(k.X(232), k.Y(88))
        p.lineTo(k.X(300), k.Y(6))
        c.drawPath(p, stroke=1, fill=0)
    # etiqueta y marcas
    w, h = k.chip(est["etiqueta"], 25, 25, est["color"], est["chip_fg"])
    mx = 25
    if carta.get("solo_ensayo") == "1":
        mx += k.marca("E", mx, 25 + h / S + 8) / S + 4
    if carta.get("solo_grupo") == "1":
        k.marca("G", mx, 25 + h / S + 8)
    # título
    ancho = (298 - 50) * S
    titulo, th = ajustar(carta["nombre"], "BricBold", 34 * S, 1.0, ancho, 2 * 34 * S * 1.02, 20 * S, TINTA)
    top_titulo = 112 if tipo == "rúbrica" else 140
    titulo.drawOn(c, k.X(25), k.Y(top_titulo) - th)
    # pie: momento e identificador
    base = 416 - 25
    if carta.get("momento"):
        momento = carta["momento"].split(" (")[0].upper()
        k.chip(momento, 25, base - 27, TINTA, CREMA)
    c.setFillColor(est["id_color"])
    c.setFont("BricSemi", 13 * S)
    c.drawRightString(k.X(298 - 25), k.Y(base - 9), carta["id"])
    # nota del momento
    limite = base - 27 - 8
    if "(" in carta.get("momento", ""):
        nota = carta["momento"].split("(")[1].rstrip(")")
        nota = nota[0].upper() + nota[1:] + "."
        c.setFillColor(NOTA)
        c.setFont("BricSemi", 11 * S)
        c.drawString(k.X(25), k.Y(limite - 2), nota)
        limite -= 20
    # cuerpo
    top_cuerpo = top_titulo + th / S + 12
    alto = (limite - top_cuerpo) * S
    if tipo == "rúbrica":
        texto = ("<b>1.</b> ¿Responde a lo preguntado? <b>(obligatorio)</b><br/>"
                 "<b>2.</b> ¿Se apoya en datos, fuentes o decisiones?<br/>"
                 "<b>3.</b> ¿Reconoce lo que no sabe o no cubre?<br/>"
                 "<b>Satisfactoria:</b> 1 y además 2 o 3. Ante la duda, gana el zorro.")
    else:
        texto = carta["texto"]
    cuerpo, bh = ajustar(texto, "Bric", 18 * S, 1.38, ancho, alto, 11 * S, TEXTO)
    cuerpo.drawOn(c, k.X(25), k.Y(top_cuerpo) - bh)
    c.restoreState()


def frente_territorio(c, x, y, carta):
    k = Carta(c, x, y)
    c.saveState()
    recorte(c, x, y)
    c.setFillColor(AMARILLO)
    c.rect(x, y, CW, CH, stroke=0, fill=1)
    k.ilustracion(BANDERA, 298 + 20 - 150, 416 + 14 - 150, 150)
    k.chip("TERRITORIO", 26, 26, TINTA, AMARILLO)
    titulo, th = ajustar(carta["nombre"], "BricBold", 46 * S, 1.0, (298 - 52) * S, 2 * 46 * S, 26 * S, TINTA)
    pregunta, ph = ajustar(carta["texto"], "BricSemi", 21 * S, 1.25, 200 * S, 140 * S, 15 * S, TINTA)
    bloque = th + 14 * S + ph
    top = k.Y(208) + bloque / 2
    titulo.drawOn(c, k.X(26), top - th)
    pregunta.drawOn(c, k.X(26), top - th - 14 * S - ph)
    c.setFillColor(TINTA)
    c.setFont("BricSemi", 13 * S)
    c.drawString(k.X(26), k.Y(416 - 26), carta["id"])
    c.restoreState()


def frente(c, x, y, carta):
    if carta["tipo"] == "territorio":
        frente_territorio(c, x, y, carta)
    else:
        frente_accion(c, x, y, carta)


# ---------- dorsos ----------

def dorso(c, x, y, tipo):
    k = Carta(c, x, y)
    c.saveState()
    recorte(c, x, y)
    if tipo == "cacería":
        fondo, texto, chip_bg, chip_fg = AZUL, CREMA, CREMA, AZUL
        c.setFillColor(fondo)
        c.rect(x, y, CW, CH, stroke=0, fill=1)
        k.ilustracion(SABUESO_MONO, -10, 66, 300)
    else:
        fondo, texto, chip_bg, chip_fg = NARANJA, TINTA, TINTA, CREMA
        c.setFillColor(fondo)
        c.rect(x, y, CW, CH, stroke=0, fill=1)
        k.ilustracion(ZORRO_MONO, 10, 80, 280)
    st = ParagraphStyle("t", fontName="BricBold", fontSize=30 * S, leading=29 * S, textColor=texto)
    p = Paragraph("Sabuesos<br/>y Zorros", st)
    _, h = p.wrap(250 * S, 200 * S)
    p.drawOn(c, k.X(24), k.Y(24) - h)
    k.chip(ESTILO[tipo]["etiqueta"], 24, 416 - 24 - 26, chip_bg, chip_fg)
    c.setFillColor(texto)
    c.setFont("BricSemi", 8 * S)
    c.drawString(k.X(24), k.Y(24) - h - 24 * S, CREDITO)
    c.restoreState()


# ---------- páginas ----------

def marcas_corte(c):
    c.saveState()
    c.setStrokeColor(CORTE)
    c.setLineWidth(0.3)
    for i in range(COLS + 1):
        xx = MX + i * CW
        c.line(xx, 0, xx, MY - 2 * mm)
        c.line(xx, PH - MY + 2 * mm, xx, PH)
    for j in range(ROWS + 1):
        yy = MY + j * CH
        c.line(0, yy, MX - 2 * mm, yy)
        c.line(PW - MX + 2 * mm, yy, PW, yy)
    c.restoreState()


def posicion(i, espejo=False):
    col, fila = i % COLS, i // COLS
    if espejo:
        col = COLS - 1 - col
    return MX + col * CW, PH - MY - (fila + 1) * CH


def pagina_frentes(c, cartas):
    marcas_corte(c)
    for i, carta in enumerate(cartas):
        frente(c, *posicion(i), carta)
    c.showPage()


def pagina_dorsos(c, tipo, n=9, espejo=False):
    marcas_corte(c)
    for i in range(n):
        dorso(c, *posicion(i, espejo), tipo)
    c.showPage()


def portada(c, total):
    c.setFillColor(CREMA)
    c.rect(0, 0, PW, PH, stroke=0, fill=1)
    # ilustraciones
    k = Carta(c, 0, 0)
    escala = 1.0

    def dibuja(pols, left_pt, top_pt, size_pt):
        for pts, spec in pols:
            coords = [tuple(float(v) for v in p.split(",")) for p in pts.split()]
            path = c.beginPath()
            for i, (u, v) in enumerate(coords):
                px = left_pt + u / 100.0 * size_pt
                py = top_pt - v / 100.0 * size_pt
                path.moveTo(px, py) if i == 0 else path.lineTo(px, py)
            path.close()
            c.setFillColor(color(spec))
            c.drawPath(path, stroke=0, fill=1)

    dibuja(SABUESO, PW - 95 * mm, PH - 8 * mm, 105 * mm)
    dibuja(ZORRO, PW - 72 * mm, PH - 108 * mm, 70 * mm)
    st = ParagraphStyle("h", fontName="BricBold", fontSize=58, leading=54, textColor=TINTA)
    p = Paragraph('<font color="#2747D6">Sabuesos</font><br/>y <font color="#FF6A2B">Zorros</font>', st)
    _, h = p.wrap(120 * mm, 80 * mm)
    p.drawOn(c, 22 * mm, PH - 40 * mm - h)
    c.setFont("BricSemi", 13)
    c.setFillColor(NOTA)
    c.drawString(22 * mm, PH - 50 * mm - h, "Kit de cartas para imprimir · %s" % VERSION)
    st2 = ParagraphStyle("b", fontName="Bric", fontSize=11, leading=16, textColor=TEXTO)
    texto = (
        "<b>Contenido.</b> %d cartas: 25 de cacería, 19 de supervivencia, 6 territorios, 6 roles y 1 rúbrica. "
        "Las fichas y los marcadores pueden ser monedas, botones o cualquier objeto de dos colores.<br/><br/>"
        "<b>Cómo imprimir.</b> Papel A4, escala al 100 %% (sin «ajustar a la página»). Recorta por las líneas "
        "grises de los márgenes. Cada carta mide 63 × 88 mm, el tamaño de una carta de póquer, así que caben "
        "en fundas estándar.<br/><br/>"
        "<b>Dorsos.</b> Si imprimes a una cara, al final hay una página de dorsos por baraja: imprímela tantas "
        "veces como páginas tenga esa baraja y pégala detrás. Para imprimir a doble cara, usa el archivo "
        "<b>SyZ-Beta2-doble-cara.pdf</b> y voltea por el borde largo.<br/><br/>"
        "<b>Marcas.</b> <b>E</b>: solo en modo ensayo. <b>G</b>: solo cuando defiende un equipo. "
        "La etiqueta negra inferior indica cuándo se juega la carta.<br/><br/>"
        "<b>Licencia.</b> Creative Commons Atribución 4.0 Internacional. Autor: Ariel Ortiz Beltrán. "
        "Tipografía: Bricolage Grotesque (SIL Open Font License)."
    ) % total
    p2 = Paragraph(texto, st2)
    _, h2 = p2.wrap(PW - 44 * mm, 140 * mm)
    p2.drawOn(c, 22 * mm, 22 * mm)
    c.showPage()


def leer(csv_path):
    with open(csv_path, encoding="utf-8") as f:
        filas = list(csv.DictReader(f))
    mazos = {}
    for fila in filas:
        for _ in range(int(fila["copias"])):
            mazos.setdefault(fila["tipo"], []).append(fila)
    return mazos


def trozos(lista, n=9):
    return [lista[i:i + n] for i in range(0, len(lista), n)]


def main(csv_path, salida):
    mazos = leer(csv_path)
    otros = mazos.get("territorio", []) + mazos.get("rol", []) + mazos.get("rúbrica", [])
    grupos = [("cacería", mazos["cacería"]), ("supervivencia", mazos["supervivencia"]), (None, otros)]
    total = sum(len(v) for v in mazos.values())
    titulo = "Sabuesos y Zorros %s" % VERSION

    c = canvas.Canvas(os.path.join(salida, "SyZ-Beta2-imprimible.pdf"), pagesize=A4)
    c.setTitle(titulo + " — kit imprimible")
    c.setAuthor("Ariel Ortiz Beltrán")
    portada(c, total)
    for _, cartas in grupos:
        for t in trozos(cartas):
            pagina_frentes(c, t)
    pagina_dorsos(c, "cacería")
    pagina_dorsos(c, "supervivencia")
    c.save()

    c = canvas.Canvas(os.path.join(salida, "SyZ-Beta2-doble-cara.pdf"), pagesize=A4)
    c.setTitle(titulo + " — doble cara")
    c.setAuthor("Ariel Ortiz Beltrán")
    for tipo, cartas in grupos:
        for t in trozos(cartas):
            pagina_frentes(c, t)
            if tipo:
                pagina_dorsos(c, tipo, n=len(t), espejo=True)
            else:
                c.showPage()
    c.save()
    print("Cartas:", total)


if __name__ == "__main__":
    csv_path = sys.argv[1] if len(sys.argv) > 1 else os.path.join(RAIZ, "cartas", "cartas.csv")
    salida = sys.argv[2] if len(sys.argv) > 2 else os.path.join(RAIZ, "imprimir")
    os.makedirs(salida, exist_ok=True)
    main(csv_path, salida)
