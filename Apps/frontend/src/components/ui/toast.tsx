import * as React from "react";
import { createPortal } from "react-dom";
import { X, CheckCircle, AlertTriangle, AlertCircle, Info } from "lucide-react";
import { useToastStore, ToastMessage } from "@/shared/stores/toast.store";
import { cn } from "@/shared/utils";

type ResolvedToastType = "success" | "error" | "warning" | "info";

const ASSERTIVE_TYPES: ResolvedToastType[] = ["error", "warning"];

const TYPE_LABEL: Record<ResolvedToastType, string> = {
  success: "Success",
  error: "Error",
  warning: "Warning",
  info: "Info",
};

function resolveType(message: ToastMessage): ResolvedToastType {
  return message.type ?? "info";
}

export function ToastContainer() {
  const toasts = useToastStore((state) => state.toasts);
  const dismiss = useToastStore((state) => state.dismiss);
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  if (!mounted) return null;

  const politeToasts = toasts.filter((t) => !ASSERTIVE_TYPES.includes(resolveType(t)));
  const assertiveToasts = toasts.filter((t) => ASSERTIVE_TYPES.includes(resolveType(t)));

  return createPortal(
    <div className="fixed bottom-4 right-4 z-50 flex flex-col space-y-2 w-full max-w-sm pointer-events-none">
      {/* Routine confirmations (saved, completed, info) — announced without interrupting the user */}
      <div role="status" aria-live="polite" aria-atomic="true" className="flex flex-col space-y-2">
        {politeToasts.map((t) => (
          <ToastItem key={t.id} message={t} onDismiss={dismiss} />
        ))}
      </div>
      {/* Errors and warnings — announced immediately */}
      <div
        role="alert"
        aria-live="assertive"
        aria-atomic="true"
        className="flex flex-col space-y-2"
      >
        {assertiveToasts.map((t) => (
          <ToastItem key={t.id} message={t} onDismiss={dismiss} />
        ))}
      </div>
    </div>,
    document.body,
  );
}

function ToastItem({
  message,
  onDismiss,
}: {
  message: ToastMessage;
  onDismiss: (id: string) => void;
}) {
  const type = resolveType(message);

  return (
    <div
      className={cn(
        "flex w-full items-start space-x-3 rounded-lg border border-zinc-800 p-4 shadow-lg pointer-events-auto animate-toast-in glass",
        {
          "border-emerald-500/30 bg-emerald-950/20": type === "success",
          "border-red-500/30 bg-red-950/20": type === "error",
          "border-amber-500/30 bg-amber-950/20": type === "warning",
          "border-blue-500/30 bg-blue-950/20": type === "info",
        },
      )}
    >
      <span className="mt-0.5" aria-hidden="true">
        {type === "success" && <CheckCircle className="h-4 w-4 text-emerald-400" />}
        {type === "error" && <AlertCircle className="h-4 w-4 text-red-400" />}
        {type === "warning" && <AlertTriangle className="h-4 w-4 text-amber-400" />}
        {type === "info" && <Info className="h-4 w-4 text-blue-400" />}
      </span>

      <div className="flex-1 space-y-1">
        <h5 className="text-sm font-semibold text-white leading-none">
          <span className="sr-only">{TYPE_LABEL[type]}: </span>
          {message.title}
        </h5>
        {message.description && (
          <p className="text-xs text-zinc-400 leading-normal">{message.description}</p>
        )}
      </div>

      <button
        onClick={() => onDismiss(message.id)}
        aria-label="Dismiss notification"
        className="flex h-8 w-8 items-center justify-center -m-2 text-zinc-400 hover:text-white transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-white rounded-sm"
      >
        <X className="h-4 w-4" aria-hidden="true" />
      </button>
    </div>
  );
}
