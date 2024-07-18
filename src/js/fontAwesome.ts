import { library, dom } from "@fortawesome/fontawesome-svg-core";
import {
  faCircleQuestion,
  faCircleXmark,
} from "@fortawesome/free-regular-svg-icons";
import {
  faUpRightFromSquare,
  faCaretDown,
  faLightbulb,
  fas,
  faGear,
} from "@fortawesome/free-solid-svg-icons";
import "@fortawesome/fontawesome-svg-core/styles.css";

const setUpIcons = (): void => {
  library.add(
    faCircleQuestion,
    faUpRightFromSquare,
    faCaretDown,
    faLightbulb,
    faCircleXmark,
    fas,
    faGear
  );
  dom.watch();
};

export default setUpIcons;
