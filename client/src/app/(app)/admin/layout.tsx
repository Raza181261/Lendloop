import { AdminGate } from "@/features/admin/components/AdminGate";
import { AdminNav } from "@/features/admin/components/AdminNav";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <AdminGate>
      <div className="space-y-6">
        <h1 className="text-2xl font-bold">Admin</h1>
        <AdminNav />
        {children}
      </div>
    </AdminGate>
  );
}