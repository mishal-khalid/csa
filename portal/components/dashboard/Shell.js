"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { holdLoading } from "@/components/loader/ready";
import { api } from "@/lib/api";
import { AccountUpdateContext, SessionContext, initials } from "@/lib/session";
import { CloseIcon, LogOutIcon, MenuIcon } from "./icons";
import { Bar } from "./skeletons";
import { skeletonFor, tabsFor } from "./tabs";

// the insignia and the CSA wordmark, as in the main site's nav
function Logo() {
  return (
    <Link href="/" aria-label="CSA Portal, home" className="flex h-12 items-center gap-1 rounded-full px-1">
      <Image src="/brand/csa-insignia-black.png" alt="" width={34} height={36} preload className="h-9 w-auto" />
      <Image src="/brand/CSA_Wordmark_Black.svg" alt="" width={96} height={36} className="h-9 w-24" />
    </Link>
  );
}

// The sidebar's contents: the logo, the tabs, and the signed-in account with Log out at the foot.
function Sidebar({ account, onNavigate }) {
  const pathname = usePathname();
  const router = useRouter();

  async function logOut() {
    await api("/auth/logout", { body: {} }).catch(() => {});
    router.replace("/login");
  }

  return (
    <div className="flex h-full flex-col">
      <Logo />

      <nav aria-label="Portal" className="mt-10">
        <ul className="space-y-1">
          {tabsFor(account).map(({ href, label, Icon }) => {
            const current = pathname === href;
            return (
              <li key={href}>
                <Link
                  href={href}
                  onClick={onNavigate}
                  aria-current={current ? "page" : undefined}
                  className={`flex items-center gap-3 rounded-full px-4 py-2.5 text-[15px] font-medium transition-colors duration-300 ${
                    current ? "bg-ink text-white" : "text-ink/60 hover:bg-ink/[0.04] hover:text-ink"
                  }`}
                >
                  <Icon className="size-5" />
                  {label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      <div className="mt-auto space-y-2">
        <div className="flex items-center gap-3 rounded-[20px] bg-white/70 p-3 ring-1 ring-black/5">
          <span className="grid size-10 shrink-0 place-items-center rounded-full bg-ink text-sm font-medium text-white">
            {initials(account.name)}
          </span>
          <div className="min-w-0">
            <p className="truncate text-sm font-medium">{account.name}</p>
            <p className="truncate text-[13px] text-ink/50">{account.email}</p>
          </div>
        </div>
        <button
          type="button"
          onClick={logOut}
          className="flex w-full items-center gap-3 rounded-full px-4 py-2.5 text-[15px] font-medium text-ink/60 transition-colors duration-300 hover:bg-ink/[0.04] hover:text-ink"
        >
          <LogOutIcon className="size-5" />
          Log out
        </button>
      </div>
    </div>
  );
}

// the sidebar while the session is checked: the logo, then grey blocks for the tabs and account
function SidebarSkeleton() {
  return (
    <div className="flex h-full flex-col">
      <Logo />
      <div className="mt-10 space-y-1">
        {["w-16", "w-14", "w-24"].map((width) => (
          <div key={width} className="flex items-center gap-3 px-4 py-3">
            <Bar className="size-5 rounded-md" />
            <Bar className={`h-3.5 ${width}`} />
          </div>
        ))}
      </div>
      <div className="mt-auto space-y-2">
        <div className="flex items-center gap-3 rounded-[20px] bg-white/70 p-3 ring-1 ring-black/5">
          <Bar className="size-10 shrink-0" />
          <div className="min-w-0 flex-1">
            <Bar className="h-3.5 w-28" />
            <Bar className="mt-2 h-3 w-32" />
          </div>
        </div>
        <div className="flex items-center gap-3 px-4 py-3">
          <Bar className="size-5 rounded-md" />
          <Bar className="h-3.5 w-14" />
        </div>
      </div>
    </div>
  );
}

const glass = "border border-black/[0.06] bg-white/70 shadow-[0_1px_2px_rgba(11,11,12,0.04)] backdrop-blur-xl";

// The portal's frame for signed-in pages: a glass sidebar on the left (on phones, a top bar whose
// menu opens it over the page), and the current tab beside it. It checks the session first; anyone
// not signed in goes to the login page. Until that's settled, the sidebar and the tab show their
// skeletons. (Arriving from the login page, the loading screen covers all this instead, until the
// tab and its images are in.)
export default function Shell({ children }) {
  const router = useRouter();
  const pathname = usePathname();
  const [account, setAccount] = useState(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const release = useRef(null);
  const updateAccount = useCallback((changes) => setAccount((current) => ({ ...current, ...changes })), []);

  useLayoutEffect(() => {
    release.current = holdLoading();
    return () => release.current();
  }, []);

  // the account's pages (and their images) are on the page now
  useLayoutEffect(() => {
    if (account) release.current?.();
  }, [account]);

  useEffect(() => {
    let live = true;
    api("/auth/me").then(
      ({ data }) => {
        if (!live) return;
        if (data?.user) setAccount(data.user);
        else {
          release.current?.();
          router.replace("/login");
        }
      },
      () => {
        release.current?.();
        router.replace("/login");
      },
    );
    return () => {
      live = false;
    };
  }, [router]);

  return (
    <SessionContext.Provider value={account}>
      <AccountUpdateContext.Provider value={updateAccount}>
      <div className="min-h-svh bg-neutral-100 text-ink">
        {/* desktop: the sidebar, floating over the page's left edge */}
        <aside className={`fixed inset-y-4 left-4 z-30 hidden w-64 rounded-[28px] p-4 lg:block ${glass}`}>
          {account ? <Sidebar account={account} /> : <SidebarSkeleton />}
        </aside>

        {/* phones and tablets: a top bar, with the sidebar's contents in a menu */}
        <header className={`sticky top-3 z-30 mx-3 mt-3 flex items-center justify-between rounded-full p-2 lg:hidden ${glass}`}>
          <Logo />
          <button
            type="button"
            onClick={() => setMenuOpen(true)}
            disabled={!account}
            aria-label="Open menu"
            aria-expanded={menuOpen}
            className="grid size-12 place-items-center rounded-full bg-white/70 ring-1 ring-black/5 disabled:opacity-40"
          >
            <MenuIcon className="size-5" />
          </button>
        </header>
        {menuOpen && account && (
          <div role="dialog" aria-modal="true" aria-label="Menu" className="fixed inset-0 z-50 bg-white/85 p-4 backdrop-blur-2xl lg:hidden">
            <button
              type="button"
              onClick={() => setMenuOpen(false)}
              aria-label="Close menu"
              className="absolute right-4 top-4 grid size-12 place-items-center rounded-full bg-white/70 ring-1 ring-black/5"
            >
              <CloseIcon className="size-5" />
            </button>
            <Sidebar account={account} onNavigate={() => setMenuOpen(false)} />
          </div>
        )}

        <main className="px-4 pb-12 pt-8 sm:px-6 lg:pl-[18rem] lg:pr-8 lg:pt-12">
          <div className="mx-auto max-w-5xl">{account ? children : skeletonFor(pathname)}</div>
        </main>
      </div>
      </AccountUpdateContext.Provider>
    </SessionContext.Provider>
  );
}
