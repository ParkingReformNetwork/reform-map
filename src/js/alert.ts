/* global document */

const setUpAlerts = () => {
  document
    .getElementById("no-requirements-toggle")
    .addEventListener("change", (e: Event) => {
      const noRequirementsToggleElement = e.target as HTMLInputElement;
      const noRequirementsAlert = document.getElementById(
        "no-requirements-alert"
      ) as HTMLInputElement;
      if (noRequirementsToggleElement.checked) {
        noRequirementsAlert.style.display = "block";
      } else {
        noRequirementsAlert.style.display = "none";
      }
    });
};

export default setUpAlerts;
