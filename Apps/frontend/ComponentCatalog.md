# Component Catalog

This document catalogues the modular, reusable UI primitives constructed inside `src/components/ui/` for the **Memento OS** design system.

## Baseline Component Registry

### 1. Button (`button.tsx`)
- **Variants**: `default`, `destructive`, `outline`, `secondary`, `ghost`, `link`, `gradient` (Indigo -> Violet gradient with branding shadow).
- **Sizes**: `default`, `sm`, `lg`, `icon`.

### 2. Card (`card.tsx`)
- **Exports**: `Card`, `CardHeader`, `CardTitle`, `CardDescription`, `CardContent`, `CardFooter`.
- **Custom Attributes**: `glass: boolean` toggle to activate or deactivate glassmorphism backgrounds.

### 3. Progress (`progress.tsx`)
- **Variants**: `default`, `emerald` (gradient emerald-550 -> teal-400), `indigo` (gradient), `amber`.
- **Purpose**: Displays progress bar indicators.

### 4. Dialog (`dialog.tsx`)
- **Exports**: `Dialog`, `DialogContent`, `DialogHeader`, `DialogTitle`, `DialogDescription`.
- **Engine**: Lightweight React-controlled HTML5 portals attaching to `document.body` after hydration to avoid SSR mismatch issues.

### 5. Table (`table.tsx`)
- **Exports**: `Table`, `TableHeader`, `TableBody`, `TableRow`, `TableHead`, `TableCell`.
- **Styling**: Hover row color highlighting using `bg-zinc-800/40`.

### 6. Badge (`badge.tsx`)
- **Variants**: `default`, `secondary`, `destructive`, `outline`, `success`, `warning`, `info`.
- **Usage**: Displays priority indices, skill complexities, and verification states.

### 7. Tabs (`tabs.tsx`)
- **Exports**: `Tabs`, `TabsList`, `TabsTrigger`, `TabsContent`.
- **Purpose**: Context-bound tab views for clean workplace divisions.

### 8. Timeline (`timeline.tsx`)
- **Exports**: `Timeline`, `TimelineItem`.
- **Aesthetic**: Chronological list of nodes with dots and vertical connector lines.

### 9. Skeleton (`skeleton.tsx`)
- **Purpose**: Pulsing placeholder containers used during asynchronous fetch queries.
