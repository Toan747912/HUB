# Interaction Checklist — Sprint 1.4

Keyboard and interaction behavior for the components touched in this pass. Verified via automated tests (`jest-axe` + React Testing Library) and static code review; not yet verified with a live screen reader (see `UXPolishReport.md`).

## Dialog (`src/components/ui/dialog.tsx`)
Used by: Goals modal, Assessments quiz modal, Learning Workspace (`evidence-dialog.tsx`, `reflection-modal.tsx`, `shortcuts-help-dialog.tsx`).

| Key | Behavior | Verified |
|---|---|---|
| Tab | Moves to next focusable element inside the dialog; wraps from last back to first | ✅ automated test |
| Shift+Tab | Moves to previous focusable element; wraps from first back to last | ✅ automated test |
| Esc | Closes the dialog | ✅ automated test |
| Enter / Space | Activates the focused button (native behavior, not intercepted) | ✅ code review |
| On open | Focus moves to the first focusable element inside the dialog | ✅ automated test |
| On close | Focus returns to the element that opened the dialog | ✅ automated test |
| Background content | Not reachable by Tab while dialog is open (focus trap contains it) | ✅ automated test |

## Toast (`src/components/ui/toast.tsx`)
| Behavior | Verified |
|---|---|
| Success/info toasts announced via `aria-live="polite"` (non-interrupting) | ✅ automated test |
| Error/warning toasts announced via `aria-live="assertive"` (interrupting) | ✅ automated test |
| Dismiss button reachable by Tab and has an accessible name | ✅ automated test |
| Status conveyed by icon shape + border color + `sr-only` text prefix, not color alone | ✅ code review |

## Mobile navigation drawer (`src/components/layout/sidebar.tsx`)
Appears below the `lg` breakpoint, triggered by the hamburger button in the header.

| Key | Behavior | Verified |
|---|---|---|
| Tab / Shift+Tab | Cycles within the drawer only, same trap logic as Dialog | ✅ automated test |
| Esc | Closes the drawer, focus returns to the hamburger button | ✅ automated test |
| Enter / Space on a nav link | Navigates and closes the drawer | ✅ automated test (click; Enter/Space are native `<a>` behavior) |
| Clicking the backdrop | Closes the drawer | ✅ code review |
| Above `lg` breakpoint | Drawer is unmounted (not just visually hidden) — no keyboard trap, no hidden focusable elements | ✅ code review |

## Header icon buttons (`src/components/layout/header.tsx`)
| Control | Accessible name | Verified |
|---|---|---|
| Hamburger / open navigation | "Open navigation menu" | ✅ code review |
| Notifications | "Notifications (unread)" | ✅ code review |
| Help | "Help and support" | ✅ code review |
| All three | Reachable by Tab, visible focus ring (`focus-visible:ring-2`) | ✅ code review |

## Dashboard weekly-goal toggle (`src/app/(authenticated)/dashboard/page.tsx`)
| Behavior | Verified |
|---|---|
| Edit/Done button exposes `aria-pressed` reflecting its toggle state | ✅ code review |
| Minutes input has an associated (visually hidden) `<label>` | ✅ code review |

## Global
| Requirement | Status |
|---|---|
| `prefers-reduced-motion: reduce` disables drawer slide-in, toast entrance, and fade-up animations | ✅ code review (`globals.css`) |
| No keyboard trap outside an intentionally modal context (Dialog, mobile drawer) | ✅ code review — no other component intercepts Tab |

## Not yet covered by this checklist
Arrow-key navigation within composite widgets (e.g. a future tab list or menu), and a full live screen-reader walkthrough, are outside this pass's scope — see the "Known gaps" section of `UXPolishReport.md`.
