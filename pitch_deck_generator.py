"""
Generatore Pitch Deck PDF per LoveableConnect → Zest Group
14 slide, formato widescreen 16:9, tema viola/rosa coerente col sito.
"""
from reportlab.pdfgen import canvas
from reportlab.lib.colors import HexColor, Color
from reportlab.lib.units import cm
from reportlab.lib.utils import ImageReader

# ---- Configurazione ----
LOGO_PATH = "public/images/loveable-logo.png"
OUTPUT_PATH = "LoveableConnect_PitchDeck.pdf"
PAGE_W, PAGE_H = 1280, 720  # 16:9 widescreen
MARGIN = 60

# Palette (a tema sito)
BG_DARK = HexColor("#0e0717")
BG_GRADIENT_TOP = HexColor("#1a0b2e")
BG_GRADIENT_BOTTOM = HexColor("#3a0d3c")
PINK = HexColor("#ec4899")
PURPLE = HexColor("#a855f7")
VIOLET = HexColor("#8b5cf6")
TEXT_MAIN = HexColor("#ffffff")
TEXT_SOFT = HexColor("#c4b5d4")
TEXT_DIM = HexColor("#8b7ba1")
ACCENT = HexColor("#f472b6")

c = canvas.Canvas(OUTPUT_PATH, pagesize=(PAGE_W, PAGE_H))


def draw_bg(c):
    """Sfondo gradient simulato + accenti decorativi"""
    # Gradient con sottili rettangoli
    steps = 60
    for i in range(steps):
        t = i / steps
        r = (1 - t) * 0x1a / 255 + t * 0x3a / 255
        g = (1 - t) * 0x0b / 255 + t * 0x0d / 255
        b = (1 - t) * 0x2e / 255 + t * 0x3c / 255
        c.setFillColorRGB(r, g, b)
        c.rect(0, PAGE_H * (1 - (i + 1) / steps), PAGE_W, PAGE_H / steps + 1, fill=1, stroke=0)

    # Decoration: cerchio in alto a destra
    c.setFillColor(PINK)
    c.setFillAlpha(0.08)
    c.circle(PAGE_W - 80, PAGE_H - 80, 180, fill=1, stroke=0)
    # Cerchio in basso a sinistra
    c.setFillColor(VIOLET)
    c.setFillAlpha(0.08)
    c.circle(60, 60, 220, fill=1, stroke=0)
    c.setFillAlpha(1.0)


def draw_header(c, title, subtitle=None):
    """Header standard delle slide (non cover)"""
    c.setFillColor(PINK)
    c.rect(MARGIN, PAGE_H - MARGIN - 6, 70, 4, fill=1, stroke=0)
    c.setFont("Helvetica-Bold", 36)
    c.setFillColor(TEXT_MAIN)
    c.drawString(MARGIN, PAGE_H - MARGIN - 50, title)
    if subtitle:
        c.setFont("Helvetica", 16)
        c.setFillColor(TEXT_SOFT)
        c.drawString(MARGIN, PAGE_H - MARGIN - 75, subtitle)


def draw_footer(c, page_num, total):
    c.setFont("Helvetica", 10)
    c.setFillColor(TEXT_DIM)
    c.drawString(MARGIN, 30, "LoveableConnect · Pitch Deck · 2026")
    c.drawRightString(PAGE_W - MARGIN, 30, f"{page_num} / {total}")


def bullet(c, x, y, text, size=15, color=TEXT_SOFT, indent=24):
    """Disegna un bullet point con dot rosa"""
    c.setFillColor(PINK)
    c.circle(x + 6, y + 5, 4, fill=1, stroke=0)
    c.setFillColor(color)
    c.setFont("Helvetica", size)
    c.drawString(x + indent, y, text)


def wrap_text(c, text, x, y, max_width, font="Helvetica", size=15, line_h=22, color=TEXT_SOFT):
    """Wrap manuale del testo"""
    c.setFont(font, size)
    c.setFillColor(color)
    words = text.split()
    line = ""
    cur_y = y
    for w in words:
        test = line + (" " if line else "") + w
        if c.stringWidth(test, font, size) <= max_width:
            line = test
        else:
            c.drawString(x, cur_y, line)
            cur_y -= line_h
            line = w
    if line:
        c.drawString(x, cur_y, line)
    return cur_y


