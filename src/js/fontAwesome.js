import { library, dom } from "@fortawesome/fontawesome-svg-core";
import {
  faCircleInfo,
  faLink,
  faUpRightFromSquare,
  faCaretDown,
  fas,
} from "@fortawesome/free-solid-svg-icons";
import "@fortawesome/fontawesome-svg-core/styles.css";

const setUpIcons = () => {
  library.add(faCircleInfo, faLink, faUpRightFromSquare, faCaretDown, fas);
  dom.watch();
};

export default setUpIcons;
