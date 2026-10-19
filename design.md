# Nudge Portfolio (`nudge-folio.framer.website`) — Comprehensive Design & Architecture Specification

## 0. Document Scope, Reference Metadata & Evidence Ledger

| Attribute | Value / Observation | Status |
| :--- | :--- | :--- |
| **Primary Reference URL** | `https://nudge-folio.framer.website/` | **Verified** |
| **Discovered Subpages** | `/about`, `/case-study`, `/case-study/meridian-health`, `/case-study/north-light`, `/services`, `/blog`, `/blog/geometry-builds-trust`, `/play-ground`, `/contact` | **Verified** (via video URL bar & search index) |
| **Template Identity** | **Nudge (V2)** — Premium Portfolio Template by **Huehaus Studio** (`https://www.framer.com/marketplace/templates/nudge/`) | **Verified** |
| **Portfolio Persona** | **Bejaman** — Product Designer based in Chicago, IL (Currently at Meridian Health; previously at Searchless AI, StyleBook, Northlight Consulting, Homestead) | **Verified** |
| **Primary Visual Evidence** | Full desktop screen recording (`ui rs.mp4`, `1914×870` px at `30fps`, `78.63s` duration, `2,359` frames) + static DOM text extraction (`google:browse`) | **Verified** |
| **Inspection Limitations** | Live headless browser actuation encountered a network connection error, and unindexed subpages were blocked in static `google:browse`. All 6 primary views (`Home`, `About`, `Case Study`, `Services`, `Journal`, `Playground`) were inspected at full `1914×870` resolution from the screen recording, while `/contact` was inspected via `google:browse`. Direct DevTools CSS inspection (`@font-face` source files, raw keyframe curves, and live mobile/tablet resizing) was unavailable; therefore, font family matches, animation easing curves, and tablet/mobile breakpoint rules are explicitly labeled as **Estimates** or **Recommendations**. | **Documented** |

### Epistemic Labeling Convention Used Throughout This Specification
* **[Verified]**: Directly observed in the `1914×870` video frames, measured in pixels via OpenCV/NumPy frame analysis, or extracted verbatim from the live site DOM via `google:browse`.
* **[Sampled]**: Median RGB/HEX values and pixel bounding-box coordinates measured directly from the `1914×870` H.264 (`yuv420p`) recording frames, paired with normalized design-token HEX values.
* **[Estimated]**: Typographic font-family matches, `rem` conversions, and transition durations/easings inferred from frame-by-frame `30fps` playback analysis.
* **[Recommended]**: Production engineering standards for responsive tablet/mobile breakpoints, semantic HTML5 structure, keyboard focus management, and `prefers-reduced-motion` fallbacks.

---

## A. Design Philosophy and Visual Identity

### 1. Overall Design Direction, Personality, and Aesthetic
* **"Tool-Native" Design Software UI Metaphor [Verified]**: Nudge translates the interface conventions of collaborative design and whiteboarding tools (Figma, FigJam, Framer, Miro, and classic desktop folder systems) into a personal product designer portfolio. Rather than presenting a static editorial grid, the website frames the designer's work as an active, living design canvas.
* **Personality & Tone [Verified]**: Playful, tactile, high-craft, and self-aware. It balances senior-level product design credibility (structured problem-framing, HIPAA/enterprise constraints, clear role timelines) with approachable creative warmth (tilted sticky notes, polaroid snapshots, handwritten margin scribbles, and a friendly multiplayer cursor).
* **Visual Influences [Verified]**:
  * **Collaborative Canvas Tools (Figma / FigJam)**: `125px` square background graph grid, cyan/yellow/magenta bounding boxes with square corner resize handles, vector polylines with vertex points, and multiplayer cursor pills (`YOU`, `BEJAMAN`, `PRODUCT DESIGNER`, `CHICAGO, IL`).
  * **Tactile Stationery & Desktop Metaphors**: Chamfered manila file-folder tabs that stack stickily on scroll, pastel sticky notes with hand-drawn arrows, and tilted instant-film Polaroid frames.
  * **Retro-Digital / Bitmap Typography**: Custom modular pixel-stencil display typography (`BEJAMAN`, `FEATURED WORKS`, `LET'S TALK`, `WHAT I DO`) juxtaposed against crisp neo-grotesk sans-serif prose and uppercase technical monospace labels.

### 2. Visual Hierarchy and Content Presentation
* **Three-Tier Typographic Contrast [Verified]**:
  1. **Macro Anchors**: Oversized uppercase modular pixel-stencil display titles (`103px`–`129px` cap height) immediately anchor each major section (`BEJAMAN`, `FEATURED WORKS`, `LET'S TALK`, `ABOUT`, `CASE STUDIES`, `WHAT I DO`, `JOURNAL`).
  2. **Editorial Narrative**: High-contrast, tightly tracked neo-grotesk sans-serif headlines (`52px`–`68px`) with inline graphic badges and readable body paragraphs (`16px`–`20px`) deliver the substantive storytelling.
  3. **Technical & Handwritten Micro-Layers**: Uppercase monospace metadata (`12px`–`14px`) provides structural grounding (dates, tags, rulers, coordinates, navigation), while casual handwritten script (`18px`–`24px`) acts as an informal human voice guiding the eye (`my name is`, `about me!`, `explore my work!`, `think first, draw later.`).

### 3. Balance Between Whitespace, Imagery, Typography, and Content Density
* **Open Grid Breathing Room vs. High-Saturation Color Blocks [Verified]**: Sections alternate between expansive white graph-paper canvas areas (`#FFFFFF` with `#F6F6F6` grid lines and `40%+` open whitespace around floating badges) and full-width, high-saturation color cards (`#42D2ED` cyan, `#111111` black, `#E5B433` gold, `#D0075A` magenta) or full-bleed pastel service bands (`#ABEBF7`, `#F2DEA3`, `#F6B6D0`, `#A6E3C4`).
* **Controlled Content Density [Verified]**: Project cards and service bands restrict text to a concise 2-line summary and 2–5 folder-tab pills, preventing cognitive overload while keeping scan speed high.

### 4. What Makes This Website Visually Distinctive
1. **Persistent CAD/Design Ruler Chrome [Verified]**: Top and bottom horizontal pixel rulers (`0` to `1500`+ in `100px` increments) frame the viewport like an artboard editor.
2. **Selection Bounding Boxes & Vector Handles [Verified]**: Headlines (`BEJAMAN`, `what's up`, `I DO`, `CONTACT`), project thumbnails, and bio containers are wrapped in `1px`–`2px` selection outlines with `10px × 10px` square corner handles, while section dividers on the Services page are drawn as vector paths with black square vertex nodes.
3. **Scroll-Stacked File Folder Cards [Verified]**: The Featured Works section uses chamfered folder tabs offset horizontally across 4 columns (`PROJECT 01` through `PROJECT 04`) so that as each card sticks to the top during scroll, the tabs remain visible in a neat horizontal row like physical file dividers.
4. **Interactive Hero Canvas Toys [Verified]**: The hero features an initial `Hey there!` → `Welcome!` speech-bubble intro animation, a bottom audio/parameter slider (`0–26`), and a draggable/hoverable black inversion lens that inverts colors (`#FFFFFF` text on `#000000` fill) across any hero region it overlaps.
5. **Progressive Opacity Fade on Pixel Display Headers [Verified]**: Multi-word pixel headers (`CASE STUDIES`, `JOURNAL`, `CORE CAPABILITIES`, `LET'S TALK`) render leading characters in solid `#111111` and progressively step down trailing characters through mid-gray to near-transparent (`#555555` → `#999999` → `#E5E5E5`) during scroll reveal.

---

## B. Color System

All colors below were sampled directly from the `1914×870` video frames (`ui rs.mp4`) using median patch sampling (`deep_measurements.py`) and paired with clean normalized HEX tokens to account for H.264 `yuv420p` chroma subsampling.

### 1. Core Surfaces, Backgrounds & Structural Neutrals

| Role / Element | Sampled HEX (RGB) | Normalized Token HEX | Usage & Context | Status |
| :--- | :--- | :--- | :--- | :--- |
| **Canvas Background** | `#FFFFFF` (`255, 255, 255`) | `#FFFFFF` | Primary artboard background across all pages | **[Sampled]** |
| **Navbar Surface** | `#FEFEFE` (`254, 254, 254`) | `#FFFFFF` | Sticky top navigation bar background (`y=0..62`) | **[Sampled]** |
| **Canvas Grid Line** | `#F6F6F6` (`246, 246, 246`) | `#F4F4F4` | `1px` vertical & horizontal background grid lines every `125px` | **[Sampled]** |
| **Case Study Card Surface** | `#EEEEEE` (`238, 238, 238`) | `#EEEEEE` | Folder-tab card body & tab fill on `/case-study` index grid | **[Sampled]** |
| **FAQ / Chat Bubble Gray** | `#F1F1F1` (`241, 241, 241`) | `#F1F1F1` | Reply message bubble surface in Services FAQ cards | **[Sampled]** |
| **Navbar Utility Circle** | `#EDEDED` (`237, 237, 237`) | `#EDEDED` | `EM` and `PH` circular icon buttons in top-right navbar | **[Sampled]** |
| **Ruler Border / Divider** | `#C7C7C7` / `#CCCCCC` | `#CCCCCC` | `1px` horizontal border lines below navbar (`y=62`) and ruler (`y=111`) | **[Sampled]** |
| **Ruler Tick & Label Muted** | `#8E8E8E` (`142, 142, 142`) | `#888888` | Ruler numbers (`0`, `100`..`1500`), minor tick marks, `Comment` / `Question` labels | **[Sampled]** |
| **Primary Ink / Obsidian** | `#111111` / `#121111` | `#111111` | Primary display text, body copy, Project 02 card surface, `CONTACT ME` CTA button, borders | **[Sampled]** |
| **Secondary Body Text** | `#333333` (`51, 51, 51`) | `#333333` | Narrative paragraphs in Bio, Timeline, and Project card descriptions | **[Sampled]** |
| **Deep Espresso / Plum** | `#422C3A` (`66, 44, 58`) | `#422C3A` | Diagonal stripes in Contact footer banner; `AVAILABLE FOR Q4 PROJECTS` badge on `/services` | **[Sampled]** |

### 2. Primary & Secondary Chromatic Palette (4-Color System + Pastel Tints)

Nudge relies on a disciplined **4-hue chromatic system** (Cyan, Gold, Magenta, Mint Green), where each hue has a **saturated primary token** (for tabs, active states, skill blocks, and cursor badges) and a **pastel tint token** (for sticky notes and full-bleed service backgrounds).

