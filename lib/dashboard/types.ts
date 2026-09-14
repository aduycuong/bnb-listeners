export type DashboardDailyIngestionPoint = {
  dateKey: string;
  docCount: number;
};

export type GetDashboardOverviewResult = {
  totalDocuments: number;
  totalJobs: number;
  newDocumentsLast30Days: number;
  dailyIngestion: DashboardDailyIngestionPoint[];
};

export type DashboardTermGroupTopTerm = {
  id: string;
  name: string;
  docCount: number;
  trendScore: number | null;
};

export type DashboardTermGroupItem = {
  id: string;
  name: string;
  description: string | null;
  memberCount: number;
  topTerms: DashboardTermGroupTopTerm[];
};

export type GetDashboardTermGroupsResult = {
  groups: DashboardTermGroupItem[];
  period: {
    startDate: string;
    endDate: string;
  };
};
