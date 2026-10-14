import { AdminPersonaFormPage } from "@/components/admin/admin-persona-form-page";

export default async function AdminPersonaRoute({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <AdminPersonaFormPage id={id} />;
}
