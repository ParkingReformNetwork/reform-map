/** A small set of places covering the main city_detail template branches
 * (plain city, city with minimal supplemental info, benefit district, and a
 * country with no supplemental info), used to keep `npm test` fast by only
 * generating these pages instead of the entire dataset. */
export const SAMPLE_PLACES = [
  { placeId: "Abilene, Texas, United States", encodedId: "Abilene_TX" },
  {
    placeId: "Abbottstown, Pennsylvania, United States",
    encodedId: "Abbottstown_PA",
  },
  { placeId: "Basalt, Colorado, United States", encodedId: "Basalt_CO" },
  { placeId: "Auburn, Maine, United States", encodedId: "Auburn_ME" },
  // Benefit district
  {
    placeId: "Pasadena, California, United States",
    encodedId: "Pasadena_CA",
  },
  // Country, meaning no supplemental place information in the title
  { placeId: "Israel", encodedId: "Israel" },
];
