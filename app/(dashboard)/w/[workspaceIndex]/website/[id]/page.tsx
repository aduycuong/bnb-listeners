import { JobMenuEditRoutePage } from "@/components/jobs/job-menu-route-pages";

type PageProps = {
  params: Promise<{ workspaceIndex: string; id: string }>;
};

export default async function EditWebsiteJobPage({ params }: PageProps) {
  const { workspaceIndex, id } = await params;

  return (
    <JobMenuEditRoutePage
      jobMenuKey="website"
      workspaceIndexParam={workspaceIndex}
      jobId={id}
    />
  );
}
