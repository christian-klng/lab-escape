# Lab Escape Game – Prototyp

First-Person-Escape-Room im Browser: Ein Labor mit interaktiven Gegenständen (Quiz, Zahlenschloss, Hinweise, Animationen). Wenn alle Pflichtaufgaben gelöst sind, öffnet sich die Ausgangstür.

**Stack:** Vite · React · TypeScript · React Three Fiber (Three.js) · drei · Rapier (Physik/Kollision) · postprocessing · Zustand (Spielzustand)

## Lokal starten

Voraussetzung: Node.js 20 oder neuer.

```bash
npm install
npm run dev
```

Dann im Browser `http://localhost:5173` öffnen.

**Auf dem Tablet testen:** Tablet ins selbe WLAN, dann die „Network“-Adresse öffnen, die `npm run dev` im Terminal anzeigt (z. B. `http://192.168.x.x:5173`).

## Steuerung

| | Desktop | Tablet |
|---|---|---|
| Laufen | WASD / Pfeiltasten | Joystick links unten |
| Umsehen | Maus (nach Klick ins Bild) | Wischen |
| Interagieren | Klick auf Gegenstand unter dem Fadenkreuz | Gegenstand antippen |
| Pause | Esc | Pause-Knopf oben rechts |

Oben rechts: Inventar, Ton an/aus (🔊) und auf Tablets der Pause-Knopf. Im Pausenmenü: Weiter, Ton an/aus und „Neu starten“ (mit Rückfrage). In der Pause sind Steuerung und Sound angehalten; der Sound pausiert auch, wenn der Tab oder die App in den Hintergrund wechselt. Der Fortschritt wird im Browser gespeichert (`localStorage`).

## Rätselkette im Prototyp

1. **Mikroskop** – Quiz → Schrankschlüssel 🔑
2. **Laborschrank** – mit Schlüssel öffnen → Blutprobe 🧪
3. **Schublade** (Sideboard hinten) – Zettel mit Code
4. **Verschlossene Box** (orange, auf dem Tisch) – Code 4711 → Zugangskarte 💳
5. **Analysegerät** (rechte Wand) – Probe einlegen
6. **Ausgangstür** – mit Zugangskarte, wenn alles erledigt ist → Raum abgeschlossen

Die **Zentrifuge** ist ein reines Animationsobjekt (an/aus), ohne Einfluss auf den Abschluss.

## Stilisierte Optik

Der Look orientiert sich an freundlichen Indie-Spielen: klare Farbflächen statt Fototexturen, warmes Licht. Zwei Stile sind umschaltbar:

| Stil | Aufruf | Merkmale |
|---|---|---|
| **Low-Poly** (Standard) | `http://localhost:5173/` | facettierte Flächen (Flat Shading), abgeschrägte Kanten, wenige Segmente bei runden Formen, leichte Farbvariation pro Facette, gerichtetes Hauptlicht |
| **Weich** | `http://localhost:5173/?style=soft` | runde Kanten, glatte Schattierung, weiches Rundum-Licht |

Der Stil wird zentral in `scene/style.ts` gesteuert; alle Bausteine aus `scene/kit.tsx` richten sich danach. Beide Parameter lassen sich kombinieren, z. B. `?style=soft&q=medium`.

- **Formen:** alle Möbel und Geräte mit abgeschrägten bzw. abgerundeten Kanten (`RBox` in `scene/kit.tsx`)
- **Farbpalette:** Creme, Mint/Petrol, Schiefergrau, Akzente in Orange und Gelb (`C` in `scene/kit.tsx`)
- **Licht:** Umgebungslicht aus Lichtflächen (`Environment` + `Lightformer`), weiche Kontaktschatten (einmalig berechnet), Streulicht vom Boden
- **Post-Processing:** Ambient Occlusion, Bloom für Bildschirme/LEDs/Lampen, Tone Mapping, Kantenglättung, Vignette
- **Leben im Raum:** blubbernde Kolben, animierte Monitore, Wanduhr mit echter Zeit, flackernde Röhre, Staub im Licht, Zentrifuge
- **Texturen:** Boden, Poster, Warnstreifen und Schilder werden per Canvas gezeichnet – keine Bilddateien nötig
- **Sound:** Raumrauschen, Klicks und Erfolgsklänge per Web Audio API synthetisiert – keine Audiodateien nötig. Auf iPad/iPhone wird der Sound beim ersten Tippen freigeschaltet und spielt auch im Stumm-Modus (Audio-Session „playback“, ab iPadOS 16.4).
- **Feedback:** Anvisierte Gegenstände bekommen einen weißen Umriss; beim Abschluss dreht die Kamera zur Tür, die aufschwingt und Licht hereinlässt

### Kompakter Raum („Bühnenbild“)

