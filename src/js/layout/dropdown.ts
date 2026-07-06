import { capitalize } from "lodash-es";

/** Create a `<label>` + `<select>` pair and append it to `container`. */
export function createLabeledSelect(
  container: HTMLDivElement,
  params: {
    id: string;
    className: string;
    label: string;
    options: readonly string[];
    initialValue: string;
    onChange: (value: string) => void;
  },
): void {
  const wrapper = document.createElement("div");
  wrapper.className = params.className;

  const label = document.createElement("label");
  label.htmlFor = params.id;
  label.textContent = params.label;

  const select = document.createElement("select");
  select.id = params.id;
  select.name = params.id;

  params.options.forEach((option) => {
    const element = document.createElement("option");
    element.value = option;
    element.textContent = capitalize(option);
    select.append(element);
  });

  select.value = params.initialValue;

  select.addEventListener("change", () => {
    params.onChange(select.value);
  });

  wrapper.append(label);
  wrapper.append(select);
  container.append(wrapper);
}
