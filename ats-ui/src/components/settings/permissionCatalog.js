export const PERMISSION_GROUPS = [
  {
    title: "Candidate Permissions",
    items: [
      { key: "candidate:view", label: "View candidates" },
      { key: "candidate:add", label: "Add candidates" },
      { key: "candidate:edit", label: "Edit candidates" },
      { key: "candidate:move", label: "Move candidates between stages" },
      { key: "candidate:delete", label: "Delete candidates" },
    ],
  },
  {
    title: "Job Permissions",
    items: [
      { key: "job:view", label: "View jobs" },
      { key: "job:create", label: "Create jobs" },
      { key: "job:edit", label: "Edit jobs" },
      { key: "job:close", label: "Close jobs" },
      { key: "job:delete", label: "Delete jobs" },
    ],
  },
  {
    title: "User Management",
    items: [
      { key: "users.view", label: "View users" },
      { key: "users.create", label: "Create users" },
      { key: "users.edit", label: "Edit users" },
      { key: "users.delete", label: "Delete users" },
    ],
  },
  {
    title: "Comments & Activity",
    items: [
      { key: "comments:add", label: "Add comments" },
      { key: "comments:private:view", label: "View private comments" },
    ],
  },
  {
    title: "System Settings",
    items: [
      { key: "settings:view", label: "View settings" },
      { key: "settings.edit", label: "Edit settings" },
    ],
  },
];
