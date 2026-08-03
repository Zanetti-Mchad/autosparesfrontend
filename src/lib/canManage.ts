import { getRole } from "@/lib/data";

export function currentUserId() {
  if (typeof window === "undefined") return "";
  const direct = localStorage.getItem("userId");
  if (direct) return String(direct);
  try {
    const raw = localStorage.getItem("user");
    if (!raw) return "";
    const user = JSON.parse(raw);
    return String(user?.id || user?._id || "");
  } catch {
    return "";
  }
}

export function isAdminRole() {
  const role = String(getRole() || "").toLowerCase();
  return role === "admin" || role.includes("admin");
}

/** Admin or the user who created the record. */
export function canManageRecord(createdById?: string | null) {
  if (isAdminRole()) return true;
  const uid = currentUserId();
  const creator = createdById != null ? String(createdById) : "";
  return Boolean(uid && creator && creator === uid);
}

export const MANAGE_DENIED_REMARK =
  "Only an admin or the creator can edit or delete this record";
