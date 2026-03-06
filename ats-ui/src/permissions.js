const PERMISSION_ALIASES = {
  "users.view": ["users.view", "user:view"],
  "users.create": ["users.create", "user:create"],
  "users.edit": ["users.edit", "user:edit"],
  "users.delete": ["users.delete", "user:delete"],
  "settings.view": ["settings.view", "settings:view"],
  "settings.edit": ["settings.edit", "settings:edit"],
  "job:view": ["job:view", "jobs.view"],
  "job:create": ["job:create", "jobs.create"],
  "job:edit": ["job:edit", "jobs.edit"],
  "job:close": ["job:close", "jobs.close"],
  "job:delete": ["job:delete", "jobs.delete"],
  "candidate:view": ["candidate:view", "candidates.view"],
  "candidate:add": ["candidate:add", "candidates.add"],
  "candidate:edit": ["candidate:edit", "candidates.edit"],
  "candidate:move": ["candidate:move", "candidates.move_stage"],
  "candidate:delete": ["candidate:delete", "candidates.delete"],
  "comments:add": ["comments:add", "comments.create"],
  "comments:private:view": ["comments:private:view", "comments.view_private"],
};

export function hasPermission(user, permission) {
  if (!user || !permission) return false;
  if (user.is_admin === true) return true;
  const permissions = Array.isArray(user.permissions) ? user.permissions : [];
  if (permissions.includes("*")) return true;
  const accepted = PERMISSION_ALIASES[permission] || [permission];
  if (accepted.some((p) => permissions.includes(p))) return true;

  if (permission.endsWith(":view")) {
    const [prefix] = permission.split(":");
    if (permissions.includes(`${prefix}:*`)) return true;
  }
  if (permission.endsWith(".view")) {
    const [prefix] = permission.split(".");
    if (permissions.includes(`${prefix}.*`)) return true;
  }
  return false;
}

export function can(permission, user) {
  return hasPermission(user, permission);
}
