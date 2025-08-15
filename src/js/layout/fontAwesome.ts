import { library, dom } from "@fortawesome/fontawesome-svg-core";
import {
  faCircleQuestion,
  faCircleXmark,
  faSquare,
} from "@fortawesome/free-regular-svg-icons";
import {
  faArrowRight,
  faCheck,
  faChevronDown,
  faChevronUp,
  faUpRightFromSquare,
  faMagnifyingGlass,
  faLink,
  faSquareCheck,
  faSliders,
  faTable,
  faEarthAmericas,
  faTriangleExclamation,
} from "@fortawesome/free-solid-svg-icons";

export default function initIcons(): void {
  library.add(
    faArrowRight,
    faCheck,
    faChevronUp,
    faChevronDown,
    faCircleQuestion,
    faUpRightFromSquare,
    faCircleXmark,
    faLink,
    faMagnifyingGlass,
    faSquare,
    faSquareCheck,
    faSliders,
    faTable,
    faEarthAmericas,
    faTriangleExclamation,
  );
  dom.watch();
}
