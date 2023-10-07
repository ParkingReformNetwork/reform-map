import { library, dom } from "@fortawesome/fontawesome-svg-core";
import {
  faCircleInfo,
  faLink,
  faUpRightFromSquare,
  faCaretDown,
  faLightbulb,
  faCircleXmark,
  fas,
  faGear,
} from "@fortawesome/free-solid-svg-icons";
import "@fortawesome/fontawesome-svg-core/styles.css";

const setUpIcons = (): void => {
  library.add(
    faCircleInfo,
    faLink,
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
