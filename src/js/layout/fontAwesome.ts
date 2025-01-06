import { library, dom } from "@fortawesome/fontawesome-svg-core";
import {
  faCircleQuestion,
  faCircleXmark,
  faSquare,
} from "@fortawesome/free-regular-svg-icons";
import {
  faArrowRight,
  faChevronDown,
  faChevronUp,
  faUpRightFromSquare,
  faMagnifyingGlass,
  faSquareCheck,
  faSliders,
  faTable,
  faEarthAmericas,
} from "@fortawesome/free-solid-svg-icons";

export default function initIcons(): void {
  library.add(
    faArrowRight,
    faChevronUp,
    faChevronDown,
    faCircleQuestion,
    faUpRightFromSquare,
    faCircleXmark,
    faMagnifyingGlass,
    faSquare,
    faSquareCheck,
    faSliders,
    faTable,
    faEarthAmericas,
  );
  dom.watch();
}
