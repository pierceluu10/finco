---
name: Finco Landing
description: A clear, connected money map for Finco's public landing page.
colors:
  brand: "#4948c9"
  brand-hover: "#33329f"
  ink: "#20214a"
  body: "#575b76"
  canvas: "#f9fafc"
  lilac: "#e8e9fc"
  line: "#cfd3e6"
  white: "#fff"
  green: "#166953"
  route-line: "#a3a6d5"
typography:
  display:
    fontFamily: "Manrope, sans-serif"
    fontSize: "clamp(48px, 5.5vw, 80px)"
    fontWeight: 750
    lineHeight: 1.04
    letterSpacing: "-0.04em"
  headline:
    fontFamily: "Manrope, sans-serif"
    fontSize: "clamp(32px, 3.7vw, 52px)"
    fontWeight: 650
    lineHeight: 1.15
    letterSpacing: "-0.035em"
  title:
    fontFamily: "Manrope, sans-serif"
    fontSize: "23px"
    fontWeight: 700
    letterSpacing: "-0.02em"
  body:
    fontFamily: "Manrope, sans-serif"
    fontSize: "17px"
    fontWeight: 400
    lineHeight: 1.75
  body-detail:
    fontFamily: "Manrope, sans-serif"
    fontSize: "16px"
    fontWeight: 400
    lineHeight: 1.85
  body-compact:
    fontFamily: "Manrope, sans-serif"
    fontSize: "14px"
    fontWeight: 400
    lineHeight: 1.8
  label:
    fontFamily: "Manrope, sans-serif"
    fontSize: "14px"
    fontWeight: 700
  navigation:
    fontFamily: "Manrope, sans-serif"
    fontSize: "14px"
    fontWeight: 600
  amount:
    fontFamily: "Manrope, sans-serif"
    fontSize: "24px"
    fontWeight: 700
    letterSpacing: "-0.025em"
rounded:
  disclosure: "6px"
  icon: "12px"
  destination: "14px"
  map: "24px"
  pill: "100px"
  circle: "50%"
spacing:
  xs: "8px"
  sm: "12px"
  md: "16px"
  lg: "24px"
  xl: "32px"
  wide: "48px"
components:
  button-primary:
    backgroundColor: "{colors.brand}"
    textColor: "{colors.white}"
    typography: "{typography.label}"
    rounded: "{rounded.pill}"
    padding: "16px 24px"
  button-primary-hover:
    backgroundColor: "{colors.brand-hover}"
  button-secondary:
    textColor: "{colors.ink}"
    typography: "{typography.label}"
  button-login:
    textColor: "{colors.ink}"
    typography: "{typography.label}"
    rounded: "{rounded.pill}"
    padding: "11px 23px"
  navigation-link:
    textColor: "{colors.ink}"
    typography: "{typography.navigation}"
  demo-tag:
    textColor: "{colors.body}"
    rounded: "{rounded.disclosure}"
    padding: "5px 8px"
  money-map:
    backgroundColor: "{colors.lilac}"
    textColor: "{colors.ink}"
    rounded: "{rounded.map}"
    padding: "25px"
  destination:
    backgroundColor: "{colors.white}"
    textColor: "{colors.ink}"
    rounded: "{rounded.destination}"
    padding: "17px 13px"
  destination-savings:
    backgroundColor: "{colors.brand}"
    textColor: "{colors.white}"
    rounded: "{rounded.destination}"
    padding: "17px 13px"
  destination-remaining:
    backgroundColor: "{colors.white}"
    textColor: "{colors.green}"
    rounded: "{rounded.destination}"
    padding: "17px 13px"
  savings-control:
    backgroundColor: "{colors.white}"
    textColor: "{colors.ink}"
    rounded: "{rounded.pill}"
    padding: "11px 13px"
  savings-control-active:
    backgroundColor: "{colors.brand}"
    textColor: "{colors.white}"
  agent-row:
    textColor: "{colors.ink}"
    padding: "28px 0 0"
---

# Design System: Finco Landing

## Overview

**Creative North Star: "The Money Transit Map"**