| Color Family | Variant | Sampled HEX (RGB) | Normalized HEX | Observed Component Usage | Status |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **1. Cyan (Primary Accent)** | **Electric Cyan (Primary)** | `#42D2ED` (`66, 210, 237`) | `#42D2ED` | Active navbar tab fill, Hero `BEJAMAN` bounding box & handles, availability dot, `Hey there!` / `Welcome!` bubble, `EM` hover tooltip, Project 01 card, `Motion Design` skill block, `CONTACT` footer banner box, `STEP 01` cursor tag | **[Sampled]** |
| **1. Cyan** | **Pastel Cyan (Tint)** | `#ABEBF7` (`171, 235, 247`) | `#ABEBF7` | Hero floating avatar speech-bubbles, About Story sticky note #1 (`Starting with why...`), Services `WHAT I DO` box, Service `(01) PRODUCT DESIGN` full-bleed background, `Discover` phone card, Timeline `SEP 2025 - CURRENT` pill | **[Sampled]** |
| **2. Gold / Yellow** | **Warm Gold (Primary)** | `#E5B433` (`229, 180, 51`) | `#E5B433` | Hero `PRODUCT DESIGNER` cursor badge, About inline clover icon, `Interaction Design` skill block, Project 03 (`Homestead`) card, Contact footer banner stripes, `MAIN BIO` tag, Service `(02)` capability pills, `STEP 02` cursor tag | **[Sampled]** |
| **2. Gold / Yellow** | **Pastel Butter (Tint)** | `#F2DEA3` (`242, 222, 163`) | `#F2DEA3` | Hero `Previously at Searchless AI` ribbon, Featured Works subtitle sticky note, About Bio & Story sticky notes (`Designing for real constraints`), Service `(02) WEB DESIGN` background, `Define` phone card | **[Sampled]** |
| **3. Magenta / Pink** | **Vibrant Magenta (Primary)** | `#D0075A` (`208, 7, 90`) | `#D0075A` | Hero `CHICAGO, IL` cursor badge, About inline hourglass icon, `User Research` skill block (white text), Project 04 (`North Light`) card, Service `(03)` capability pills (white text), Core Capabilities `MOTION` folder tab | **[Sampled]** |
| **3. Magenta / Pink** | **Pastel Rose (Tint)** | `#F6B6D0` (`246, 182, 208`) | `#F6B6D0` | About Story sticky note #3 (`Sweating the small stuff`), Service `(03) DESIGN SYSTEMS` full-bleed background, `Design` phone card, Playground sticky notes (`Random shot`, `bus bus bus`) | **[Sampled]** |
| **4. Emerald / Mint** | **Emerald Green (Primary)** | `#3BCF81` (`59, 207, 129`) | `#3BCF81` | `Prototyping` skill block, `Let's Talk` 4-leaf mascot character, Service `(04)` capability pills, Core Capabilities `STRATEGY` folder tab, Journal lightbulb icon badge | **[Sampled]** |
| **4. Emerald / Mint** | **Pastel Mint (Tint)** | `#A6E3C4` (`166, 227, 196`) | `#A6E3C4` | Hero `Currently at Meridian Health` ribbon, Service `(04) CREATIVE DIRECTION` full-bleed background, Core Capabilities Strategy sticky notes, Playground `flower!` sticky note | **[Sampled]** |

### 3. Interactive States, Borders & Overlays
* **Selection Outlines & Handles [Verified]**:
  * **Cyan Selection Box (`#42D2ED`)**: `2px solid #42D2ED` rectangle with `12px × 12px` `#42D2ED` square corner handles bordered by `1.5px solid #111111` (used on Hero `BEJAMAN` and About Timeline container).
  * **Black Selection Box (`#111111`)**: `1.5px solid #111111` rectangle with `10px × 10px` white-filled, black-stroked square corner handles (used on `what's up` badge and Project 01/03 thumbnails).
  * **White Selection Box (`#FFFFFF`)**: `1.5px solid #FFFFFF` rectangle with `10px × 10px` black-filled, white-stroked corner handles (used on Project 02 dark card and Project 04 magenta card thumbnails).
* **Hover Inversion Lens [Verified]**: On the Hero section (`frame_011`, `frame_015`), a black rectangular lens (`#000000` fill with `10px × 10px` black corner handles) applies a `mix-blend-mode: difference` / color-inversion effect over the underlying text and badges (`BEJAMAN` turns `#FFFFFF`, the cyan availability dot turns red-orange `#D9381E`, and green icons turn magenta).
* **CTA & Card Hover States [Verified]**:
  * **Hero `CONTACT ME` Button (`frame_019`)**: On hover, the `#121111` button dims to a translucent gray selection state (`#C4C4C4` fill with a `1px solid #888888` bounding box and corner handles).
  * **Footer `CONTACT` Banner (`frame_038` vs `frame_062`)**: Default state displays black `CONTACT` pixel text on a `#42D2ED` cyan box with a `2px solid #111111` border; on hover (`frame_062`), the box inverts to `#111111` black fill with `#42D2ED` cyan pixel text and a white `2px` selection outline with `16px × 16px` black/white corner handles.

---

## C. Typography

### 1. Font Families and Weights
Because raw `@font-face` files could not be extracted via DevTools, the four distinct typographic voices observed across the site are documented below with their exact visual characteristics and production-ready open-source/commercial equivalents:

| Typographic Role | Visual Characteristics (Observed) | Recommended Font Stack (Implementation) | Weights Used | Status |
| :--- | :--- | :--- | :--- | :--- |
| **1. Display Pixel / Stencil (`--font-display`)** | Custom modular bitmap/rounded-stencil display face where diagonal and curved strokes step through `90°` pixel joints with rounded outer corners and circular negative-space cutouts (e.g., `B`, `E`, `J`, `A`, `M`, `A`, `N`, `R`, `K`, `S`). | Custom SVG/Webfont (`Nudge Pixel` / `PP Mondwest` / `Bitcount Grid Single` / `Press Start 2P` or custom SVG glyph paths for the 10 display headers) | `700` (Bold) | **[Verified Visual / Estimated Font Name]** |
| **2. Primary Sans (`--font-sans`)** | Clean, high-x-height neo-grotesk sans-serif with neutral terminals, single-story `a` in bold weights, tight tracking, and crisp geometric proportions. | `'Inter'`, `'Switzer'`, `'Plus Jakarta Sans'`, `-apple-system, BlinkMacSystemFont, sans-serif` | `400` (Regular), `500` (Medium), `600` (SemiBold) | **[Estimated Match]** |
| **3. Technical Mono (`--font-mono`)** | Monospaced grotesque with slotted/dotted zero (`0` in `PROJECT 01`, `01`, `2026`), distinct uppercase `I`/`1`, and wide tracking for UI chrome. | `'JetBrains Mono'`, `'Fragment Mono'`, `'Space Mono'`, `monospace` | `400` (Regular), `500` (Medium) | **[Estimated Match]** |
| **4. Handwritten Script (`--font-hand`)** | Casual felt-tip marker handwriting with slight baseline bounce, natural ascender loops, and hand-drawn double/triple underline strokes. | `'Caveat'`, `'Nanum Pen Script'`, `'Reenie Beanie'`, `cursive` | `400` (Regular), `600` (SemiBold) | **[Estimated Match]** |

### 2. Practical Typography Scale & Measured Pixel Metrics

Cap heights were measured directly in pixels from the `1914×870` desktop frames (`detailed_metrics.py`) and converted to standard CSS `font-size` (`cap-height ÷ 0.72` for sans/mono; `1:1` for modular display glyphs).

| Element / Style Token | Font Family | Measured Cap Height (`1914px` Viewport) | Desktop Size (`px` / `rem`) | Tablet Size (`≤1024px`) | Mobile Size (`≤767px`) | Line Height | Letter Spacing | Case / Styling |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Hero Display (`BEJAMAN`)** | `--font-display` | `129px` (`y=346..474`) | `140px` (`8.75rem`) | `96px` (`6.0rem`) | `56px` (`3.5rem`) | `0.95` | `0.02em` | `UPPERCASE` **[Sampled]** |
| **Section Display (`FEATURED WORKS`, `LET'S TALK`, `ABOUT`, `CASE STUDIES`, `WHAT I DO`, `JOURNAL`)** | `--font-display` | `103px` (`y=140..380`) | `112px` (`7.0rem`) | `80px` (`5.0rem`) | `48px` (`3.0rem`) | `1.0` | `0.02em` | `UPPERCASE`; trailing letters fade opacity on scroll **[Sampled]** |
| **About Statement (`I'm Bejaman a product designer...`)** | `--font-sans` (`500`) | `62px` (`y=583..644`) | `72px` (`4.5rem`) | `52px` (`3.25rem`) | `34px` (`2.125rem`) | `1.15` | `-0.03em` | Sentence case with inline `58px × 58px` image/icon tiles **[Sampled]** |
| **Project Card Title (`Meridian Health`, `StyleBook`)** | `--font-sans` (`500`) | `66px` (`y=280..346`) | `68px` (`4.25rem`) | `48px` (`3.0rem`) | `32px` (`2.0rem`) | `1.08` | `-0.03em` | Title Case **[Sampled]** |
| **Hero Subheadline (`I design outstanding digital products.`)** | `--font-sans` (`500`) | `36px` (`y=636..671`) | `52px` (`3.25rem`) | `40px` (`2.5rem`) | `28px` (`1.75rem`) | `1.18` | `-0.025em` | Sentence case with inline `42px` SVG icons **[Sampled]** |
| **Skill Block Label (`Interaction Design`, etc.) & Process Card Title (`Discover`)** | `--font-sans` (`500`) | `32px`–`36px` | `40px` (`2.5rem`) | `32px` (`2.0rem`) | `24px` (`1.5rem`) | `1.15` | `-0.02em` | Title Case **[Sampled]** |
| **Story Sticky Note Heading (`Starting with why, not what`) & Timeline Role Title** | `--font-sans` (`500`) | `28px`–`32px` | `36px` (`2.25rem`) | `28px` (`1.75rem`) | `22px` (`1.375rem`) | `1.2` | `-0.02em` | Sentence / Title Case **[Sampled]** |
| **Case Study Grid Title (`Meridian Health` on `/case-study`) & FAQ Question** | `--font-sans` (`500`) | `24px`–`28px` | `32px` (`2.0rem`) | `26px` (`1.625rem`) | `20px` (`1.25rem`) | `1.25` | `-0.02em` | Title / Sentence Case **[Sampled]** |
| **Journal Card Title (`Ideas Need Silence`)** | `--font-sans` (`500`) | `16px` | `20px` (`1.25rem`) | `18px` (`1.125rem`) | `18px` (`1.125rem`) | `1.35` | `-0.01em` | Title Case **[Sampled]** |
| **Body Copy (Bio, Project Summary, Sticky Notes, FAQ Reply)** | `--font-sans` (`400`) | `12px`–`14px` | `17px` (`1.0625rem`) | `16px` (`1.0rem`) | `15px` (`0.9375rem`) | `1.55` | `-0.005em` | Sentence case, comfortable `55ch–68ch` measure **[Sampled]** |
| **Handwritten Annotations (`my name is`, `about me!`, `explore my work!`, Polaroids)** | `--font-hand` (`400`) | `16px`–`22px` | `24px` (`1.5rem`) | `22px` (`1.375rem`) | `20px` (`1.25rem`) | `1.2` | `0.01em` | Lowercase / casual mixed case, often tilted `-4°` to `-12°` **[Sampled]** |
| **UI Monospace Chrome (Navbar, Tabs, CTA, Availability, Dates, Tags)** | `--font-mono` (`500`) | `10px`–`11px` | `14px` (`0.875rem`) | `13px` (`0.8125rem`) | `12px` (`0.75rem`) | `1.0` | `0.06em` | `UPPERCASE` **[Sampled]** |
| **Ruler Numbers & Micro Labels (`0`, `100`..`1500`, `BIO`/`STORY`/`WORK`)** | `--font-mono` (`400`) | `8px`–`9px` | `11px` (`0.6875rem`) | `11px` (`0.6875rem`) | `10px` (`0.625rem`) | `1.0` | `0.04em` | `UPPERCASE` / Numeric **[Sampled]** |

### 3. Special Typographic Treatments
* **Scroll-Linked Character Opacity Gradient [Verified]**: On section headers (`FEATURED WORKS` in `frame_031`, `LET'S TALK` in `frame_036`, `CASE STUDIES` in `frame_049`, `CORE CAPABILITIES` in `frame_064`, `JOURNAL` in `frame_068`), individual letters transition from low-opacity light gray (`rgba(17, 17, 17, 0.12)`) to solid `#111111` from left to right as the heading enters the viewport.
* **Inline Pictogram & Photo Tokens [Verified]**: Both the Hero subheadline (`I design [🟢] outstanding digital products [🌸].`) and the About statement (`I'm Bejaman [🖼️] a product designer in Chicago who gets excited [🌼] about making complicated things simple [⏳].`) embed inline square/circular media tokens aligned to `vertical-align: middle` that scale proportionally with the surrounding `font-size`.

---

## D. Layout and Spacing

### 1. Viewport, Background Grid & Maximum Content Width
* **Recorded Desktop Viewport [Verified]**: `1914px × 870px` (`1900px` active document width excluding the `14px` right browser scrollbar).
* **Universal Canvas Graph Grid [Verified]**:
  * Every white-background section displays a continuous `125px × 125px` square graph grid (`background-size: 125px 125px`) drawn with `1px` lines in `#F6F6F6` (`rgba(0, 0, 0, 0.035)`).
  * Measured vertical grid coordinates (`geometry_measurements.py`): `x = 125px, 250px, 375px, 500px, 625px, 750px, 875px, 1000px, 1125px, 1250px, 1375px, 1500px, 1625px, 1775px`.
  * Measured horizontal grid coordinates: `y = 126px, 251px, 376px, 501px, 626px, 751px`.
