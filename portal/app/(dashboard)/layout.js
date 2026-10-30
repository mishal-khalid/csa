import Shell from "@/components/dashboard/Shell";

// Every signed-in page of the portal sits in the dashboard shell (sidebar and session check). The
// (dashboard) folder is a route group, so it doesn't appear in the address; the login page sits
// outside it.
export default function DashboardLayout({ children }) {
  return <Shell>{children}</Shell>;
}
