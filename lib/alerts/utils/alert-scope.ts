import type { StoredAlertScope } from "./parse-stored-alert-rule";

export type AlertScopeTarget = {
  dedupeKey: string;
  label: string;
  entityId: string | null;
  aspectId: string | null;
};

type EntityRef = { id: string; name: string; role: string };
type AspectRef = { id: string; name: string };

/** One evaluation per entity when the rule says `each_role`. A missing id is skipped. */
export function alertScopeTargets(
  scope: StoredAlertScope,
  entities: EntityRef[],
  aspects: AspectRef[],
): AlertScopeTarget[] {
  if (scope.type === "project") {
    return [{ dedupeKey: "project", label: "Toàn project", entityId: null, aspectId: null }];
  }
  if (scope.type === "entity") {
    const entity = entities.find((item) => item.id === scope.entityId);
    if (!entity) return [];
    return [{ dedupeKey: entity.id, label: entity.name, entityId: entity.id, aspectId: null }];
  }
  if (scope.type === "aspect") {
    const aspect = aspects.find((item) => item.id === scope.aspectId);
    if (!aspect) return [];
    return [{ dedupeKey: aspect.id, label: aspect.name, entityId: null, aspectId: aspect.id }];
  }
  return entities
    .filter((entity) => entity.role === scope.role)
    .map((entity) => ({
      dedupeKey: entity.id,
      label: entity.name,
      entityId: entity.id,
      aspectId: null,
    }));
}

export function alertScopeSummary(
  scope: StoredAlertScope,
  entities: EntityRef[],
  aspects: AspectRef[],
  roleLabel: (role: string) => string,
) {
  if (scope.type === "project") return "Toàn project";
  if (scope.type === "entity") {
    return entities.find((item) => item.id === scope.entityId)?.name ?? "Đối tượng đã xóa";
  }
  if (scope.type === "aspect") {
    return aspects.find((item) => item.id === scope.aspectId)?.name ?? "Khía cạnh đã xóa";
  }
  return `Từng mục: ${roleLabel(scope.role).toLowerCase()}`;
}
