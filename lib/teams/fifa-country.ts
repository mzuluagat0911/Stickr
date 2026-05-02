import { countryFlagEmoji } from "@/lib/data/countries";

const FIFA_TO_ISO2: Record<string, string> = {
  ALG: "DZ",
  ARG: "AR",
  AUS: "AU",
  AUT: "AT",
  BEL: "BE",
  BIH: "BA",
  BRA: "BR",
  CAN: "CA",
  COL: "CO",
  CPV: "CV",
  CIV: "CI",
  COD: "CD",
  CRO: "HR",
  CUW: "CW",
  CZE: "CZ",
  ECU: "EC",
  EGY: "EG",
  ENG: "GB",
  ESP: "ES",
  FRA: "FR",
  GHA: "GH",
  GER: "DE",
  HAI: "HT",
  IRN: "IR",
  IRQ: "IQ",
  JOR: "JO",
  JPN: "JP",
  KOR: "KR",
  MAR: "MA",
  MEX: "MX",
  NED: "NL",
  NOR: "NO",
  NZL: "NZ",
  PAN: "PA",
  PAR: "PY",
  POR: "PT",
  QAT: "QA",
  RSA: "ZA",
  KSA: "SA",
  SCO: "GB",
  SEN: "SN",
  SUI: "CH",
  SWE: "SE",
  TUN: "TN",
  TUR: "TR",
  URU: "UY",
  USA: "US",
  UZB: "UZ",
};

export function fifaTeamFlagEmoji(teamCode: string): string {
  const up = teamCode.toUpperCase();
  if (up === "MUSEUM") return "🏛️";
  const iso2 = FIFA_TO_ISO2[up];
  if (!iso2) return "🏳️";
  return countryFlagEmoji(iso2);
}