TOTAL = 14


# ============= SLIDE 1: COVER =============
def slide_cover():
    draw_bg(c)
    # Logo grande al centro-sinistra
    try:
        logo = ImageReader(LOGO_PATH)
        c.drawImage(logo, 120, PAGE_H / 2 - 130, width=260, height=260, mask='auto')
    except Exception as e:
        print(f"Logo non caricato: {e}")

    # Titolo
    c.setFont("Helvetica-Bold", 72)
    c.setFillColor(TEXT_MAIN)
    c.drawString(440, PAGE_H / 2 + 50, "LoveableConnect")

    # Sottotitolo
    c.setFont("Helvetica", 24)
    c.setFillColor(PINK)
    c.drawString(440, PAGE_H / 2 + 10, "Dating reinventato attraverso il gioco")

    # Tagline
    c.setFont("Helvetica", 18)
    c.setFillColor(TEXT_SOFT)
    c.drawString(440, PAGE_H / 2 - 30, "Una nuova piattaforma social-gaming dove l'incontro")
    c.drawString(440, PAGE_H / 2 - 55, "nasce dall'interazione reale tra utenti.")

    # Linea decorativa
    c.setStrokeColor(PINK)
    c.setLineWidth(3)
    c.line(440, PAGE_H / 2 - 90, 600, PAGE_H / 2 - 90)

    # Info bottom
    c.setFont("Helvetica", 14)
    c.setFillColor(TEXT_DIM)
    c.drawString(440, PAGE_H / 2 - 120, "Pitch Deck · 2026")
    c.drawString(440, PAGE_H / 2 - 145, "Giuseppe Chighini · Founder & CTO")

    c.showPage()


# ============= SLIDE 2: VISIONE =============
def slide_vision():
    draw_bg(c)
    draw_header(c, "Visione", "Dove vogliamo arrivare")

    y = PAGE_H - 220
    c.setFont("Helvetica-Bold", 28)
    c.setFillColor(TEXT_MAIN)
    c.drawString(MARGIN, y, "“Cambiare il modo in cui le persone si conoscono online.”")
    y -= 60

    paragraphs = [
        "Il dating tradizionale ha trasformato l'incontro in uno scroll infinito di foto.",
        "Pochi secondi, una decisione superficiale, zero relazione reale.",
        "",
        "LoveableConnect ribalta il modello: l'incontro nasce dall'interazione di gioco.",
        "Giocando insieme a Tris, Othello e Dama, anche in tornei a eliminazione,",
        "emergono carattere e affinità, e durante la partita si può mettere like",
        "all'avversario. Il match diventa la conseguenza di un'esperienza condivisa,",
        "non di uno swipe.",
    ]
    for p in paragraphs:
        if p:
            c.setFont("Helvetica", 17)
            c.setFillColor(TEXT_SOFT)
            c.drawString(MARGIN, y, p)
        y -= 28

    draw_footer(c, 2, TOTAL)
    c.showPage()


# ============= SLIDE 3: PROBLEMA =============
def slide_problem():
    draw_bg(c)
    draw_header(c, "Il problema", "Perché il dating online è rotto")

    y = PAGE_H - 200
    items = [
        ("Swipe fatigue", "Gli utenti scorrono migliaia di profili senza mai costruire una connessione."),
        ("Profili superficiali", "Le decisioni si basano su 4 foto e una bio: zero contesto sulla persona."),
        ("Conversazioni piatte", "Match che restano fermi, ghosting, chat che non decollano."),
        ("Dating app burnout reale", "Il 78% degli utenti dating si dichiara emotivamente esausto (Forbes Health/OnePoll, 2024)."),
        ("Mancanza di gioco / leggerezza", "L'app diventa lavoro emotivo: nessuna piattaforma rende il processo divertente."),
    ]
    for title, desc in items:
        c.setFillColor(PINK)
        c.circle(MARGIN + 6, y + 5, 4, fill=1, stroke=0)
        c.setFont("Helvetica-Bold", 18)
        c.setFillColor(TEXT_MAIN)
        c.drawString(MARGIN + 24, y, title)
        c.setFont("Helvetica", 15)
        c.setFillColor(TEXT_SOFT)
        c.drawString(MARGIN + 24, y - 22, desc)
        y -= 65

    draw_footer(c, 3, TOTAL)
    c.showPage()


