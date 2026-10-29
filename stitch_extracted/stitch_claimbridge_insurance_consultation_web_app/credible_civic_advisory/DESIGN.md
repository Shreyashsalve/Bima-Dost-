---
name: Credible Civic Advisory
colors:
  surface: '#f5fbf6'
  surface-dim: '#d5dbd6'
  surface-bright: '#f5fbf6'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#eff5f0'
  surface-container: '#e9efea'
  surface-container-high: '#e4eae5'
  surface-container-highest: '#dee4df'
  on-surface: '#171d1a'
  on-surface-variant: '#404945'
  inverse-surface: '#2c322f'
  inverse-on-surface: '#ecf2ed'
  outline: '#717975'
  outline-variant: '#c0c8c4'
  surface-tint: '#39675a'
  primary: '#002d24'
  on-primary: '#ffffff'
  primary-container: '#144439'
  on-primary-container: '#82b1a2'
  inverse-primary: '#a0d0c1'
  secondary: '#9e4300'
  on-secondary: '#ffffff'
  secondary-container: '#ff8843'
  on-secondary-container: '#692b00'
  tertiary: '#1f2826'
  on-tertiary: '#ffffff'
  tertiary-container: '#353e3c'
  on-tertiary-container: '#9fa9a5'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#bceddd'
  primary-fixed-dim: '#a0d0c1'
  on-primary-fixed: '#002019'
  on-primary-fixed-variant: '#204f43'
  secondary-fixed: '#ffdbcb'
  secondary-fixed-dim: '#ffb690'
  on-secondary-fixed: '#341100'
  on-secondary-fixed-variant: '#783100'
  tertiary-fixed: '#dbe5e1'
  tertiary-fixed-dim: '#bfc9c5'
  on-tertiary-fixed: '#141d1b'
  on-tertiary-fixed-variant: '#3f4946'
  background: '#f5fbf6'
  on-background: '#171d1a'
  surface-variant: '#dee4df'
typography:
  headline-xl:
    fontFamily: Plus Jakarta Sans
    fontSize: 40px
    fontWeight: '700'
    lineHeight: 48px
    letterSpacing: -0.02em
  headline-xl-mobile:
    fontFamily: Plus Jakarta Sans
    fontSize: 30px
    fontWeight: '700'
    lineHeight: 38px
    letterSpacing: -0.01em
  headline-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 32px
    fontWeight: '700'
    lineHeight: 40px
    letterSpacing: -0.015em
  headline-lg-mobile:
    fontFamily: Plus Jakarta Sans
    fontSize: 24px
    fontWeight: '700'
    lineHeight: 32px
    letterSpacing: -0.01em
  headline-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
    letterSpacing: -0.01em
  headline-sm:
    fontFamily: Plus Jakarta Sans
    fontSize: 20px
    fontWeight: '600'
    lineHeight: 28px
  body-lg:
    fontFamily: Inter
    fontSize: 18px
    fontWeight: '400'
    lineHeight: 28px
  body-md:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  body-md-medium:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '500'
    lineHeight: 24px
  label-lg:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '600'
    lineHeight: 24px
  label-md:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '600'
    lineHeight: 20px
    letterSpacing: 0.01em
  label-sm:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '600'
    lineHeight: 16px
    letterSpacing: 0.02em
  caption:
    fontFamily: Inter
    fontSize: 13px
    fontWeight: '400'
    lineHeight: 18px
rounded:
  sm: 0.125rem
  DEFAULT: 0.25rem
  md: 0.375rem
  lg: 0.5rem
  xl: 0.75rem
  full: 9999px
spacing:
  gutter: 1.5rem
  gutter-mobile: 1rem
  margin: 2rem
  margin-mobile: 1rem
  space-xs: 0.25rem
  space-sm: 0.5rem
  space-md: 1rem
  space-lg: 1.5rem
  space-xl: 2.5rem
---

## Brand & Style

This design system establishes a credible, civic-minded consultation platform built for the Indian insurance and advisory landscape. It deliberately rejects the ephemeral, hyper-stylized aesthetics of consumer venture-backed tech (such as glassy blur layers, neon gradients, and low-contrast grey type) as well as the dense, impassive bureaucracy of dated government portals.

Instead, the aesthetic channels the dignity, permanence, and accessibility of a modern public institution. It evokes calm authority, patient clarity, and structural trust. Users visiting this platform are often undergoing stressful insurance claim disputes, critical policy reviews, or family health emergencies; the interface responds with unambiguous wayfinding, deeply grounded natural tones, generous physical targets, and an empathetic, unhurried cadence.

