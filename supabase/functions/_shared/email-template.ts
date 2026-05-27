export type TemplateVariables = Record<string, string | number | boolean | null | undefined>;

const normalizeTemplateKey = (key: string) =>
  key
    .trim()
    .replace(/^\.+/, "")
    .trim()
    .replace(/[\s._-]+/g, "")
    .toLowerCase();

export const replaceTemplateVars = (
  text: string | null | undefined,
  variables: TemplateVariables,
) => {
  if (!text) return "";

  const lookup = new Map<string, string>();

  for (const [key, value] of Object.entries(variables)) {
    if (value === null || value === undefined) continue;
    lookup.set(normalizeTemplateKey(key), String(value));
  }

  return text.replace(/\{\{\s*\.?\s*([^}]+?)\s*\}\}/g, (_match, rawKey: string) => {
    return lookup.get(normalizeTemplateKey(rawKey)) ?? "";
  });
};

export const getDisplayName = (
  profile?: { nickname?: unknown; full_name?: unknown } | null,
  user?: {
    email?: string | null;
    user_metadata?: Record<string, unknown> | null;
    raw_user_meta_data?: Record<string, unknown> | null;
  } | null,
  fallback = "Utente",
) => {
  const metadata = (user?.user_metadata ?? user?.raw_user_meta_data ?? {}) as Record<string, unknown>;
  const email = typeof user?.email === "string" ? user.email : "";

  const candidates = [
    profile?.nickname,
    profile?.full_name,
    metadata.nickname,
    metadata.full_name,
    metadata.name,
    metadata.preferred_username,
    email ? email.split("@")[0] : "",
    fallback,
  ];

  for (const candidate of candidates) {
    if (typeof candidate !== "string") continue;
    const cleaned = candidate.trim();
    if (cleaned) return cleaned;
  }

  return fallback;
};

export const userTemplateVars = (displayName: string, prefixes: string[] = []): TemplateVariables => {
  const variables: TemplateVariables = {
    userName: displayName,
    username: displayName,
    nickname: displayName,
    name: displayName,
    displayName,
  };

  for (const prefix of prefixes) {
    variables[`${prefix}Name`] = displayName;
    variables[`${prefix}Nickname`] = displayName;
    variables[`${prefix}Username`] = displayName;
    variables[`${prefix}UserName`] = displayName;
  }

  return variables;
};
