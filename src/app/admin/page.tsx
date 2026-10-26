import { AdminApp } from "@/components/AdminApp";
export const metadata = {
  title: "Yönetim",
  robots: { index: false, follow: false },
};
export default function AdminPage() {
  return <AdminApp />;
}
