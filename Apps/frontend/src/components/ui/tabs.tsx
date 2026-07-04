import * as React from "react";
import { cn } from "@/shared/utils";

interface TabsContextProps {
  value: string;
  onValueChange: (value: string) => void;
}

const TabsContext = React.createContext<TabsContextProps | undefined>(undefined);

export function Tabs({
  value,
  defaultValue,
  onValueChange,
  children,
  className,
}: {
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  children: React.ReactNode;
  className?: string;
}) {
  const [activeTab, setActiveTab] = React.useState(value ?? defaultValue ?? "");

  React.useEffect(() => {
    if (value !== undefined) {
      setActiveTab(value);
    }
  }, [value]);

  const handleValueChange = React.useCallback(
    (val: string) => {
      if (value === undefined) {
        setActiveTab(val);
      }
      onValueChange?.(val);
    },
    [value, onValueChange],
  );

  return (
    <TabsContext.Provider value={{ value: activeTab, onValueChange: handleValueChange }}>
      <div className={cn("w-full", className)}>{children}</div>
    </TabsContext.Provider>
  );
}

export function TabsList({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "inline-flex h-10 items-center justify-center rounded-md bg-zinc-900 p-1 text-zinc-400 border border-zinc-800/80",
        className,
      )}
    >
      {children}
    </div>
  );
}

export function TabsTrigger({
  value,
  children,
  className,
}: {
  value: string;
  children: React.ReactNode;
  className?: string;
}) {
  const context = React.useContext(TabsContext);
  if (!context) return null;

  const isActive = context.value === value;

  return (
    <button
      onClick={() => context.onValueChange(value)}
      className={cn(
        "inline-flex items-center justify-center whitespace-nowrap rounded-sm px-3 py-1.5 text-sm font-medium transition-all focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50",
        isActive
          ? "bg-zinc-850 text-white shadow-sm font-semibold border-b-2 border-indigo-500 bg-zinc-800/60"
          : "hover:bg-zinc-800/20 hover:text-zinc-200",
        className,
      )}
    >
      {children}
    </button>
  );
}

export function TabsContent({
  value,
  children,
  className,
}: {
  value: string;
  children: React.ReactNode;
  className?: string;
}) {
  const context = React.useContext(TabsContext);
  if (!context || context.value !== value) return null;

  return (
    <div className={cn("mt-4 ring-offset-background focus-visible:outline-none", className)}>
      {children}
    </div>
  );
}
