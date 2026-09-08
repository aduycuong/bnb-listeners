import { TopicDetailRoutePage } from "@/components/topics/topic-route-pages";

type PageProps = {
  params: Promise<{ workspaceIndex: string; topicId: string }>;
};

export default async function TopicDetailPageRoute({ params }: PageProps) {
  const { workspaceIndex, topicId } = await params;

  return (
    <TopicDetailRoutePage
      workspaceIndexParam={workspaceIndex}
      topicId={topicId}
    />
  );
}