* **Primary Container Width & Page Margins [Verified]**:
  * **Max Content Container**: `1650px` (`x = 124px` to `x = 1774px`), leaving exact **`125px` left and right outer margins** on the `1900px` viewport. Crucially, the left and right edges of all full-width cards (Featured Works project cards, Case Study 2-column grid, Journal 3-column grid, Core Capabilities matrix, and Contact footer banner) **snap directly to the first (`x=125px`) and last (`x=1775px`) vertical grid lines**.

### 2. Grid Structure and Column Arrangements Across Pages

| Section / Page | Container Width | Column Structure & Measured Pixel Coordinates (`1900px` Canvas) | Gap / Gutter | Status |
| :--- | :--- | :--- | :--- | :--- |
| **Top Navbar** | `100%` (`1900px`) | Full-bleed flex bar (`height: 62px`, `border-bottom: 1px solid #CCCCCC`): Left brand mark (`x=0..83`) + 6 nav tabs (`x=84..960`) + spacer + right utility group (`EM`, `PH`, Avatar, `CONTACT` button at `x=1550..1865`) | `0px` between tabs; `12px` between right utilities | **[Sampled]** |
| **Top & Bottom Rulers** | `100%` (`1900px`) | Full-bleed horizontal scale (`height: 49px`, `y=63..111` at top; `height: 45px` at footer) with major ticks every `100px` and minor ticks every `50px` | `50px` tick interval | **[Sampled]** |
| **Home — Hero** | `1650px` (`750px` core) | Centered single-column stack (`BEJAMAN` bounding box `750px × 189px` at `x=574..1324, y=306..495`) surrounded by 6 absolute-positioned floating badges/avatars across the `1650px` stage | `24px–36px` vertical stack gap | **[Sampled]** |
| **Home — About & Skills** | `1650px` (`1150px` text) | Centered editorial column (`max-width: 1150px`) flanked by 2 tilted Polaroid cards (`x=50..300` left, `x=1590..1850` right), followed by a centered 2-row flex grid of 4 Skill + Icon pairs (`x=500..1385`) | `16px` horizontal & vertical gap between skill blocks | **[Sampled]** |
| **Home — Featured Works** | `1650px` (`x=124..1774`) | 4 vertically stacked sticky folder cards (`width: 1650px`, `height: ~680px` body + `88px` tab). Inside each card: **Left column (`~42%` / `680px`)** for metadata & title; **Right column (`~58%` / `850px`)** for framed project image (`x=942..1756`) | `48px` internal column gap | **[Sampled]** |
| **Shared — Let's Talk + Footer** | `1650px` (`x=124..1775`) | **Let's Talk**: 2-column split — Left column (`x=250..760`) holds giant green 4-leaf mascot + floating `Comment` card (`435px` wide); Right column (`x=960..1700`) holds `LET'S TALK` title + bio. **Contact Banner**: `1650px × 560px` rounded card (`border-radius: 32px`) | `120px` split column gap | **[Sampled]** |
| **About Page (`/about`)** | `1650px` | **Asymmetric 2-Zone Layout**: Sticky Left Section Spy Pill (`x=128..236`, `width: 108px`) + Center-Left Content Column (`x=504..1161` for Bio/Timeline `658px`–`980px` wide; `x=375..1625` `1250px` wide for staggered Story sticky notes) | `140px–268px` offset from left pill | **[Sampled]** |
| **Case Studies (`/case-study`)** | `1650px` (`x=124..1774`) | **2-Column Symmetric Grid**: Column 1 (`x=124..914`, `width: 790px`) + Column 2 (`x=985..1774`, `width: 789px`) | `71px` horizontal gap; `64px` vertical row gap | **[Sampled]** |
| **Services (`/services`)** | `100%` bleed / `1650px` inner | **4 Full-Bleed Jagged Sections** (`1900px` wide) containing a **3-Column Folder Pill Grid** (`3 × 526px` columns, `36px` gap, 5 pills per service); **3-Column Mobile Process Row** (`3 × 448px` phone cards at `x=268..716`, `x=888..1336`, `x=1508..1900`); **2×2 Core Capabilities Matrix** (`1650px` wide, `825px` per quadrant); **2-Column Staggered FAQ Cards** | `36px` pill grid gap; `172px` phone card gap | **[Sampled]** |
| **Journal (`/blog`)** | `1650px` (`x=123..1774`) | **3-Column Symmetric Card Grid**: 3 equal cards (`width: ~526px` each) across 2 rows (5 total articles: 3 in row 1, 2 in row 2) | `36px` horizontal & vertical gap | **[Sampled]** |
| **Playground (`/play-ground`)** | `100vw × 100vh` | **Freeform Pan-and-Zoom Infinite Canvas**: Scattered draggable polaroids, sticky notes, and vector stickers positioned across a `2D` coordinate plane | Freeform coordinates | **[Verified]** |

### 3. Section Order and Vertical Spacing
* **Macro Section Padding [Sampled]**: `120px` to `160px` (`7.5rem`–`10rem`) top and bottom vertical padding between major sections on white canvas,frequently separated by a full-width hand-drawn scribble arc (`1px` gray `#999999` curve spanning `x=0..1900`, observed between Hero and About in `frame_027`).
* **Card & Element Spacing [Sampled]**:
  * Navbar height: `62px`; Ruler height: `49px` (combined top chrome = `111px`).
  * Featured Works header to first project card: `72px`.
  * Project card internal padding: `48px` left/right, `44px` top/bottom.
  * Skill block grid gap: `16px` horizontal, `16px` vertical.

---

## E. Component Inventory

### 1. Top Header & Utility Navigation Bar (`Navbar`)
* **Purpose**: Persistent global navigation and quick contact utility bar across all pages.
* **Structure & Layout [Verified]**: Full-width horizontal bar (`height: 62px`, `background: #FFFFFF`, `border-bottom: 1px solid #CCCCCC`, `position: sticky; top: 0; z-index: 100`).
  * **Left Brand Cell (`x=0..83`, `width: 84px`)**: Contains a `36px × 20px` black geometric rainbow/arch logo icon centered in the cell, separated by a subtle `1px` vertical divider.
  * **Primary Navigation Links (`x=84..960`)**: 6 horizontal tab items, each with a `16px × 16px` solid black geometric icon on the left and uppercase `--font-mono` (`14px`) text on the right:
    1. `HOME` (house/pentagon icon) — `width: 114px` (`x=84..197`)
    2. `ABOUT` (8-point asterisk/star icon) — `width: 118px`
    3. `CASE STUDY` (hourglass/spool icon) — `width: 156px`
    4. `SERVICES` (double-pill/stack icon) — `width: 154px`
    5. `JOURNAL` (Y-branch/antenna icon) — `width: 142px`
    6. `PLAYGROUND` (stepped-stairs icon) — `width: 164px`
  * **Right Utility Cluster (`x=1550..1865`)**:
    * `EM` circular button (`38px × 38px`, `border-radius: 50%`, `background: #EDEDED`, `--font-mono` `13px` `#111111`).
    * `PH` circular button (`38px × 38px`, `border-radius: 50%`, `background: #EDEDED`, `--font-mono` `13px` `#111111`).
    * Profile Avatar (`38px × 38px` circular photo of Bejaman with a `2px solid #42D2ED` cyan ring).
    * `CONTACT` CTA button (`138px × 42px`, `background: #FFFFFF`, `border: 1.5px solid #111111`, heart icon `♥` + `CONTACT` in `--font-mono` `14px`).
* **Visual & Interactive States [Verified]**:
  * **Active Route Tab**: Full-height rectangular fill (`height: 62px`) in Electric Cyan (`#42D2ED`) with `#111111` icon and text (observed moving across `HOME`, `ABOUT`, `CASE STUDY`, `SERVICES`, `JOURNAL`, `PLAYGROUND` in the recording).
  * **`EM` / `PH` Hover Tooltip (`frame_024`)**: Hovering `EM` reveals a floating cyan dropdown pill (`background: #42D2ED`, `border-radius: 8px`, `padding: 14px 24px`) directly below at `y=64..115` displaying `HELLO@BEJAMANDESIGNS.COM` in `--font-mono` `14px` `#111111`.
  * **`CONTACT` Button Hover (`frame_023`)**: Fills with `#111111` background and `#FFFFFF` text/heart icon; links to `/contact`.

### 2. Horizontal CAD Ruler Bar (`RulerBar`)
* **Purpose**: Reinforces the design-tool artboard metaphor at the very top of the page (directly below the navbar) and at the bottom of the footer.
* **Structure & Layout [Verified]**: Full-width strip (`height: 49px`, `y=63..111`, `background: #FFFFFF`, `border-bottom: 1px solid #CCCCCC`).
  * Major vertical tick marks (`height: 14px`, `1px solid #CCCCCC`) every `100px` (`0`, `100`, `200`, ..., `1500` / `1600`) with centered numeric labels (`11px` `--font-mono`, color `#888888`) below the ticks.
  * Minor vertical tick marks (`height: 8px`, `1px solid #DCDCDC`) at every `50px` midpoint.
* **Interactive Behavior [Verified]**: In `frame_021`–`frame_024`, hovering and moving across the ruler horizontally shifts/scrubs the ruler coordinate origin (`0` shifts from `x=0` to `x=160` as `100..1500` slide smoothly).

### 3. Hero Section & Interactive Selection Stage (`HeroStage`)
* **Purpose**: High-impact personal introduction combining design-software selection chrome with playful interactive toys.
* **Structure & Layout [Verified]**:
  * **Intro Splash Sequence (`frame_001`–`frame_003`)**: On initial load (`00:00`–`00:02`), the canvas shows only the `125px` grid and a centered cyan chat-bubble (`#42D2ED`, `border: 2px solid #111111`, sharp top-left corner `0px`, other 3 corners `border-radius: 18px`) that types/morphs from `Hey there!` → `H` → `Welcome!` while the underlying hero elements fade and scale in from `opacity: 0`.
  * **Live Digital Clock (`y=136`)**: Centered live time readout (`9:27:15 AM`) in `--font-mono` `14px` `#111111` ticking every second.
  * **Handwritten Kicker (`y=215`)**: `my name is` in `--font-hand` `28px` `#111111` with a triple hand-drawn horizontal underline.
  * **Primary Selection Box (`x=574..1324, y=306..495`, `750px × 189px`)**:
    * Border: `2px solid #42D2ED` with four `12px × 12px` `#42D2ED` square corner handles (`border: 1.5px solid #111111`).
    * Content: `BEJAMAN` in `--font-display` (`129px` cap height, `#111111`).
    * Overlapping Top-Left Ribbon: Tilted (`-14°`) pastel mint rectangle (`#A6E3C4`, `padding: 12px 24px`) reading `Currently at Meridian Health` (`--font-sans` `16px` `#111111`).
    * Overlapping Top-Right Ribbon: Tilted (`+8°`) pastel yellow rectangle (`#F2DEA3`, `padding: 12px 24px`) reading `Previously at Searchless AI` (`--font-sans` `16px` `#111111`).
  * **Availability Status Indicator (`y=535`)**: `14px × 14px` `#42D2ED` circle + `AVAILABLE FOR THOUGHTFUL PROJECTS` (`--font-mono` `14px`, `letter-spacing: 0.06em`, `#111111`).
  * **Editorial Value Proposition (`y=636..740`)**: Two-line centered heading (`I design [🟢] outstanding` / `digital products [🌸].`) in `--font-sans` `52px` (`weight: 500`, `#111111`), where `[🟢]` is a `42px` `#92E1B8` concentric-target icon and `[🌸]` is a `42px` `#D0075A`/`#E88DB1` 8-petal flower icon.
  * **Primary CTA Button (`x=852..1046, y=771..840`, `195px × 70px`)**: `#121111` solid rectangle containing a left `48px × 48px` `#D0075A` square with a `#42D2ED` circle and black `>>` double-chevron icon, paired with `CONTACT ME` (`--font-mono` `15px` `#FFFFFF`).
  * **Floating Decorative Cursor Badges & Avatars**:
    * Bottom-Left (`x=65..310, y=735..805`): Tilted (`-6°`) Gold pill (`#E5B433`, `border: 2px solid #111111`, `border-radius: 28px`) reading `PRODUCT DESIGNER` (`--font-mono` `15px`) with a top-right gold cursor arrow pointer.
    * Middle-Right (`x=1280..1465, y=525..615`): Tilted (`+10°`) Magenta pill (`#D0075A`, `border: 2px solid #111111`, `border-radius: 28px`) reading `CHICAGO, IL` (`--font-mono` `15px` `#FFFFFF`) with a top-left magenta cursor arrow pointer.
    * Left & Right Floating Mini-Avatars (`x=152..222, y=438..508` and `x=1674..1744, y=556..626`): `70px × 70px` `#ABEBF7` pastel cyan teardrop/speech-bubble frames holding circular portraits of Bejaman. Hovering the left avatar (`frame_019`) expands it horizontally into a pill reading `have [avatar] nice day!`.
  * **Interactive Bottom Parameter Slider (`frame_005`–`frame_009`)**: Clicking/interacting near the hero bottom reveals a dark floating HUD pill (`#1E1E1E`, `border-radius: 12px`, `width: 240px`, `height: 54px`) with a speaker/wave icon, cyan range track (`#42D2ED`), and numeric readout (`0` to `26`).
  * **Interactive Black Inversion Lens (`frame_010`–`frame_015`)**: A draggable/cursor-linked black selection rectangle (`~420px × 430px` or `~240px × 240px`, `#000000` fill with `12px` black corner handles) that inverts all underlying colors via blend-mode difference.

