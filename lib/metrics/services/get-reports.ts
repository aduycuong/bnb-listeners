import { REPORT_REGISTRY } from "../report-registry";
import { REPORT_PARAMS_SCHEMAS } from "../schema";
import type {
  GetReportsParams,
  GetReportsResult,
  ReportKey,
  ReportRequest,
  ReportResult,
} from "../types";
import { getReportContext } from "./get-report-context";

/**
 * The reports of a page for one period: the context (period, case, subject, enrichers) is
 * resolved once, then every report runs in parallel. Results keep the order of the request;
 * a report the project has no numbers for comes back with its availability and no data.
 */
export async function getReports<const R extends readonly ReportRequest[]>(
  params: GetReportsParams & { reports: R },
): Promise<GetReportsResult<R>> {
  const ctx = await getReportContext({ projectId: params.projectId, period: params.period });
  const reports = await Promise.all(params.reports.map((request) => runReport(ctx, request)));

  return {
    period: ctx.window.info,
    timezone: ctx.window.timezone,
    subject: ctx.subject,
    reports: reports as GetReportsResult<R>["reports"],
  };
}

async function runReport<K extends ReportKey>(
  ctx: Parameters<(typeof REPORT_REGISTRY)[K]["load"]>[0],
  request: ReportRequest<K>,
): Promise<ReportResult<unknown>> {
  const definition = REPORT_REGISTRY[request.key];
  const availability = definition.available?.(ctx) ?? "ok";
  if (availability !== "ok") return { key: request.key, availability, data: null };
  const params = REPORT_PARAMS_SCHEMAS[request.key].parse(request.params ?? {});
  const data = await definition.load(ctx, params as never);
  return { key: request.key, availability, data };
}
