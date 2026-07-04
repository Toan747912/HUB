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

const reflectionSchema = z.object({
  wentWell: z.string().min(3, "Tell us a little more"),
  hardestPart: z.string().min(3, "Tell us a little more"),
  nextFocus: z.string().min(3, "Tell us a little more"),
  rating: z.number().min(1).max(5),
});

export type ReflectionInput = z.infer<typeof reflectionSchema>;

interface ReflectionModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  isSubmitting: boolean;
  onSubmit: (content: string, rating: number) => void;
}

export function ReflectionModal({
  open,
  onOpenChange,
  isSubmitting,
  onSubmit,
}: ReflectionModalProps) {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ReflectionInput>({
    resolver: zodResolver(reflectionSchema),
    defaultValues: { rating: 4 },
  });

  const submit = (data: ReflectionInput) => {
    const content = [
      `What did you learn today? ${data.wentWell}`,
      `What was the hardest part? ${data.hardestPart}`,
      `What would you like to improve next? ${data.nextFocus}`,
    ].join("\n");
    onSubmit(content, data.rating);
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) reset();
        onOpenChange(next);
      }}
    >
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Session Reflection</DialogTitle>
          <DialogDescription>
            Take a moment to reflect before closing out this session.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(submit)} className="space-y-4 mt-2">
          <div className="space-y-1">
            <label
              className="text-xs font-semibold text-zinc-400 block"
              htmlFor="reflection-went-well"
            >
              What did you learn today?
            </label>
            <textarea
              id="reflection-went-well"
              rows={2}
              className="w-full bg-zinc-950 border border-zinc-800 rounded-md py-2 px-3 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-indigo-500 transition-colors resize-none"
              {...register("wentWell")}
            />
            {errors.wentWell && (
              <p className="text-xs text-red-400 font-medium">{errors.wentWell.message}</p>
            )}
          </div>

          <div className="space-y-1">
            <label
              className="text-xs font-semibold text-zinc-400 block"
              htmlFor="reflection-hardest"
            >
              What was the hardest part?
            </label>
            <textarea
              id="reflection-hardest"
              rows={2}
              className="w-full bg-zinc-950 border border-zinc-800 rounded-md py-2 px-3 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-indigo-500 transition-colors resize-none"
              {...register("hardestPart")}
            />
            {errors.hardestPart && (
              <p className="text-xs text-red-400 font-medium">{errors.hardestPart.message}</p>
            )}
          </div>

          <div className="space-y-1">
            <label
              className="text-xs font-semibold text-zinc-400 block"
              htmlFor="reflection-next-focus"
            >
              What would you like to improve next?
            </label>
            <textarea
              id="reflection-next-focus"
              rows={2}
              className="w-full bg-zinc-950 border border-zinc-800 rounded-md py-2 px-3 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-indigo-500 transition-colors resize-none"
              {...register("nextFocus")}
            />
            {errors.nextFocus && (
              <p className="text-xs text-red-400 font-medium">{errors.nextFocus.message}</p>
            )}
          </div>

          <div className="space-y-1">
            <label
              className="text-xs font-semibold text-zinc-400 block"
              htmlFor="reflection-rating"
            >
              How would you rate this session? (1-5)
            </label>
            <input
              id="reflection-rating"
              type="number"
              min={1}
              max={5}
              className="w-full bg-zinc-950 border border-zinc-800 rounded-md py-2 px-3 text-sm text-white focus:outline-none focus:border-indigo-500 transition-colors"
              {...register("rating", { valueAsNumber: true })}
            />
          </div>

          <div className="flex space-x-3 justify-end pt-3">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="gradient" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Completing...
                </>
              ) : (
                "Submit & Complete Session"
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
