"use client";

import { api } from "@/lib/api";
import { normalise } from "@/lib/rules";
import TypedDeleteDialog from "../TypedDeleteDialog";
import { saveProblem } from "./cells";

// Deleting an account: the account's username has to be typed out before Delete works.
export default function DeleteUserModal({ user, onDeleted, onExpired, onClose }) {
  async function remove(typed) {
    try {
      const result = await api(`/users/${user.id}`, { method: "DELETE", body: { username: typed } });
      if (result.status === 204) {
        onDeleted(user);
        return null;
      }
      if (result.status === 401) {
        onExpired();
        return "Your session has ended.";
      }
      return result.data?.code === "confirm" ? "That isn’t this account’s username." : saveProblem(result);
    } catch {
      return "Couldn’t reach the portal. Check your connection and try again.";
    }
  }

  return (
    <TypedDeleteDialog
      title={`Delete ${user.name}?`}
      explanation={
        <>
          This can’t be undone. The account is removed and signed out everywhere. To confirm, type its username,{" "}
          <span className="font-medium text-ink">{user.username}</span>.
        </>
      }
      label="Username"
      matches={(typed) => normalise(typed) === user.username}
      remove={remove}
      button="Delete account"
      onClose={onClose}
    />
  );
}
