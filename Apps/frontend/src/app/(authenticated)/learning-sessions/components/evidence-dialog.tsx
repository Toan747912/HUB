"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

const evidenceSchema = z.object({
  focusScore: z.number().int().min(0).max(100),
  engagementScore: z.number().int().min(0).max(100),
});

export type EvidenceInput = z.infer<typeof evidenceSchema>;

interface EvidenceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  isSubmitting: boolean;
  onSubmit: (data: EvidenceInput) => void;
}

export function EvidenceDialog({
  open,
  onOpenChange,
  isSubmitting,
  onSubmit,
}: EvidenceDialogProps) {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<EvidenceInput>({
    resolver: zodResolver(evidenceSchema),
    defaultValues: {
      focusScore: 70,
      engagementScore: 70,
    },
  });

  React.useEffect(() => {
    if (!open) reset();
  }, [open, reset]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Log Learning Evidence</DialogTitle>
          <DialogDescription>
            Task progress and time are recorded automatically from this session. Rate your focus
            and engagement for this stretch of work.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 mt-2">
          <div className="space-y-1">
            <label className="text-xs font-semibold text-zinc-400 block" htmlFor="evidence-focus">
              Focus Score (0 - 100)
            </label>
            <input
              id="evidence-focus"
              type="number"
              min={0}
              max={100}
              className="w-full bg-zinc-950 border border-zinc-800 rounded-md py-2 px-3 text-sm text-white focus:outline-none focus:border-indigo-500 transition-colors"
              {...register("focusScore", { valueAsNumber: true })}
            />
            {errors.focusScore && (
              <p className="text-xs text-red-400 font-medium">{errors.focusScore.message}</p>
            )}
          </div>

          <div className="space-y-1">
            <label
              className="text-xs font-semibold text-zinc-400 block"
              htmlFor="evidence-engagement"
            >
              Engagement Score (0 - 100)
            </label>
            <input
              id="evidence-engagement"
              type="number"
              min={0}
              max={100}
              className="w-full bg-zinc-950 border border-zinc-800 rounded-md py-2 px-3 text-sm text-white focus:outline-none focus:border-indigo-500 transition-colors"
              {...register("engagementScore", { valueAsNumber: true })}
            />
            {errors.engagementScore && (
              <p className="text-xs text-red-400 font-medium">{errors.engagementScore.message}</p>
            )}
          </div>

          <div className="flex space-x-3 justify-end pt-3">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="gradient" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Publishing...
                </>
              ) : (
                "Submit Telemetry"
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
