import type { z } from "zod";

/** One editable value of a settings group, as the admin form renders it. */
export type SettingField = {
  /** Dotted path inside the group value, e.g. `intervalHours.hot`. */
  path: string;
  label: string;
  description?: string;
  /** Shown after the value, e.g. `h` or `posts/day`. */
  unit?: string;
  /** `number-list` is edited as comma-separated numbers. */
  kind: "number" | "number-list";
};

/**
 * A group of app-wide settings stored as one `app_settings` row. The schema
 * validates both the stored override and the admin's edit; without a row the
 * group uses `defaultValue`. Must stay importable from client components.
 */
export type SettingDefinition<S extends z.ZodType = z.ZodType> = {
  label: string;
  description: string;
  schema: S;
  defaultValue: z.infer<S>;
  fields: SettingField[];
};

export type AdminSettingGroup = {
  key: string;
  /** The value in use: the override when there is a valid one, else the default. */
  value: Record<string, unknown>;
  defaultValue: Record<string, unknown>;
  isDefault: boolean;
  updatedAt: string | null;
  updatedBy: { id: string; email: string; displayName: string | null } | null;
};

export type ListSettingsResult = {
  items: AdminSettingGroup[];
};