# ============= SLIDE 4: SOLUZIONE =============
def slide_solution():
    draw_bg(c)
    draw_header(c, "La soluzione", "Conoscersi giocando, non scrollando")

    # Box 1
    boxes = [
        ("Suite di mini-giochi",
         "Tris, Othello e Dama con sistema ELO e classifica.",
         "Giochi che richiedono pensiero e personalità, non solo riflessi."),
        ("Tornei a eliminazione",
         "Bracket a 8 sfidanti su Othello e Dama, con premi e titoli.",
         "Competizione strutturata che spinge ritorno e ingaggio quotidiano."),
        ("“Tenta il Destino”",
         "Un quiz di affinità a scelte rapide che propone profili compatibili.",
         "Trasforma la scoperta in un'esperienza giocosa, non in uno scroll."),
        ("Titoli, badge & crediti",
         "Obiettivi sbloccabili, classifiche e crediti monetizzabili via Stripe.",
         "La gamification diventa il driver d'uso e di monetizzazione."),
    ]

    col_w = (PAGE_W - 2 * MARGIN - 30) / 2
    box_h = 180
    positions = [
        (MARGIN, PAGE_H - 320),
        (MARGIN + col_w + 30, PAGE_H - 320),
        (MARGIN, PAGE_H - 320 - box_h - 20),
        (MARGIN + col_w + 30, PAGE_H - 320 - box_h - 20),
    ]

    for (title, sub, desc), (x, y) in zip(boxes, positions):
        c.setFillColor(HexColor("#1f1530"))
        c.setStrokeColor(PURPLE)
        c.setLineWidth(1)
        c.roundRect(x, y, col_w, box_h, 12, fill=1, stroke=1)

        c.setFillColor(PINK)
        c.setFont("Helvetica-Bold", 18)
        c.drawString(x + 20, y + box_h - 35, title)
        c.setFillColor(TEXT_MAIN)
        c.setFont("Helvetica-Bold", 14)
        c.drawString(x + 20, y + box_h - 65, sub)
        c.setFillColor(TEXT_SOFT)
        c.setFont("Helvetica", 13)
        wrap_text(c, desc, x + 20, y + box_h - 100, col_w - 40, size=13, line_h=18)

    draw_footer(c, 4, TOTAL)
    c.showPage()


# ============= SLIDE: NOVITÀ / FEATURE FLAGSHIP =============
def slide_highlights():
    draw_bg(c)
    draw_header(c, "Novità di prodotto", "Le funzionalità che ci distinguono")

    cards = [
        ("Tornei a eliminazione",
         "Bracket a 8 sfidanti su Othello e Dama: quarti, semifinali e finale, "
         "con avversari calibrati per livello, premi in crediti ed ELO e gestione "
         "automatica degli spareggi. Una vera competizione che crea ritorno quotidiano."),
        ("“Tenta il Destino”",
         "Un quiz di affinità interamente a scelte rapide (gusti, indole, scenari) "
         "che, al termine, propone profili compatibili da scoprire uno alla volta. "
         "La scoperta diventa un gioco, non uno scroll infinito."),
        ("Suite di giochi ampliata",
         "Oltre a Tris e Dama, abbiamo introdotto Othello, con regole complete, "
         "sistema ELO e classifica condivisa. Più modi di interagire, più occasioni "
         "di conoscersi davvero."),
        ("Titoli, badge & obiettivi",
         "Un sistema di riconoscimenti sbloccabili, come Champion, Tournament Champion "
         "e traguardi di vittorie e di ELO, con icone dedicate. Progressione e status "
         "che premiano la fedeltà e alimentano l'ingaggio."),
    ]

    col_w = (PAGE_W - 2 * MARGIN - 30) / 2
    box_h = 175
    positions = [
        (MARGIN, PAGE_H - 315),
        (MARGIN + col_w + 30, PAGE_H - 315),
        (MARGIN, PAGE_H - 315 - box_h - 20),
        (MARGIN + col_w + 30, PAGE_H - 315 - box_h - 20),
    ]

    for (title, desc), (x, y) in zip(cards, positions):
        c.setFillColor(HexColor("#1f1530"))
        c.setStrokeColor(PINK)
        c.setLineWidth(1.2)
        c.roundRect(x, y, col_w, box_h, 12, fill=1, stroke=1)
        c.setFillColor(PINK)
        c.setFont("Helvetica-Bold", 19)
        c.drawString(x + 20, y + box_h - 38, title)
        c.setFillColor(TEXT_SOFT)
        wrap_text(c, desc, x + 20, y + box_h - 70, col_w - 40, size=13, line_h=19)

    draw_footer(c, 5, TOTAL)
    c.showPage()


