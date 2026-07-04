# UX Polish Report — Sprint 1.4

Status: 5 severe issues from `AccessibilityAudit.md` fixed and verified. This report documents what changed, how it was verified, and what remains open for a future pass.

## Scope

This pass targeted the five severe findings from the initial audit, in the priority order the team agreed on:

1. Dialog — focus trap, focus restore, Escape-to-close, ARIA roles
2. Toast — `aria-live` regions, non-color status cues
3. Icon-only buttons — `aria-label`, `aria-pressed`, touch target size
4. Error messages — learner-friendly copy, raw technical detail kept out of the UI
5. Mobile navigation — collapsible sidebar

Moderate-severity items from the original audit (color-only analytics deltas, a dead "Last 7 Days" control, missing chart text alternatives, unwired form `aria-invalid`, the absent Settings page) were **not** touched — they're out of scope for this pass and remain in `AccessibilityAudit.md` as follow-up work.

## What changed

### 1. Dialog (`src/components/ui/dialog.tsx`)
- Added `role="dialog"`, `aria-modal="true"`, `aria-labelledby`/`aria-describedby` wired to real `DialogTitle`/`DialogDescription` element ids (via `React.useId()`, so nested dialog instances can't collide).
- Added a focus trap: Tab/Shift+Tab cycle within the dialog's focusable elements; a dialog with zero focusable children swallows Tab entirely instead of leaking focus to the page.
- Focus moves to the first focusable element on open, and is restored to whatever had focus before the dialog opened, on close.
- Escape now closes the dialog, with `stopPropagation` so it doesn't also bubble to an outer dialog in a nested case.
- This affects every modal in Goals, Assessments, and Learning Workspace (`evidence-dialog.tsx`, `reflection-modal.tsx`, `shortcuts-help-dialog.tsx`) — one fix, four flows.

A real timing bug surfaced by the new tests: if a `Dialog` is already `open` on first mount, the portal content didn't exist yet in the same commit where the focus effect ran, so focus silently landed nowhere. Fixed by adding the `mounted` flag to the focus effect's dependency array — documented in a code comment since the failure mode is easy to reintroduce.

### 2. Toast (`src/components/ui/toast.tsx`)
- Split the toast container into two live regions: `role="status" aria-live="polite"` for success/info, `role="alert" aria-live="assertive"` for error/warning — so failures interrupt a screen reader user while routine confirmations don't.
- Dismiss button now has `aria-label="Dismiss notification"`.
- Added a visually-hidden type prefix (`sr-only`) so "Error: Session expired" is announced even though sighted users already get that from the icon/border color.

### 3. Icon-only buttons (`src/components/layout/header.tsx`, `src/app/(authenticated)/dashboard/page.tsx`)
- Header notification and help buttons: added `aria-label`, `aria-hidden` on their icons, bumped from 36px to 40px to match the app's existing `Button size="icon"` convention.
- Dashboard weekly-goal "Edit/Done" toggle: added `aria-pressed`.
- Weekly-goal minutes input: added an associated (visually hidden) `<label>`.
- A repo-wide search confirmed no other icon-only buttons were missing labels — every other icon usage already pairs with visible text or was already labeled.

### 4. Error messages (`src/shared/utils/error-message.ts`, new)
- Added `getFriendlyErrorMessage(err, fallback)`, used at all 11 call sites that previously piped `err.response?.data?.message` straight into a toast.
- Deliberately narrow: it only overrides with a generic message for status codes that mean the same thing in every context (409 conflict, 429 rate limit, 5xx server error, no-response/offline). For everything else (401/403/404/422/etc.) it defers to a caller-supplied, context-specific fallback — a 401 on the login page means "wrong password," not "session expired," so a single global mapping would have been actively wrong there.
- The raw error is still logged via `console.error` for DevTools/log inspection; only the mapped sentence reaches the user.

### 5. Mobile navigation (`src/components/layout/sidebar.tsx`, `header.tsx`, `(authenticated)/layout.tsx`, new `mobile-nav.store.ts`)
- Below the `lg` breakpoint, the fixed sidebar is replaced by a hamburger-triggered slide-in drawer with the same focus-trap/Escape/focus-restore treatment as the Dialog fix.
- The drawer closes automatically when a nav link is clicked.
- Desktop sidebar (`hidden lg:flex`) and the drawer (`lg:hidden`, and unmounted — not just hidden — when closed) can't double-render or leave a hidden keyboard trap.
- Main content padding changed from an unconditional `pl-64` to `lg:pl-64`, so content no longer sits under an invisible sidebar gutter on small screens.
- Added `prefers-reduced-motion` support to `globals.css`, disabling the new drawer slide-in (and existing toast/fade animations) for users who've requested reduced motion at the OS level.

## Verification performed

- **Automated accessibility tests (jest-axe)**: added for Dialog, Toast, and the mobile nav drawer (`src/components/ui/__tests__/dialog.spec.tsx`, `toast.spec.tsx`, `src/components/layout/__tests__/sidebar.spec.tsx`) — 14 new tests covering ARIA roles, live-region announcement, focus trap, Escape, and focus restoration. All pass, and `jest-axe` reports zero violations on the rendered markup.
- **Full test suite**: 61/61 real tests pass. The only failing suite (`__tests__/critical-path.test.jsx`) is a pre-existing orphaned test unrelated to this work (references a module path that predates the current app structure — confirmed via `git log`).
- **Production build**: `next build` compiles cleanly with no new type errors.
- **Independent re-audit**: a second read-only pass confirmed each of the 5 fixes against the original findings and found no regressions or newly introduced issues.
- **Not performed**: a live screen-reader session (NVDA/VoiceOver) and manual browser-based keyboard walkthrough. This work ran in a headless CLI environment with no GUI. `jest-axe` catches most ARIA/role/label defects programmatically, but it cannot substitute for a human listening to actual announcement order and timing. **Recommend a manual NVDA or VoiceOver pass over Dialog, Toast, and the mobile drawer before closed-beta sign-off.**

## Known gaps carried forward (not in this pass's scope)

- Settings page doesn't exist yet.
- Recommendation has no standalone flow (lives inline in Dashboard).
- Chart visualizations (Recharts) still have no text/table fallback for screen readers.
- Form validation errors (Login/Register/Goals) aren't yet wired to `aria-invalid`/live announcement.
- Analytics has a dead "Last 7 Days" control and low-contrast delta indicators.
