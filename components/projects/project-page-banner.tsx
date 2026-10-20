"use client";

import Link from "next/link";
import { useT } from "next-i18next/client";

import { Button } from "@/components/ui/button";
import { PROJECT_CASE_ICONS, type ProjectCase } from "@/lib/projects/project-cases";

/** Full-width project strip shared by the listening report pages. */
export const projectReportPageClassName = "flex w-full flex-col gap-4 px-4 py-5 md:px-7";

export type ProjectPageBannerProps = {
  name: string;
  description: string | null;
  projectCase: ProjectCase;
  settingsHref: string;
};

export function ProjectPageBanner({
  name,
  description,
  projectCase,
  settingsHref,
}: ProjectPageBannerProps) {
  const { t } = useT("dashboard");

  return (
    <section className="grid items-center gap-4 rounded-[22px] bg-[var(--tile-blue)] px-5 py-4 md:grid-cols-[auto_minmax(0,1fr)_auto]">
      <div className="grid size-11 place-items-center rounded-2xl bg-white text-[22px]">
        {PROJECT_CASE_ICONS[projectCase]}
      </div>
      <div className="min-w-0">
        <h2 className="font-heading text-base font-bold">
          {name}
          <span className="ml-2 inline-flex rounded-full bg-primary px-2 py-0.5 align-middle text-[11.5px] font-semibold text-white">
            Case: {t(`cases.${projectCase}`)}
          </span>
        </h2>
        {description ? (
          <p className="mt-0.5 max-w-[85ch] text-[13px] text-muted-foreground">{description}</p>
        ) : null}
      </div>
      <Button
        nativeButton={false}
        render={<Link href={settingsHref} />}
        className="justify-self-start rounded-full bg-white px-4 text-primary shadow-none hover:bg-white/90 md:justify-self-end"
      >
        {t("nav.projectSettings")}
      </Button>
    </section>
  );
}
