/**
 * Icons used only by slash components (FolderView, ViewModeBar, CanvasItem, etc.).
 * Loaded after icons.js so b-icon is already registered.
 */
import Vue from "vue";
import {
  BIconBox,
  BIconCalendarDay,
  BIconCameraVideo,
  BIconChatLeftText,
  BIconChatLeftTextFill,
  BIconCursor,
  BIconFileEarmarkPdf,
  BIconFolder2,
  BIconGrid,
  BIconLayoutWtf,
  BIconLink45deg,
  BIconMusicNoteBeamed,
} from "bootstrap-vue";

Vue.component("BIconBox", BIconBox);
Vue.component("BIconCalendarDay", BIconCalendarDay);
Vue.component("BIconCameraVideo", BIconCameraVideo);
Vue.component("BIconChatLeftText", BIconChatLeftText);
Vue.component("BIconChatLeftTextFill", BIconChatLeftTextFill);
Vue.component("BIconCursor", BIconCursor);
Vue.component("BIconFileEarmarkPdf", BIconFileEarmarkPdf);
Vue.component("BIconFolder2", BIconFolder2);
Vue.component("BIconGrid", BIconGrid);
Vue.component("BIconLayoutWtf", BIconLayoutWtf);
Vue.component("BIconLink45deg", BIconLink45deg);
Vue.component("BIconMusicNoteBeamed", BIconMusicNoteBeamed);
