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
import type { PersonaRow } from "@/lib/personas/types";

import { formatDateTime, formatNumber } from "./admin-format";
import { adminQueryKeys } from "./admin-query-keys";
import { AdminQueryState } from "./admin-query-state";
import { AdminSection } from "./admin-section";
import { AdminStatusBadge } from "./admin-status-badge";
import { fetchAdminJson } from "./fetch-admin-json";

export function AdminPersonasPage() {
  const { data, isPending, error } = useQuery({
    queryKey: adminQueryKeys.personas(),
    queryFn: () => fetchAdminJson<{ items: PersonaRow[] }>("/api/admin/personas"),
  });

  return (
    <AdminSection
      title="Personas"
      description="A kind of person the synthetic connector writes as. Editing bumps the version; authors already created keep their persona."
      actions={
        <Link href="/admin/personas/new" className={buttonVariants({ size: "sm" })}>
          New persona
        </Link>
      }
    >
      {!data ? (
        <AdminQueryState isPending={isPending} error={error} />
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Persona</TableHead>
              <TableHead>Concerns</TableHead>
              <TableHead className="text-right">Panels</TableHead>
              <TableHead className="text-right">Authors</TableHead>
              <TableHead>Source</TableHead>
              <TableHead>Review</TableHead>
              <TableHead className="text-right">Version</TableHead>
              <TableHead>Updated</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.items.map((persona) => (
              <TableRow key={persona.id}>
                <TableCell className="max-w-80">
                  <Link
                    href={`/admin/personas/${persona.id}`}
                    className="block truncate font-medium hover:underline"
                  >
                    {persona.name}
                  </Link>
                  <span className="line-clamp-2 text-xs text-muted-foreground">
                    {persona.kind} · {persona.description}
                  </span>
                </TableCell>
                <TableCell className="max-w-56 text-xs">
                  {persona.concerns.join(", ") || "—"}
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {formatNumber(persona.panelCount)}
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {formatNumber(persona.authorCount)}
                </TableCell>
                <TableCell className="text-xs">{persona.source}</TableCell>
                <TableCell>
                  <AdminStatusBadge value={persona.reviewStatus} />
                </TableCell>
                <TableCell className="text-right tabular-nums">{persona.version}</TableCell>
                <TableCell className="text-xs">{formatDateTime(persona.updatedAt)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </AdminSection>
  );
}