Das Labor ist bewusst kleiner als ein echtes (6 × 5 m statt 10 × 8 m, Decke 2,6 m). In 3D wirkt ein realistisch großer Raum leer und alles erscheint weit weg; ein kompakter Raum fühlt sich dagegen natürlicher an – wie ein Bühnenbild oder Diorama. Alle Stationen sind ein bis zwei Schritte von der Raummitte entfernt. Dazu kommen zwei bewusst unrealistische Kniffe:

- **Hero-Props:** Gegenstände, mit denen man interagiert (Mikroskop, Box, Zentrifuge, Monitor), sind um 30 % vergrößert – besser lesbar und leichter zu treffen.
- **Engerer Blickwinkel:** 58° statt der üblichen 70° – alles wirkt näher, die Ränder sind weniger verzerrt.

Raumgröße, Vergrößerung, Blickwinkel und Startposition stehen zentral in `src/scene/layout.ts`.

### Ausblick aus dem Fenster

Hinter dem Fenster liegt ein kleiner Low-Poly-Park (`src/scene/Park.tsx`) – als echte 3D-Geometrie, nicht als Bild. Nur so stimmt die Perspektive aus jedem Blickwinkel: Geht man am Fenster entlang, verschieben sich nahe Dinge stärker als ferne (Parallaxe), genau wie bei einem echten Fenster. Ein flaches Bild würde dagegen wie ein Poster wirken.

Der Park ist in drei Tiefenebenen aufgebaut:

- **nah** (1–3 m): Hecke direkt vor dem Fenster
- **mittel** (5–25 m): Wiese, Weg, Teich, Bank, Laterne, Laub- und Nadelbäume
- **fern** (30–90 m): Hügel, Berge, ziehende Wolken, Sonne, Himmelskuppel; leichter Nebel sorgt für Tiefe

Bäume und Büsche sind Instanzen (ein Draw Call je Form), der ganze Park hat nur wenige tausend Dreiecke. Die Anordnung ist zufällig, aber mit festem Startwert – der Park sieht bei jedem Laden gleich aus. Lage und Größe des Fensters stehen in `src/scene/layout.ts` (`WINDOW`).

### Qualitätsstufen

| Stufe | Standard für | Effekte |
|---|---|---|
| `high` | Desktop | Ambient Occlusion, Bloom, Kantenglättung, Vignette |
| `medium` | Tablet | Bloom, Kantenglättung, Vignette |
| `low` | Notfall | kein Post-Processing |

Sinkt die Bildrate dauerhaft, schaltet das Spiel automatisch eine Stufe herunter. Zum Testen lässt sich eine Stufe per URL erzwingen, z. B. `http://localhost:5173/?q=medium`.

## Aufbau

```
src/
  game/
    config.ts   ← Raum-Konfiguration: alle Gegenstände, Rätsel, Belohnungen
    store.ts    ← Spiellogik: Inventar, gelöste Aufgaben, Abschlussbedingung
    audio.ts    ← synthetischer Sound (Ambiente + Effekte)
    input.ts    ← Eingabezustand (Tastatur, Maus, Touch, Joystick)
    picking.ts  ← Raycast: welcher Gegenstand wird angezielt/angetippt
  scene/
    layout.ts   ← Raumgröße, Hero-Prop-Vergrößerung, Blickwinkel, Startposition
    style.ts    ← Stil-Schalter (Low-Poly / weich), Segmentzahlen, Facetten-Shader
    Park.tsx    ← Außenwelt hinter dem Fenster (Low-Poly-Park)
    kit.tsx     ← Bausteine: RBox, Cyl, Mat, Glow, Hit, Screen, Farbpalette
    textures.ts ← prozedurale Texturen (Boden, Poster, Schilder)
    Lab.tsx     ← Raum, Licht und alle interaktiven Gegenstände
    Decor.tsx   ← Dekoration (Regal, Fenster, Uhr, Pflanzen, Rohre …)
    Effects.tsx ← Post-Processing je Qualitätsstufe
    Player.tsx  ← Spieler-Kapsel mit Kollision, Kamera, Bewegung
  ui/
    HUD.tsx     ← Fortschritt, Inventar, Fadenkreuz, Meldungen, Endscreen
    Overlay.tsx ← Quiz, Zahlenschloss, Info-Fenster
    Joystick.tsx← virtueller Joystick für Touch
```

### Gegenstandstypen (`config.ts`)

| Typ | Verhalten |
|---|---|
| `quiz` | Overlay mit Frage und Antworten |
| `code` | Overlay mit Zahlenschloss |
| `info` | Overlay mit Text (z. B. Hinweis) |
| `use` | Direkt lösen, wenn `requires` erfüllt ist (z. B. Schlüssel benutzen) |
| `toggle` | Nur Animation an/aus |
| `exit` | Abschluss, wenn alle `required`-Aufgaben gelöst sind |