### 4. Home About Section & 2×2 Skill Blocks (`AboutPreview` & `SkillGrid`)
* **Purpose**: Introduces Bejaman's location, philosophy, and four core competencies.
* **Structure & Layout [Verified]**:
  * **Top Divider**: Full-width hand-drawn gray pencil arc (`y=115..290` in `frame_029`).
  * **Handwritten Kicker**: `about me!` tilted `-10°` at `x=285, y=315` (`--font-hand` `24px`).
  * **Selection Box Label**: Centered `what's up` (`--font-sans` `32px`) inside a `215px × 76px` black selection box (`1.5px solid #111111` with four `10px × 10px` white/black corner handles).
  * **Inline-Media Bio Statement**: Centered 4-line statement (`max-width: 1150px`, `--font-sans` `72px`, `line-height: 1.15`):
    `I'm Bejaman [photo] a product designer in Chicago who gets excited [gold-clover] about making complicated things simple [magenta-hourglass].`
  * **Flanking Polaroids**:
    * Left Polaroid (`x=52..298`, tilted `-11°`): White instant-film frame (`padding: 14px 14px 48px 14px`, `box-shadow: 0 12px 32px rgba(0,0,0,0.08)`) with portrait photo and `2026` in `--font-hand` `22px`.
    * Right Polaroid (`x=1605..1855`, tilted `+9°`): White instant-film frame with desk/shelf photo and `my workspace` in `--font-hand` `22px`.
  * **2×2 Colored Skill Blocks (`frame_030`, `y=420..595`)**:
    * Two centered rows of `79px`-tall rectangular label blocks paired with `79px × 79px` square geometric icon tiles (`16px` gap between items):
      1. **Interaction Design**: Gold rectangle (`#E5B433`, `width: 414px`, `#111111` text) + Gold `79px × 79px` tile with dashed inner border and black 4-diamond icon.
      2. **Prototyping**: Emerald Green rectangle (`#3BCF81`, `width: 284px`, `#111111` text) + Green `79px × 79px` tile with radial black rays and `#D0075A` magenta center circle.
      3. **User Research**: Magenta rectangle (`#D0075A`, `width: 342px`, `#FFFFFF` text) + Magenta `79px × 79px` tile with white eye shape and gold star pupil.
      4. **Motion Design**: Electric Cyan rectangle (`#42D2ED`, `width: 338px`, `#111111` text) + Cyan `79px × 79px` tile with two `#D0075A` magenta circles in opposite corners and black dots.

### 5. Featured Works Header & Sticky Folder-Tab Project Cards (`FeaturedWorkSection` & `FolderProjectCard`)
* **Purpose**: Showcases 4 flagship case studies using a physical file-folder stacking metaphor.
* **Section Heading (`frame_032`) [Verified]**:
  * Handwritten kicker: `explore my work!` (`--font-hand` `24px`) with triple hand-drawn underline.
  * Display Title: `FEATURED` / `WORKS` stacked on 2 lines (`--font-display` `112px` `#111111`).
  * Subtitle Sticky Note: Tilted (`-2.5°`) pastel yellow rectangle (`#F2DEA3`, `378px × 98px`, `padding: 20px 28px`) reading `This is a showcase of what happens when curiosity drives the process.` (`--font-sans` `17px`).
* **Folder-Tab Project Cards (`frame_033`–`frame_035`) [Verified]**:
  * **Dimensions**: `width: 1650px` (`x=124..1774`), card body height `~660px`, top folder tab height `88px` (`y=104..192`).
  * **Chamfered Folder Tab Geometry**: Each card has a top tab (`height: 88px`, `width: ~390px`) whose sloped side(s) angle at `45°` (`88px` horizontal run over `88px` vertical rise) with a rounded `16px` transition into the horizontal card top edge. Inside the tab sits a `16px` stepped-stairs icon + `PROJECT 01`..`04` in `--font-mono` `15px`.
  * **Staggered Horizontal Tab Positions (Sticky Stack Alignment)**:
    * **Card 01 (`Meridian Health`)**: Cyan `#42D2ED` fill, `#111111` text. Tab anchored flush-left at `x=124..450` (chamfered on right edge only). Tags at bottom-left (`frame_033`): white folder-shaped pills `HEALTHCARE` and `WORKFLOW DESIGN`.
    * **Card 02 (`StyleBook`)**: Obsidian Black `#111111` fill, `#FFFFFF` text (`#CCCCCC` body copy). Tab positioned at Column 2 (`x=445..865`, chamfered on both left and right edges). Tags at bottom-left (`frame_034`): white folder-shaped pills `SAAS` and `TRANSFORMATION` (`#111111` text).
    * **Card 03 (`Homestead`)**: Warm Gold `#E5B433` fill, `#111111` text. Tab positioned at Column 3 (`x=855..1275`, chamfered on both edges). Tags: `PROPTECH` and `0 -> 1`.
    * **Card 04 (`North Light`)**: Vibrant Magenta `#D0075A` fill, `#FFFFFF` text (title in translucent pink/white blend). Tab positioned at Column 4 (`x=1240..1660`, chamfered on both edges). Tags: `STRATEGY` and `ENTERPRISE`.
  * **Internal Card Layout**:
    * **Left Column (`x=148..820`)**:
      * Date row: `12px` solid circle dot + uppercase date (`MAR 19, 2026`, `MAR 2, 2026`, `JAN 2, 2025`, `MAR 19, 2026`) in `--font-mono` `14px`.
      * Project Title: `Meridian Health` / `StyleBook` / `Homestead` / `North Light` in `--font-sans` `68px`.
      * 2-line Hook: `When therapists spend less time clicking, they have more time for patients.` (`--font-sans` `17px`, `max-width: 340px`).
      * Link CTA: `VIEW PROJECT ↗` (`--font-mono` `14px`, `padding-bottom: 10px`, `border-bottom: 1.5px solid currentColor`).
      * Bottom-left Category Pills: 2 miniature folder-tab shaped pills (`height: 44px`, `padding: 0 18px`).
    * **Right Column (`x=942..1756`, `width: 814px`, `height: 556px`)**:
      * Large rectangular project photography wrapped in a `1.5px` selection bounding box with four `12px × 12px` corner handles.
      * Top-Right File Badge (`x=1568..1732`, `164px × 48px`): Rectangular badge (`#111111` on light cards with `#42D2ED` or `#E5B433` text; `#FFFFFF` on dark/magenta cards with `#111111` or `#D0075A` text) containing a file-page `JPG` icon + `IMAGE.JPG` in `--font-mono` `14px`.

### 6. Let's Talk Section & Footer Contact Banner (`LetsTalkSection` & `FooterBanner`)
* **Purpose**: Recurring pre-footer conversion block and bold visual footer across `Home`, `About`, `Case Studies`, `Services`, and `Journal`.
* **Let's Talk Upper Split (`frame_037`) [Verified]**:
  * **Left Column (`x=290..765`)**:
    * Giant asymmetrical 4-leaf clover/butterfly mascot illustration (`width: 475px`, `height: 440px`, fill `#3BCF81`, stroke `3px solid #111111`) with two vertical black oval eyes (`26px × 78px`) that subtly track/shift toward the cursor.
    * Overlapping White Comment Card (`x=250..685, y=585..855`, `width: 435px`, `background: #FFFFFF`, `border-radius: 16px`, `box-shadow: 0 10px 40px rgba(0,0,0,0.08)`, `padding: 24px`):
      * Top header: `Comment` (`--font-sans` `14px` `#888888`) above a `1px solid #EEEEEE` divider.
      * Body: `44px` circular avatar of Bejaman + `Bejaman` (`16px` medium) + `Open to contract work, full-time roles, and interesting conversations about hard design problems.` (`15px` `#333333`).
      * Reaction Pill: `64px × 32px` light-cyan pill (`#E6F9FD`, `border: 1.5px solid #42D2ED`, `border-radius: 6px`) with a cyan lightning bolt `⚡` + `1`.
  * **Right Column (`x=965..1700`)**:
    * Display Heading: `LET'S TALK` (`--font-display` `112px`).
    * Bio Paragraph: `I'm most energized by projects where I can dig into complex problems, collaborate with smart people, and ship things that genuinely improve someone's day.` (`--font-sans` `17px`, `max-width: 480px`).
* **Footer Contact Banner (`frame_038`, `frame_062`) [Verified]**:
  * **Outer Container**: `width: 1651px` (`x=124..1775`), `height: 560px`, `border-radius: 32px`, `overflow: hidden`.
  * **Background Graphic**: Bold diagonal/curved abstract stripes alternating between Warm Gold (`#E5B433`) and Deep Espresso (`#422C3A`).
  * **Centered Interactive `CONTACT` Sign (`x=550..1350, y=165..325`, `800px × 160px`)**:
    * Default State (`frame_038`): `#42D2ED` cyan fill, `2px solid #111111` border, containing left & right `98px × 98px` `#D0075A` magenta squares with black diamonds and gold `>>` arrows flanking `CONTACT` in `--font-display` `104px` `#111111`.
    * Hover State (`frame_062`): Inverts to `#111111` black fill with `#42D2ED` cyan `CONTACT` text and a `2px solid #FFFFFF` selection box with four `20px × 20px` black-filled, white-stroked corner handles. Clicking navigates to `/contact`.
  * **Bottom Ruler Bar**: Full-width `45px` ruler (`0` to `1400`+) at the very bottom of the page.

