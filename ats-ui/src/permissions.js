export function hasPermission(user, permission) {
  if (!user || !permission) return false;
  if (user.is_admin === true) return true;
  const permissions = Array.isArray(user.permissions) ? user.permissions : [];
  return permissions.includes(permission);
}

export function can(permission, user) {
  return hasPermission(user, permission);
}
