import { Suspense } from "react";

import { ResearchCreateRoutePage } from "@/components/research/research-route-pages";

type PageProps = {
  params: Promise<{ workspaceIndex: string }>;
};

export default async function NewResearchPage({ params }: PageProps) {
  const { workspaceIndex } = await params;

  return (
    <Suspense fallback={null}>
      <ResearchCreateRoutePage workspaceIndexParam={workspaceIndex} />
    </Suspense>
  );
}
