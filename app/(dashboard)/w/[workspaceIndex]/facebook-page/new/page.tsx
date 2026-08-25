import { JobMenuNewRoutePage } from "@/components/jobs/job-menu-route-pages";

type PageProps = {
  params: Promise<{ workspaceIndex: string }>;
};

export default async function NewFacebookPageJobPage({ params }: PageProps) {
  const { workspaceIndex } = await params;

  return (
    <JobMenuNewRoutePage
      jobMenuKey="facebook-page"
      workspaceIndexParam={workspaceIndex}
    />
  );
}
