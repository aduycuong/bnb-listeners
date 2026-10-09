"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2Icon } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/components/ui/toast";
import { fetchProjects, projectsQueryKey } from "@/hooks/use-project-route-context";
import { useWorkspaceRouteContext } from "@/hooks/use-workspace-route-context";
import { getProjectNavHref } from "@/lib/dashboard/nav-items";
import {
  ASPECT_OPTIONS,
  CREATE_BRANDS,
  CREATE_CASE_GROUPS,
  CREATE_CASE_OPTIONS,
  CREATE_CHANNELS,
  CREATE_DATASETS,
  CREATE_MEMBERS,
  CREATE_PROJECT_STEPS,
  alertRulesFor,
  formatMentionCount,
  getCreateCase,
  type AlertRule,
} from "@/lib/projects/create-project-demo";
import { cn } from "@/lib/utils";
import { workspaceFetch } from "@/lib/workspaces/utils/workspace-fetch";

type MemberRow = { email: string; role: string };

type Draft = {
  typeId: string;
  name: string;
  desc: string;
  brand: string;
  owner: string;
  mode: "ongoing" | "range";
  start: string;
  end: string;
  topicIds: string[];
  include: string[];
  exclude: string[];
  channels: string[];
  langs: string[];
  region: string;
  cfg: Record<string, string | string[]>;
  rules: AlertRule[];
  via: string[];
  to: string[];
  digest: string;
  members: MemberRow[];
};

const REGIONS = [
  "Toàn quốc",
  "TP.HCM và vùng lân cận",
  "Hà Nội và vùng lân cận",
  "Miền Trung",
];

const PROVINCES = [
  "TP.HCM",
  "Bình Dương",
  "Đồng Nai",
  "Long An",
  "Bà Rịa – Vũng Tàu",
  "Hà Nội",
  "Đà Nẵng",
];

const BROKER_CHECKS = [
  "Giá rao sai bảng giá",
  "Chiết khấu vượt chính sách",
  "Cam kết lợi nhuận",
  "Thông tin pháp lý sai",
  "Dùng logo trái phép",
  "Tự nhận đại lý chính thức",
];

function today() {
  return new Date().toISOString().slice(0, 10);
}

function emptyDraft(): Draft {
  return {
    typeId: "",
    name: "",
    desc: "",
    brand: "Phát Đạt",
    owner: CREATE_MEMBERS[0],
    mode: "ongoing",
    start: today(),
    end: "",
    topicIds: ["t1"],
    include: [],
    exclude: [],
    channels: CREATE_CHANNELS.slice(0, 7),
    langs: ["Tiếng Việt"],
    region: "Toàn quốc",
    cfg: {},
    rules: [],
    via: ["Email"],
    to: ["lanhuong@demo-phatdat.vn"],
    digest: "weekly",
    members: [{ email: "lanhuong@demo-phatdat.vn", role: "Quản trị" }],
  };
}

function defaultCfg(typeId: string): Record<string, string | string[]> {
  if (typeId === "brand") {
    return {
      competitors: ["Becamex IDC", "Kim Oanh Group", "Bcons"],
      projects: ["La Pura", "Quy Nhơn Iconic", "Bắc Hà Thanh"],
      pillars: ["Pháp lý minh bạch", "Tiến độ cam kết", "Năng lực tài chính", "Chất lượng sản phẩm"],
      period: "month",
    };
  }
  if (typeId === "project") {
    return {
      projectName: "",
      aliases: [],
      province: "TP.HCM",
      district: "",
      segment: "Căn hộ",
      stage: "Đang mở bán",
      priceRef: "",
      priceAlert: "15",
      aspects: [...ASPECT_OPTIONS],
      competitors: [],
    };
  }
  if (typeId === "market") {
    return {
      areas: ["Thuận An", "Dĩ An", "Thủ Dầu Một", "Thủ Đức"],
      segments: ["Căn hộ"],
      themes: ["Lãi suất", "Hạ tầng", "Pháp lý", "Giá"],
      priceMin: "",
      priceMax: "",
      period: "week",
    };
  }
  if (typeId === "broker") {
    return {
      priceList: "",
      maxDiscount: "8",
      priceTolerance: "5",
      f1: [],
      forbidden: ["cam kết lợi nhuận", "bao thuê", "cam kết mua lại", "đại lý độc quyền"],
      checks: BROKER_CHECKS.slice(0, 5),
      escalate: "3",
    };
  }
  if (typeId === "crisis") {
    return {
      incident: "",
      detected: "",
      level: "1",
      keywords: [],
      l2: "50",
      l3: "150",
      sla: "4",
      freq: "5 phút",
      team: [],
    };
  }
  return {};
}

function isEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function asList(value: string | string[] | undefined) {
  return Array.isArray(value) ? value : [];
}

function asText(value: string | string[] | undefined) {
  return typeof value === "string" ? value : "";
}

