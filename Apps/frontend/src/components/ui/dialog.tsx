import * as React from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { cn } from "@/shared/utils";

interface DialogContextProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  titleId: string;
  descriptionId: string;
  hasDescription: boolean;
  setHasDescription: (value: boolean) => void;
}

const DialogContext = React.createContext<DialogContextProps | undefined>(undefined);

const FOCUSABLE_SELECTOR =
  'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

export function Dialog({
  open,
  onOpenChange,
  children,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children: React.ReactNode;
}) {
  const reactId = React.useId();
  const [hasDescription, setHasDescription] = React.useState(false);

  return (
    <DialogContext.Provider
      value={{
        open,
        onOpenChange,
        titleId: `${reactId}-title`,
        descriptionId: `${reactId}-description`,
        hasDescription,
        setHasDescription,
      }}
    >
      {children}
    </DialogContext.Provider>
  );
}

export function DialogContent({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  const context = React.useContext(DialogContext);
  const [mounted, setMounted] = React.useState(false);
  const contentRef = React.useRef<HTMLDivElement>(null);
  const previouslyFocusedElement = React.useRef<HTMLElement | null>(null);

  React.useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  const open = context?.open ?? false;

  // Focus management: move focus into the dialog on open, restore it on close.
  // Depends on `mounted` too — on a dialog that's already `open` on first render,
  // the portal content doesn't exist yet in the commit where `open` first became
  // true, so this must re-run once `mounted` flips and the content is in the DOM.
  React.useEffect(() => {
    if (!open || !mounted) return;

    previouslyFocusedElement.current = document.activeElement as HTMLElement | null;

    const node = contentRef.current;
    const firstFocusable = node?.querySelector<HTMLElement>(FOCUSABLE_SELECTOR);
    (firstFocusable ?? node)?.focus();

    return () => {
      previouslyFocusedElement.current?.focus?.();
    };
  }, [open, mounted]);

  const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (!context) return;

    if (event.key === "Escape") {
      event.stopPropagation();
      context.onOpenChange(false);
      return;
    }

    if (event.key !== "Tab") return;

    const node = contentRef.current;
    if (!node) return;

    const focusable = Array.from(node.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR));
    if (focusable.length === 0) {
      event.preventDefault();
      return;
    }

    const first = focusable[0];
    const last = focusable[focusable.length - 1];

    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  };

  if (!context || !context.open || !mounted) return null;

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
        onClick={() => context.onOpenChange(false)}
        aria-hidden="true"
      />
      {/* Content box */}
      <div
        ref={contentRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={context.titleId}
        aria-describedby={context.hasDescription ? context.descriptionId : undefined}
        tabIndex={-1}
        onKeyDown={handleKeyDown}
        className={cn(
          "relative z-50 w-full max-w-lg rounded-lg border border-zinc-800 bg-zinc-950 p-6 shadow-xl text-white glass focus:outline-none",
          className,
        )}
      >
        <button
          onClick={() => context.onOpenChange(false)}
          aria-label="Close dialog"
          className="absolute right-4 top-4 rounded-sm opacity-70 transition-opacity hover:opacity-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-white text-zinc-400 hover:text-white"
        >
          <X className="h-4 w-4" aria-hidden="true" />
        </button>
        {children}
      </div>
    </div>,
    document.body,
  );
}

export function DialogHeader({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("flex flex-col space-y-1.5 text-center sm:text-left", className)}
      {...props}
    />
  );
}

export function DialogTitle({ className, ...props }: React.HTMLAttributes<HTMLHeadingElement>) {
  const context = React.useContext(DialogContext);
  return (
    <h2
      id={context?.titleId}
      className={cn("text-lg font-semibold leading-none tracking-tight text-white", className)}
      {...props}
    />
  );
}

export function DialogDescription({
  className,
  ...props
}: React.HTMLAttributes<HTMLParagraphElement>) {
  const context = React.useContext(DialogContext);

  React.useEffect(() => {
    context?.setHasDescription(true);
    return () => context?.setHasDescription(false);
  }, [context]);

  return (
    <p id={context?.descriptionId} className={cn("text-sm text-zinc-400", className)} {...props} />
  );
}