# ============= SLIDE 5: MERCATO =============
def slide_market():
    draw_bg(c)
    draw_header(c, "Il mercato", "Dating online → social gaming")

    y = PAGE_H - 200
    c.setFont("Helvetica-Bold", 22)
    c.setFillColor(TEXT_MAIN)
    c.drawString(MARGIN, y, "Mercato globale del dating online")
    y -= 40
    c.setFont("Helvetica", 15)
    c.setFillColor(TEXT_SOFT)
    c.drawString(MARGIN, y, "•  Valore stimato tra $11 e $13 miliardi nel 2025")
    y -= 24
    c.drawString(MARGIN, y, "•  Oltre 390 milioni di utenti attivi a livello globale")
    y -= 24
    c.drawString(MARGIN, y, "•  CAGR atteso ~7-9% nei prossimi anni")
    y -= 24
    c.drawString(MARGIN, y, "•  Europa: tasso di penetrazione ~8,8% nel 2025, in crescita")
    y -= 30
    c.setFont("Helvetica-Oblique", 11)
    c.setFillColor(TEXT_DIM)
    c.drawString(MARGIN, y, "Fonti: Business of Apps (2026), Statista Market Forecast (2025), SkyQuest Research")

    y -= 50
    c.setFont("Helvetica-Bold", 22)
    c.setFillColor(TEXT_MAIN)
    c.drawString(MARGIN, y, "Trend rilevanti")
    y -= 40
    c.setFont("Helvetica", 15)
    c.setFillColor(TEXT_SOFT)
    c.drawString(MARGIN, y, "•  Gen Z e Millennial chiedono esperienze diverse dal classico swipe")
    y -= 24
    c.drawString(MARGIN, y, "•  Convergenza fra dating, social e gaming come direzione di crescita")
    y -= 24
    c.drawString(MARGIN, y, "•  Modello di business validato: freemium + acquisti in-app + abbonamenti")

    draw_footer(c, 6, TOTAL)
    c.showPage()


# ============= SLIDE 6: PRODOTTO =============
def slide_product():
    draw_bg(c)
    draw_header(c, "Il prodotto", "Cosa abbiamo già costruito")

    features_left = [
        ("Autenticazione & profili", "Email/password, verifica età 18+, profili ricchi (foto, bio, interessi, canzoni Spotify)."),
        ("Matching & “Tenta il Destino”", "Like reciproci, filtri avanzati e un quiz di affinità a scelte rapide che propone profili compatibili."),
        ("Suite di giochi (Tris, Othello, Dama)", "Sfide con sistema ELO e classifica; durante la partita si può mettere like all'avversario aprendone il profilo dall'avatar."),
        ("Tornei a eliminazione", "Bracket a 8 giocatori su Othello e Dama, con premi in crediti/ELO e gestione completa dei round."),
    ]
    features_right = [
        ("Titoli, badge & obiettivi", "Sistema di riconoscimenti sbloccabili (Champion, Tournament Champion, milestone) con icone dedicate."),
        ("Crediti & abbonamenti", "Vittorie e acquisti generano crediti; piani Premium/Platino via Stripe."),
        ("Chat real-time & supporto", "Messaggi istantanei con allegati, più chat di supporto e dashboard admin."),
        ("Backend serverless & deploy", "Supabase (Postgres, Auth, Storage, Realtime, RLS) su Vercel; mobile-first, production-ready."),
    ]

    col_w = (PAGE_W - 2 * MARGIN - 30) / 2
    y_start = PAGE_H - 200

    for i, (title, desc) in enumerate(features_left):
        y = y_start - i * 95
        c.setFillColor(PINK)
        c.circle(MARGIN + 6, y + 5, 4, fill=1, stroke=0)
        c.setFont("Helvetica-Bold", 16)
        c.setFillColor(TEXT_MAIN)
        c.drawString(MARGIN + 22, y, title)
        wrap_text(c, desc, MARGIN + 22, y - 22, col_w - 30, size=13, line_h=17)

    for i, (title, desc) in enumerate(features_right):
        y = y_start - i * 95
        x0 = MARGIN + col_w + 30
        c.setFillColor(PINK)
        c.circle(x0 + 6, y + 5, 4, fill=1, stroke=0)
        c.setFont("Helvetica-Bold", 16)
        c.setFillColor(TEXT_MAIN)
        c.drawString(x0 + 22, y, title)
        wrap_text(c, desc, x0 + 22, y - 22, col_w - 30, size=13, line_h=17)

    draw_footer(c, 7, TOTAL)
    c.showPage()