function validate(step: number, draft: Draft) {
  const errors: Record<string, string> = {};
  if (step === 0 && !getCreateCase(draft.typeId)?.projectCase) {
    errors.type = "Chọn một kiểu case để tiếp tục";
  }
  if (step === 1) {
    if (!draft.name.trim()) {
      errors.name = "Nhập tên dự án";
    }
    if (draft.mode === "range") {
      if (!draft.start) {
        errors.start = "Chọn ngày bắt đầu";
      }
      if (!draft.end) {
        errors.end = "Chọn ngày kết thúc";
      } else if (draft.start && draft.end < draft.start) {
        errors.end = "Ngày kết thúc phải sau ngày bắt đầu";
      }
    }
  }
  if (step === 2) {
    if (draft.topicIds.length === 0) {
      errors.topics = "Chọn ít nhất một bộ dữ liệu";
    }
    if (draft.channels.length === 0) {
      errors.channels = "Chọn ít nhất một kênh";
    }
  }
  if (step === 3) {
    if (draft.typeId === "project" && !asText(draft.cfg.projectName).trim()) {
      errors.projectName = "Nhập tên thương mại của dự án";
    }
    if (draft.typeId === "project" && asList(draft.cfg.aspects).length === 0) {
      errors.aspects = "Chọn ít nhất một khía cạnh";
    }
    if (draft.typeId === "market" && asList(draft.cfg.areas).length === 0) {
      errors.areas = "Nhập ít nhất một khu vực";
    }
    if (draft.typeId === "broker" && !asText(draft.cfg.priceList).trim()) {
      errors.priceList = "Nhập bảng giá đang áp dụng";
    }
    if (draft.typeId === "broker" && asList(draft.cfg.f1).length === 0) {
      errors.f1 = "Nhập ít nhất một sàn F1";
    }
    if (draft.typeId === "crisis" && !asText(draft.cfg.incident).trim()) {
      errors.incident = "Nhập tên sự cố";
    }
    if (draft.typeId === "crisis" && asList(draft.cfg.keywords).length === 0) {
      errors.keywords = "Nhập ít nhất một từ khóa";
    }
    if (
      draft.typeId === "crisis" &&
      Number(draft.cfg.l3) <= Number(draft.cfg.l2)
    ) {
      errors.l3 = "Ngưỡng cấp 3 phải lớn hơn ngưỡng cấp 2";
    }
    const badTeam = asList(draft.cfg.team).find((email) => !isEmail(email));
    if (badTeam) {
      errors.team = `Email không hợp lệ: ${badTeam}`;
    }
  }
  if (step === 4) {
    if (draft.rules.some((rule) => rule.on)) {
      if (draft.via.length === 0) {
        errors.via = "Chọn ít nhất một kênh nhận cảnh báo";
      }
      if (draft.to.length === 0) {
        errors.to = "Nhập ít nhất một người nhận";
      }
    }
    const badTo = draft.to.find((email) => !isEmail(email));
    if (badTo) {
      errors.to = `Email không hợp lệ: ${badTo}`;
    }
    if (draft.members.length === 0) {
      errors.members = "Dự án cần ít nhất một thành viên";
    } else if (draft.members.some((member) => !isEmail(member.email))) {
      errors.members = "Có thành viên chưa nhập email hợp lệ";
    } else if (!draft.members.some((member) => member.role === "Quản trị")) {
      errors.members = "Cần ít nhất một người có vai trò Quản trị";
    }
  }
  return errors;
}

function FieldHint({ error, hint }: { error?: string; hint?: string }) {
  if (!error && !hint) {
    return null;
  }
  return (
    <p className={error ? "text-xs text-destructive" : "text-xs text-muted-foreground"}>
      {error || hint}
    </p>
  );
}

function TagEditor({
  values,
  placeholder,
  onChange,
}: {
  values: string[];
  placeholder: string;
  onChange: (values: string[]) => void;
}) {
  const [text, setText] = useState("");

  function add(raw: string) {
    const next = raw.trim();
    if (!next || values.includes(next)) {
      setText("");
      return;
    }
    onChange([...values, next]);
    setText("");
  }

  return (
    <div className="flex min-h-10 flex-wrap items-center gap-1.5 rounded-[14px] border-[1.5px] border-input px-2 py-1.5">
      {values.map((value) => (
        <span key={value} className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-xs">
          {value}
          <button
            type="button"
            className="text-muted-foreground"
            aria-label={`Xóa ${value}`}
            onClick={() => onChange(values.filter((item) => item !== value))}
          >
            ×
          </button>
        </span>
      ))}
      <input
        value={text}
        placeholder={values.length ? "Thêm…" : placeholder}
        className="min-w-24 flex-1 bg-transparent text-[13.5px] outline-none"
        onChange={(event) => setText(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === "Enter") {
            event.preventDefault();
            add(text);
          }
        }}
        onBlur={() => add(text)}
      />
    </div>
  );
}

