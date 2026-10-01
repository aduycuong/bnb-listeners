"use client";

import { useT } from "next-i18next/client";

import { Button } from "@/components/ui/button";
import { getAquaCase } from "@/lib/projects/aqua-demo";
import {
  getAquaProfile,
  type AquaReviewValue,
} from "@/lib/projects/aqua-demo-profile";
import { PROJECT_CASE_ICONS, type ProjectCase } from "@/lib/projects/project-cases";

import {
  DemoBanner,
  DemoPage,
  DemoPanel,
  ReviewValueView,
} from "./demo-ui";

type AquaProjectSettingsProps = {
  projectName: string;
  projectDescription: string | null;
  projectCase: ProjectCase;
  settingsHref: string;
  onEdit: () => void;
};

function isOfficialName(value: AquaReviewValue | undefined, projectName: string) {
  return value?.type === "text" && value.text === projectName;
}

export function AquaProjectSettings({
  projectName,
  projectDescription,
  projectCase,
  settingsHref,
  onEdit,
}: AquaProjectSettingsProps) {
  const { t } = useT("dashboard");
  const data = getAquaCase(projectCase);
  const profile = data ? getAquaProfile(data.id) : null;
  const officialName = profile?.sections
    .find((section) => section.title === "Thông tin chung")
    ?.rows.find((row) => row.label === "Tên dự án")?.value;

  return (
    <DemoPage
      title="Cài đặt dự án"
      subtitle="Cấu hình của dự án đang chọn"
      banner={
        <DemoBanner
          icon={data?.icon ?? PROJECT_CASE_ICONS[projectCase]}
          name={projectName}
          caseLabel={t(`cases.${projectCase}`)}
          description={projectDescription || data?.desc || ""}
          datasets={profile?.datasets ?? []}
          modeLabel={profile?.modeLabel ?? "Liên tục"}
          owner={profile?.owner ?? "—"}
          showSampleFlag={Boolean(profile) && !isOfficialName(officialName, projectName)}
          settingsHref={settingsHref}
        />
      }
    >
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <Button type="button" onClick={onEdit}>
          Chỉnh sửa dự án
        </Button>
        <Button type="button" variant="outline" disabled>
          Lưu trữ dự án
        </Button>
        <span className="text-[12.5px] text-muted-foreground">
          Lưu trữ chỉ ẩn dự án, dữ liệu trong các bộ dữ liệu vẫn được giữ nguyên.
        </span>
      </div>
      {profile ? (
        <div className="flex flex-col gap-3.5">
          {profile.sections.map((section) => (
            <section
              key={section.title}
              className="rounded-[22px] border-[1.5px] border-border bg-card px-4 py-3.5"
            >
              <h3 className="mb-2 text-sm font-bold">{section.title}</h3>
              <dl className="grid gap-2 text-[13px] md:grid-cols-[200px_1fr] md:gap-x-4">
                {section.rows.map((row) => (
                  <div key={row.label} className="contents">
                    <dt className="text-muted-foreground">{row.label}</dt>
                    <dd className="m-0">
                      <ReviewValueView value={row.value} />
                    </dd>
                  </div>
                ))}
              </dl>
            </section>
          ))}
        </div>
      ) : (
        <DemoPanel title="Cấu hình case" span="s12" scope="case" scopeLabel={t(`cases.${projectCase}`)}>
          <p className="text-sm text-muted-foreground">
            Kiểu case này chưa có bộ cấu hình mẫu trong bản demo.
          </p>
        </DemoPanel>
      )}
    </DemoPage>
  );
}
