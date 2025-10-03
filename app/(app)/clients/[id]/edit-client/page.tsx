// app/(app)/clients/[id]/edit-client/page.tsx
import { createClient } from "@/lib/supabase/server";
import EditClientOverlay from "./EditClientOverlay";

type ClientFull = {
  id: string;
  name: string;
  charged_by: "second" | "minute" | "hour" | "project";
  rate: number;
  contact_name: string | null;
  designation: string | null;
  email: string | null;
  phone: string | null;
  note: string | null;
  created_at: string; // timestamptz ISO string
};

export default async function EditClientPage({
  params,
}: {
  // IMPORTANT: Next 15+ requires awaiting params
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("clients")
    .select(
      "id,name,charged_by,rate,contact_name,designation,email,phone,note,created_at"
    )
    .eq("id", id)
    .single<ClientFull>();

  if (error || !data) {
    return (
      <div className="p-6">
        <p className="text-red-600">{error?.message || "Client not found."}</p>
        <a href="/clients" className="text-blue-600 underline">
          Back to clients
        </a>
      </div>
    );
  }

  return <EditClientOverlay client={data} backHref="/clients" />;
}
