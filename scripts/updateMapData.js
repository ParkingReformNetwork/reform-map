// -------------------------------------------------------------
// Encoding logic
// -------------------------------------------------------------

const magnitudeToHighest = (magnitudeString) => {
  const lowerCaseString = magnitudeString.toLowerCase();
  if (lowerCaseString.includes("regional")) {
    return "Regional";
  }
  if (lowerCaseString.includes("citywide")) {
    return "Citywide";
  }
  if (lowerCaseString.includes("city center")) {
    return "City Center";
  }
  if (lowerCaseString.includes("transit oriented")) {
    return "TOD";
  }
  if (lowerCaseString.includes("main street")) {
    return "Main Street";
  }
  return "NA";
};

const magnitudeToHighestOrAllUses = (magnitudeString, landusesString) => {
  const isAllUse = landusesString.toLowerCase().includes("all uses");
  const lowerCaseMagnitude = magnitudeString.toLowerCase();
  if (lowerCaseMagnitude.includes("citywide") && isAllUse) {
    return "Citywide All";
  }
  if (lowerCaseMagnitude.includes("citywide")) {
    return "Citywide";
  }
  if (lowerCaseMagnitude.includes("city center") && isAllUse) {
    return "City Center All";
  }
  if (lowerCaseMagnitude.includes("city center")) {
    return "City Center";
  }
  if (lowerCaseMagnitude.includes("transit oriented") && isAllUse) {
    return "TOD";
  }
  if (lowerCaseMagnitude.includes("transit oriented")) {
    return "TOD All";
  }
  if (lowerCaseMagnitude.includes("main street") && isAllUse) {
    return "Main Street";
  }
  if (lowerCaseMagnitude.includes("main street")) {
    return "Main Street All";
  }
  return "NA";
};

const landUseToString = (landUseString) => {
  const lowerCaseLandUse = landUseString.toLowerCase();
  if (lowerCaseLandUse.includes("all uses")) {
    return "city";
  }
  if (
    lowerCaseLandUse.includes("residential") &&
    lowerCaseLandUse.includes("commercial")
  ) {
    return "laptop";
  }
  if (lowerCaseLandUse.includes("commercial")) {
    return "building";
  }
  if (lowerCaseLandUse.includes("residential")) {
    return "home";
  }
  return "car";
};

const populationToBin = (population) => {
  if (population > 500000) {
    return 1;
  }
  if (population > 200000) {
    return 0.7;
  }
  if (population > 100000) {
    return 0.4;
  }
  return 0.2;
};

export {
  magnitudeToHighest,
  magnitudeToHighestOrAllUses,
  landUseToString,
  populationToBin,
};
