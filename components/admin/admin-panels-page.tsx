"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";

import { buttonVariants } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { PanelRow } from "@/lib/personas/types";

import { formatDateTime, formatNumber } from "./admin-format";
import { adminQueryKeys } from "./admin-query-keys";
import { AdminQueryState } from "./admin-query-state";
import { AdminSection } from "./admin-section";
import { fetchAdminJson } from "./fetch-admin-json";

export function AdminPanelsPage() {
  const { data, isPending, error } = useQuery({
    queryKey: adminQueryKeys.panels(),
    queryFn: () => fetchAdminJson<{ items: PanelRow[] }>("/api/admin/persona-panels"),
  });

  return (
    <AdminSection
      title="Panels"
      description="A set of personas with weights that stands for one community."
      actions={
        <Link href="/admin/panels/new" className={buttonVariants({ size: "sm" })}>
          New panel
        </Link>
      }
    >
      {!data ? (
        <AdminQueryState isPending={isPending} error={error} />
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Panel</TableHead>
              <TableHead className="text-right">Personas</TableHead>
              <TableHead>Updated</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.items.map((panel) => (
              <TableRow key={panel.id}>
                <TableCell className="max-w-96">
                  <Link
                    href={`/admin/panels/${panel.id}`}
                    className="block truncate font-medium hover:underline"
                  >
                    {panel.name}
                  </Link>
                  <span className="line-clamp-2 text-xs text-muted-foreground">
                    {panel.description || "—"}
                  </span>
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {formatNumber(panel.memberCount)}
                </TableCell>
                <TableCell className="text-xs">{formatDateTime(panel.updatedAt)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </AdminSection>
  );
}