Key brand tenants:
- **Steadfast & Protective:** Visual elements convey safety, solvency, and rigorous legal/financial backing.
- **Rooted & Tactile:** Materials draw inspiration from tactile ledger paper, stamped seals, and warm natural pigments rather than sterile digital monitors.
- **Radically Accessible:** Strict adherence to high-contrast visual standards, legible typography scaling for multi-generational users, and intuitive layouts across varying digital literacy levels.

## Colors

The color palette is grounded in warm, organic pigments reminiscent of high-grade paper documents, dark forest foliage, and sunbaked terracotta. 

### Core Palette
- **Primary (`#144439` - Deep Forest Green):** Represents fiscal stability, institutional longevity, and calm protection. Used for navigational anchors, authoritative headers, key selection states, and core branding elements. Deepened to `#0F382E` for active interactive states, and lightened to `#E8F2EE` for calming tint fields.
- **Secondary / Action Accent (`#D96B27` - Terracotta Amber):** Represents warmth, decisive energy, and guidance. Used intentionally and sparingly for key booking conversion actions, primary call-to-action buttons, high-priority status notifications, and critical alerts. Deepened to `#C25615` on hover/pressed states, with a soft supporting tint of `#FEF3EB`.
- **Tertiary Surface Tint (`#E8F2EE` - Celadon Tint):** Used to isolate verified reassurance badges, official seal ribbons, and positive state panels without jarring the user.
- **Neutral Charcoal (`#1E2421` - Ink Slate):** Replaces pure digital black with a deep, mineral charcoal to maximize legibility while preventing visual eye fatigue. Secondary text is held at `#4A5550`, and muted captions at `#728078`, preserving strict AAA contrast ratios against parchment backgrounds.

### Structural Surfaces & Borders
- **Canvas Base:** `#FBF9F5` (Warm Parchment) serves as the default page background.
- **Container Recesses:** `#F5F1E9` (Milled Paper) provides tonal demarcation for sidebars, footers, and progress containers.
- **Active Cards:** `#FFFFFF` (Clean Ledger White) ensures that interactive consultation cards and booking forms lift cleanly off the parchment background.
- **Architectural Borders:** `#E2DCD3` (Warm Stone) outlines panels and form fields with quiet physical certainty.

## Typography

The typographic strategy accommodates diverse reading proficiencies and multi-script rendering across Indian languages (such as Devanagari alongside Latin scripts). 

- **Headlines:** Set in `Plus Jakarta Sans` for wide, stable letterforms that present clear humanist geometry. Headings are weighted with solid authority (`600` and `700`) to anchor complex insurance information.
- **Body & Controls:** Set in `Inter` to take advantage of its neutral micro-details, explicit diacritic support, tall x-height, and robust rendering across affordable mobile devices with varying pixel densities.
- **Sizing Constraints:** Body copy never drops below `16px` on core instructional text. Small captions (`13px`) are restricted solely to secondary metadata, timestamps, and statutory disclaimers. Line heights remain generous (`1.5` to `1.6`) to ensure comfortable scanning for individuals reviewing lengthy claim criteria or terms.

## Layout & Spacing

The layout model is built on an adaptable 12-column grid designed for transactional transparency and sequential step completion.

- **Desktop (1024px+):** Max layout width constrained to `1200px` for optimal reading comfort. A 12-column system with a `1.5rem` (`24px`) gutter and `2rem` (`32px`) screen margin. Booking flows utilize an asymmetrical 7:5 ratio (7 columns for user inputs/actions and 5 columns for persistent reassurance, fee breakdown, and advisor credentials).
- **Tablet (640px – 1023px):** An 8-column layout with `1.25rem` gutters. Sidebars collapse above or below step panels.
- **Mobile (<640px):** A single-column, fluid linear model with a strict `1rem` (`16px`) margin and gutter. Actions dock to a tactile, sticky bottom bar to ensure effortless thumb-reach.

### Spacing Rhythm
Vertical cadence relies on clear groupings: related form inputs maintain an inner gap of `space-md` (`16px`), distinct field groupings break with `space-lg` (`24px`), and structural card modules separate by `space-xl` (`40px`).

## Elevation & Depth