Finco's public landing page makes financial relationships feel navigable. Indigo destinations, quiet routing lines, and readable amounts turn an abstract financial picture into a route someone can inspect. The atmosphere is open, precise, and approachable: large Manrope statements sit beside a concrete illustration, while generous space keeps supporting explanations calm.

This system applies only to `/` and `src/components/landing/`. Its light palette is scoped by the landing stylesheet. The financial graph, dashboard, authentication screens, and shared application tokens keep their existing design; this document does not authorize changing them. The shared Finco mark is recolored locally on the landing page. Page sequence and campaign copy belong in `.impeccable/surfaces/landing.md`, rather than becoming rules for every future surface.

**Key Characteristics:**

- Light canvas with indigo actions and lilac illustration surfaces.
- One Manrope family, confident headlines, and legible financial amounts.
- Flat surfaces with crisp routes and restrained borders.
- Rounded action pills and distinct destination containers.
- Deliberate interaction with no autonomous landing motion.

## Colors

The palette pairs cool paper and deep ink with a committed indigo route; green communicates available money in the illustrative example.

### Primary

- **Route Indigo** (`brand`): primary actions, the local logo mark, route junctions, agent illustrations, and the savings destination.
- **Deep Route Indigo** (`brand-hover`): the primary action's hover response.

### Secondary

- **Available Green** (`green`): the remaining-money destination and its confirmation icon; a financial meaning, rather than another general action color.

### Neutral

- **Midnight Ink** (`ink`): headlines, navigation, default destination labels, and button text on light surfaces.
- **Slate Text** (`body`): supporting prose, notes, and explanations.
- **Cool Canvas** (`canvas`): the landing page's background.
- **Map Lilac** (`lilac`): the money-map panel and closing section; it also clears space around junction markers.
- **Quiet Line** (`line`): navigation outlines and separators above agent descriptions.
- **White Surface** (`white`): destination containers, the introduction section, and text on indigo.
- **Routing Lavender** (`route-line`): thin paths connecting the map's financial destinations.

**The Landing Boundary Rule.** Apply these colors inside the landing surface only. Keep the node graph and shared application's existing tokens authoritative for their own screens.

**The Route Color Rule.** Indigo identifies an action or a meaningful point in the financial route. Route strokes stay quieter than destinations and amounts.

## Typography

**Display Font:** Manrope, with sans-serif fallback.  
**Body Font:** Manrope, with sans-serif fallback.

**Character:** The single-family system gains contrast through weight, size, and spacing. Large headings are compact and decisive; supporting paragraphs use a generous line height. Sentence case carries both headings and controls.

### Hierarchy

- **Display:** the main heading, balanced within a narrow measure (8.5ch on desktop). Its actual responsive sizes are documented under Layout.
- **Headline:** section and closing headings, balanced with compact tracking.
- **Title:** agent names.
- **Body:** the introductory hero paragraph, limited to a readable measure (37ch on desktop, 44ch on mobile).
- **Body detail:** longer introduction text, with a maximum measure (48ch).
- **Body compact:** agent descriptions, with a measure (35ch on desktop, 50ch on mobile).
- **Label:** primary and secondary actions; navigation uses the separate navigation weight.
- **Amount:** destination values, with tabular numerals so the interactive change does not disturb the layout.

The illustration also uses compact annotations (10–12px) for destinations, demo disclosure, and feedback. These sizes are specific to that supporting diagram; they do not establish a general reading-text scale.

**The Readable Destination Rule.** Amounts lead within each destination, and the label explains the amount beside it. Preserve tabular numerals when values can change.

## Layout

The outer navigation, hero, agent section, and footer share a centered maximum width (1360px), normally with wide side padding (48px). The hero uses an asymmetric two-column grid (0.9fr / 1.1fr), a generous gap (50px), and vertical padding (72px above, 110px below). Introductory prose uses a two-column split; the agent list has three equal columns with a wide gap (48px). White and lilac section backgrounds separate ideas without enclosing every block in a card.