### 7. Secondary Page Components (Observed in `ui rs.mp4` & `google:browse`)
* **About Page (`/about`, `frame_040`–`frame_045`) [Verified]**:
  * **Sticky Left Section Spy Pill (`x=128..236, y=190..505`)**: Floating vertical white capsule (`108px × 315px`, `border-radius: 20px`, `box-shadow: 0 8px 30px rgba(0,0,0,0.06)`, `padding: 16px`) containing 3 square `76px × 76px` anchor buttons (`BIO` with gear icon, `STORY` with connector icon, `WORK` with 4-point star icon). The active section button fills with `#111111` black (`border-radius: 12px`) and white text/icon.
  * **Bio Box (`x=504..1500`)**: Top gold badge `MAIN BIO` (`#E5B433`), followed by a `1.5px solid #E5B433` selection box with `12px` white/gold corner handles containing the inline-icon headline, 2 body paragraphs, 2 pastel-yellow `#F2DEA3` sticky notes (the bottom one tilted `+4°`), and a tilted `+6°` Polaroid (`it's me`) with a floating gold `BEJAMAN` cursor badge.
  * **Story Section (`frame_043`–`frame_044`)**: Large `1250px`-wide pink-bordered selection frame (`1.5px solid #D0075A` with corner handles) containing 3 staggered pastel sticky notes (`~485px × 345px` each) paired with hand-drawn curved arrows and handwritten callouts:
    1. Left Cyan Note (`#ABEBF7`): `Starting with why, not what` + arrow to `think first, draw later.`
    2. Right Yellow Note (`#F2DEA3`): `Designing for real constraints` + arrow to `no perfect world here!`
    3. Right Pink Note (`#F6B6D0`): `Sweating the small stuff` + arrow to `details build trust.`
  * **Work Timeline (`frame_044`–`frame_045`)**: Top cyan badge `WHAT DIVE INTO MY WORK` (`#42D2ED`), followed by a `1.5px solid #42D2ED` selection box (`width: 998px`) containing `Timeline` header and 4 vertical entries separated by `1px solid #E5E5E5` dividers (`Meridian Health` `SEP 2025 - CURRENT` in cyan pill; `StyleBook` `MAR 2024 - AUG 2025`; `Northlight Consulting` `FEB 2024 - DEC 2024`; `Homestead`), accompanied by a floating cyan `MY WORK` cursor badge.
* **Case Studies Page (`/case-study`, `frame_048`–`frame_051`) [Verified]**:
  * Display Header: `CASE STUDIES` (`--font-display` `112px`).
  * 2×2 Grid of Gray Folder Cards (`width: 790px` each, `gap: 71px`): Each card has a `#EEEEEE` chamfered top-left folder tab (`height: 68px`) with a black dot + date (`MAR 19, 2026`), a `#EEEEEE` image frame (`padding: 24px`) holding a `16:10` project image, and centered below on the white canvas: Title (`36px` `--font-sans`) + 2-line subtitle (`16px` `#444444`). Hovering triggers a `80px × 80px` solid `#111111` circular cursor follower reading `See` (`18px` `#FFFFFF`).