# ============= SLIDE 7: DIFFERENZIAZIONE =============
def slide_differentiation():
    draw_bg(c)
    draw_header(c, "Cosa ci rende diversi", "vs Tinder, Bumble, Hinge")

    # Tabella semplice
    headers = ["", "Tinder", "Bumble", "Hinge", "LoveableConnect"]
    rows = [
        ["Modalità di scoperta", "Swipe", "Swipe", "Swipe + prompts", "Gioco + “Tenta il Destino”"],
        ["Interazione pre-match", "Nessuna", "Nessuna", "Like su prompt", "Partita condivisa"],
        ["Gamification", "Minima", "Bassa", "Bassa", "Centrale"],
        ["Tornei competitivi", "No", "No", "No", "Bracket a 8 (Othello/Dama)"],
        ["Progressione & titoli", "No", "No", "No", "ELO, classifica, badge"],
        ["Onboarding sociale", "Solo dating", "Solo dating", "Solo dating", "Dating + social-gaming"],
    ]

    col_widths = [220, 130, 130, 150, 240]
    x0 = MARGIN
    y = PAGE_H - 220
    row_h = 42

    # Header
    c.setFillColor(PURPLE)
    c.setFillAlpha(0.3)
    c.rect(x0, y, sum(col_widths), row_h, fill=1, stroke=0)
    c.setFillAlpha(1.0)
    cx = x0
    for i, h in enumerate(headers):
        c.setFont("Helvetica-Bold", 14)
        c.setFillColor(TEXT_MAIN)
        c.drawString(cx + 12, y + 14, h)
        cx += col_widths[i]
    y -= row_h

    # Rows
    for r_idx, row in enumerate(rows):
        if r_idx % 2 == 0:
            c.setFillColor(HexColor("#1f1530"))
            c.setFillAlpha(0.5)
            c.rect(x0, y, sum(col_widths), row_h, fill=1, stroke=0)
            c.setFillAlpha(1.0)
        cx = x0
        for i, cell in enumerate(row):
            if i == 0:
                c.setFont("Helvetica-Bold", 13)
                c.setFillColor(TEXT_MAIN)
            elif i == len(row) - 1:
                c.setFont("Helvetica-Bold", 13)
                c.setFillColor(PINK)
            else:
                c.setFont("Helvetica", 13)
                c.setFillColor(TEXT_SOFT)
            c.drawString(cx + 12, y + 14, cell)
            cx += col_widths[i]
        y -= row_h

    draw_footer(c, 8, TOTAL)
    c.showPage()


