import { library, dom } from "@fortawesome/fontawesome-svg-core";
import {
  faCircleQuestion,
  faCircleXmark,
} from "@fortawesome/free-regular-svg-icons";
import {
  faChevronUp,
  faChevronDown,
  faUpRightFromSquare,
  faMagnifyingGlass,
  faSliders,
  faTable,
  faEarthAmericas,
  fas,
} from "@fortawesome/free-solid-svg-icons";
import "@fortawesome/fontawesome-svg-core/styles.css";

export default function initIcons(): void {
  library.add(
    faChevronDown,
    faChevronUp,
    faCircleQuestion,
    faUpRightFromSquare,
    faCircleXmark,
    faMagnifyingGlass,
    faSliders,
    faTable,
    faEarthAmericas,
    fas,
  );
  dom.watch();
}
