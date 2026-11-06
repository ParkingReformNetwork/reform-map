import { encodedPlaceToUrl } from "./placeId";
import { ReformDate } from "./ReformDate";
import {
  ALL_POLICY_TYPE,
  type LandUsePolicyType,
  type PlaceId,
  type PolicyType,
  type ProcessedCoreBenefitDistrict,
  type ProcessedCoreEntry,
  type ProcessedCoreLandUsePolicy,
  type ProcessedPlace,
  type RawCoreBenefitDistrict,
  type RawCoreEntry,
  type RawCoreLandUsePolicy,
  type RawPlace,
  type ReformStatus,
} from "./types";

export const COUNTRIES_PREFIXED_BY_THE = new Set([
  "Bahamas",
  "Cayman Islands",
  "Central African Republic",
  "Cook Islands",
  "Czech Republic",
  "Democratic Republic of the Congo",
  "Dominican Republic",
  "Falkland Islands",
  "Faroe Islands",
  "Gambia",
  "Isle of Man",
  "Ivory Coast",
  "Maldives",
  "Marshall Islands",
  "Netherlands",
  "Philippines",
  "Republic of the Congo",
  "Solomon Islands",
  "United Arab Emirates",
  "United Kingdom",
  "United States",
]);

/** ISO 3166-1 alpha-2 country codes used in Directus, mapped to display names.
 *
 * Names are part of each place's ID (and thus its URL), so don't rename an
 * existing entry. Note that we use `UK` rather than `GB`.
 */
