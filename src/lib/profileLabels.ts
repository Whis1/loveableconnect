// Etichette tradotte per i campi del profilo (genere, orientamento, stato
// relazionale, tipo di relazione). Stessa logica usata in ProfileDialog,
// estratta qui per poterla riusare nelle anteprime del profilo.

type T = (key: string) => string;

export function getGenderLabel(t: T, gender: string | null | undefined): string {
  if (!gender) return t("common.notSpecified");
  const key = gender.toLowerCase();
  const labels: Record<string, string> = {
    male: t("common.male"),
    uomo: t("common.male"),
    female: t("common.female"),
    donna: t("common.female"),
    transgender: t("common.transgender"),
    transexual: t("common.transexual"),
    transessuale: t("common.transexual"),
    genderfluid: t("common.genderfluid"),
    "non-binary": t("common.nonBinary"),
    "non binario": t("common.nonBinary"),
    other: t("common.other"),
    altro: t("common.other"),
  };
  return labels[key] || gender;
}

export function getOrientationLabel(t: T, orientation: string | null | undefined): string {
  if (!orientation) return t("common.notSpecified");
  const key = orientation.toLowerCase();
  const labels: Record<string, string> = {
    heterosexual: t("common.heterosexual"),
    eterosessuale: t("common.heterosexual"),
    homosexual: t("common.homosexual"),
    omosessuale: t("common.homosexual"),
    bisexual: t("common.bisexual"),
    bisessuale: t("common.bisexual"),
    pansexual: t("common.pansexual"),
    pansessuale: t("common.pansexual"),
    asexual: t("common.asexual"),
    asessuale: t("common.asexual"),
    other: t("common.other"),
    altro: t("common.other"),
  };
  return labels[key] || orientation;
}

export function getRelationshipTypeLabel(t: T, type: string | null | undefined): string {
  if (!type) return t("common.notSpecified");
  const key = type.toLowerCase();
  const labels: Record<string, string> = {
    serious: t("profile.seriousRelationship"),
    "relazione seria": t("profile.seriousRelationship"),
    "serious relationship": t("profile.seriousRelationship"),
    casual: t("profile.casualDating"),
    "incontri casuali": t("profile.casualDating"),
    "casual dating": t("profile.casualDating"),
    friendship: t("profile.friendship"),
    amicizia: t("profile.friendship"),
    open: t("common.openRelationship"),
    "relazione aperta": t("common.openRelationship"),
    "open relationship": t("common.openRelationship"),
    "prefer-not-say": t("common.preferNotSay"),
    prefer_not_say: t("common.preferNotSay"),
    "preferisco non dirlo": t("common.preferNotSay"),
    preferisco_non_dirlo: t("common.preferNotSay"),
    "not-sure": t("common.notSure"),
    not_sure: t("common.notSure"),
    "not sure": t("common.notSure"),
    "non specifico": t("common.notSure"),
  };
  return labels[key] || type;
}

export function getRelationshipStatusLabel(t: T, status: string | null | undefined): string {
  if (!status) return t("common.notSpecified");
  const key = status.toLowerCase();
  const labels: Record<string, string> = {
    single: t("common.single"),
    sposato: t("common.married"),
    sposata: t("common.married"),
    "sposato/a": t("common.married"),
    married: t("common.married"),
    divorced: t("common.divorced"),
    divorziato: t("common.divorced"),
    divorziata: t("common.divorced"),
    "divorziato/a": t("common.divorced"),
    widowed: t("common.widowed"),
    vedovo: t("common.widowed"),
    vedova: t("common.widowed"),
    "vedovo/a": t("common.widowed"),
    in_relationship: t("common.inRelationship"),
    fidanzato: t("common.inRelationship"),
    fidanzata: t("common.inRelationship"),
    "fidanzato/a": t("common.inRelationship"),
    "in una relazione": t("common.inRelationship"),
    prefer_not_say: t("common.preferNotSay"),
    preferisco_non_dirlo: t("common.preferNotSay"),
    "preferisco non dirlo": t("common.preferNotSay"),
    scoprilo: t("common.notSpecified"),
  };
  return labels[key] || status;
}
