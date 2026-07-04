# Accessibility & UX Audit — Sprint 1.4

Scope: `Apps/frontend/src` (Next.js 14 App Router). Read-only audit against WCAG 2.2 AA and the Sprint 1.4 quality checklist. No code changes made yet.

Flows found: Login, Register, Dashboard, Goals, Roadmaps, Assessments, Learning Workspace, Analytics.
Flows missing: **Settings** (no route exists). **Recommendation** has no standalone page — its UI is inline inside Dashboard (`dashboard/page.tsx:405-475`).

---

## Severe — fix first

| # | Issue | Location | Impact |
|---|---|---|---|
| 1 | Shared `Dialog` has no `role="dialog"`/`aria-modal`, no `aria-labelledby`/`aria-describedby`, no focus trap, no focus-in on open / focus-restore on close, **no Escape-to-close** | `src/components/ui/dialog.tsx:21-53` | Every modal in Goals, Assessments, and Learning Workspace (`evidence-dialog.tsx`, `reflection-modal.tsx`, `shortcuts-help-dialog.tsx`) traps keyboard users with no reliable exit |
| 2 | No mobile/responsive nav — sidebar is `fixed w-64`, main content `pl-64` unconditionally, no `md:hidden` fallback or hamburger | `src/app/(authenticated)/layout.tsx:54-70`, `src/components/layout/sidebar.tsx:33` | On small viewports the sidebar overlaps all page content app-wide |
| 3 | Toast container has no `aria-live`/`role="status"`/`role="alert"`; dismiss button is icon-only with no `aria-label` | `src/components/ui/toast.tsx:19-64` | Every success/error confirmation (Login, Register, Goals, Assessments, Roadmaps, Learning Sessions) is silent for screen readers |
| 4 | Icon-only header buttons (notifications, help) have no `aria-label` | `src/components/layout/header.tsx:27-35` | Unnamed controls for AT users; contrast with the correct pattern already in `learning-sessions/page.tsx:278-286` |
| 5 | Raw backend error messages (`err.response?.data?.message`) passed straight into toast copy, no sanitization/mapping layer | `login/page.tsx:49`, `register/page.tsx:57`, `goals/page.tsx:127`, `assessments/page.tsx:84`, `roadmaps/page.tsx:59`, `learning-sessions/page.tsx:80,119,146,184,229` | Any raw validation exception or stack fragment from the API is shown verbatim to learners |

## Moderate

- Analytics delta indicators rely on small (`text-[10px]`) `+`/`-` text with weak color-only reinforcement — `analytics/page.tsx:114,127,140,153`.
- Weekly-goal "Edit/Done" toggle has no `aria-pressed` — `dashboard/page.tsx:506-511`.
- Form validation errors (Login, Register, Goals) render as plain `<p>` with no `role="alert"`/`aria-live`, and inputs lack `aria-invalid`/`aria-describedby` — `login/page.tsx:95-97,117-119`, `register/page.tsx:103-105,125-127`, `goals/page.tsx:338-340,353-355,398-400`.
- Weekly-goal minutes `<input type="number">` has no associated `<label>`/`aria-label` — `dashboard/page.tsx:517-524`.
- Analytics "Last 7 Days" button has a chevron affordance but no click handler/menu — dead control — `analytics/page.tsx:100-104`.
- Recharts visualizations (assessment radar, analytics area/bar/line) have no text/table fallback for screen readers — `assessments/page.tsx:149-157`, `analytics/page.tsx:174-267`.
- Decorative icons are inconsistently marked `aria-hidden="true"` (done well in Learning Sessions, missing on Dashboard cards).

## What's working — preserve these patterns

- Proper `<label htmlFor>`/`id` pairing and semantic form elements in Login, Register, Goals.
- Sidebar nav uses real `<nav>` + `<Link>` anchors, not div-onClick.
- **Learning Workspace is the accessibility reference implementation**: `session-timer.tsx` (`role="timer"`), `session-checklist.tsx` (per-item `aria-label`, disables during pending mutations), `use-keyboard-shortcuts.ts` (ignores shortcuts while an editable field has focus, supports Escape). Bring the rest of the app up to this bar rather than reinventing patterns.
- Status/priority badges pair color with a text label (e.g. "ACTIVE", "HIGH") — don't regress this when touching those components.
- Loading skeletons and empty states exist consistently across Dashboard, Goals, Roadmaps, Assessments, Learning Sessions.
- Page-body grids use responsive Tailwind classes (`md:grid-cols-3`, `lg:grid-cols-3`) correctly — the responsive failure is isolated to the app shell (sidebar/header), not page content.

## Tooling inventory

- **No component library** (no Radix/shadcn/MUI) — hand-rolled primitives in `src/components/ui/` using `class-variance-authority` + `tailwind-merge`. This is the root cause of the inconsistent ARIA: a library like Radix Dialog would solve issue #1 for free.
- **Forms**: `react-hook-form` + `zod` — good foundation for wiring `aria-invalid`/live regions.
- **No animation library** (no `framer-motion`); transitions are CSS-only.
- **No toast library** — fully custom (`shared/stores/toast.store.ts`), hence missing `aria-live` by default.
- **Testing**: `jest` + `@testing-library/react` only. **No Playwright, no axe-core/jest-axe, no `@testing-library/user-event`** — no automated accessibility or E2E coverage exists yet; needed to satisfy the sprint's testing checklist.

## Flow → file map

| Flow | File(s) |
|---|---|
| Login | `src/app/login/page.tsx` |
| Register | `src/app/register/page.tsx` |
| Dashboard | `src/app/(authenticated)/dashboard/page.tsx` |
| Goal + Roadmap (form UI) | `src/app/(authenticated)/goals/page.tsx` |
| Roadmap explorer | `src/app/(authenticated)/roadmaps/page.tsx` |
| Assessment | `src/app/(authenticated)/assessments/page.tsx` |
| Recommendation | inline in `dashboard/page.tsx:405-475` |
| Learning Workspace | `src/app/(authenticated)/learning-sessions/page.tsx` + `components/*`, `hooks/*` |
| Analytics | `src/app/(authenticated)/analytics/page.tsx` |
| Settings | not implemented |
| Shared shell | `src/app/(authenticated)/layout.tsx`, `src/components/layout/{sidebar,header}.tsx` |
| Shared primitives | `src/components/ui/{button,card,dialog,badge,progress,skeleton,table,tabs,timeline,toast}.tsx` |

## Suggested priority order for the polish pass

1. Fix `Dialog` (focus trap, Escape, ARIA roles) — unblocks accessibility for three flows at once.
2. Add `aria-live` region + labeled dismiss to the toast system — unblocks feedback-announcement for every flow.
3. Responsive app shell (collapsible sidebar) — unblocks mobile/tablet for the entire authenticated app.
4. Error-message mapping layer (replace raw API messages with learner-friendly copy).
5. Icon-only button labels, form `aria-invalid`/live validation, chart text alternatives.
6. Build out Settings page and Recommendation as its own reviewable flow, if in scope.
