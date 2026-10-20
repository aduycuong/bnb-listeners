"use client";

import Link from "next/link";
import { useT } from "next-i18next/client";

import { Button } from "@/components/ui/button";
import { PROJECT_CASE_ICONS } from "@/lib/projects/project-cases";
import type { ProjectListItem } from "@/lib/projects/types";

/** Shown for real projects until Match and the dashboard read real data (phase 3 PR 2, phase 5). */
export function ProjectPendingDashboard({
  project,
  settingsHref,
}: {
  project: ProjectListItem;
  settingsHref: string;
}) {
  const { t } = useT("dashboard");

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-4 px-4 py-5 md:px-7">
      <div>
        <h1 className="font-heading text-xl font-bold">
          {PROJECT_CASE_ICONS[project.case]} {project.name}
        </h1>
        <p className="text-[13px] text-muted-foreground">
          {t(`cases.${project.case}`)}
        </p>
      </div>
      <section className="flex flex-col gap-3 rounded-[22px] border-[1.5px] border-border bg-card px-4 py-5 md:px-5">
        <h2 className="text-base font-semibold">Chưa có số liệu</h2>
        <p className="text-sm text-muted-foreground">
          Cấu hình đã được lưu. Mention sẽ có sau khi bước so khớp (Match) chạy trên kho dữ liệu,
          dashboard dùng số liệu thật sẽ có ở giai đoạn sau.
        </p>
        <div>
          <Button variant="outline" nativeButton={false} render={<Link href={settingsHref} />}>
            Xem cấu hình
          </Button>
        </div>
      </section>
    </div>
  );
}
