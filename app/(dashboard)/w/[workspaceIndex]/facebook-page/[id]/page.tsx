import { JobMenuEditRoutePage } from "@/components/jobs/job-menu-route-pages";

type PageProps = {
  params: Promise<{ workspaceIndex: string; id: string }>;
};

export default async function EditFacebookPageJobPage({ params }: PageProps) {
  const { workspaceIndex, id } = await params;

  return (
    <JobMenuEditRoutePage
      jobMenuKey="facebook-page"
      workspaceIndexParam={workspaceIndex}
      jobId={id}
    />
  );
}