At the tablet threshold (1050px and below), navigation and hero side padding tighten (32px), the hero gap narrows (30px), the display heading uses a fixed intermediate size (62px), and the map control stacks. At the mobile threshold (760px and below), the hero, introduction, and agent list become single columns, side padding becomes compact (24px), secondary navigation links disappear, and the logo and login remain visible. The hero heading changes to a mobile clamp (48px–70px, driven by 10vw) with a slightly wider measure (10ch). The map stays after the explanation and actions in reading order.

Below the compact threshold (400px), the illustration padding reduces (16px), destination values reduce (21px), and the savings control stacks again. At wide desktop widths (1600px and above), hero vertical breathing room increases (90px above, 120px below). These are observed breakpoints, not a new app-wide responsive system.

## Elevation & Depth

The landing has no box shadows. Depth comes from white destinations on lilac, indigo emphasis within the route, and clean changes between section backgrounds. The map's fine borders divide control and diagram; agent descriptions use a single line instead of a raised card. Focus is explicit: interactive links and buttons receive an indigo outline (3px) with separation from the control (5px).

**The Flat Map Rule.** Use tonal surfaces and routing lines to establish hierarchy on this landing. A destination's color and content carry its importance.

The primary action's background transitions briefly (180ms) with the observed ease curve (`cubic-bezier(.16, 1, .3, 1)`). The route has no autonomous animation. Reduced-motion preference removes transitions and smooth scrolling within the landing.

## Shapes

Actions and login use full pill silhouettes. The main map is softly rounded; its destinations use a smaller radius, and icon tiles sit between the two. Demo disclosure uses a modest rounded rectangle. Circular account and junction forms retain the transit-map grammar. Thin strokes describe connection and division; they do not frame every paragraph.

SVG line illustrations stay simple, with rounded paths where supplied by the icon source. Use inline SVG for this visual language instead of a symbol font or decorative text glyph.

## Components

### Buttons

Primary actions are indigo pills with white labels and an inline diagonal arrow. Their background deepens on hover. Secondary actions are ink text with a persistent underline and no container. The outlined login pill uses the quiet line color. All three preserve the landing's visible keyboard focus outline; no additional hover movement is present.

### Chips

The **Illustrative demo** disclosure is a small, lightly outlined tag within the map header. It identifies the example's status, rather than promising a customer result. It is passive text, with no selected or hover behavior.

### Cards / Containers

The main money map uses a lilac surface and the map radius. White destination containers keep labels and amounts together; the savings destination becomes indigo with white text, and remaining money uses green text. Agent descriptions are open rows separated by a thin top border, rather than enclosed cards. These are content containers, not clickable surfaces.

### Navigation

The desktop header places the existing Finco logo, two quiet text links, and an outlined login action across one row. Navigation link hover adds an underline with clear separation (5px). Mobile removes the in-page link group while retaining home and login access. The local mark remains indigo and its wordmark remains ink.

### Interactive Money Route

The route connects monthly income through a chequing account to spending, savings, and remaining money. Right-angle paths with rounded turns carry the map metaphor; three labeled amounts make the result understandable without relying on color. The savings control is white at rest and indigo when pressed. It exposes `aria-pressed`, and feedback uses a polite live region.

**The Accounted Change Rule.** When the savings control changes the example, savings and remaining money update together while monthly income and spending stay consistent. The annual difference must follow that same monthly change; visual feedback follows the calculation.

## Do's and Don'ts

### Do:

- **Do** keep the landing palette and component rules scoped to `/` and its landing components.
- **Do** pair financial route lines with readable destination labels and amounts.
- **Do** use tabular numerals for values that change in place.
- **Do** preserve visible keyboard focus and reduced-motion behavior.
- **Do** identify illustrative financial examples as demos.
- **Do** use flat tonal surfaces and open separators to keep explanations calm.

### Don't:

- **Don't** replace shared dark application tokens or graph styling with this landing's light system.
- **Don't** animate the landing route continuously; interaction should follow a deliberate action.
- **Don't** turn every explanatory block into an enclosed card.
- **Don't** treat compact diagram annotations as the default size for reading text.
- **Don't** use color alone to explain a financial destination or changed amount.