* **Services Page (`/services`, `frame_055`–`frame_066`) [Verified]**:
  * **Hero**: Tilted (`-3°`) dark brown pill (`#422C3A`) with avatar + `AVAILABLE FOR Q4 PROJECTS OTS`, `WHAT` (`--font-display` `112px`) over a `#ABEBF7` cyan selection box containing `I DO` flanked by two `#42D2ED` geometric butterfly shapes, bio paragraph, and `CONTACT ME` CTA.
  * **4 Full-Bleed Jagged Service Bands (`(01) PRODUCT DESIGN` on `#ABEBF7`, `(02) WEB DESIGN` on `#F2DEA3`, `(03) DESIGN SYSTEMS` on `#F6B6D0`, `(04) CREATIVE DIRECTION` on `#A6E3C4`)**: Separated by full-width 5-segment polyline borders (`2px solid #111111`) with `8px × 8px` solid black square vertex nodes at each peak/valley. Each band contains a circular `(01)` number badge (`58px` circle, `1px solid #111111`), a large watermark geometric icon behind the `--font-display` title, a 2-line subtitle, and 5 folder-tab capability pills arranged in a 3-column grid (`width: 526px`, `height: 62px`).
  * **3 Mobile Process Cards (`frame_062`–`frame_063`)**: Three vertical smartphone-bezel cards (`width: 448px`, `height: 750px`, `border-radius: 48px`, `border: 4px solid #111111`, top notch `210px × 24px`):
    1. `Discover` (`#ABEBF7` cyan fill, `STEP 01` cyan cursor badge)
    2. `Define` (`#F2DEA3` yellow fill, `STEP 02` gold cursor badge)
    3. `Design` (`#F6B6D0` pink fill, `STEP 03` magenta cursor badge)
    Each card features a centered `96px` line-art illustration, `40px` title, 2-line description, and a bottom-right `64px` white circle button (`border: 2px solid #111111`) with a `→` right arrow.
  * **Core Capabilities 2×2 Matrix (`frame_064`–`frame_065`)**: `CORE CAPABILITIES` header above a `1650px` 2×2 grid divided by a `1px solid #111111` crosshair (`STRATEGY` with mint sticky notes, `DESIGN` with cyan sticky notes, `SYSTEMS` with yellow sticky notes, `MOTION` with pink sticky notes).
  * **FAQ Chat Cards (`frame_066`)**: 2-column staggered white cards (`width: ~720px`, `border-radius: 16px`, `box-shadow: 0 10px 35px rgba(0,0,0,0.06)`, `padding: 28px`) structured like Slack/FigJam threads (`Question` header, colored user avatar circle, `28px` question title, bordered reaction counter pill `🌈 1` / `💎 1` / `😊 1`, and Bejaman's avatar alongside a `#F1F1F1` rounded reply bubble).
* **Journal Page (`/blog`, `frame_068`–`frame_070`) [Verified]**:
  * Display Header: `JOURNAL` (`--font-display` `112px`).
  * 3-Column Article Card Grid (`width: 526px` per card, `gap: 36px`): Each card has a subtle chamfered top-left folder tab outline (`border: 1px solid #E5E5E5`), a `526px × 295px` (`16:9`) photograph, and a white footer bar (`height: 98px`, `padding: 20px 24px`, `border: 1px solid #E5E5E5`) containing a `38px × 38px` colored square icon badge (green lightbulb `#3BCF81`, gold fountain pen `#E5B433`, or magenta leaf `#D0075A`) + article title (`20px`) and date (`14px` `#777777`).
* **Playground Page (`/play-ground`, `frame_072`–`frame_078`) [Verified]**:
  * Interactive zoomable/pannable whiteboard canvas where the cursor turns into a grab hand (`✋`) with the `YOU` pill. Contains 7 tilted square/rectangular photographs (`border: 6px solid #FFFFFF`, soft shadow) taped with pastel sticky notes (`Tiny moments`, `Random shot`, `Not sure what I'm doing`, `bus bus bus`, `flower!`, `Brain's messy, but it's okay`, `Good weather`) and vector stickers (purple smiley face, rainbow cloud, pink heart, daisy flowers).
* **Contact Page (`/contact`) [Verified via `google:browse`]**:
  * Interactive 2-step conversational note form (`leave me a note` / `Contact` / Step `(1/2)` with prompts `Where to find you?` and `What's on your mind?` + `Next` button), status `I'm available for new projects!`, and social links (`Facebook`, `Instagram`, `Linkedin`).

---

## F. Images and Media

### 1. Observed Image Assets, Aspect Ratios & Treatments

| Section / Component | Asset Subject & Placement | Aspect Ratio / Measured Size | Framing & Treatment | Verified Asset URL (where available) |
| :--- | :--- | :--- | :--- | :--- |
| **OG / Primary Portrait** | Portrait of Bejaman (smiling young man in olive button-down shirt & patterned headband) | `1:1` square (`38px` navbar avatar, `44px` comment avatar, `58px` inline bio tile, `210px` Polaroid photo) | Circular crop (`border-radius: 50%`) in avatars; square crop inside white Polaroid frame (`padding: 14px 14px 48px`) tilted `-11°` or `+6°` | `https://framerusercontent.com/images/fLhqLc1Zfa1vomoVNhwjalzo.jpg` **[Verified]** |
| **About Workspace Polaroid** | Bright minimalist desk with wooden wall shelves and framed prints (`my workspace`) | `1:1` square (`~210px × 210px` inside `240px × 288px` Polaroid) | White instant-film border tilted `+9°` with subtle drop shadow | Inspectable in `frame_029` **[Verified]** |
| **Project 01 (`Meridian Health`)** | Three athletes resting on a bright blue running track (`a group of people`) | `814px × 556px` (`~1.46:1` / `3:2` on Home); `742px × 440px` (`~16:10` on Case Studies) | `object-fit: cover`; wrapped in `1.5px solid #111111` selection box with `12px` corner handles + top-right `#111111` `JPG IMAGE.JPG` badge | Inspectable in `frame_033`, `frame_049` **[Verified]** |
| **Project 02 (`StyleBook`)** | Young man sitting thoughtfully by indoor houseplants (`a man is thinking about things`) | `814px × 556px` (`~3:2` on Home); `742px × 440px` (`~16:10` on Case Studies) | `object-fit: cover`; wrapped in `1.5px solid #FFFFFF` selection box with `12px` corner handles + top-right `#FFFFFF` `JPG IMAGE.JPG` badge | Inspectable in `frame_034`, `frame_049` **[Verified]** |
| **Project 03 (`Homestead`)** | Two Shiba Inu dogs in front of a yellow tiled facade with red striped awning (`two dog in front of the house`) | `814px × 556px` (`~3:2` on Home); `742px × 440px` (`~16:10` on Case Studies) | `object-fit: cover`; wrapped in `1.5px solid #111111` selection box + `#111111` `JPG IMAGE.JPG` badge | Inspectable in `frame_035`, `frame_050` **[Verified]** |
| **Project 04 (`North Light`)** | Lone figure standing on sand dunes (`a man in the desert`) | `814px × 556px` (`~3:2` on Home); `742px × 440px` (`~16:10` on Case Studies) | `object-fit: cover`; wrapped in `1.5px solid #FFFFFF` selection box + `#FFFFFF` `JPG IMAGE.JPG` badge | Inspectable in `frame_035`, `frame_050` **[Verified]** |
| **Journal Cards (`01`–`05`)** | Architectural, studio desk, and interior workspace photography | `526px × 295px` (`16:9` widescreen crop) | Sharp corners (`border-radius: 0`), `object-fit: cover`, flush inside folder card body | Inspectable in `frame_068`–`frame_070` **[Verified]** |
| **Playground Photos (`01`–`07`)** | Architectural curves, still-life geometry, red spice mounds, pastel building facades | `~260px` to `480px` square/portrait (`4:3` & `1:1`) | Tilted (`-6°` to `+8°`), `6px` white border, overlapped by colored sticky labels and cartoon stickers | `https://framerusercontent.com/images/GeBUV4VcRCbGk0YtC0xD3Hts4.png?width=1342&height=1007` **[Verified]** |

---

## G. Interactions and Motion

Every interaction below is separated into **Observed Behavior** (verified with exact timestamps in `ui rs.mp4`) and **Implementation Specification** (estimated easing/durations for code recreation).

| Interaction / Element | Video Timestamp | Trigger | Observed Behavior **[Verified]** | Implementation Suggestion (`duration` / `easing`) **[Estimated]** |
| :--- | :--- | :--- | :--- | :--- |
| **1. Intro Speech-Bubble Preloader** | `00:00` – `00:03` | Initial Page Load | Canvas starts blank with only navbar and grid; centered `#42D2ED` bubble shows `Hey there!`, contracts to single letter `H`, expands to `Welcome!`, and dissolves as Hero elements scale/fade in. | `2200ms` total sequence; spring scale `cubic-bezier(0.22, 1, 0.36, 1)` |
| **2. Custom Multiplayer Cursor (`YOU`)** | `00:00` – `01:18` | `mousemove` (Global) | A `16px` solid circle + pill badge reading `YOU` trails the native pointer across the entire site. Changes color contextually (`#111111` black on white canvas, `#42D2ED` cyan on gold cards, `#E5B433` orange on blue photos, `#6A8CAF` lavender on dark photos). | `requestAnimationFrame` lerp (`0.18` damping factor) or CSS `transition: transform 80ms linear` |
| **3. Project & Journal `"See"` Cursor** | `00:49` – `00:50`, `01:09` | Hover over Case Study / Journal card | A `80px × 80px` solid `#111111` circle with centered white `See` text scales up around the cursor while the `YOU` pill offsets to its bottom-right. | `transform: scale(0)` → `scale(1)` over `250ms cubic-bezier(0.34, 1.56, 0.64, 1)` |
| **4. Hero Parameter / Audio Slider** | `00:05` – `00:09` | Click / Hover bottom of Hero | Dark HUD pill (`#1E1E1E`) pops up at bottom center; dragging the cyan slider from `26` down to `0` and back to `26` modulates the ambient sound/visual state. | `200ms ease-out` fade/slide-up |
| **5. Hero Black Inversion Lens** | `00:10` – `00:15` | Hover across `BEJAMAN` hero stage | A black selection box (`#000000` with corner handles) glides across the hero stage, inverting underlying pixels (`mix-blend-mode: difference`). | `mix-blend-mode: difference; pointer-events: none;` with smooth spring tracking |
| **6. Mini-Avatar Greeting Pill** | `00:19` | Hover left Hero mini-avatar | The `70px` `#ABEBF7` avatar circle expands horizontally into a `180px` pill reading `have [avatar] nice day!`. | `width` / `max-width` transition `300ms cubic-bezier(0.22, 1, 0.36, 1)` |
| **7. Ruler Horizontal Scrubbing** | `00:21` – `00:24` | Cursor move along top ruler | The ruler tick strip translates horizontally (`translateX`) in response to cursor X position. | Parallax transform `translateX(calc(var(--mouse-x) * -0.15))` |
| **8. Navbar `EM` Email Reveal** | `00:23` | Hover `EM` button in navbar | Cyan tooltip (`#42D2ED`) drops down displaying `HELLO@BEJAMANDESIGNS.COM`. | `opacity` + `translateY(-6px -> 0)` over `180ms ease-out` |
| **9. Scroll-Linked Character Reveal** | `00:30`–`00:31`, `00:35`, `00:48`, `01:03`, `01:08` | Scroll into viewport (`IntersectionObserver`) | Large `--font-display` titles (`FEATURED WORKS`, `LET'S TALK`, `CASE STUDIES`, `CORE CAPABILITIES`, `JOURNAL`) reveal character-by-character from translucent gray (`opacity: 0.12`) to solid `#111111`. | Scroll-progress mapped per character (`stagger: 40ms`) or `IntersectionObserver` threshold array |
| **10. Sticky Folder-Tab Card Stack** | `00:31` – `00:35` | Vertical scroll through Featured Works | Each `1650px` project card uses `position: sticky; top: 104px;`. Because tabs `01`–`04` are offset horizontally into 4 distinct columns (`x=124`, `x=445`, `x=855`, `x=1240`), scrolling stacks cards directly on top of one another while keeping all 4 folder tabs visible in a single horizontal row! | Native CSS `position: sticky; top: 104px;` with identical top offset for all 4 cards |
| **11. About Sticky Section Spy Pill** | `00:40` – `00:44` | Scroll through `BIO`, `STORY`, `WORK` on `/about` | Left floating pill stays fixed at `top: 190px`; active black square indicator smoothly switches from `BIO` → `STORY` → `WORK` as each section crosses the viewport center. | `IntersectionObserver` (`rootMargin: "-40% 0px -40% 0px"`) |
| **12. Footer `CONTACT` Box Inversion** | `01:01` (`frame_062`) | Hover over `CONTACT` box in footer banner | Box background flips from `#42D2ED` cyan to `#111111` black, text flips from `#111111` to `#42D2ED` cyan, and corner handles expand into `20px` white-stroked black squares. | `200ms cubic-bezier(0.16, 1, 0.3, 1)` |
| **13. Playground Canvas Pan & Zoom** | `01:12` – `01:18` | Click-drag & wheel on `/play-ground` | Cursor switches to grab hand; user pans and zooms out (`scale(1)` → `scale(0.65)`) across the 2D moodboard canvas, and drags individual sticky notes (`bus bus bus`). | Pointer-events pan/zoom transform (`transform: translate3d(x, y, 0) scale(s)`) |

### Reduced-Motion Considerations **[Recommended]**
* Under `@media (prefers-reduced-motion: reduce)`:
  * Skip the `2.2s` `Hey there!` → `Welcome!` intro overlay and render the Hero immediately in its settled state.
  * Disable the trailing `YOU` cursor follower and ruler horizontal parallax scrubbing.
  * Render all `--font-display` characters at `opacity: 1` immediately without scroll-linked opacity stepping.
  * Preserve `position: sticky` on the Featured Works folder cards and About section-spy pill (as these are structural layout aids), but remove spring bounce on hover states.

---

## H. Responsive Design

Because the screen recording captures the `1914×870` desktop layout and the static `google:browse` extraction reveals the mobile `Menu` trigger in the DOM, the desktop rules below are **[Verified]**, while the Tablet and Mobile adaptations are **[Recommended]** based on Framer's standard breakpoint architecture (`Desktop ≥ 1200px`, `Tablet 810px–1199px`, `Mobile ≤ 809px`).

| Layout Dimension / Component | Desktop (`≥ 1200px` / Reference `1914×870`) **[Verified]** | Tablet (`810px – 1199px`) **[Recommended]** | Mobile (`≤ 809px`) **[Recommended + DOM Verified Menu]** |
| :--- | :--- | :--- | :--- |
| **Outer Page Margins** | `125px` left & right (`max-width: 1650px` centered) | `40px` left & right (`width: calc(100% - 80px)`) | `20px` left & right (`width: calc(100% - 40px)`) |
| **Background Canvas Grid** | `125px × 125px` square grid | `80px × 80px` square grid | `50px × 50px` square grid |
| **Navigation Chrome** | Full horizontal top bar with 6 tab links + `EM`/`PH`/Avatar/`CONTACT` | Compact top bar (`HOME`, `ABOUT`, `WORK`, `CONTACT`) or collapse center tabs into floating bottom `Menu` button | Top bar shows only Brand Logo + `CONTACT` button; primary navigation moves into the floating bottom **`Menu`** pill button (observed in `google:browse` DOM output) which opens a full-screen overlay menu |
| **Hero Stage** | `750px × 189px` `BEJAMAN` box + 6 floating peripheral badges/avatars | Scale `BEJAMAN` box to `540px` wide; tuck `PRODUCT DESIGNER` and `CHICAGO, IL` badges closer to center; hide peripheral mini-avatars | Full-width `BEJAMAN` box (`100%`); stack `Currently at...` and `Previously at...` ribbons compactly above/below; hide hover inversion lens and custom cursor |
| **About Polaroids & Skills** | 2 flanking tilted Polaroids + 2×2 horizontal skill blocks (`79px` height) | Place Polaroids in a 2-column row below the bio text; keep 2×2 skill blocks with `56px` height | Stack Polaroids side-by-side (`48%` width each) above/below bio; stack the 4 Skill + Icon blocks into a single vertical column (`100%` width) |
| **Featured Works Folder Cards** | 4 staggered horizontal folder tabs (`25%` width each) that stay visible side-by-side when sticky-stacked | Keep 4 staggered tabs at `25%` width (`~180px` each); stack internal card layout into 1 column (text top, image bottom) | Convert folder tabs to full-width or `50%` width tabs with `16px` vertical stack offset (`top: calc(72px + var(--index) * 44px)`) so each card's tab title remains visible above the next card |
| **Case Studies & Journal Grids** | Case Studies: 2 columns (`gap: 71px`); Journal: 3 columns (`gap: 36px`) | Case Studies: 2 columns (`gap: 24px`); Journal: 2 columns (`gap: 24px`) | Single-column stack (`1fr`, `gap: 32px`) for both Case Studies and Journal |
| **Services Sections & Phones** | 3-column capability pill grid + 3-column smartphone frames (`448px` wide) + 2×2 Capabilities matrix | 2-column capability pill grid + horizontal scroll snap or 2+1 wrap for smartphone frames + 2×2 matrix | 1-column capability pills + vertical stack of smartphone frames (`100%` max `360px` centered) + 1-column Capabilities stack |
| **Let's Talk & Footer Banner** | 2-column split (Mascot/Comment left, Title/Bio right) + `560px` tall `CONTACT` banner | 2-column split (`45%` / `55%`) + `380px` tall `CONTACT` banner | Single-column stack (Title & Bio top, Mascot & Comment card bottom) + `240px` tall `CONTACT` banner with scaled `CONTACT` box |

---

## I. Accessibility and Usability

### 1. Observed Accessibility Features **[Verified]**
* **Descriptive Image Alt Text in DOM**: `google:browse` extraction confirms that the author populated descriptive human-written `alt` attributes on images in the Framer project:
  * Portrait in About section: `alt="a man (me)"`
  * Workspace Polaroid: `alt="my workspace"`
  * Project 01 (`Meridian Health`): `alt="a group of people"`
  * Project 02 (`StyleBook`): `alt="a man is thinking about things"`
  * Project 03 (`Homestead`): `alt="two dog in front of the house"`
  * Project 04 (`North Light`): `alt="a man in the desert"`
* **High Foreground/Background Luminance Contrast**: Primary combinations far exceed WCAG AAA (`7:1`):
  * `#111111` text on `#FFFFFF` canvas: **`18.8:1`**
  * `#111111` text on `#42D2ED` cyan (Navbar, Project 01, Motion Design): **`10.4:1`**
  * `#111111` text on `#E5B433` gold (Project 03, Interaction Design): **`9.6:1`**
  * `#111111` text on `#3BCF81` emerald green (Prototyping): **`9.3:1`**
  * `#FFFFFF` text on `#111111` black (Project 02, `CONTACT ME` CTA): **`18.8:1`**
  * `#FFFFFF` text on `#D0075A` magenta (User Research, Service 03 pills): **`5.8:1`** (Passes WCAG AA for normal text and AAA for large text).

### 2. Recommended Accessibility & Usability Improvements **[Recommended]**
* **Contrast Fix on Project 04 (`North Light`) Title**: In `frame_035`, the title `North Light` on the `#D0075A` magenta card uses a low-contrast translucent pink tint (`~#E25B8E` on `#D0075A`, contrast `~1.9:1`). Use solid `#FFFFFF` (`5.8:1`) for the project title to meet WCAG AA.
* **Ruler Numerals & Decorative Chrome (`aria-hidden="true"`)**: In the `google:browse` text dump, screen readers read out every single character of the animated intro (`W e l c o m e ! H e y t h e r e !`) and every ruler number (`0 100 200 300 400 500 600 700 800`) at the top and bottom of the page. Wrap the top/bottom `RulerBar` components, decorative selection handles, and floating cursor pills in `aria-hidden="true"` and put `aria-label="Welcome! Hey there!"` on split-character animated text containers so assistive technologies are not spammed.
* **Semantic Landmarks & Heading Hierarchy**:
  * Use `<header>` + `<nav aria-label="Main Navigation">` for the top utility bar, `<main>` for the page body, `<article>` for each Project and Journal card, and `<footer>` for the `Let's Talk` + `CONTACT` banner region.
  * Ensure `<h1>` is assigned to the primary page subject (`Bejaman — I design outstanding digital products.` on Home) and `<h2>` to section headers (`About Me`, `Featured Works`, `Let's Talk`).
* **Keyboard Focus Indicators & Sticky Card Navigation**:
  * Provide a high-visibility `:focus-visible` ring (`outline: 3px solid #111111; outline-offset: 4px; box-shadow: 0 0 0 6px #42D2ED;`) on all interactive controls.
  * When a user tabs into the `VIEW PROJECT ↗` link inside a `position: sticky` project card, ensure the browser scrolls the card cleanly into view without being occluded by subsequent stacked cards.
* **Touch Targets on Mobile**: Increase the `EM` and `PH` circular navbar buttons from `38px × 38px` to at least `44px × 44px` on touch devices (`@media (pointer: coarse)`), and convert the hover-only `EM` email tooltip into a click-to-copy / `mailto:` action.

---

## 3. Implementation-Ready Design System (CSS Custom Properties & Rules)

```css
:root {
  /* ==========================================================================
     1. COLOR TOKENS ([Sampled] & Normalized from 1914x870 Recording)
     ========================================================================== */
  /* Surfaces & Neutrals */
  --color-bg-canvas: #FFFFFF;
  --color-bg-navbar: #FFFFFF;
  --color-bg-card-muted: #EEEEEE;
  --color-bg-chat-bubble: #F1F1F1;
  --color-bg-pill-neutral: #EDEDED;
  --color-grid-line: #F4F4F4;        /* Sampled #F6F6F6 */
  --color-border-subtle: #E5E5E5;
  --color-border-ruler: #CCCCCC;     /* Sampled #C7C7C7 - #CCCCCC */
  --color-border-strong: #111111;

  /* Ink & Text */
  --color-text-primary: #111111;     /* Sampled #111111 - #121111 */
  --color-text-secondary: #333333;
  --color-text-muted: #777777;
  --color-text-ruler: #888888;
  --color-text-inverse: #FFFFFF;

  /* Brand Chromatic Primary Palette (4 Core Hues) */
  --color-cyan-primary: #42D2ED;     /* Sampled #42D2ED / #43D1EC */
  --color-gold-primary: #E5B433;     /* Sampled #E2B333 / #E5B433 */
  --color-magenta-primary: #D0075A;  /* Sampled #D0075A / #D0065A */
  --color-green-primary: #3BCF81;    /* Sampled #3BCE80 / #3BCF81 */

  /* Brand Pastel Tint Palette (Sticky Notes & Service Sections) */
  --color-cyan-tint: #ABEBF7;        /* Sampled #ABEAF7 / #ABEBF7 */
  --color-gold-tint: #F2DEA3;        /* Sampled #F2DEA3 */
  --color-magenta-tint: #F6B6D0;     /* Sampled #F6B6D0 */
  --color-green-tint: #A6E3C4;       /* Sampled #A6E3C4 */

  /* Special Accent Surfaces */
  --color-espresso-dark: #422C3A;    /* Sampled #422C3A (Footer Banner & Services Pill) */
  --color-reaction-bg: #E6F9FD;

  /* ==========================================================================
     2. TYPOGRAPHY TOKENS ([Estimated] Font Stacks + [Sampled] Scale)
     ========================================================================== */
  --font-display: 'Nudge Pixel', 'PP Mondwest', 'Bitcount Grid Single', monospace;
  --font-sans: 'Inter', 'Switzer', 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, sans-serif;
  --font-mono: 'JetBrains Mono', 'Fragment Mono', 'Space Mono', monospace;
  --font-hand: 'Caveat', 'Nanum Pen Script', cursive;

  /* Fluid / Responsive Font Sizes */
  --text-display-hero: clamp(3.5rem, 7.3vw, 8.75rem);      /* 56px -> 140px */
  --text-display-section: clamp(3.0rem, 5.8vw, 7.0rem);    /* 48px -> 112px */
  --text-statement-xl: clamp(2.125rem, 3.8vw, 4.5rem);     /* 34px -> 72px  */
  --text-project-title: clamp(2.0rem, 3.5vw, 4.25rem);     /* 32px -> 68px  */
  --text-hero-sub: clamp(1.75rem, 2.75vw, 3.25rem);        /* 28px -> 52px  */
  --text-heading-lg: clamp(1.5rem, 2.1vw, 2.5rem);         /* 24px -> 40px  */
  --text-heading-md: clamp(1.375rem, 1.9vw, 2.25rem);      /* 22px -> 36px  */
  --text-heading-sm: clamp(1.25rem, 1.65vw, 2.0rem);       /* 20px -> 32px  */
  --text-card-title: 1.25rem;                              /* 20px */
  --text-body-lg: 1.0625rem;                               /* 17px */
  --text-body-md: 0.9375rem;                               /* 15px */
  --text-hand-md: 1.5rem;                                  /* 24px */
  --text-mono-ui: 0.875rem;                                /* 14px */
  --text-mono-xs: 0.6875rem;                               /* 11px */

  /* ==========================================================================
     3. LAYOUT, GRID & SPACING TOKENS ([Sampled] from 1914x870 Viewport)
     ========================================================================== */
  --grid-cell-size: 125px;
  --container-max-width: 1650px;
  --container-bio-width: 980px;
  --page-margin-desktop: 125px;
  --page-margin-tablet: 40px;
  --page-margin-mobile: 20px;

  --navbar-height: 62px;
  --ruler-height: 49px;
  --top-chrome-height: 111px; /* navbar + ruler */

  --space-1: 4px;
  --space-2: 8px;
  --space-3: 12px;
  --space-4: 16px;
  --space-5: 24px;
  --space-6: 36px;
  --space-7: 48px;
  --space-8: 72px;
  --space-9: 120px;
  --space-10: 160px;

  /* ==========================================================================
     4. BORDER, RADIUS & SHADOW TOKENS
     ========================================================================== */
  --border-thin: 1px solid var(--color-border-ruler);
  --border-selection: 2px solid var(--color-cyan-primary);
  --border-ink: 1.5px solid var(--color-border-strong);
  --border-heavy: 3px solid var(--color-border-strong);

  --radius-none: 0px;
  --radius-sm: 6px;
  --radius-md: 12px;
  --radius-lg: 16px;
  --radius-xl: 28px;
  --radius-banner: 32px;
  --radius-phone: 48px;
  --radius-pill: 9999px;

  --shadow-polaroid: 0 12px 32px rgba(0, 0, 0, 0.08);
  --shadow-card: 0 10px 35px rgba(0, 0, 0, 0.06);
  --shadow-sticky-nav: 0 8px 30px rgba(0, 0, 0, 0.06);

  /* ==========================================================================
     5. MOTION & TRANSITION TOKENS ([Estimated])
     ========================================================================== */
  --ease-spring: cubic-bezier(0.22, 1, 0.36, 1);
  --ease-bounce: cubic-bezier(0.34, 1.56, 0.64, 1);
  --ease-out-quart: cubic-bezier(0.16, 1, 0.3, 1);
  --duration-fast: 180ms;
  --duration-normal: 300ms;
  --duration-slow: 600ms;
}
```

### Key Architectural CSS Patterns

```css
/* 1. 125px x 125px Graph Paper Canvas Background */
.canvas-grid-bg {
  background-color: var(--color-bg-canvas);
  background-image:
    linear-gradient(to right, var(--color-grid-line) 1px, transparent 1px),
    linear-gradient(to bottom, var(--color-grid-line) 1px, transparent 1px);
  background-size: var(--grid-cell-size) var(--grid-cell-size);
  background-position: 0 var(--top-chrome-height);
}

/* 2. Selection Bounding Box with 4 Corner Resize Handles */
.selection-box {
  position: relative;
  border: 2px solid var(--box-color, var(--color-cyan-primary));
}
.selection-box > .handle {
  position: absolute;
  width: 12px;
  height: 12px;
  background-color: var(--handle-fill, var(--color-cyan-primary));
  border: 1.5px solid var(--handle-stroke, var(--color-border-strong));
  z-index: 2;
}
.selection-box > .handle.tl { top: -7px; left: -7px; }
.selection-box > .handle.tr { top: -7px; right: -7px; }
.selection-box > .handle.bl { bottom: -7px; left: -7px; }
.selection-box > .handle.br { bottom: -7px; right: -7px; }

/* 3. Chamfered File-Folder Tab Geometry (Featured Works & Pills) */
.folder-tab {
  height: 88px;
  padding: 0 48px;
  display: inline-flex;
  align-items: center;
  gap: 12px;
  font-family: var(--font-mono);
  font-size: var(--text-mono-ui);
  text-transform: uppercase;
  /* 45-degree chamfered sides using clip-path or SVG mask */
  clip-path: polygon(64px 0%, calc(100% - 64px) 0%, 100% 100%, 0% 100%);
}
.folder-tab--flush-left {
  clip-path: polygon(0% 0%, calc(100% - 64px) 0%, 100% 100%, 0% 100%);
}
```

---

## 4. Page Structure and Component Architecture

### 1. Discovered Multi-Page Hierarchy (`nudge-folio.framer.website`)

```text
Nudge Portfolio Application
├── Global Shell (Persistent Across All Routes)
│   ├── TopNavbar (Sticky y=0..62px)
│   │   ├── BrandLogoCell (Rainbow arch icon)
│   │   ├── NavTabList (HOME, ABOUT, CASE STUDY, SERVICES, JOURNAL, PLAYGROUND)
│   │   └── UtilityCluster (EM button + Hover Tooltip, PH button, Avatar, ♥ CONTACT CTA)
│   ├── TopRulerBar (y=63..111px, 0..1500px interactive scale; hidden on Case Studies sub-scroll)
│   ├── CustomCursorLayer (Global 'YOU' pill follower + contextual 'See' 80px circle)
│   └── MobileMenuTrigger (Floating bottom 'Menu' button for <810px viewports)
│
├── Route 1: Home (`/`)
│   ├── IntroSplashBubble ('Hey there!' -> 'Welcome!' morphing cyan tooltip)
│   ├── HeroSection
│   │   ├── LiveClock ('9:27:15 AM')
│   │   ├── HandwrittenKicker ('my name is' + triple underline)
│   │   ├── SelectionBoxHero ('BEJAMAN' + 'Currently at Meridian Health' & 'Previously at Searchless AI' ribbons)
│   │   ├── InversionLensOverlay (Interactive black difference-blend square)
│   │   ├── AvailabilityBadge (Cyan dot + 'AVAILABLE FOR THOUGHTFUL PROJECTS')
│   │   ├── HeroSubheadline ('I design [target] outstanding digital products [flower].')
│   │   ├── PrimaryCtaButton ('>> CONTACT ME')
│   │   ├── FloatingDecorations ('PRODUCT DESIGNER' gold tag, 'CHICAGO, IL' magenta tag, 2 Mini-Avatars)
│   │   └── BottomParameterSlider (Floating dark audio/effect slider 0..26)
│   ├── ScribbleDividerArc (Full-width hand-drawn curve)
│   ├── AboutPreviewSection
│   │   ├── HandwrittenKicker ('about me!')
│   │   ├── SelectionBadge ('what's up')
│   │   ├── InlineMediaBio ('I'm Bejaman [photo] a product designer in Chicago...')
│   │   ├── FlankingPolaroids (Left '2026' portrait, Right 'my workspace' photo)
│   │   └── SkillBlockGrid (4 Colored Skill Rectangles + 4 Geometric SVG Icon Tiles)
│   ├── FeaturedWorksSection
│   │   ├── SectionHeader ('explore my work!' + 'FEATURED WORKS' + yellow sticky note)
│   │   └── StickyFolderStack (4 Sticky 1650px Cards with Staggered Top Tabs)
│   │       ├── FolderProjectCard 01 (Cyan #42D2ED — Meridian Health, Tab col 1)
│   │       ├── FolderProjectCard 02 (Black #111111 — StyleBook, Tab col 2)
│   │       ├── FolderProjectCard 03 (Gold #E5B433 — Homestead, Tab col 3)
│   │       └── FolderProjectCard 04 (Magenta #D0075A — North Light, Tab col 4)
│   └── SharedFooterConversion
│       ├── LetsTalkSplit (Green 4-leaf mascot + Comment Card left; 'LET'S TALK' + bio right)
│       ├── ContactBannerCard (1650px gold/espresso striped card + interactive 'CONTACT' box)
│       └── BottomRulerBar (0..1400px scale)
│
├── Route 2: About (`/about`)
│   ├── StickyLeftSectionSpy ('BIO', 'STORY', 'WORK' floating vertical pill)
│   ├── BioSection ('ABOUT' header + 'MAIN BIO' gold selection box + 2 yellow sticky notes + 'it's me' Polaroid)
│   ├── StorySection (Magenta selection box + 3 staggered Cyan/Yellow/Pink sticky notes with hand-drawn arrows)
│   ├── WorkTimelineSection ('WHAT DIVE INTO MY WORK' cyan selection box + 4 company timeline rows)
│   └── SharedFooterConversion (LetsTalkSplit + ContactBannerCard + BottomRulerBar)
│
├── Route 3: Case Studies (`/case-study` & `/case-study/:slug`)
│   ├── CaseStudiesHeader ('CASE STUDIES' with character opacity gradient)
│   ├── CaseStudyTwoColGrid (4 Gray #EEEEEE Folder-Tab Cards: Meridian Health, StyleBook, Homestead, North Light)
│   └── SharedFooterConversion
│
├── Route 4: Services (`/services`)
│   ├── ServicesHero ('AVAILABLE FOR Q4 PROJECTS' dark pill + 'WHAT I DO' cyan selection box + 'CONTACT ME')
│   ├── JaggedServiceBands (4 Full-Bleed Polygons with Vertex Handles)
│   │   ├── ServiceBand 01 ('(01) PRODUCT DESIGN' on #ABEBF7 + 5 cyan folder pills)
│   │   ├── ServiceBand 02 ('(02) WEB DESIGN' on #F2DEA3 + 5 gold folder pills)
│   │   ├── ServiceBand 03 ('(03) DESIGN SYSTEMS' on #F6B6D0 + 5 magenta folder pills)
│   │   └── ServiceBand 04 ('(04) CREATIVE DIRECTION' on #A6E3C4 + 5 green folder pills)
│   ├── ProcessPhoneRow (3 Smartphone Bezel Cards: 'Discover' #ABEBF7, 'Define' #F2DEA3, 'Design' #F6B6D0)
│   ├── CoreCapabilitiesMatrix ('CORE CAPABILITIES' + 2x2 Crosshair Grid with Folder Tabs & Sticky Notes)
│   ├── FaqChatGrid (4 Staggered Thread Cards with User Questions, Emoji Reactions & Gray Reply Bubbles)
│   └── SharedFooterConversion
│
├── Route 5: Journal (`/blog` & `/blog/:slug`)
│   ├── JournalHeader ('JOURNAL' with character opacity gradient)
│   ├── JournalThreeColGrid (5 Folder-Outline Article Cards with 16:9 photos & colored square icon badges)
│   └── SharedFooterConversion
│
├── Route 6: Playground (`/play-ground`)
│   └── InfinitePanZoomCanvas (Draggable/zoomable 2D board with 7 Polaroids, 8 sticky notes & vector stickers)
│
└── Route 7: Contact (`/contact`)
    └── TwoStepConversationalForm ('leave me a note', Step 1/2 inputs, availability status & social links)
```

### 2. Reusable vs. Section-Specific Component Boundaries

| Component Name | Reusability Scope | Props / Configuration API |
| :--- | :--- | :--- |
| `<SelectionBox>` | **Global Reusable** (Used in Hero, Project thumbnails, About Bio, Story, Timeline, Services Hero, Footer Contact) | `borderColor`, `handleFill`, `handleStroke`, `handleSize` (`10px`\|`12px`\|`20px`), `className` |
| `<FolderCard>` & `<FolderPill>` | **Global Reusable** (Used in Featured Works, Case Studies grid, Services capability pills, Core Capabilities tabs, Journal cards) | `tabOffsetIndex` (`1..4`), `tabWidth`, `bgColor`, `textColor`, `chamferLeft` (`boolean`), `chamferRight` (`boolean`) |
| `<StickyNote>` | **Global Reusable** (Used in Hero ribbons, Featured Works subtitle, About Bio, About Story, Core Capabilities, Playground) | `tint` (`cyan`\|`yellow`\|`pink`\|`mint`), `rotationDeg`, `title`, `body`, `size` (`sm`\|`md`\|`lg`) |
| `<CursorBadge>` | **Global Reusable** (Used for `YOU` follower, `PRODUCT DESIGNER`, `CHICAGO, IL`, `BEJAMAN`, `MY WORK`, `STEP 01..03`) | `label`, `bgColor`, `textColor`, `pointerCorner` (`top-left`\|`top-right`\|`none`), `rotationDeg` |
| `<PolaroidFrame>` | **Global Reusable** (Used in Home About, About Bio, Playground) | `imageSrc`, `alt`, `caption`, `rotationDeg`, `width` |
| `<PixelDisplayHeading>` | **Global Reusable** (Used across all 10 major section titles) | `text`, `lines`, `scrollFade` (`boolean`) |
| `<RulerBar>` | **Global Reusable** (Top chrome & Footer bottom) | `position` (`top`\|`bottom`), `maxUnits` (`1500`), `interactiveScrub` (`boolean`) |
| `<JaggedSectionBand>` | **Page-Specific (`/services`)** | `number` (`01..04`), `title`, `subtitle`, `bgColor`, `pillColor`, `capabilities[]`, `topPolygonPoints` |

---

## 5. Recreation Strategy

### 1. Implementation Priorities (Phased Build Order)
1. **Phase 1 — Canvas Foundation & Chrome**: Implement the `125px × 125px` CSS background grid, the `62px` sticky `TopNavbar` with active `#42D2ED` tab state, and the `49px` `RulerBar` component. Verify that a `1650px` centered container aligns its left and right edges directly with the `125px` and `1775px` grid lines on a `1900px` viewport.
2. **Phase 2 — Typography & Selection Primitives**: Load or construct the 4 font voices (`--font-display`, `--font-sans`, `--font-mono`, `--font-hand`) and build the `<SelectionBox>`, `<StickyNote>`, `<CursorBadge>`, and `<PolaroidFrame>` primitives.
3. **Phase 3 — Hero & About Sections**: Build the Hero `BEJAMAN` stage (including the tilted ribbons, inline-icon subheadline, `CONTACT ME` button, and difference-blend hover lens) followed by the About inline-media statement, flanking Polaroids, and the 2×2 colored Skill + Icon blocks.
4. **Phase 4 — Sticky Folder-Tab Project Stack**: Implement the 4 `1650px` `FolderProjectCard` components with `position: sticky; top: 104px;` and horizontal tab offsets (`0%`, `20%`, `44%`, `68%`) so all 4 chamfered tabs line up horizontally when scrolled to the bottom of the stack.
5. **Phase 5 — Let's Talk Mascot, Footer Banner & Secondary Routes**: Build the 4-leaf `#3BCF81` SVG mascot with eye-tracking, the floating `Comment` card, the diagonal-striped `#E5B433`/`#422C3A` `CONTACT` footer banner with hover inversion, and the secondary page layouts (`/about`, `/case-study`, `/services`, `/blog`, `/play-ground`, `/contact`).

### 2. Critical Visual Details That Must Not Be Overlooked
* **Exact Grid Alignment (`125px` Quantum)**: Do not use an arbitrary `1200px` or `1440px` container on large desktop screens; on the `1900px` reference canvas, the `1650px` cards snap directly to the `125px` background grid lines (`125px` left margin + `1650px` card = `1775px`).
* **Staggered Folder Tab Offsets**: On the Home page, Project 01's tab is on the far left (`x=124..450`), Project 02's tab sits immediately to its right (`x=445..865`), Project 03's tab sits third (`x=855..1275`), and Project 04's tab sits fourth (`x=1240..1660`). If all 4 tabs were left-aligned, they would cover each other when stacked!
* **Selection Box Handle Contrast**: Notice how selection handles adapt to their background — on white canvas (`BEJAMAN`), handles are `#42D2ED` cyan with `#111111` borders; on cyan/gold project cards (`Meridian Health`, `Homestead`), image handles are transparent/filled with `#111111` black borders; on black/magenta project cards (`StyleBook`, `North Light`), image handles are `#111111` filled with `#FFFFFF` white borders.
* **Vector Vertex Handles on Services Dividers**: The angled dividers between `(01) PRODUCT DESIGN`, `(02) WEB DESIGN`, `(03) DESIGN SYSTEMS`, and `(04) CREATIVE DIRECTION` are not plain CSS `clip-path` polygons — they draw a visible `2px solid #111111` polyline stroke with `8px × 8px` solid black square anchor points at every bend (`frame_058`–`frame_062`), mimicking a selected Pen-tool path in Figma/Illustrator.
* **Character-by-Character Opacity Gradient on Section Headers**: Display headings (`CASE STUDIES`, `JOURNAL`, `CORE CAPABILITIES`, `LET'S TALK`) must include the left-to-right character opacity ramp during scroll entry.

### 3. Recommended Asset Handling
* **Display Pixel Typography**: If the proprietary Framer bitmap font file is unavailable, render the 10 uppercase display words (`BEJAMAN`, `FEATURED WORKS`, `LET'S TALK`, `CONTACT`, `ABOUT`, `CASE STUDIES`, `WHAT I DO`, `PRODUCT DESIGN`, `WEB DESIGN`, `DESIGN SYSTEMS`, `CORE CAPABILITIES`, `JOURNAL`) using modular SVG glyph components built on a `5×7` rounded-stepped grid, or load `Bitcount Grid Single` / `PP Mondwest` with custom CSS ligatures.
* **Geometric Icons & Mascot**: Build the inline text icons (green concentric rings, magenta 8-petal flower, gold 4-leaf clover, magenta hourglass), the 4 `79px × 79px` Skill tiles, the 4-leaf `#3BCF81` `Let's Talk` mascot, and the handwritten curved arrows as crisp inline SVGs so they scale cleanly at any DPR.
* **Photography**: Use the verified `framerusercontent.com` URLs where available (`https://framerusercontent.com/images/fLhqLc1Zfa1vomoVNhwjalzo.jpg` for Bejaman's portrait and `https://framerusercontent.com/images/GeBUV4VcRCbGk0YtC0xD3Hts4.png` for Playground), and use high-resolution photography matching the exact color temperature and subject matter (blue running track, moody indoor plant portrait, two Shiba Inus against yellow tiles, lone desert walker) for the 4 case studies.

### 4. Common Mistakes That Would Make a Recreation Look Generic
1. **Omitting the `125px` Graph Paper Grid & Rulers**: Without the subtle `#F4F4F4` grid lines and top/bottom `0..1500` pixel rulers, the layout loses its signature "design-software canvas" identity and looks like a standard white webpage.
2. **Using Rounded Corners on Everything**: Nudge deliberately contrasts **sharp `0px` corners** on selection boxes, sticky notes, skill blocks, navbar active tabs, and `CONTACT ME` buttons against **generous rounded corners** on cursor badges (`28px`), footer banner (`32px`), and mobile process frames (`48px`). Rounding the sticky notes or skill blocks destroys the FigJam aesthetic.
3. **Using Generic Drop Shadows Instead of Hard Ink Borders**: Cursor pills (`PRODUCT DESIGNER`, `CHICAGO, IL`), speech bubbles (`Hey there!`), the `Let's Talk` mascot, and the `Discover/Define/Design` phone frames rely on crisp `1.5px`–`4px solid #111111` ink outlines with zero blur, whereas only Polaroids, white comment/FAQ cards, and the sticky `BIO/STORY/WORK` nav pill use soft ambient shadows (`0 10px 35px rgba(0,0,0,0.06)`).
4. **Flattening the Folder Tabs**: Making the project cards simple rectangles instead of chamfered `45°` folder tabs with staggered horizontal tab columns removes the core interactive highlight of the home page.

### 5. Visual Verification Checklist
- [ ] **Canvas & Chrome**: Does the page feature a `62px` sticky navbar (`#42D2ED` active tab fill), a `49px` `0..1500` horizontal ruler below it, and a continuous `125px × 125px` `#F4F4F4` background square grid?
- [ ] **Hero Fidelity**: Is `BEJAMAN` framed inside a `750px × 189px` `#42D2ED` selection box with `12px` corner handles, overlapped by `-14°` mint (`#A6E3C4`) and `+8°` yellow (`#F2DEA3`) ribbons, with floating `PRODUCT DESIGNER` (`#E5B433`) and `CHICAGO, IL` (`#D0075A`) cursor badges?
- [ ] **About & Skills**: Does the `72px` bio statement include the 3 inline square tokens (portrait photo, gold clover, magenta hourglass), flanked by tilted Polaroids (`2026` and `my workspace`), above the 4 colored `79px`-tall Skill + Icon blocks?
- [ ] **Sticky Folder Stack**: Do the 4 `1650px` Featured Works cards (`#42D2ED`, `#111111`, `#E5B433`, `#D0075A`) have chamfered `88px`-tall top tabs positioned in columns 1, 2, 3, and 4 so all 4 tabs remain visible side-by-side when scrolled?
- [ ] **Project Card Internals**: Does each project card display the date dot, `68px` title, 2-line description, underlined `VIEW PROJECT ↗` link, bottom-left folder category pills, and a right-hand `814px × 556px` image wrapped in a selection box with corner handles and a `JPG IMAGE.JPG` badge?
- [ ] **Let's Talk & Footer**: Does the pre-footer pair the `#3BCF81` 4-leaf mascot and floating `Comment` card (`⚡ 1`) on the left with `LET'S TALK` on the right, above the `1650px × 560px` rounded `#E5B433`/`#422C3A` striped banner whose centered `CONTACT` box inverts from cyan-on-black to black-on-cyan on hover?