export const COUNTRY_MAPPING: Partial<Record<string, string>> = {
  AD: "Andorra",
  AE: "United Arab Emirates",
  AF: "Afghanistan",
  AG: "Antigua and Barbuda",
  AI: "Anguilla",
  AL: "Albania",
  AM: "Armenia",
  AO: "Angola",
  AQ: "Antarctica",
  AR: "Argentina",
  AS: "American Samoa",
  AT: "Austria",
  AU: "Australia",
  AW: "Aruba",
  AX: "Åland Islands",
  AZ: "Azerbaijan",
  BA: "Bosnia and Herzegovina",
  BB: "Barbados",
  BD: "Bangladesh",
  BE: "Belgium",
  BF: "Burkina Faso",
  BG: "Bulgaria",
  BH: "Bahrain",
  BI: "Burundi",
  BJ: "Benin",
  BL: "Saint Barthélemy",
  BM: "Bermuda",
  BN: "Brunei",
  BO: "Bolivia",
  BQ: "Bonaire, Sint Eustatius and Saba",
  BR: "Brazil",
  BS: "Bahamas",
  BT: "Bhutan",
  BV: "Bouvet Island",
  BW: "Botswana",
  BY: "Belarus",
  BZ: "Belize",
  CA: "Canada",
  CC: "Cocos (Keeling) Islands",
  CD: "Democratic Republic of the Congo",
  CF: "Central African Republic",
  CG: "Republic of the Congo",
  CH: "Switzerland",
  CI: "Ivory Coast",
  CK: "Cook Islands",
  CL: "Chile",
  CM: "Cameroon",
  CN: "China",
  CO: "Colombia",
  CR: "Costa Rica",
  CU: "Cuba",
  CV: "Cape Verde",
  CW: "Curaçao",
  CX: "Christmas Island",
  CY: "Cyprus",
  CZ: "Czech Republic",
  DE: "Germany",
  DJ: "Djibouti",
  DK: "Denmark",
  DM: "Dominica",
  DO: "Dominican Republic",
  DZ: "Algeria",
  EC: "Ecuador",
  EE: "Estonia",
  EG: "Egypt",
  EH: "Western Sahara",
  ER: "Eritrea",
  ES: "Spain",
  ET: "Ethiopia",
  FI: "Finland",
  FJ: "Fiji",
  FK: "Falkland Islands",
  FM: "Federated States of Micronesia",
  FO: "Faroe Islands",
  FR: "France",
  GA: "Gabon",
  GD: "Grenada",
  GE: "Georgia",
  GF: "French Guiana",
  GG: "Guernsey",
  GH: "Ghana",
  GI: "Gibraltar",
  GL: "Greenland",
  GM: "Gambia",
  GN: "Guinea",
  GP: "Guadeloupe",
  GQ: "Equatorial Guinea",
  GR: "Greece",
  GS: "South Georgia and South Sandwich Islands",
  GT: "Guatemala",
  GU: "Guam",
  GW: "Guinea-Bissau",
  GY: "Guyana",
  HK: "Hong Kong",
  HM: "Heard and McDonald Islands",
  HN: "Honduras",
  HR: "Croatia",
  HT: "Haiti",
  HU: "Hungary",
  ID: "Indonesia",
  IE: "Ireland",
  IL: "Israel",
  IM: "Isle of Man",
  IN: "India",
  IO: "British Indian Ocean Territory",
  IQ: "Iraq",
  IR: "Iran",
  IS: "Iceland",
  IT: "Italy",
  JE: "Jersey",
  JM: "Jamaica",
  JO: "Jordan",
  JP: "Japan",
  KE: "Kenya",
  KG: "Kyrgyzstan",
  KH: "Cambodia",
  KI: "Kiribati",
  KM: "Comoros",
  KN: "Saint Kitts and Nevis",
  KP: "North Korea",
  KR: "Korea",
  KW: "Kuwait",
  KY: "Cayman Islands",
  KZ: "Kazakhstan",
  LA: "Laos",
  LB: "Lebanon",
  LC: "Saint Lucia",
  LI: "Liechtenstein",
  LK: "Sri Lanka",
  LR: "Liberia",
  LS: "Lesotho",
  LT: "Lithuania",
  LU: "Luxembourg",
  LV: "Latvia",
  LY: "Libya",
  MA: "Morocco",
  MC: "Monaco",
  MD: "Moldova",
  ME: "Montenegro",
  MF: "Saint Martin",
  MG: "Madagascar",
  MH: "Marshall Islands",
  MK: "North Macedonia",
  ML: "Mali",
  MM: "Myanmar",
  MN: "Mongolia",
  MO: "Macao",
  MP: "Northern Mariana Islands",
  MQ: "Martinique",
  MR: "Mauritania",
  MS: "Montserrat",
  MT: "Malta",
  MU: "Mauritius",
  MV: "Maldives",
  MW: "Malawi",
  MX: "Mexico",
  MY: "Malaysia",
  MZ: "Mozambique",
  NA: "Namibia",
  NC: "New Caledonia",
  NE: "Niger",
  NF: "Norfolk Island",
  NG: "Nigeria",
  NI: "Nicaragua",
  NL: "Netherlands",
  NO: "Norway",
  NP: "Nepal",
  NR: "Nauru",
  NU: "Niue",
  NZ: "New Zealand",
  OM: "Oman",
  PA: "Panama",
  PE: "Peru",
  PF: "French Polynesia",
  PG: "Papua New Guinea",
  PH: "Philippines",
  PK: "Pakistan",
  PL: "Poland",
  PM: "Saint Pierre and Miquelon",
  PN: "Pitcairn Islands",
  PR: "Puerto Rico",
  PS: "Palestine",
  PT: "Portugal",
  PW: "Palau",
  PY: "Paraguay",
  QA: "Qatar",
  RE: "Réunion",
  RO: "Romania",
  RS: "Serbia",
  RU: "Russia",
  RW: "Rwanda",
  SA: "Saudi Arabia",
  SB: "Solomon Islands",
  SC: "Seychelles",
  SD: "Sudan",
  SE: "Sweden",
  SG: "Singapore",
  SH: "Saint Helena",
  SI: "Slovenia",
  SJ: "Svalbard and Jan Mayen",
  SK: "Slovakia",
  SL: "Sierra Leone",
  SM: "San Marino",
  SN: "Senegal",
  SO: "Somalia",
  SR: "Suriname",
  SS: "South Sudan",
  ST: "São Tomé and Príncipe",
  SV: "El Salvador",
  SX: "Sint Maarten",
  SY: "Syria",
  SZ: "Eswatini",
  TC: "Turks and Caicos Islands",
  TD: "Chad",
  TF: "French Southern Territories",
  TG: "Togo",
  TH: "Thailand",
  TJ: "Tajikistan",
  TK: "Tokelau",
  TL: "Timor-Leste",
  TM: "Turkmenistan",
  TN: "Tunisia",
  TO: "Tonga",
  TR: "Turkey",
  TT: "Trinidad and Tobago",
  TV: "Tuvalu",
  TW: "Taiwan",
  TZ: "Tanzania",
  UA: "Ukraine",
  UG: "Uganda",
  UK: "United Kingdom",
  UM: "United States Minor Outlying Islands",
  US: "United States",
  UY: "Uruguay",
  UZ: "Uzbekistan",
  VA: "Vatican City",
  VC: "Saint Vincent and Grenadines",
  VE: "Venezuela",
  VG: "British Virgin Islands",
  VI: "United States Virgin Islands",
  VN: "Vietnam",
  VU: "Vanuatu",
  WF: "Wallis and Futuna",
  WS: "Samoa",
  XK: "Kosovo",
  YE: "Yemen",
  YT: "Mayotte",
  ZA: "South Africa",
  ZM: "Zambia",
  ZW: "Zimbabwe",
};

