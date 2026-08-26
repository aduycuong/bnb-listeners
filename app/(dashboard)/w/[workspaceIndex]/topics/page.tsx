import { TopicListRoutePage } from "@/components/topics/topic-route-pages";

type PageProps = {
  params: Promise<{ workspaceIndex: string }>;
};

export default async function TopicsPage({ params }: PageProps) {
  const { workspaceIndex } = await params;

  return <TopicListRoutePage workspaceIndexParam={workspaceIndex} />;
}