function CheckGrid({
  options,
  values,
  onChange,
}: {
  options: string[];
  values: string[];
  onChange: (values: string[]) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((option) => {
        const checked = values.includes(option);
        return (
          <label
            key={option}
            className={cn(
              "inline-flex cursor-pointer items-center gap-2 rounded-full border px-3 py-1.5 text-[13px]",
              checked ? "border-primary bg-primary/10" : "border-border",
            )}
          >
            <input
              type="checkbox"
              className="accent-primary"
              checked={checked}
              onChange={() =>
                onChange(
                  checked ? values.filter((item) => item !== option) : [...values, option],
                )
              }
            />
            {option}
          </label>
        );
      })}
    </div>
  );
}

function SelectField({
  value,
  options,
  onChange,
}: {
  value: string;
  options: { value: string; label: string }[];
  onChange: (value: string) => void;
}) {
  return (
    <select
      value={value}
      className="h-10 w-full rounded-[14px] border-[1.5px] border-input bg-transparent px-3 text-[13.5px] outline-none focus-visible:border-primary focus-visible:ring-3 focus-visible:ring-primary/15"
      onChange={(event) => onChange(event.target.value)}
    >
      {options.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  );
}

export function CreateProjectPage({
  workspaceIndexParam,
}: {
  workspaceIndexParam: string;
}) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { workspace, workspaceIndex } = useWorkspaceRouteContext(workspaceIndexParam);
  const { data } = useQuery({
    queryKey: projectsQueryKey(workspace?.id ?? "pending"),
    queryFn: () => fetchProjects(workspace!.id),
    enabled: Boolean(workspace),
  });
  const [step, setStep] = useState(0);
  const [draft, setDraft] = useState<Draft>(emptyDraft);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const selected = getCreateCase(draft.typeId);
  const projectsHref = `/w/${workspaceIndex}/projects`;

  const volume = useMemo(
    () =>
      CREATE_DATASETS.filter((item) => draft.topicIds.includes(item.id)).reduce(
        (total, item) => total + item.volume,
        0,
      ),
    [draft.topicIds],
  );

  function patch(partial: Partial<Draft>) {
    setDraft((current) => ({ ...current, ...partial }));
  }

  function setCfg(key: string, value: string | string[]) {
    setDraft((current) => ({ ...current, cfg: { ...current.cfg, [key]: value } }));
  }

  function chooseType(typeId: string) {
    patch({
      typeId,
      cfg: defaultCfg(typeId),
      rules: alertRulesFor(typeId),
    });
  }

  function goNext() {
    const nextErrors = validate(step, draft);
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) {
      return;
    }
    setStep((current) => Math.min(CREATE_PROJECT_STEPS.length - 1, current + 1));
  }

  async function save() {
    if (!workspace || !selected?.projectCase) {
      return;
    }
    for (let index = 0; index < 5; index += 1) {
      const nextErrors = validate(index, draft);
      if (Object.keys(nextErrors).length > 0) {
        setStep(index);
        setErrors(nextErrors);
        toast.add({ title: `Còn thông tin chưa hợp lệ ở bước ${index + 1}`, type: "error" });
        return;
      }
    }

    setSaving(true);
    const res = await workspaceFetch(workspace.id, "/api/projects", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: draft.name.trim(),
        description: draft.desc.trim(),
        case: selected.projectCase,
      }),
    });
    const body = (await res.json()) as { message?: string; error?: string };
    setSaving(false);
    if (!res.ok) {
      toast.add({
        title: body.message ?? body.error ?? "Không tạo được dự án.",
        type: "error",
      });
      return;
    }
    toast.add({ title: body.message ?? `Đã tạo dự án “${draft.name.trim()}”`, type: "success" });
    await queryClient.invalidateQueries({ queryKey: projectsQueryKey(workspace.id) });
    const nextIndex = data?.items.length;
    router.push(
      nextIndex === undefined ? projectsHref : getProjectNavHref(workspaceIndex, nextIndex, ""),
    );
    router.refresh();
  }

  if (!workspace) {
    return null;
  }

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-4 px-4 py-5 md:px-7">
      <div>
        <h1 className="font-heading text-xl font-bold">Tạo dự án</h1>
        <p className="text-[13px] text-muted-foreground">
          Wizard giống bản demo Phát Đạt · La Pura. Kiểu “Sắp có” chưa có dashboard.
        </p>
      </div>
      <ol className="flex flex-wrap gap-2">
        {CREATE_PROJECT_STEPS.map((label, index) => (
          <li key={label}>
            <button
              type="button"
              disabled={index > step}
              className={cn(
                "inline-flex items-center gap-2 rounded-full px-3 py-1 text-[13px]",
                index === step
                  ? "bg-primary text-primary-foreground"
                  : index < step
                    ? "bg-muted text-foreground"
                    : "text-muted-foreground",
              )}
              onClick={() => {
                if (index < step) {
                  setStep(index);
                }
              }}
            >
              <span className="grid size-5 place-items-center rounded-full bg-white/20 text-xs font-semibold">
                {index < step ? "✓" : index + 1}
              </span>
              {label}
            </button>
          </li>
        ))}
      </ol>

      <section className="rounded-[22px] border-[1.5px] border-border bg-card px-4 py-4 md:px-5">
        {step === 0 ? (
          <CaseStep draft={draft} error={errors.type} onChoose={chooseType} />
        ) : null}
        {step === 1 ? (
          <InfoStep draft={draft} errors={errors} onChange={patch} />
        ) : null}
        {step === 2 ? (
          <DataStep
            draft={draft}
            errors={errors}
            volume={volume}
            onChange={patch}
          />
        ) : null}
        {step === 3 && selected ? (
          <ConfigStep
            typeName={`${selected.icon} ${selected.name}`}
            draft={draft}
            errors={errors}
            onCfg={setCfg}
          />
        ) : null}
        {step === 4 && selected ? (
          <AlertStep typeName={selected.name} draft={draft} errors={errors} onChange={patch} />
        ) : null}
        {step === 5 && selected ? <ReviewStep draft={draft} typeName={selected.name} /> : null}
      </section>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <Button variant="outline" nativeButton={false} render={<Link href={projectsHref} />}>
          Hủy
        </Button>
        <div className="flex gap-2">
          {step > 0 ? (
            <Button type="button" variant="outline" onClick={() => setStep((current) => current - 1)}>
              Quay lại
            </Button>
          ) : null}
          {step < CREATE_PROJECT_STEPS.length - 1 ? (
            <Button type="button" onClick={goNext}>
              Tiếp tục
            </Button>
          ) : (
            <Button type="button" disabled={saving} onClick={() => void save()}>
              {saving ? <Loader2Icon className="animate-spin" /> : null}
              Tạo dự án
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

function CaseStep({
  draft,
  error,
  onChoose,
}: {
  draft: Draft;
  error?: string;
  onChoose: (typeId: string) => void;
}) {
  return (
    <div className="flex flex-col gap-4">
      <div>
        <h2 className="text-base font-semibold">Chọn kiểu case</h2>
        <p className="text-[13px] text-muted-foreground">
          Kiểu case quyết định dashboard, chỉ số và các trường cấu hình ở bước 4.
        </p>
      </div>
      {CREATE_CASE_GROUPS.map((group) => (
        <div key={group}>
          <h3 className="mb-2 text-sm font-semibold">{group}</h3>
          <div className="grid gap-2 md:grid-cols-2">
            {CREATE_CASE_OPTIONS.filter((item) => item.group === group).map((item) => {
              const ready = Boolean(item.projectCase);
              const selected = draft.typeId === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  disabled={!ready}
                  aria-pressed={selected}
                  className={cn(
                    "rounded-2xl border px-3 py-3 text-left",
                    selected ? "border-primary bg-primary/5" : "border-border",
                    !ready && "cursor-not-allowed opacity-55",
                  )}
                  onClick={() => onChoose(item.id)}
                >
                  <span className="text-lg">{item.icon}</span>
                  <b className="mt-1 block text-sm">{item.name}</b>
                  <span className="mt-0.5 block text-[13px] text-muted-foreground">{item.description}</span>
                  <small className="mt-1 block text-xs text-muted-foreground">
                    {ready ? `Dành cho: ${item.audience}` : "Sắp có"}
                  </small>
                </button>
              );
            })}
          </div>
        </div>
      ))}
      <FieldHint error={error} />
    </div>
  );
}

function InfoStep({
  draft,
  errors,
  onChange,
}: {
  draft: Draft;
  errors: Record<string, string>;
  onChange: (partial: Partial<Draft>) => void;
}) {
  return (
    <div className="grid gap-3 md:grid-cols-2">
      <div className="md:col-span-2">
        <h2 className="text-base font-semibold">Thông tin chung</h2>
        <p className="mb-3 text-[13px] text-muted-foreground">Phần này giống nhau ở mọi kiểu case.</p>
      </div>
      <label className="flex flex-col gap-1 md:col-span-2 text-sm">
        Tên dự án theo dõi
        <Input
          value={draft.name}
          placeholder="VD: Mở bán phân khu Risa – La Pura"
          aria-invalid={Boolean(errors.name)}
          onChange={(event) => onChange({ name: event.target.value })}
        />
        <FieldHint error={errors.name} />
      </label>
      <label className="flex flex-col gap-1 md:col-span-2 text-sm">
        Mô tả
        <Textarea
          value={draft.desc}
          placeholder="Mục tiêu, ai sẽ dùng dashboard này…"
          onChange={(event) => onChange({ desc: event.target.value })}
        />
      </label>
      <label className="flex flex-col gap-1 text-sm">
        Thương hiệu, dự án chính
        <SelectField
          value={draft.brand}
          options={CREATE_BRANDS.map((item) => ({ value: item, label: item }))}
          onChange={(brand) => onChange({ brand })}
        />
      </label>
      <label className="flex flex-col gap-1 text-sm">
        Người phụ trách
        <SelectField
          value={draft.owner}
          options={CREATE_MEMBERS.map((item) => ({ value: item, label: item }))}
          onChange={(owner) => onChange({ owner })}
        />
      </label>
      <label className="flex flex-col gap-1 text-sm">
        Thời gian
        <SelectField
          value={draft.mode}
          options={[
            { value: "ongoing", label: "Liên tục, không có ngày kết thúc" },
            { value: "range", label: "Có thời hạn" },
          ]}
          onChange={(mode) => onChange({ mode: mode as Draft["mode"] })}
        />
      </label>
      <label className="flex flex-col gap-1 text-sm">
        Từ ngày
        <Input type="date" value={draft.start} onChange={(event) => onChange({ start: event.target.value })} />
        <FieldHint error={errors.start} hint="Có thể chọn ngày trong quá khứ nếu bộ dữ liệu đã có lịch sử" />
      </label>
      {draft.mode === "range" ? (
        <label className="flex flex-col gap-1 text-sm">
          Đến ngày
          <Input
            type="date"
            value={draft.end}
            aria-invalid={Boolean(errors.end)}
            onChange={(event) => onChange({ end: event.target.value })}
          />
          <FieldHint error={errors.end} />
        </label>
      ) : null}
    </div>
  );
}

function DataStep({
  draft,
  errors,
  volume,
  onChange,
}: {
  draft: Draft;
  errors: Record<string, string>;
  volume: number;
  onChange: (partial: Partial<Draft>) => void;
}) {
  return (
    <div className="flex flex-col gap-4">
      <div>
        <h2 className="text-base font-semibold">Chọn dữ liệu</h2>
        <p className="text-[13px] text-muted-foreground">
          Dự án dùng lại các bộ dữ liệu của workspace, không thu thập trùng.
        </p>
      </div>
      <div className="flex flex-col gap-2">
        {CREATE_DATASETS.map((dataset) => {
          const checked = draft.topicIds.includes(dataset.id);
          return (
            <label key={dataset.id} className="flex gap-3 rounded-2xl border border-border px-3 py-2.5">
              <input
                type="checkbox"
                className="mt-1 accent-primary"
                checked={checked}
                onChange={() =>
                  onChange({
                    topicIds: checked
                      ? draft.topicIds.filter((id) => id !== dataset.id)
                      : [...draft.topicIds, dataset.id],
                  })
                }
              />
              <span>
                <b className="text-sm">{dataset.name}</b>
                <span className="ml-2 text-xs text-muted-foreground">{dataset.kind}</span>
                <code className="mt-1 block text-xs break-all text-muted-foreground">{dataset.query}</code>
                <small className="text-xs text-muted-foreground">
                  {formatMentionCount(dataset.volume)} đề cập / 14 ngày
                </small>
              </span>
            </label>
          );
        })}
      </div>
      <FieldHint error={errors.topics} />
      <p className="rounded-xl bg-muted px-3 py-2 text-[13px]">
        {draft.topicIds.length
          ? `Dự án sẽ phân tích trên khoảng ${formatMentionCount(volume)} đề cập / 14 ngày từ ${draft.topicIds.length} bộ dữ liệu.`
          : "Chưa chọn bộ dữ liệu nào."}
      </p>
      <h3 className="text-sm font-semibold">Bộ lọc riêng của dự án</h3>
      <label className="flex flex-col gap-1 text-sm">
        Chỉ lấy bài có chứa
        <TagEditor
          values={draft.include}
          placeholder="VD: Zenia"
          onChange={(include) => onChange({ include })}
        />
        <FieldHint hint="Để trống nếu dùng toàn bộ dữ liệu của các bộ đã chọn" />
      </label>
      <label className="flex flex-col gap-1 text-sm">
        Loại trừ thêm
        <TagEditor
          values={draft.exclude}
          placeholder="VD: cho thuê phòng"
          onChange={(exclude) => onChange({ exclude })}
        />
      </label>
      <div className="flex flex-col gap-1 text-sm">
        Kênh
        <CheckGrid
          options={CREATE_CHANNELS}
          values={draft.channels}
          onChange={(channels) => onChange({ channels })}
        />
        <FieldHint error={errors.channels} />
      </div>
      <div className="flex flex-col gap-1 text-sm">
        Ngôn ngữ
        <CheckGrid
          options={["Tiếng Việt", "Tiếng Anh"]}
          values={draft.langs}
          onChange={(langs) => onChange({ langs })}
        />
      </div>
      <label className="flex flex-col gap-1 text-sm">
        Khu vực
        <SelectField
          value={draft.region}
          options={REGIONS.map((item) => ({ value: item, label: item }))}
          onChange={(region) => onChange({ region })}
        />
      </label>
    </div>
  );
}

function ConfigStep({
  typeName,
  draft,
  errors,
  onCfg,
}: {
  typeName: string;
  draft: Draft;
  errors: Record<string, string>;
  onCfg: (key: string, value: string | string[]) => void;
}) {
  return (
    <div className="flex flex-col gap-3">
      <div>
        <h2 className="text-base font-semibold">Cấu hình riêng: {typeName}</h2>
        <p className="text-[13px] text-muted-foreground">
          Các trường dưới đây chỉ có ở kiểu case này.
        </p>
      </div>
      {draft.typeId === "brand" ? (
        <>
          <TagLabel label="Chủ đầu tư dùng để tính Share of Voice" values={asList(draft.cfg.competitors)} onChange={(value) => onCfg("competitors", value)} />
          <TagLabel label="Dự án tính vào chỉ số uy tín" values={asList(draft.cfg.projects)} onChange={(value) => onCfg("projects", value)} />
          <TagLabel label="Các trụ cột uy tín" values={asList(draft.cfg.pillars)} onChange={(value) => onCfg("pillars", value)} />
          <label className="flex flex-col gap-1 text-sm">
            Chu kỳ so sánh
            <SelectField
              value={asText(draft.cfg.period)}
              options={[
                { value: "week", label: "Theo tuần" },
                { value: "month", label: "Theo tháng" },
                { value: "quarter", label: "Theo quý" },
              ]}
              onChange={(value) => onCfg("period", value)}
            />
          </label>
        </>
      ) : null}
      {draft.typeId === "project" ? (
        <>
          <TextLabel label="Tên thương mại của dự án" value={asText(draft.cfg.projectName)} placeholder="VD: La Pura" error={errors.projectName} onChange={(value) => onCfg("projectName", value)} />
          <TagLabel label="Tên gọi khác, tên phân khu" values={asList(draft.cfg.aliases)} placeholder="VD: Zenia, Lusso Saigon" onChange={(value) => onCfg("aliases", value)} />
          <label className="flex flex-col gap-1 text-sm">
            Tỉnh, thành phố
            <SelectField
              value={asText(draft.cfg.province)}
              options={PROVINCES.map((item) => ({ value: item, label: item }))}
              onChange={(value) => onCfg("province", value)}
            />
          </label>
          <TextLabel label="Quận, huyện" value={asText(draft.cfg.district)} placeholder="VD: Thuận An" onChange={(value) => onCfg("district", value)} />
          <label className="flex flex-col gap-1 text-sm">
            Loại hình
            <SelectField
              value={asText(draft.cfg.segment)}
              options={["Căn hộ", "Nhà phố", "Biệt thự", "Đất nền", "Condotel", "Văn phòng"].map((item) => ({ value: item, label: item }))}
              onChange={(value) => onCfg("segment", value)}
            />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            Giai đoạn
            <SelectField
              value={asText(draft.cfg.stage)}
              options={["Sắp mở bán", "Đang mở bán", "Đang xây dựng", "Đã bàn giao"].map((item) => ({ value: item, label: item }))}
              onChange={(value) => onCfg("stage", value)}
            />
          </label>
          <TextLabel label="Giá bán tham chiếu của CĐT (triệu/m²)" value={asText(draft.cfg.priceRef)} placeholder="VD: 46" onChange={(value) => onCfg("priceRef", value)} />
          <TextLabel label="Cảnh báo khi tin rao lệch quá (%)" value={asText(draft.cfg.priceAlert)} onChange={(value) => onCfg("priceAlert", value)} />
          <TagLabel label="Khía cạnh cần đo cảm xúc" values={asList(draft.cfg.aspects)} error={errors.aspects} onChange={(value) => onCfg("aspects", value)} />
          <TagLabel label="Dự án cạnh tranh để so sánh" values={asList(draft.cfg.competitors)} placeholder="VD: dự án cùng trục QL13" onChange={(value) => onCfg("competitors", value)} />
        </>
      ) : null}
      {draft.typeId === "market" ? (
        <>
          <TagLabel label="Khu vực theo dõi" values={asList(draft.cfg.areas)} placeholder="VD: Thuận An" error={errors.areas} onChange={(value) => onCfg("areas", value)} />
          <div className="flex flex-col gap-1 text-sm">
            Loại hình
            <CheckGrid
              options={["Căn hộ", "Nhà phố", "Biệt thự", "Đất nền", "Nhà ở xã hội"]}
              values={asList(draft.cfg.segments)}
              onChange={(value) => onCfg("segments", value)}
            />
          </div>
          <TagLabel label="Chủ đề vĩ mô" values={asList(draft.cfg.themes)} onChange={(value) => onCfg("themes", value)} />
          <TextLabel label="Khoảng giá quan tâm từ (tỷ đồng)" value={asText(draft.cfg.priceMin)} onChange={(value) => onCfg("priceMin", value)} />
          <TextLabel label="Đến (tỷ đồng)" value={asText(draft.cfg.priceMax)} onChange={(value) => onCfg("priceMax", value)} />
          <label className="flex flex-col gap-1 text-sm">
            Chu kỳ báo cáo
            <SelectField
              value={asText(draft.cfg.period)}
              options={[
                { value: "week", label: "Theo tuần" },
                { value: "month", label: "Theo tháng" },
              ]}
              onChange={(value) => onCfg("period", value)}
            />
          </label>
        </>
      ) : null}
      {draft.typeId === "broker" ? (
        <>
          <TextLabel label="Bảng giá đang áp dụng" value={asText(draft.cfg.priceList)} placeholder="VD: Chính sách bán hàng tháng 10" error={errors.priceList} onChange={(value) => onCfg("priceList", value)} />
          <TextLabel label="Chiết khấu tối đa (%)" value={asText(draft.cfg.maxDiscount)} onChange={(value) => onCfg("maxDiscount", value)} />
          <TextLabel label="Sai lệch giá cho phép (%)" value={asText(draft.cfg.priceTolerance)} onChange={(value) => onCfg("priceTolerance", value)} />
          <TagLabel label="Sàn F1 chính thức" values={asList(draft.cfg.f1)} placeholder="Tên sàn" error={errors.f1} onChange={(value) => onCfg("f1", value)} />
          <TagLabel label="Cụm từ cấm trong quảng cáo" values={asList(draft.cfg.forbidden)} onChange={(value) => onCfg("forbidden", value)} />
          <div className="flex flex-col gap-1 text-sm">
            Loại vi phạm cần rà soát
            <CheckGrid
              options={BROKER_CHECKS}
              values={asList(draft.cfg.checks)}
              onChange={(value) => onCfg("checks", value)}
            />
          </div>
          <label className="flex flex-col gap-1 text-sm">
            Đề xuất ngừng hợp tác sau
            <SelectField
              value={asText(draft.cfg.escalate)}
              options={[
                { value: "2", label: "2 lần cảnh báo" },
                { value: "3", label: "3 lần cảnh báo" },
                { value: "5", label: "5 lần cảnh báo" },
              ]}
              onChange={(value) => onCfg("escalate", value)}
            />
          </label>
        </>
      ) : null}
      {draft.typeId === "crisis" ? (
        <>
          <TextLabel label="Tên sự cố" value={asText(draft.cfg.incident)} placeholder="VD: Tin đồn lùi bàn giao" error={errors.incident} onChange={(value) => onCfg("incident", value)} />
          <label className="flex flex-col gap-1 text-sm">
            Thời điểm phát hiện
            <Input
              type="datetime-local"
              value={asText(draft.cfg.detected)}
              onChange={(event) => onCfg("detected", event.target.value)}
            />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            Mức độ ban đầu
            <SelectField
              value={asText(draft.cfg.level)}
              options={[
                { value: "1", label: "Cấp 1 – Theo dõi" },
                { value: "2", label: "Cấp 2 – Lan rộng" },
                { value: "3", label: "Cấp 3 – Nghiêm trọng" },
              ]}
              onChange={(value) => onCfg("level", value)}
            />
          </label>
          <TagLabel label="Từ khóa nhận diện sự cố" values={asList(draft.cfg.keywords)} placeholder="VD: lùi bàn giao" error={errors.keywords} onChange={(value) => onCfg("keywords", value)} />
          <TextLabel label="Lên cấp 2 khi tiêu cực vượt (bài/giờ)" value={asText(draft.cfg.l2)} onChange={(value) => onCfg("l2", value)} />
          <TextLabel label="Lên cấp 3 khi tiêu cực vượt (bài/giờ)" value={asText(draft.cfg.l3)} error={errors.l3} onChange={(value) => onCfg("l3", value)} />
          <TextLabel label="Thời gian phản hồi tối đa (giờ)" value={asText(draft.cfg.sla)} onChange={(value) => onCfg("sla", value)} />
          <label className="flex flex-col gap-1 text-sm">
            Tần suất cập nhật dữ liệu
            <SelectField
              value={asText(draft.cfg.freq)}
              options={["1 phút", "5 phút", "15 phút"].map((item) => ({ value: item, label: item }))}
              onChange={(value) => onCfg("freq", value)}
            />
          </label>
          <TagLabel label="Đội xử lý (email)" values={asList(draft.cfg.team)} placeholder="pr@congty.vn" error={errors.team} onChange={(value) => onCfg("team", value)} />
        </>
      ) : null}
    </div>
  );
}

function TextLabel({
  label,
  value,
  placeholder,
  error,
  onChange,
}: {
  label: string;
  value: string;
  placeholder?: string;
  error?: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="flex flex-col gap-1 text-sm">
      {label}
      <Input
        value={value}
        placeholder={placeholder}
        aria-invalid={Boolean(error)}
        onChange={(event) => onChange(event.target.value)}
      />
      <FieldHint error={error} />
    </label>
  );
}

function TagLabel({
  label,
  values,
  placeholder,
  error,
  onChange,
}: {
  label: string;
  values: string[];
  placeholder?: string;
  error?: string;
  onChange: (values: string[]) => void;
}) {
  return (
    <label className="flex flex-col gap-1 text-sm">
      {label}
      <TagEditor values={values} placeholder={placeholder ?? "Thêm…"} onChange={onChange} />
      <FieldHint error={error} />
    </label>
  );
}

function AlertStep({
  typeName,
  draft,
  errors,
  onChange,
}: {
  typeName: string;
  draft: Draft;
  errors: Record<string, string>;
  onChange: (partial: Partial<Draft>) => void;
}) {
  return (
    <div className="flex flex-col gap-4">
      <div>
        <h2 className="text-base font-semibold">Cảnh báo & chia sẻ</h2>
        <p className="text-[13px] text-muted-foreground">
          Quy tắc được gợi ý theo kiểu case “{typeName}”.
        </p>
      </div>
      <div className="flex flex-col gap-2">
        {draft.rules.map((rule, index) => (
          <div key={rule.id} className="grid items-center gap-2 md:grid-cols-[1fr_120px_auto]">
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                className="accent-primary"
                checked={rule.on}
                onChange={() =>
                  onChange({
                    rules: draft.rules.map((item, itemIndex) =>
                      itemIndex === index ? { ...item, on: !item.on } : item,
                    ),
                  })
                }
              />
              {rule.label}
            </label>
            <Input
              type="number"
              min={0}
              value={rule.threshold}
              aria-label={`Ngưỡng cho ${rule.label}`}
              onChange={(event) =>
                onChange({
                  rules: draft.rules.map((item, itemIndex) =>
                    itemIndex === index
                      ? { ...item, threshold: Number(event.target.value) }
                      : item,
                  ),
                })
              }
            />
            <span className="text-xs text-muted-foreground">{rule.unit}</span>
          </div>
        ))}
      </div>
      <div className="flex flex-col gap-1 text-sm">
        Gửi cảnh báo qua
        <CheckGrid
          options={["Email", "Zalo", "SMS", "Slack"]}
          values={draft.via}
          onChange={(via) => onChange({ via })}
        />
        <FieldHint error={errors.via} />
      </div>
      <TagLabel label="Người nhận cảnh báo" values={draft.to} placeholder="email@congty.vn" error={errors.to} onChange={(to) => onChange({ to })} />
      <label className="flex flex-col gap-1 text-sm">
        Báo cáo AI định kỳ
        <SelectField
          value={draft.digest}
          options={[
            { value: "none", label: "Không gửi" },
            { value: "daily", label: "Hằng ngày, 8:00" },
            { value: "weekly", label: "Thứ Hai hằng tuần, 8:00" },
            { value: "monthly", label: "Ngày 1 hằng tháng" },
          ]}
          onChange={(digest) => onChange({ digest })}
        />
      </label>
      <div className="flex flex-col gap-2">
        <h3 className="text-sm font-semibold">Thành viên và vai trò</h3>
        {draft.members.map((member, index) => (
          <div key={index} className="grid gap-2 md:grid-cols-[1fr_180px_auto]">
            <Input
              type="email"
              value={member.email}
              placeholder="Email"
              onChange={(event) =>
                onChange({
                  members: draft.members.map((item, itemIndex) =>
                    itemIndex === index ? { ...item, email: event.target.value } : item,
                  ),
                })
              }
            />
            <SelectField
              value={member.role}
              options={["Quản trị", "Biên tập", "Chỉ xem"].map((item) => ({ value: item, label: item }))}
              onChange={(role) =>
                onChange({
                  members: draft.members.map((item, itemIndex) =>
                    itemIndex === index ? { ...item, role } : item,
                  ),
                })
              }
            />
            <Button
              type="button"
              variant="outline"
              onClick={() =>
                onChange({ members: draft.members.filter((_, itemIndex) => itemIndex !== index) })
              }
            >
              Xóa
            </Button>
          </div>
        ))}
        <Button
          type="button"
          variant="outline"
          onClick={() => onChange({ members: [...draft.members, { email: "", role: "Chỉ xem" }] })}
        >
          Thêm thành viên
        </Button>
        <FieldHint error={errors.members} hint="Quản trị sửa cài đặt. Biên tập gắn nhãn và xử lý cảnh báo. Chỉ xem xem dashboard và báo cáo." />
      </div>
    </div>
  );
}

function ReviewStep({ draft, typeName }: { draft: Draft; typeName: string }) {
  const datasets = CREATE_DATASETS.filter((item) => draft.topicIds.includes(item.id));
  const rows = [
    ["Kiểu case", typeName],
    ["Tên dự án", draft.name],
    ["Mô tả", draft.desc || "—"],
    ["Thương hiệu, dự án chính", draft.brand],
    ["Người phụ trách", draft.owner],
    ["Thời gian", draft.mode === "range" ? `${draft.start} – ${draft.end}` : "Liên tục"],
    ["Bộ dữ liệu", datasets.map((item) => item.name).join(", ")],
    ["Kênh", draft.channels.join(", ")],
    ["Báo cáo AI", { none: "Không gửi", daily: "Hằng ngày, 8:00", weekly: "Thứ Hai hằng tuần, 8:00", monthly: "Ngày 1 hằng tháng" }[draft.digest]],
    ["Thành viên", draft.members.map((member) => `${member.email} · ${member.role}`).join("; ")],
  ];

  return (
    <div>
      <h2 className="text-base font-semibold">Xem lại</h2>
      <p className="mb-3 text-[13px] text-muted-foreground">
        Kiểm tra lại cấu hình trước khi tạo dự án. Dashboard sẽ dùng số liệu minh họa của kiểu case này.
      </p>
      <dl className="flex flex-col">
        {rows.map(([label, value]) => (
          <div key={label} className="grid gap-1 border-b border-border py-2 text-sm md:grid-cols-[220px_1fr]">
            <dt className="text-muted-foreground">{label}</dt>
            <dd>{value}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
