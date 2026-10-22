"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import { ExternalLinkIcon } from "lucide-react";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { AdminContentItemRow } from "@/lib/admin-console/types";

import { formatDateTime, formatNumber } from "./admin-format";

export function AdminContentItemsTable({
  rows,
  showSource = true,
  selection,
}: {
  rows: AdminContentItemRow[];
  showSource?: boolean;
  selection?: {
    selectedIds: ReadonlySet<string>;
    onToggle: (id: string, selected: boolean) => void;
    onTogglePage: (selected: boolean) => void;
  };
}) {
  const selectedOnPage = selection
    ? rows.filter((item) => selection.selectedIds.has(item.id)).length
    : 0;
  const allSelected = rows.length > 0 && selectedOnPage === rows.length;
  const columnCount = 7 + (showSource ? 1 : 0) + (selection ? 1 : 0);

  return (
    <Table>
      <TableHeader>
        <TableRow>
          {selection ? (
            <TableHead className="w-8">
              <SelectCheckbox
                checked={allSelected}
                indeterminate={selectedOnPage > 0 && !allSelected}
                label="Select all on this page"
                onChange={selection.onTogglePage}
              />
            </TableHead>
          ) : null}
          <TableHead>Published</TableHead>
          <TableHead>Kind</TableHead>
          {showSource ? <TableHead>Source</TableHead> : null}
          <TableHead>Author</TableHead>
          <TableHead>Text</TableHead>
          <TableHead className="text-right">Likes</TableHead>
          <TableHead className="text-right">Comments</TableHead>
          <TableHead className="text-right">Shares</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.length === 0 ? (
          <TableRow>
            <TableCell colSpan={columnCount} className="text-muted-foreground">
              No items.
            </TableCell>
          </TableRow>
        ) : (
          rows.map((item) => (
            <TableRow key={item.id} className="align-top">
              {selection ? (
                <TableCell>
                  <SelectCheckbox
                    checked={selection.selectedIds.has(item.id)}
                    label={`Select item published ${formatDateTime(item.publishedAt)}`}
                    onChange={(selected) => selection.onToggle(item.id, selected)}
                  />
                </TableCell>
              ) : null}
              <TableCell className="text-xs whitespace-nowrap">
                <Link href={`/admin/content-items/${item.id}`} className="hover:underline">
                  {formatDateTime(item.publishedAt)}
                </Link>
                <div className="text-muted-foreground">{item.origin}</div>
              </TableCell>
              <TableCell className="text-xs">{item.kind}</TableCell>
              {showSource ? (
                <TableCell className="max-w-40 truncate text-xs">
                  {item.source ? (
                    <Link href={`/admin/sources/${item.source.id}`} className="hover:underline">
                      {item.source.name ?? item.source.id}
                    </Link>
                  ) : (
                    "—"
                  )}
                </TableCell>
              ) : null}
              <TableCell className="max-w-36 truncate text-xs">{item.authorName ?? "—"}</TableCell>
              <TableCell className="max-w-xl min-w-64 text-xs whitespace-normal">
                <Link href={`/admin/content-items/${item.id}`} className="line-clamp-3 hover:underline">
                  {item.text || <span className="text-muted-foreground">(no text)</span>}
                </Link>
                {item.url ? (
                  <a
                    href={item.url}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-1 inline-flex items-center gap-1 text-muted-foreground hover:text-foreground"
                  >
                    open <ExternalLinkIcon className="size-3" />
                  </a>
                ) : null}
              </TableCell>
              <TableCell className="text-right tabular-nums">{formatNumber(item.likeCount)}</TableCell>
              <TableCell className="text-right tabular-nums">
                {formatNumber(item.commentCount)}
              </TableCell>
              <TableCell className="text-right tabular-nums">{formatNumber(item.shareCount)}</TableCell>
            </TableRow>
          ))
        )}
      </TableBody>
    </Table>
  );
}

function SelectCheckbox({
  checked,
  indeterminate = false,
  label,
  onChange,
}: {
  checked: boolean;
  indeterminate?: boolean;
  label: string;
  onChange: (checked: boolean) => void;
}) {
  const ref = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (ref.current) ref.current.indeterminate = indeterminate;
  }, [indeterminate]);

  return (
    <input
      ref={ref}
      type="checkbox"
      checked={checked}
      aria-label={label}
      className="size-4 accent-primary"
      onClick={(event) => event.stopPropagation()}
      onChange={(event) => onChange(event.target.checked)}
    />
  );
}
