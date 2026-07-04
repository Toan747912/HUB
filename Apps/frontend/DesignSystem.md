# Design System & Aesthetic tokens

This document outlines the layout constants, color schemes, and glassmorphic UI variables that compose the premium styling of **Memento OS**.

## Brand Identity Colors

The design targets a futuristic dark workspace featuring sharp contrast elements and interactive glows:

| Element | HSL / Hex Code | Usage |
|---------|----------------|-------|
| Background | `hsl(240, 10%, 3.9%)` | Dark mode background backdrop |
| Component Card | `rgba(24, 24, 27, 0.65)` | Glass container backgrounds |
| Accent Indigo | `hsl(263.4, 70%, 50.4%)` | Primary focus elements and action buttons |
| Success Emerald | `rgb(16, 185, 129)` | Milestone completion and readiness states |
| Warning Amber | `rgb(245, 158, 11)` | Paused session states and knowledge gaps |

## Custom UI Class Utilities

To establish our glassmorphism visual standard, we defined custom CSS selectors in `globals.css`:

1. `.glass`:
   - `background: rgba(24, 24, 27, 0.65)`
   - `backdrop-filter: blur(12px)`
   - `border: 1px solid rgba(63, 63, 70, 0.4)`

2. `.glass-indigo`:
   - `background: rgba(99, 102, 241, 0.03)`
   - `border: 1px solid rgba(99, 102, 241, 0.15)`

3. `.glass-emerald`:
   - `background: rgba(16, 185, 129, 0.03)`
   - `border: 1px solid rgba(16, 185, 129, 0.15)`

## Typography

We import and load Google Fonts using next/font optimization hooks:
- **Outfit**: Utilized for header tags, statistics, and brand titles to provide a sleek, premium, and structured look.
- **Inter**: Utilized for standard reading text and checklists to support high density scannability.
