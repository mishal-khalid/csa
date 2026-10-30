import UserManagement from "@/components/users/UserManagement";

export const metadata = { title: "User Management" };

// The User Management tab (admins only): every account, created, edited and deleted in place.
export default function UsersPage() {
  return <UserManagement />;
}