# ============= SLIDE 8: TRAZIONE / STATO =============
def slide_traction():
    draw_bg(c)
    draw_header(c, "Stato attuale", "Dove siamo oggi")

    y = PAGE_H - 200
    # Status big
    c.setFont("Helvetica-Bold", 28)
    c.setFillColor(PINK)
    c.drawString(MARGIN, y, "Beta pubblica online, in fase di test")
    y -= 50

    c.setFont("Helvetica", 17)
    c.setFillColor(TEXT_SOFT)
    c.drawString(MARGIN, y, "Il prodotto è sviluppato, deployato e funzionante. Siamo nella fase pre-launch:")
    c.drawString(MARGIN, y - 24, "stiamo finalizzando dettagli UX, popolamento dei contenuti e go-to-market.")
    y -= 70

    c.setFont("Helvetica-Bold", 18)
    c.setFillColor(TEXT_MAIN)
    c.drawString(MARGIN, y, "Cosa significa concretamente")
    y -= 35
    items = [
        ("Codice pronto.", "Funzionalità core (auth, profili, match, chat, giochi, pagamenti) tutte operative."),
        ("Infrastruttura scalabile.", "Backend serverless Supabase, deploy Vercel, monitoring attivo."),
        ("Sito live.", "https://loveableconnect.it/, testabile end-to-end."),
        ("Nessuna metrica reale di trazione.", "Non abbiamo ancora aperto agli utenti reali; cerchiamo un partner per il lancio."),
    ]
    for title, desc in items:
        c.setFillColor(PINK)
        c.circle(MARGIN + 6, y + 5, 4, fill=1, stroke=0)
        c.setFont("Helvetica-Bold", 15)
        c.setFillColor(TEXT_MAIN)
        c.drawString(MARGIN + 22, y, title)
        c.setFont("Helvetica", 14)
        c.setFillColor(TEXT_SOFT)
        c.drawString(MARGIN + 22, y - 20, desc)
        y -= 50

    draw_footer(c, 9, TOTAL)
    c.showPage()


# ============= SLIDE 9: MODELLO DI RICAVI =============
def slide_revenue():
    draw_bg(c)
    draw_header(c, "Modello di ricavi", "Come monetizziamo")

    streams = [
        ("Crediti in-app", "Pacchetti di crediti acquistabili via Stripe per sbloccare feature e giocare.", "Volume + ricorrenza"),
        ("Abbonamenti premium", "Piani Premium / Platinum / Settimanale con vantaggi (visibilità, like illimitati, ecc.)", "ARPU alto, retention"),
        ("Boost e visibilità", "Promozione in classifica e nei risultati di ricerca a pagamento.", "Upsell on-demand"),
        ("Brand partnership (futuro)", "Sponsor su tornei, prodotti partner integrati in chat.", "Crescita a scala"),
    ]

    y = PAGE_H - 200
    for title, desc, kpi in streams:
        c.setFillColor(HexColor("#1f1530"))
        c.setStrokeColor(PURPLE)
        c.roundRect(MARGIN, y - 78, PAGE_W - 2 * MARGIN, 70, 10, fill=1, stroke=1)
        c.setFont("Helvetica-Bold", 17)
        c.setFillColor(PINK)
        c.drawString(MARGIN + 20, y - 28, title)
        c.setFont("Helvetica", 13)
        c.setFillColor(TEXT_SOFT)
        c.drawString(MARGIN + 20, y - 50, desc)
        # KPI badge a destra
        c.setFillColor(PURPLE)
        c.setFillAlpha(0.3)
        c.roundRect(PAGE_W - MARGIN - 220, y - 50, 200, 28, 14, fill=1, stroke=0)
        c.setFillAlpha(1.0)
        c.setFont("Helvetica-Bold", 12)
        c.setFillColor(TEXT_MAIN)
        c.drawCentredString(PAGE_W - MARGIN - 120, y - 42, kpi)
        y -= 95

    draw_footer(c, 10, TOTAL)
    c.showPage()


