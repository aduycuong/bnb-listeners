import { AdminContentItemDetailPage } from "@/components/admin/admin-content-item-detail-page";

export default async function AdminContentItemDetailRoute({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <AdminContentItemDetailPage id={id} />;
}
