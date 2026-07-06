"use client";

import { useEffect, useState } from "react";
import { CheckCircle2, ClipboardList, Loader2, Upload } from "lucide-react";
import { toast } from "sonner";
import { api as axios } from "@/lib/axios";
import { useApiQuery } from "@/hooks/api/useApiQuery";

const JOURNEY_LABELS: Record<string, string> = {
  fu_h1: "FU H+1",
  fu_h3: "FU H+3",
  closing: "Closing",
  cs_h7: "CS H+7",
  cs_h14: "CS H+14",
  reorder_reminder: "Reorder Reminder",
};

type TaskState = {
  next_journey: string;
  order_id: string;
  evidence_url: string;
  notes: string;
  uploading: boolean;
  saving: boolean;
};

const getErrorMessage = (error: any, fallback: string) =>
  error?.response?.data?.message || error?.message || fallback;

const formatDueDate = (value: string) =>
  new Date(value).toLocaleString("id-ID", {
    dateStyle: "medium",
    timeStyle: "short",
  });

export default function DailyTasksPage() {
  const [taskState, setTaskState] = useState<Record<string, TaskState>>({});
  const {
    data: tasksResponse,
    isLoading: loading,
    refetch: refetchTasks,
  } = useApiQuery<any>(["admin-daily-tasks"], "/admin/daily-tasks", undefined, {
    staleTime: 60 * 1000,
  });
  const tasks: any[] = tasksResponse?.data?.tasks || [];

  useEffect(() => {
    setTaskState((prev) => {
      const next = { ...prev };
      for (const task of tasks) {
        if (!next[task.id]) {
          next[task.id] = {
            next_journey: task.allowed_next_stages?.[0] || "",
            order_id: "",
            evidence_url: "",
            notes: "",
            uploading: false,
            saving: false,
          };
        }
      }
      return next;
    });
  }, [tasksResponse]);

  const updateTaskState = (taskId: string, patch: Partial<TaskState>) => {
    setTaskState((prev) => ({
      ...prev,
      [taskId]: {
        ...prev[taskId],
        ...patch,
      },
    }));
  };

  const uploadEvidence = async (taskId: string, file?: File) => {
    if (!file) return;

    updateTaskState(taskId, { uploading: true });
    try {
      const formData = new FormData();
      formData.append("file", file);
      const { data } = await axios.post("/admin/upload", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      updateTaskState(taskId, { evidence_url: data.data.url });
      toast.success("Screenshot uploaded");
    } catch (error: any) {
      toast.error("Failed to upload screenshot", {
        description: getErrorMessage(error, "Please try again."),
      });
    } finally {
      updateTaskState(taskId, { uploading: false });
    }
  };

  const completeTask = async (task: any) => {
    const state = taskState[task.id];
    if (!state?.evidence_url) {
      toast.error("Screenshot evidence is required");
      return;
    }
    if (state.next_journey === "closing" && !state.order_id.trim()) {
      toast.error("Order ID is required when moving to Closing");
      return;
    }

    updateTaskState(task.id, { saving: true });
    try {
      await axios.post("/admin/daily-tasks", {
        customer_id: task.customer.id,
        task_type: task.task_type,
        next_journey: state.next_journey,
        evidence_url: state.evidence_url,
        order_id: state.order_id,
        notes: state.notes,
      });

      toast.success("Daily task completed");
      refetchTasks();
    } catch (error: any) {
      toast.error("Failed to complete task", {
        description: getErrorMessage(error, "Please review the task data."),
      });
    } finally {
      updateTaskState(task.id, { saving: false });
    }
  };

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Daily Tasks</h1>
        <p className="text-sm text-muted-foreground">
          Work today&apos;s customer journey tasks. Every update requires chat screenshot evidence.
        </p>
      </div>

      <div className="rounded-2xl border border-accent/20 bg-accent/10 p-4">
        <div className="flex items-center gap-3">
          <ClipboardList className="h-5 w-5 text-accent" />
          <p className="text-sm font-medium text-accent">
            {tasks.length} task(s) due today
          </p>
        </div>
      </div>

      {tasks.length === 0 ? (
        <div className="rounded-2xl border border-border bg-card p-12 text-center">
          <CheckCircle2 className="mx-auto mb-3 h-10 w-10 text-green-500" />
          <p className="font-medium text-foreground">No daily tasks due</p>
          <p className="text-sm text-muted-foreground">
            Clean board. Tiny operational dopamine, well-earned.
          </p>
        </div>
      ) : (
        <div className="grid gap-4">
          {tasks.map((task) => {
            const state = taskState[task.id];
            return (
              <section
                key={task.id}
                className="rounded-2xl border border-border bg-card p-5"
              >
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded-full border border-accent/20 bg-accent/10 px-2 py-0.5 text-xs font-semibold text-accent">
                        {task.title}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        Due {formatDueDate(task.due_at)}
                      </span>
                    </div>
                    <h2 className="mt-3 text-lg font-semibold text-foreground">
                      {task.customer.full_name}
                    </h2>
                    <p className="text-sm text-muted-foreground">
                      {task.customer.whatsapp_phone || "-"}
                      {task.customer.username ? ` · @${task.customer.username}` : ""}
                    </p>
                    <p className="mt-2 max-w-3xl text-sm text-muted-foreground">
                      {task.description}
                    </p>
                  </div>

                  <div className="grid gap-3 lg:w-[420px]">
                    <label className="space-y-1.5">
                      <span className="text-xs font-medium text-muted-foreground">
                        Update Journey To
                      </span>
                      <select
                        value={state?.next_journey || ""}
                        onChange={(e) =>
                          updateTaskState(task.id, { next_journey: e.target.value })
                        }
                        className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm outline-none focus:border-accent focus:ring-2 focus:ring-accent/20"
                      >
                        {(task.allowed_next_stages || []).map((stage: string) => (
                          <option key={stage} value={stage}>
                            {JOURNEY_LABELS[stage] || stage}
                          </option>
                        ))}
                      </select>
                    </label>

                    {state?.next_journey === "closing" && (
                      <label className="space-y-1.5">
                        <span className="text-xs font-medium text-muted-foreground">
                          Required Order ID
                        </span>
                        <input
                          value={state.order_id}
                          onChange={(e) =>
                            updateTaskState(task.id, { order_id: e.target.value })
                          }
                          className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm outline-none focus:border-accent focus:ring-2 focus:ring-accent/20"
                          placeholder="Paste order UUID"
                        />
                      </label>
                    )}

                    <label className="space-y-1.5">
                      <span className="text-xs font-medium text-muted-foreground">
                        Screenshot Evidence
                      </span>
                      <div className="flex items-center gap-2">
                        <input
                          type="file"
                          accept="image/jpeg,image/png,image/webp,image/gif"
                          onChange={(e) => uploadEvidence(task.id, e.target.files?.[0])}
                          className="hidden"
                          id={`evidence-${task.id}`}
                        />
                        <label
                          htmlFor={`evidence-${task.id}`}
                          className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-border px-3 py-2 text-xs font-medium hover:bg-muted"
                        >
                          {state?.uploading ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Upload className="h-4 w-4" />
                          )}
                          Upload SS Chat
                        </label>
                        {state?.evidence_url && (
                          <a
                            href={state.evidence_url}
                            target="_blank"
                            className="text-xs text-accent hover:underline"
                          >
                            View uploaded
                          </a>
                        )}
                      </div>
                    </label>

                    <textarea
                      value={state?.notes || ""}
                      onChange={(e) =>
                        updateTaskState(task.id, { notes: e.target.value })
                      }
                      rows={2}
                      className="w-full resize-none rounded-xl border border-border bg-background px-3 py-2.5 text-sm outline-none focus:border-accent focus:ring-2 focus:ring-accent/20"
                      placeholder="Optional notes"
                    />

                    <button
                      type="button"
                      onClick={() => completeTask(task)}
                      disabled={state?.saving || state?.uploading}
                      className="inline-flex items-center justify-center gap-2 rounded-xl bg-accent px-4 py-2.5 text-sm font-medium text-accent-foreground transition-all hover:bg-accent/90 disabled:opacity-60"
                    >
                      {state?.saving ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <CheckCircle2 className="h-4 w-4" />
                      )}
                      Complete Task
                    </button>
                  </div>
                </div>
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}
