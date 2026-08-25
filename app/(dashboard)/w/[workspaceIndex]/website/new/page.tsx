import { JobMenuNewRoutePage } from "@/components/jobs/job-menu-route-pages";

type PageProps = {
  params: Promise<{ workspaceIndex: string }>;
};

export default async function NewWebsiteJobPage({ params }: PageProps) {
  const { workspaceIndex } = await params;

  return (
    <JobMenuNewRoutePage
      jobMenuKey="website"
      workspaceIndexParam={workspaceIndex}
    />
  );
}