This system avoids floating translucent planes and exaggerated blurry drop shadows. Depth is communicated through a grounded, tactile layering system that replicates physical documents resting on an advisory table.

- **Surface Tiers:**
  - Base canvas sits at `#FBF9F5`.
  - Recessed sections, step trails, and information panels rest at `#F5F1E9`.
  - Content containers, interactive selection cards, and form panels elevate using solid `#FFFFFF`.
- **Borders over Shadows:** Structure is primarily articulated through crisp `1px` borders using Warm Stone (`#E2DCD3`). 
- **Physical Grounding Shadows:** When cards require visual separation from the canvas, they utilize a single, tight, warm-tinted shadow: `0 2px 4px rgba(30, 36, 33, 0.04), 0 1px 2px rgba(30, 36, 33, 0.06)`.
- **Active / Focused Elevation:** Raised interactive cards (such as an active appointment slot or selected insurance category) receive a subtle crisp lift: `0 4px 12px rgba(20, 68, 57, 0.08)` coupled with an intentional border shift to Primary Green (`#144439`).

## Shapes

The shape hierarchy is soft, disciplined, and functional (`roundedness: 1`), conveying structural integrity rather than casual playfulness.

- **Core Elements (Inputs, Buttons, Badges):** Feature a `0.25rem` (`4px`) to `0.375rem` (`6px`) corner radius. This gives an authoritative, clean-cut border that feels deliberate and reliable.
- **Cards & Modal Containers:** Use `0.5rem` (`8px`) corner radius (`rounded-lg`), softening the overall page view while preserving clear architectural edges.
- **Pill Exceptions:** Pill shapes (`9999px`) are strictly reserved for compact status pills (such as "IRDAI Registered", "Verified Slot", or "Claim Under Review") to prevent them from being mistaken for interactive functional containers.

## Components

### Buttons & CTAs
- **Touch Target:** Mandatory minimum height of `48px` (desktop) and `52px` (mobile). Full-width layout applied on mobile views.
- **Primary CTA:** Solid Terracotta Amber (`#D96B27`) with pure white text (`#FFFFFF`) in `label-lg` semi-bold. Hover: `#C25615`. Active: `#9E430D`. Focus: `3px` solid offset ring in `#144439`.
- **Secondary Action:** Solid Deep Forest Green (`#144439`) with `#FFFFFF` text. Hover: `#0F382E`.
- **Outline / Neutral Button:** White background (`#FFFFFF`), `1.5px` border in `#E2DCD3`, text in `#1E2421`. Hover: Background shifts to `#F5F1E9`.

### Form Fields & Inputs
- **Height & Insets:** Min height `48px` with `16px` horizontal padding. Font size fixed at minimum `16px` to prevent automatic zoom on iOS devices.
- **Resting State:** White background, `1px` border in `#E2DCD3`, placeholder text in `#728078`.
- **Focus State:** `2px` crisp border in `#144439`, no fuzzy glow.
- **Error State:** `1.5px` border in `#C83226` accompanied by a dedicated error label with a warning icon below the field.
- **Labels & Hints:** Labels sit permanently above the field in `label-md` (`#1E2421`). Helper texts use `caption` (`#4A5550`).

### Selection Controls (Checkboxes & Radios)
- Box dimension of `22px x 22px` to accommodate variable finger accuracy.
- Selected state fills with `#144439` with a distinct white check or solid dot. Hover reinforces with a soft `#E8F2EE` surrounding ring.

### Cards & Consultation Tiles
- **Advisor / Booking Tiles:** Flat `#FFFFFF` background with `1px` solid `#E2DCD3` border. 
- **Selected State:** Border width expands to `2px` in `#144439`, background receives a subtle wash of `#FBF9F5`, and an unambiguous checkmark indicator pins to the upper-right corner.
- **Structure:** Distinct structural tiers for advisor credentials, years of experience, languages spoken (e.g., Hindi, English, Marathi badges), and transparent consultation fee listings.

### Visual Reassurance Badges & Progress Indicators
- **Step Indicator:** Linear horizontal bar on top of the viewport. Completed steps marked with Deep Forest Green icons; active step highlighted with Terracotta Amber; future steps rendered in Warm Stone (`#E2DCD3`). Step numbers and titles remain visible across all device sizes.
- **Trust Ribbons:** Subtle container panels in `#E8F2EE` featuring verified advisor credentials, data protection notices, and government-registration iconography to preserve calm assurance throughout checkout.