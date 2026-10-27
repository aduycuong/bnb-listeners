"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";

import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { toast } from "@/components/ui/toast";
import type { AdminScheduleRow, AdminSchedulerState } from "@/lib/admin-console/types";
import { getCronFriendlyText } from "@/lib/common/cron-presets";
import type { SetScheduleEnabledResult } from "@/lib/schedules/types";
import { cn } from "@/lib/utils";

import { formatDateTime, formatRelative } from "./admin-format";
import { adminQueryKeys } from "./admin-query-keys";
import { AdminSection } from "./admin-section";
import { AdminStatusBadge } from "./admin-status-badge";
import { sendAdminJson } from "./send-admin-json";

const ACTION_TEXT: Record<SetScheduleEnabledResult["action"], string> = {
  create: "created and enabled",
  update: "rewritten from code and enabled",
  resume: "enabled",
  pause: "paused",
  noop: "not in QStash; nothing to pause",
};

function hostOf(url: string | null | undefined): string {
  if (!url) return "—";
  try {
    return new URL(url).host;
  } catch {
    return url;
  }
}

function ScheduleState({ row }: { row: AdminScheduleRow }) {
  if (!row.current) return <AdminStatusBadge value="missing" />;
  return <AdminStatusBadge value={row.current.isPaused ? "paused" : "running"} />;
}

/** cronstrue does not read QStash's `CRON_TZ=` prefix; describe the rest and name the zone. */
function describeCron(cron: string): string {
  const match = /^CRON_TZ=(\S+)\s+(.*)$/.exec(cron.trim());
  return match ? `${getCronFriendlyText(match[2]!)} (${match[1]})` : `${getCronFriendlyText(cron)} (UTC)`;
}

function CronCell({ row }: { row: AdminScheduleRow }) {
  const cron = row.current?.cron ?? row.managed?.cron ?? "";
  const drifted = row.drift.includes("cron");

  return (
    <div className="text-xs">
      <code className={cn(drifted && "text-destructive")}>{cron}</code>
      <div className="text-muted-foreground">{describeCron(cron)}</div>
      {drifted ? (
        <div className="text-muted-foreground">
          Code: <code>{row.managed!.cron}</code>
        </div>
      ) : null}
    </div>
  );
}

function DestinationCell({ row, serverUrl }: { row: AdminScheduleRow; serverUrl: string | null }) {
  const destination = row.current?.destination ?? null;
  const otherServer =
    destination !== null && serverUrl !== null && hostOf(destination) !== hostOf(serverUrl);

  return (
    <div className="w-72 max-w-72 text-xs">
      {destination ? (
        <div className="truncate" title={destination}>
          {destination}
        </div>
      ) : (
        <div className="text-muted-foreground">Not in QStash</div>
      )}
      {otherServer ? (
        <div className="text-amber-700 dark:text-amber-400">Another server ({hostOf(destination)})</div>
      ) : null}
      {row.drift.includes("job") ? (
        <div className="text-destructive">
          Job {row.current?.jobName ?? "?"}, code: {row.managed?.target}
        </div>
      ) : null}
      {row.managed && (!destination || row.drift.length > 0) ? (
        <div className="truncate text-muted-foreground" title={row.managed.destination ?? undefined}>
          Enable → {row.managed.destination ?? "?"}
        </div>
      ) : null}
    </div>
  );
}

function ScheduleRow({ row, serverUrl }: { row: AdminScheduleRow; serverUrl: string | null }) {
  const queryClient = useQueryClient();
  const toggle = useMutation({
    mutationFn: (enabled: boolean) =>
      sendAdminJson<SetScheduleEnabledResult>(
        `/api/admin/scheduler/schedules/${encodeURIComponent(row.scheduleId)}`,
        "PUT",
        { enabled },
      ),
    onSuccess: async (result) => {
      await queryClient.invalidateQueries({ queryKey: adminQueryKeys.scheduler() });
      toast.add({
        title: `${row.scheduleId} ${ACTION_TEXT[result.action]}.`,
        description: result.destination ? `Delivers to ${result.destination}` : undefined,
        type: "success",
      });
    },
    onError: (error: Error) => toast.add({ title: error.message, type: "error" }),
  });

  // Only a managed schedule can be created or rewritten; others just pause and resume.
  const canEnable = row.managed !== null || row.current !== null;
  const needsSync = row.enabled && row.drift.length > 0;

  return (
    <TableRow>
      <TableCell>
        <div className="font-medium">{row.managed?.label ?? row.scheduleId}</div>
        <div className="text-xs text-muted-foreground">
          {row.managed ? (
            <>
              <code>{row.scheduleId}</code> · {row.managed.kind} {row.managed.target}
            </>
          ) : (
            "Not managed by the app: pause and resume only"
          )}
        </div>
      </TableCell>
      <TableCell>
        <CronCell row={row} />
      </TableCell>
      <TableCell>
        <DestinationCell row={row} serverUrl={serverUrl} />
      </TableCell>
      <TableCell>
        <ScheduleState row={row} />
        {row.drift.length > 0 ? (
          <div className="mt-1 text-xs text-destructive">Out of sync: {row.drift.join(", ")}</div>
        ) : null}
      </TableCell>
      <TableCell className="text-xs">
        {formatDateTime(row.current?.lastScheduleTime)}
        <div className="text-muted-foreground">{formatRelative(row.current?.lastScheduleTime)}</div>
      </TableCell>
      <TableCell className="text-xs">
        {row.enabled ? formatDateTime(row.current?.nextScheduleTime) : "—"}
        <div className="text-muted-foreground">
          {row.enabled ? formatRelative(row.current?.nextScheduleTime) : null}
        </div>
      </TableCell>
      <TableCell className="text-right">
        <div className="flex items-center justify-end gap-2">
          {needsSync ? (
            <Button
              variant="outline"
              size="xs"
              disabled={toggle.isPending}
              onClick={() => toggle.mutate(true)}
            >
              Sync
            </Button>
          ) : null}
          <Switch
            checked={row.enabled}
            disabled={toggle.isPending || (!row.enabled && !canEnable)}
            onCheckedChange={(checked) => toggle.mutate(checked)}
            aria-label={`${row.enabled ? "Disable" : "Enable"} ${row.scheduleId}`}
          />
        </div>
      </TableCell>
    </TableRow>
  );
}

/** QStash schedules with an on/off switch; replaces the schedules:sync scripts. */
export function AdminSchedulerSchedules({ state }: { state: AdminSchedulerState }) {
  return (
    <AdminSection
      title="QStash schedules"
      description={
        <>
          Disabling pauses a schedule. Enabling an app schedule writes it from code when it is missing or out of
          sync, pointing it at this server ({state.serverUrl ?? "no app URL set"}), then resumes it.
        </>
      }
    >
      {state.schedulesError ? (
        <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {state.schedulesError}
        </p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Schedule</TableHead>
              <TableHead>Cron</TableHead>
              <TableHead>Destination</TableHead>
              <TableHead>State</TableHead>
              <TableHead>Last run</TableHead>
              <TableHead>Next run</TableHead>
              <TableHead className="text-right">Enabled</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {state.schedules.map((row) => (
              <ScheduleRow key={row.scheduleId} row={row} serverUrl={state.serverUrl} />
            ))}
          </TableBody>
        </Table>
      )}
    </AdminSection>
  );
}