Gemeinsame Felder: `requires` (benötigte Gegenstände), `reward` (Belohnung), `consumes` (Gegenstand verbrauchen), `required` (zählt für den Abschluss), `lockedText`, `successText`.

### Neuen Gegenstand hinzufügen

1. Eintrag in `ROOM.objects` in `src/game/config.ts` anlegen.
2. In `src/scene/Lab.tsx` das 3D-Objekt in `<Hit id="…">` einpacken und die Teile mit `<RBox id="…" />` bzw. `<Cyl id="…" />` bauen – dann leuchten sie beim Anvisieren auf und bekommen einen Umriss.
3. Für Animationen den Zustand aus dem Store lesen (`solved[id]` oder `toggles[id]`) und in `useFrame` animieren.

### Debuggen

Im Entwicklungsmodus (`npm run dev`) sind in der Browser-Konsole verfügbar:

- `__game.getState()` – Spielzustand ansehen, z. B. `__game.getState().interact('tuer')`
- `__input.yaw = 1.5` – Blickrichtung setzen
- `__teleport(1.9, -1)` – Spieler an eine Position (x, z) setzen
- `__audio()` – Zustand des Sounds (`running`, `suspended`, …)

## Deployment auf Coolify

Das Spiel ist eine rein statische Web-App: Beim Build entsteht ein Ordner mit HTML, JavaScript und CSS, den ein Nginx ausliefert. Es braucht weder Backend noch Datenbank.

**Was im Projekt dafür bereitliegt:**

- `Dockerfile` – zweistufig: baut mit Node 22 (`npm ci` mit `package-lock.json`, dadurch reproduzierbar) und liefert mit Nginx 1.27 aus
- `nginx.conf` – Gzip, lange Cache-Zeiten für die gehashten Dateien unter `/assets/`, kein Cache für `index.html` (neue Versionen kommen sofort an), Healthcheck unter `/healthz`
- `.dockerignore` – hält `node_modules`, `dist` und `.git` aus dem Build heraus

**Einrichtung in Coolify:**

1. Repository zu GitHub pushen (siehe unten).
2. In Coolify: **Projects → (Projekt wählen) → + New → Private Repository (with GitHub App)** bzw. **Public Repository**, dann das Repository `lab-escape` und den Branch `main` wählen.
3. **Build Pack:** `Dockerfile` (Base Directory `/`, Dockerfile Location `/Dockerfile`).
4. **Ports Exposes:** `80`.
5. **Domains:** gewünschte Domain eintragen, z. B. `https://labor.example.de` – Coolify holt das SSL-Zertifikat automatisch.
6. **Deploy** klicken. Der Healthcheck (`/healthz`) zeigt Coolify, wann der Container bereit ist.
7. Optional: **Automatic Deployment** aktiv lassen – dann wird bei jedem Push auf `main` neu gebaut.

Umgebungsvariablen sind nicht nötig. Die Debug-Helfer (`__game`, `__input`, `__teleport`, `__audio`) sind im Produktions-Build nicht enthalten.

**Lokal testen wie auf dem Server** (falls Docker installiert ist):

```bash
docker build -t lab-escape .
docker run --rm -p 8080:80 lab-escape
# dann http://localhost:8080 öffnen
```

### Brauche ich eine Datenbank?

Aktuell nicht. Der Spielfortschritt liegt im Browser (`localStorage`). Eine Datenbank (z. B. Postgres in Coolify) wird erst nötig, wenn Fortschritt geräteübergreifend gespeichert werden soll, es Nutzerkonten gibt oder Ergebnisse ausgewertet werden sollen (z. B. Bestenliste, Auswertung für Schulungen). Dann kommt zusätzlich ein kleiner Backend-Dienst dazu, der zwischen Spiel und Datenbank vermittelt – das Spiel selbst greift nie direkt auf die Datenbank zu.

## Git und GitHub

Das Projekt ist ein Git-Repository mit Branch `main`. Zum ersten Push:

1. Auf GitHub ein **leeres** Repository `lab-escape` anlegen (ohne README, `.gitignore` oder Lizenz).
2. Im Projektordner:

```bash
git remote add origin https://github.com/<dein-account>/lab-escape.git
git push -u origin main
```

`node_modules` und `dist` sind per `.gitignore` ausgeschlossen. `package-lock.json` gehört ins Repository – sie sorgt dafür, dass Coolify genau die getesteten Paketversionen installiert.

## Nächste Schritte

- Gegenstände durch Low-Poly-Modelle ersetzen – selbst in Blender modelliert oder aus Asset-Paketen (Lizenz je Modell prüfen) – als GLB mit Draco/Meshopt; Licht in Lightmaps backen
- Kamera-Fokus beim Untersuchen eines Gegenstands
- Weitere Mechaniken: Drag-and-Drop-Sortierung, Gegenstände kombinieren
- Optional Hotspot-Navigation für Tablets
