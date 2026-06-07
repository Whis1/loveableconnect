import { supabase } from "@/integrations/supabase/client";

export const NICKNAME_TAKEN_MESSAGE = "Nickname già utilizzato da un altro utente";

export const normalizeNickname = (value: string): string => value.trim();

const nicknameKey = (value: string | null | undefined): string =>
  normalizeNickname(value ?? "").toLocaleLowerCase("it-IT");

const escapeIlikePattern = (value: string): string =>
  value.replace(/[\\%_]/g, (match) => `\\${match}`);

export const isNicknameDuplicateError = (error: unknown): boolean => {
  const anyError = error as { code?: string; message?: string; details?: string; hint?: string };
  const text = `${anyError?.code ?? ""} ${anyError?.message ?? ""} ${anyError?.details ?? ""} ${anyError?.hint ?? ""}`.toLowerCase();
  return (
    text.includes("23505") ||
    text.includes("duplicate key") ||
    text.includes("profiles_nickname_unique_ci") ||
    text.includes("nickname e' gia' in uso") ||
    text.includes("nickname è già in uso") ||
    text.includes("nickname già utilizzato") ||
    text.includes("nickname Ã¨ giÃ  in uso")
  );
};

export const isNicknameTaken = async (
  nickname: string,
  currentProfileId?: string,
): Promise<boolean> => {
  const normalized = normalizeNickname(nickname);
  if (!normalized) return false;

  const { data: functionData, error: functionError } = await supabase.functions.invoke("check-nickname", {
    body: {
      nickname: normalized,
      current_profile_id: currentProfileId ?? null,
    },
  });

  if (!functionError) {
    return Boolean(functionData?.taken);
  }

  console.warn("check-nickname function failed, falling back to client query:", functionError);

  const { data, error } = await supabase
    .from("profiles")
    .select("id, nickname")
    .ilike("nickname", escapeIlikePattern(normalized))
    .limit(25);

  if (error) throw error;

  const wantedKey = nicknameKey(normalized);
  return (data ?? []).some((profile) => (
    profile.id !== currentProfileId &&
    nicknameKey(profile.nickname) === wantedKey
  ));
};
