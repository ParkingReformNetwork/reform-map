import { library, dom } from "@fortawesome/fontawesome-svg-core";
import {
  faCircleInfo,
  faShare,
  faUpRightFromSquare,
  faLightbulb,
  fas,
} from "@fortawesome/free-solid-svg-icons";
import "@fortawesome/fontawesome-svg-core/styles.css";

const setUpIcons = () => {
  library.add(faCircleInfo, faShare, faUpRightFromSquare, faLightbulb, fas);
  dom.watch();
};

export default setUpIcons;
