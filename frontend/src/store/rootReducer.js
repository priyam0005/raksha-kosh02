import { combineReducers } from "redux";
import fileScan from "./scan";
import login from "./login";
import ScanUser from "./scanUser";
const rootReducer = combineReducers({
  scan: fileScan,
  just: login,
  scans: ScanUser,
});

export default rootReducer;
