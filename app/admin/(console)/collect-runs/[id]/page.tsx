import { AdminCollectRunDetailPage } from "@/components/admin/admin-collect-run-detail-page";

export default async function AdminCollectRunDetailRoute({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <AdminCollectRunDetailPage id={id} />;
}
