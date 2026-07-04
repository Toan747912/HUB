"use client";

import * as React from "react";
import { ListTodo, Loader2 } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";

export interface SessionTaskLike {
  id: string;
  title: string;
  completed: boolean;
}

interface SessionChecklistProps {
  tasks: SessionTaskLike[];
  disabled: boolean;
  pendingTaskId: string | null;
  onToggle: (taskId: string, completed: boolean) => void;
}

export function SessionChecklist({
  tasks,
  disabled,
  pendingTaskId,
  onToggle,
}: SessionChecklistProps) {
  const completedCount = tasks.filter((t) => t.completed).length;

  return (
    <Card className="border-zinc-800 bg-zinc-900/30">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold text-zinc-400 flex items-center gap-2">
          <ListTodo className="h-4 w-4 text-indigo-400" aria-hidden="true" />
          Focus Tasks
          <span className="ml-auto text-xs font-normal text-zinc-500">
            {completedCount}/{tasks.length}
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {tasks.length === 0 && (
          <p className="text-xs text-zinc-500">No tasks attached to this session.</p>
        )}
        {tasks.map((task) => {
          const isPending = pendingTaskId === task.id;
          return (
            <label
              key={task.id}
              htmlFor={`task-${task.id}`}
              className="flex items-center space-x-2.5 p-2.5 rounded border border-zinc-800 bg-zinc-950/40 text-xs cursor-pointer"
            >
              <input
                id={`task-${task.id}`}
                type="checkbox"
                checked={task.completed}
                disabled={disabled || isPending}
                onChange={(e) => onToggle(task.id, e.target.checked)}
                className="rounded border-zinc-700 bg-zinc-900 text-indigo-500 h-3.5 w-3.5"
                aria-label={`Mark "${task.title}" ${task.completed ? "incomplete" : "complete"}`}
              />
              <span className={task.completed ? "text-zinc-500 line-through" : "text-zinc-200"}>
                {task.title}
              </span>
              {isPending && (
                <Loader2
                  className="h-3 w-3 animate-spin text-zinc-500 ml-auto"
                  aria-hidden="true"
                />
              )}
            </label>
          );
        })}
      </CardContent>
    </Card>
  );
}
