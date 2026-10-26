import { SETTINGS, type SettingKey, type SettingValue } from "../registry";

type ResolvedSetting<K extends SettingKey> = {
  value: SettingValue<K>;
  defaultValue: SettingValue<K>;
  isDefault: boolean;
};

/**
 * The value of a group in use: the stored override when it still passes the
 * group's schema, else the default (a schema change can make an old row
 * invalid; it is ignored, not an error). Values go through the schema so key
 * order is stable and `isDefault` can compare them as JSON.
 */
export function resolveSettingValue<K extends SettingKey>(
  key: K,
  stored: unknown,
): ResolvedSetting<K> {
  const { schema, defaultValue } = SETTINGS[key];
  const normalizedDefault = schema.parse(defaultValue) as SettingValue<K>;

  if (stored === undefined) {
    return { value: normalizedDefault, defaultValue: normalizedDefault, isDefault: true };
  }

  const parsed = schema.safeParse(stored);
  if (!parsed.success) {
    console.warn(`[settings] stored "${key}" no longer matches its schema; using the default`, {
      issues: parsed.error.issues,
    });
    return { value: normalizedDefault, defaultValue: normalizedDefault, isDefault: true };
  }

  const value = parsed.data as SettingValue<K>;
  return {
    value,
    defaultValue: normalizedDefault,
    isDefault: JSON.stringify(value) === JSON.stringify(normalizedDefault),
  };
}