export function processPlace(raw: RawPlace): ProcessedPlace {
  return {
    ...raw,
    url: encodedPlaceToUrl(raw.encoded),
  };
}

function getPolicyRecords(
  entry: ProcessedCoreEntry,
  policyType: PolicyType,
): Array<{ status: ReformStatus }> {
  if (policyType === "parking benefit district") {
    return entry.benefit_district ?? [];
  }
  return getLandUsePolicyRecords(entry, policyType);
}

export function determineAllPolicyTypes(
  entry: ProcessedCoreEntry,
  status: ReformStatus,
): PolicyType[] {
  return ALL_POLICY_TYPE.filter((policyType) =>
    getPolicyRecords(entry, policyType).some((p) => p.status === status),
  );
}

export function determinePolicyTypeStatuses(
  entry: ProcessedCoreEntry,
): Record<PolicyType, Set<ReformStatus>> {
  return Object.fromEntries(
    ALL_POLICY_TYPE.map((policyType) => [
      policyType,
      new Set(getPolicyRecords(entry, policyType).map((p) => p.status)),
    ]),
  ) as Record<PolicyType, Set<ReformStatus>>;
}

export function getLandUsePolicyRecords(
  entry: ProcessedCoreEntry,
  policyType: LandUsePolicyType,
): ProcessedCoreLandUsePolicy[] {
  switch (policyType) {
    case "add parking maximums":
      return entry.add_max ?? [];
    case "reduce parking minimums":
      return entry.reduce_min ?? [];
    case "remove parking minimums":
      return entry.rm_min ?? [];
  }
}

function processLandUsePolicy(
  raw: RawCoreLandUsePolicy,
): ProcessedCoreLandUsePolicy {
  return {
    ...raw,
    date: ReformDate.fromNullable(raw.date),
  };
}

function processBenefitDistrict(
  raw: RawCoreBenefitDistrict,
): ProcessedCoreBenefitDistrict {
  return {
    ...raw,
    date: ReformDate.fromNullable(raw.date),
  };
}

export function processRawCoreEntry(raw: RawCoreEntry): ProcessedCoreEntry {
  const result: ProcessedCoreEntry = {
    place: processPlace(raw.place),
  };
  if (raw.add_max) {
    result.add_max = raw.add_max.map(processLandUsePolicy);
  }
  if (raw.reduce_min) {
    result.reduce_min = raw.reduce_min.map(processLandUsePolicy);
  }
  if (raw.rm_min) {
    result.rm_min = raw.rm_min.map(processLandUsePolicy);
  }
  if (raw.benefit_district) {
    result.benefit_district = raw.benefit_district.map(processBenefitDistrict);
  }
  return result;
}

export default async function readData(): Promise<
  Record<PlaceId, ProcessedCoreEntry>
> {
  const rawData = (await import("../../../data/core.json", {
    with: { type: "json" },
  })) as unknown as Record<PlaceId, RawCoreEntry>;
  return Object.fromEntries(
    Object.entries(rawData).map(([placeId, entry]) => [
      placeId,
      processRawCoreEntry(entry),
    ]),
  );
}

export function getFilteredIndexes<T>(
  array: T[],
  predicate: (value: T) => boolean,
): number[] {
  return array.reduce((indexes: number[], currentValue, currentIndex) => {
    if (predicate(currentValue)) {
      indexes.push(currentIndex);
    }
    return indexes;
  }, []);
}
