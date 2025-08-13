import fs from "fs/promises";

import { sortBy, without } from "lodash-es";

import { COUNTRY_MAPPING } from "../../src/js/model/data";
import {
  RawCoreLandUsePolicy,
  UNKNOWN_YEAR,
  Date,
  RawPlace,
  RawCoreEntry,
  RawCoreBenefitDistrict,
} from "../../src/js/model/types";

/** The option values for a single dataset. */
class OptionValues {
  readonly placeType: Set<string>;

  readonly country: Set<string>;

  readonly scope: Set<string>;

  readonly landUse: Set<string>;

  readonly year: Set<string>;

  constructor() {
    this.placeType = new Set();
    this.country = new Set();
    this.scope = new Set();
    this.landUse = new Set();
    this.year = new Set();
  }

  #addPlace(place: RawPlace): void {
    this.placeType.add(place.type);
    this.country.add(COUNTRY_MAPPING[place.country] ?? place.country);
  }

  #addDate(date: string | null): void {
    this.year.add(date ? new Date(date).parsed.year.toString() : UNKNOWN_YEAR);
  }

  addBenefitDistrict(
    place: RawPlace,
    benefitDistrict: RawCoreBenefitDistrict,
  ): void {
    this.#addPlace(place);
    this.#addDate(benefitDistrict.date);
  }

  addLandUse(place: RawPlace, landUseRecord: RawCoreLandUsePolicy): void {
    this.#addPlace(place);
    this.#addDate(landUseRecord.date);
    landUseRecord.scope.forEach((v) => this.scope.add(v));
    landUseRecord.land.forEach((v) => this.landUse.add(v));
  }

  export() {
    return {
      placeType: Array.from(this.placeType).sort(),
      country: sortCountries(this.country),
      scope: Array.from(this.scope).sort(),
      landUse: Array.from(this.landUse).sort(),
      year: Array.from(this.year).sort().reverse(),
    };
  }
}

export function determineOptionValues(entries: RawCoreEntry[]) {
  const merged = new OptionValues();
  const anyAdopted = new OptionValues();
  const anyProposed = new OptionValues();
  const anyRepealed = new OptionValues();
  const addMaxAdopted = new OptionValues();
  const addMaxProposed = new OptionValues();
  const addMaxRepealed = new OptionValues();
  const reduceMinAdopted = new OptionValues();
  const reduceMinProposed = new OptionValues();
  const reduceMinRepealed = new OptionValues();
  const rmMinAdopted = new OptionValues();
  const rmMinProposed = new OptionValues();
  const rmMinRepealed = new OptionValues();
  const benefitDistrictAdopted = new OptionValues();
  const benefitDistrictProposed = new OptionValues();
  const benefitDistrictRepealed = new OptionValues();

  entries.forEach((entry) => {
    entry.add_max?.forEach((policyRecord) => {
      merged.addLandUse(entry.place, policyRecord);
      const [any, policy] = {
        adopted: [anyAdopted, addMaxAdopted],
        proposed: [anyProposed, addMaxProposed],
        repealed: [anyRepealed, addMaxRepealed],
      }[policyRecord.status];
      any.addLandUse(entry.place, policyRecord);
      policy.addLandUse(entry.place, policyRecord);
    });
    entry.reduce_min?.forEach((policyRecord) => {
      merged.addLandUse(entry.place, policyRecord);
      const [any, policy] = {
        adopted: [anyAdopted, reduceMinAdopted],
        proposed: [anyProposed, reduceMinProposed],
        repealed: [anyRepealed, reduceMinRepealed],
      }[policyRecord.status];
      any.addLandUse(entry.place, policyRecord);
      policy.addLandUse(entry.place, policyRecord);
    });
    entry.rm_min?.forEach((policyRecord) => {
      merged.addLandUse(entry.place, policyRecord);
      const [any, policy] = {
        adopted: [anyAdopted, rmMinAdopted],
        proposed: [anyProposed, rmMinProposed],
        repealed: [anyRepealed, rmMinRepealed],
      }[policyRecord.status];
      any.addLandUse(entry.place, policyRecord);
      policy.addLandUse(entry.place, policyRecord);
    });
    entry.benefit_district?.forEach((record) => {
      merged.addBenefitDistrict(entry.place, record);
      const [any, policy] = {
        adopted: [anyAdopted, benefitDistrictAdopted],
        proposed: [anyProposed, benefitDistrictProposed],
        repealed: [anyRepealed, benefitDistrictRepealed],
      }[record.status];
      any.addBenefitDistrict(entry.place, record);
      policy.addBenefitDistrict(entry.place, record);
    });
  });

  const result = {
    merged: merged.export(),
    anyAdopted: anyAdopted.export(),
    anyProposed: anyProposed.export(),
    anyRepealed: anyRepealed.export(),
    addMaxAdopted: addMaxAdopted.export(),
    addMaxProposed: addMaxProposed.export(),
    addMaxRepealed: addMaxRepealed.export(),
    reduceMinAdopted: reduceMinAdopted.export(),
    reduceMinProposed: reduceMinProposed.export(),
    reduceMinRepealed: reduceMinRepealed.export(),
    rmMinAdopted: rmMinAdopted.export(),
    rmMinProposed: rmMinProposed.export(),
    rmMinRepealed: rmMinRepealed.export(),
    benefitDistrictAdopted: benefitDistrictAdopted.export(),
    benefitDistrictProposed: benefitDistrictProposed.export(),
    benefitDistrictRepealed: benefitDistrictRepealed.export(),
  };
  return result;
}

/**
 * Sort alphabetically, but ensure the US is at the top.
 *
 * @param countries the fully normalized country names.
 */
export function sortCountries(countries: Set<string>): string[] {
  const sortedWithoutUS = sortBy(
    without(Array.from(countries), "United States"),
  );
  return countries.has("United States")
    ? ["United States", ...sortedWithoutUS]
    : sortedWithoutUS;
}

export async function saveOptionValues(entries: RawCoreEntry[]): Promise<void> {
  const result = determineOptionValues(entries);
  const json = JSON.stringify(result, null, 2);
  // eslint-disable-next-line no-console
  console.log("Writing data/option-values.json");
  await fs.writeFile("data/option-values.json", json);
}
