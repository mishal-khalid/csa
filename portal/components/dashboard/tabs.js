import { DirectoryIcon, FingerprintIcon, HomeIcon, UsersIcon } from "./icons";
import { DirectorySkeleton, FingerprintsSkeleton, HomeSkeleton, UsersSkeleton } from "./skeletons";

// The portal's tabs, in sidebar order. New tabs are added here, with a page under app/(dashboard).
// A tab with `roles` shows only to accounts with one of them, and one marked `main` only to the
// main account (the API checks again). `Skeleton` stands in for the tab while it loads.
export const tabs = [
  { href: "/", label: "Home", Icon: HomeIcon, Skeleton: HomeSkeleton },
  { href: "/directory", label: "Directory", Icon: DirectoryIcon, Skeleton: DirectorySkeleton },
  { href: "/users", label: "Users", Icon: UsersIcon, roles: ["ADMIN"], Skeleton: UsersSkeleton },
  { href: "/fingerprints", label: "Fingerprints", Icon: FingerprintIcon, main: true, Skeleton: FingerprintsSkeleton },
];

export const tabsFor = (account) =>
  tabs.filter((tab) => (!tab.roles || tab.roles.includes(account.role)) && (!tab.main || account.main));

// the skeleton for a page's address (Home's for any other)
export function skeletonFor(pathname) {
  const Skeleton = tabs.find((tab) => tab.href === pathname)?.Skeleton ?? HomeSkeleton;
  return <Skeleton />;
}
