import { AdminSourceDetailPage } from "@/components/admin/admin-source-detail-page";

export default async function AdminSourceDetailRoute({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <AdminSourceDetailPage id={id} />;
}
