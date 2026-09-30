export type DashboardDailyIngestionPoint = {
  dateKey: string;
  docCount: number;
};

export type GetDashboardOverviewResult = {
  totalDocuments: number;
  totalDataSources: number;
  newDocumentsLast30Days: number;
  dailyIngestion: DashboardDailyIngestionPoint[];
};
