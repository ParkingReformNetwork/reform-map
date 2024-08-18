import { library, dom } from "@fortawesome/fontawesome-svg-core";
import {
  faCircleQuestion,
  faCircleXmark,
} from "@fortawesome/free-regular-svg-icons";
import {
  faChevronDown,
  faChevronUp,
  faUpRightFromSquare,
  faMagnifyingGlass,
  faSliders,
  faTable,
  faEarthAmericas,
} from "@fortawesome/free-solid-svg-icons";
import "@fortawesome/fontawesome-svg-core/styles.css";

export default function initIcons(): void {
  library.add(
    faChevronUp,
    faChevronDown,
    faCircleQuestion,
    faUpRightFromSquare,
    faCircleXmark,
    faMagnifyingGlass,
    faSliders,
    faTable,
    faEarthAmericas,
  );
  dom.watch();
}
