import { JobMenuListRoutePage } from "@/components/jobs/job-menu-route-pages";

type PageProps = {
  params: Promise<{ workspaceIndex: string }>;
};

export default async function WebsiteJobsPage({ params }: PageProps) {
  const { workspaceIndex } = await params;

  return (
    <JobMenuListRoutePage
      jobMenuKey="website"
      workspaceIndexParam={workspaceIndex}
    />
  );
}
