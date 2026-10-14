import { AdminPanelFormPage } from "@/components/admin/admin-panel-form-page";

export default async function AdminPanelRoute({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <AdminPanelFormPage id={id} />;
}
