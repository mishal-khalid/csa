"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { holdLoading } from "@/components/loader/ready";
import { api } from "@/lib/api";
import { emailProblem, nameProblem, normalise, usernameProblem } from "@/lib/rules";
import { useAccount, useUpdateAccount } from "@/lib/session";
import { PlusIcon, TrashIcon } from "../dashboard/icons";
import { UsersSkeleton } from "../dashboard/skeletons";
import { PasswordCell, RoleCell, saveProblem, TextCell } from "./cells";
import CreateUserModal from "./CreateUserModal";
import DeleteUserModal from "./DeleteUserModal";

// in the table it sits under the name; on the cards, beside it
function MainTag() {
  return (
    <span className="mt-1 inline-block shrink-0 whitespace-nowrap rounded-full bg-ink/[0.06] px-2 py-0.5 text-[12px] font-medium text-ink/70">
      Main account
    </span>
  );
}

// The User Management tab, for admins: every account, edited in place (a table on wider screens,
// a card per account on phones), with Create user and Delete. What each admin may do follows the
// API's rules: the main account is changed or shown only by itself and can't be deleted, and no
// one changes their own role or deletes their own account.
export default function UserManagement() {
  const me = useAccount();
  const updateAccount = useUpdateAccount();
  const router = useRouter();
  const [users, setUsers] = useState(null);
  const [failed, setFailed] = useState(false);
  const [creating, setCreating] = useState(false);
  const [deleting, setDeleting] = useState(null);
  const release = useRef(null);

  // the loading screen stays up until the accounts are in
  useLayoutEffect(() => {
    release.current = holdLoading();
    return () => release.current();
  }, []);
  useLayoutEffect(() => {
    if (users || failed) release.current?.();
  }, [users, failed]);

  const expired = useCallback(() => router.replace("/login"), [router]);

  const load = useCallback(
    () =>
      api("/users").then(
        ({ status, data }) => {
          if (status === 200) {
            setUsers(data.users);
            setFailed(false);
          } else if (status === 401) expired();
          else if (status === 403) router.replace("/");
          else setFailed(true);
        },
        () => setFailed(true),
      ),
    [expired, router],
  );

  useEffect(() => {
    if (me.role !== "ADMIN") {
      release.current?.();
      router.replace("/");
      return;
    }
    load();
  }, [me.role, load, router]);

  // saves one field of an account; resolves with what went wrong, or null
  async function change(user, field, value) {
    try {
      const result = await api(`/users/${user.id}`, { method: "PATCH", body: { [field]: value } });
      if (result.status === 401) {
        expired();
        return "Your session has ended.";
      }
      const problem = saveProblem(result);
      if (problem) return problem;
      const saved = result.data.user;
      setUsers((current) => current.map((u) => (u.id === saved.id ? saved : u)));
      if (saved.id === me.id) updateAccount({ name: saved.name, username: saved.username, email: saved.email });
      return null;
    } catch {
      return "Couldn’t reach the portal. Try again.";
    }
  }

  // fetches an account's password to show it
  async function reveal(user) {
    try {
      const result = await api(`/users/${user.id}/password`, { body: {} });
      if (result.status === 200) return { password: result.data.password };
      if (result.status === 401) {
        expired();
        return { problem: "Your session has ended." };
      }
      const problems = {
        main_account: "Only the main account can see this.",
        not_stored: "This password isn’t stored. Set a new one.",
        unreadable: "This password can’t be shown. Set a new one.",
      };
      return {
        problem: problems[result.data?.code] ?? (result.status === 429 ? "Too many views. Try again in a minute." : "Couldn’t show it. Try again."),
      };
    } catch {
      return { problem: "Couldn’t reach the portal. Try again." };
    }
  }

  // each account's cells, for the table and the cards alike
  function cellsFor(user) {
    const self = user.id === me.id;
    const editable = !user.main || self;
    const canRemove = !user.main && !self;
    return {
      // a long name runs onto a second line rather than being cut short
      name: <TextCell value={user.name} label="Name" editable={editable} wrap problem={nameProblem} save={(v) => change(user, "name", v)} />,
      username: (
        <TextCell
          value={user.username}
          label="Username"
          editable={editable}
          problem={(v) => usernameProblem(v, users, user.id)}
          normalise={normalise}
          save={(v) => change(user, "username", v)}
        />
      ),
      email: (
        <TextCell
          value={user.email}
          label="Email"
          editable={editable}
          inputMode="email"
          problem={(v) => emailProblem(v, users, user.id)}
          normalise={normalise}
          save={(v) => change(user, "email", v)}
        />
      ),
      password: <PasswordCell user={user} canView={editable} editable={editable} reveal={() => reveal(user)} save={(v) => change(user, "password", v)} />,
      role: (
        <RoleCell
          value={user.role}
          editable={editable && !user.main && !self}
          lockedReason={user.main ? "The main account is always an admin." : self ? "You can’t change your own role." : undefined}
          save={(v) => change(user, "role", v)}
        />
      ),
      remove: canRemove && (
        <button
          type="button"
          onClick={() => setDeleting(user)}
          aria-label={`Delete ${user.name}`}
          className="grid size-8 place-items-center rounded-full text-ink/40 transition-colors duration-200 hover:bg-maroon/[0.08] hover:text-maroon"
        >
          <TrashIcon className="size-[18px]" />
        </button>
      ),
    };
  }

  if (!users) {
    if (!failed) return <UsersSkeleton />;
    return (
      <div className="rounded-[28px] bg-white p-8 ring-1 ring-black/5">
        <p className="text-[15px]">Couldn’t load the accounts.</p>
        <button type="button" onClick={load} className="mt-4 h-10 rounded-full bg-ink px-5 text-sm font-medium text-white hover:bg-ink/85">
          Try again
        </button>
      </div>
    );
  }

  const rows = users.map((user) => ({ user, cells: cellsFor(user) }));

  return (
    <div className="space-y-10">
      <header className="flex flex-wrap items-end justify-between gap-x-6 gap-y-5">
        <div>
          <p className="text-sm text-ink/50">
            {users.length} account{users.length === 1 ? "" : "s"}
          </p>
          <h1 className="mt-2 font-serif text-5xl font-semibold leading-[1.05] tracking-tight sm:text-6xl">User Management</h1>
        </div>
        <button
          type="button"
          onClick={() => setCreating(true)}
          className="flex h-12 items-center gap-2 rounded-full bg-ink pl-4 pr-5 text-[15px] font-medium text-white transition-colors duration-300 ease-soft hover:bg-ink/85 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
        >
          <PlusIcon className="size-5" />
          Create user
        </button>
      </header>

      {/* wider screens: the table */}
      <div className="hidden overflow-x-auto rounded-[28px] bg-white ring-1 ring-black/5 lg:block">
        <table className="w-full min-w-[46rem] table-fixed text-[15px]">
          <colgroup>
            <col className="w-16" />
            <col />
            <col className="w-[17%]" />
            <col className="w-[24%]" />
            <col className="w-[18%]" />
            <col className="w-28" />
            <col className="w-14" />
          </colgroup>
          <thead>
            <tr className="text-left text-[13px] text-ink/50">
              <th scope="col" className="py-4 pl-6 pr-3 font-normal">
                #
              </th>
              {["Name", "Username", "Email", "Password", "Role"].map((heading) => (
                <th key={heading} scope="col" className="px-3 py-4 font-normal">
                  {heading}
                </th>
              ))}
              <th scope="col" className="py-4 pr-4">
                <span className="sr-only">Delete</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map(({ user, cells }) => (
              <tr key={user.id} className="border-t border-ink/10 align-top">
                <td className="py-3 pl-6 pr-3 tabular-nums text-ink/40">
                  <span className="block py-1">{user.number}</span>
                </td>
                <td className="px-3 py-3">
                  {cells.name}
                  {user.main && <MainTag />}
                </td>
                <td className="px-3 py-3">{cells.username}</td>
                <td className="px-3 py-3">{cells.email}</td>
                <td className="px-3 py-3">{cells.password}</td>
                <td className="px-3 py-3">{cells.role}</td>
                <td className="py-3 pr-4">
                  <div className="flex justify-end">{cells.remove}</div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* phones and tablets: a card per account */}
      <ul className="space-y-3 lg:hidden">
        {rows.map(({ user, cells }) => (
          <li key={user.id} className="rounded-[24px] bg-white p-5 ring-1 ring-black/5">
            <div className="flex items-start gap-3">
              <span className="py-1 text-[13px] leading-6 tabular-nums text-ink/40">#{user.number}</span>
              <div className="min-w-0 flex-1 text-[17px] font-medium">{cells.name}</div>
              {user.main && <MainTag />}
              {cells.remove}
            </div>
            <dl className="mt-3 space-y-2 border-t border-ink/10 pt-3 text-[15px]">
              {[
                ["Username", cells.username],
                ["Email", cells.email],
                ["Password", cells.password],
                ["Role", cells.role],
              ].map(([term, cell]) => (
                <div key={term} className="grid grid-cols-[5.5rem_minmax(0,1fr)] items-start gap-3">
                  <dt className="py-1 text-[13px] leading-6 text-ink/50">{term}</dt>
                  <dd className="min-w-0">{cell}</dd>
                </div>
              ))}
            </dl>
          </li>
        ))}
      </ul>

      {creating && (
        <CreateUserModal
          users={users}
          onExpired={expired}
          onClose={() => setCreating(false)}
          onCreated={(user) => {
            setUsers((current) => [...current, user].sort((a, b) => a.number - b.number));
            setCreating(false);
          }}
        />
      )}
      {deleting && (
        <DeleteUserModal
          user={deleting}
          onExpired={expired}
          onClose={() => setDeleting(null)}
          onDeleted={(user) => {
            setUsers((current) => current.filter((u) => u.id !== user.id));
            setDeleting(null);
          }}
        />
      )}
    </div>
  );
}