# ============= SLIDE 10: ROADMAP =============
def slide_roadmap():
    draw_bg(c)
    draw_header(c, "Roadmap", "Prossimi 18 mesi")

    phases = [
        ("0-3 mesi", "Lancio soft",
         ["Finalizzazione UX & QA", "Popolamento community iniziale (microtarget)", "Setup analytics & misurazione KPI"]),
        ("3-6 mesi", "Crescita controllata",
         ["Acquisizione organica + influencer marketing", "Onboarding 1.000-5.000 utenti reali", "Iterazione su retention & conversione"]),
        ("6-12 mesi", "Scaling",
         ["Marketing performance (Meta, TikTok, Google)", "Espansione in 2-3 paesi UE", "Nuovi mini-giochi e features sociali"]),
        ("12-18 mesi", "Espansione",
         ["Brand partnership e tornei sponsorizzati", "App mobile native (iOS, Android)", "Round seed istituzionale (se opportuno)"]),
    ]

    col_w = (PAGE_W - 2 * MARGIN - 45) / 4
    y_top = PAGE_H - 220

    for i, (phase, title, items) in enumerate(phases):
        x = MARGIN + i * (col_w + 15)
        # Top label
        c.setFillColor(PINK)
        c.setFillAlpha(0.2)
        c.roundRect(x, y_top - 36, col_w, 30, 6, fill=1, stroke=0)
        c.setFillAlpha(1.0)
        c.setFont("Helvetica-Bold", 14)
        c.setFillColor(PINK)
        c.drawCentredString(x + col_w / 2, y_top - 28, phase)
        # Title
        c.setFont("Helvetica-Bold", 17)
        c.setFillColor(TEXT_MAIN)
        c.drawString(x, y_top - 70, title)
        # Items
        y = y_top - 100
        for it in items:
            c.setFillColor(PURPLE)
            c.circle(x + 4, y + 5, 3, fill=1, stroke=0)
            c.setFont("Helvetica", 12)
            c.setFillColor(TEXT_SOFT)
            wrap_text(c, it, x + 14, y, col_w - 14, size=12, line_h=15)
            y -= 50

    draw_footer(c, 11, TOTAL)
    c.showPage()


# ============= SLIDE 11: TEAM =============
def slide_team():
    draw_bg(c)
    draw_header(c, "Team", "Founder & competenze")

    # Card founder
    c.setFillColor(HexColor("#1f1530"))
    c.setStrokeColor(PURPLE)
    c.setLineWidth(1)
    c.roundRect(MARGIN, PAGE_H - 460, PAGE_W - 2 * MARGIN, 240, 14, fill=1, stroke=1)

    # Avatar circle (placeholder)
    c.setFillColor(PINK)
    c.setFillAlpha(0.25)
    c.circle(MARGIN + 90, PAGE_H - 340, 60, fill=1, stroke=0)
    c.setFillAlpha(1.0)
    c.setFont("Helvetica-Bold", 36)
    c.setFillColor(TEXT_MAIN)
    c.drawCentredString(MARGIN + 90, PAGE_H - 355, "GC")

    # Info
    info_x = MARGIN + 180
    c.setFont("Helvetica-Bold", 24)
    c.setFillColor(TEXT_MAIN)
    c.drawString(info_x, PAGE_H - 280, "Giuseppe Chighini")
    c.setFont("Helvetica", 16)
    c.setFillColor(PINK)
    c.drawString(info_x, PAGE_H - 305, "Founder & CTO · 29 anni · Sassari, Italia")

    c.setFont("Helvetica", 14)
    c.setFillColor(TEXT_SOFT)
    lines = [
        "•  Sviluppatore full-stack: React/TypeScript, Node.js, PostgreSQL, Supabase",
        "•  Esperienza diretta su Stripe, Vercel, edge functions, sistemi real-time",
        "•  Coinvolgimento full-time sul progetto da diversi anni",
        "•  Investimento personale già sostenuto per lo sviluppo del prodotto",
        "•  Ruolo in caso di partnership: gestione tecnica e prodotto end-to-end",
    ]
    y = PAGE_H - 340
    for ln in lines:
        c.drawString(info_x, y, ln)
        y -= 24

    # Note: stiamo cercando partner per le competenze mancanti
    c.setFont("Helvetica-Oblique", 14)
    c.setFillColor(TEXT_DIM)
    c.drawString(MARGIN, PAGE_H - 500, "Cerchiamo un partner che integri competenze di go-to-market, growth e branding.")

    draw_footer(c, 12, TOTAL)
    c.showPage()


