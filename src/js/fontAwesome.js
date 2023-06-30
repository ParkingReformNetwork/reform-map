import { library, dom } from "@fortawesome/fontawesome-svg-core";
import {
  faCircleInfo,
  faCircleXmark,
  faShare,
  faLink,
  faUpRightFromSquare,
  faCaretDown,
  fas,
} from "@fortawesome/free-solid-svg-icons";
import "@fortawesome/fontawesome-svg-core/styles.css";

const setUpIcons = () => {
  library.add(
    faCircleInfo,
    faCircleXmark,
    faShare,
    faLink,
    faUpRightFromSquare,
    faCaretDown,
    fas
  );
  dom.watch();
};

export default setUpIcons;