# ============= SLIDE 12: FABBISOGNO =============
def slide_ask():
    draw_bg(c)
    draw_header(c, "Cosa cerchiamo", "La nostra richiesta")

    # Big statement
    c.setFont("Helvetica-Bold", 24)
    c.setFillColor(TEXT_MAIN)
    c.drawString(MARGIN, PAGE_H - 200, "Non cerchiamo un investimento puramente finanziario.")
    c.setFont("Helvetica", 18)
    c.setFillColor(PINK)
    c.drawString(MARGIN, PAGE_H - 230, "Cerchiamo un partner che porti competenze e capacità di go-to-market.")

    # Tre colonne
    asks = [
        ("Cosa portiamo noi",
         ["Prodotto pronto, scalabile e deployato",
          "Competenze tecniche full-stack continuative",
          "Visione e roadmap di prodotto",
          "Investimento personale già sostenuto"]),
        ("Cosa cerchiamo",
         ["Strategia di lancio e go-to-market",
          "Acquisizione utenti & marketing performance",
          "Brand identity e posizionamento",
          "Network e validazione di settore"]),
        ("Investimento richiesto",
         ["Supporto operativo prima di tutto",
          "Capitale calibrato sui costi reali di growth",
          "Quote/condizioni da definire insieme",
          "Approccio modulare, no grandi round"]),
    ]

    col_w = (PAGE_W - 2 * MARGIN - 40) / 3
    y_start = PAGE_H - 290
    for i, (title, items) in enumerate(asks):
        x = MARGIN + i * (col_w + 20)
        c.setFillColor(HexColor("#1f1530"))
        c.setStrokeColor(PURPLE if i != 2 else PINK)
        c.setLineWidth(1.5 if i == 2 else 1)
        c.roundRect(x, y_start - 240, col_w, 240, 12, fill=1, stroke=1)
        c.setFont("Helvetica-Bold", 16)
        c.setFillColor(PINK if i == 2 else TEXT_MAIN)
        c.drawString(x + 20, y_start - 30, title)
        y = y_start - 60
        for it in items:
            c.setFillColor(PINK if i == 2 else PURPLE)
            c.circle(x + 24, y + 5, 3, fill=1, stroke=0)
            c.setFont("Helvetica", 13)
            c.setFillColor(TEXT_SOFT)
            wrap_text(c, it, x + 34, y, col_w - 50, size=13, line_h=17)
            y -= 42

    draw_footer(c, 13, TOTAL)
    c.showPage()


# ============= SLIDE 13: CONTATTI =============
def slide_contacts():
    draw_bg(c)

    # Logo piccolo in alto
    try:
        logo = ImageReader(LOGO_PATH)
        c.drawImage(logo, MARGIN, PAGE_H - 180, width=100, height=100, mask='auto')
    except Exception:
        pass

    # Titolo centrale
    c.setFont("Helvetica-Bold", 56)
    c.setFillColor(TEXT_MAIN)
    c.drawCentredString(PAGE_W / 2, PAGE_H / 2 + 60, "Costruiamolo insieme.")

    c.setFont("Helvetica", 22)
    c.setFillColor(PINK)
    c.drawCentredString(PAGE_W / 2, PAGE_H / 2 + 20, "LoveableConnect cerca un partner che creda nella visione.")

    # Linea decorativa
    c.setStrokeColor(PINK)
    c.setLineWidth(2)
    c.line(PAGE_W / 2 - 100, PAGE_H / 2 - 10, PAGE_W / 2 + 100, PAGE_H / 2 - 10)

    # Contatti
    c.setFont("Helvetica-Bold", 24)
    c.setFillColor(TEXT_MAIN)
    c.drawCentredString(PAGE_W / 2, PAGE_H / 2 - 60, "Giuseppe Chighini")
    c.setFont("Helvetica", 16)
    c.setFillColor(TEXT_SOFT)
    c.drawCentredString(PAGE_W / 2, PAGE_H / 2 - 90, "Founder & CTO")

    c.setFont("Helvetica", 18)
    c.setFillColor(TEXT_MAIN)
    c.drawCentredString(PAGE_W / 2, PAGE_H / 2 - 130, "daishxvii@gmail.com")
    c.drawCentredString(PAGE_W / 2, PAGE_H / 2 - 160, "+39 342 1209673")
    c.drawCentredString(PAGE_W / 2, PAGE_H / 2 - 190, "https://loveableconnect.it/")

    c.setFont("Helvetica-Oblique", 13)
    c.setFillColor(TEXT_DIM)
    c.drawCentredString(PAGE_W / 2, 60, "Grazie per il tempo dedicato.")

    c.showPage()


# ---- Build ----
slide_cover()
slide_vision()
slide_problem()
slide_solution()
slide_highlights()
slide_market()
slide_product()
slide_differentiation()
slide_traction()
slide_revenue()
slide_roadmap()
slide_team()
slide_ask()
slide_contacts()

c.save()
print(f"OK - PDF generato: {OUTPUT_PATH}")
