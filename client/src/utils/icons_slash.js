/**
 * Icons used only by slash components (FolderView, ViewModeBar, CanvasItem, etc.).
 * Loaded after icons.js so b-icon is already registered.
 */
import Vue from "vue";
import {
  BIconChatLeft,
  BIconChatLeftTextFill,
  BIconCursor,
  BIconGrid,
  BIconLayoutWtf,
  BIconCalendarDay,
  BIconHandIndex,
} from "bootstrap-vue";

Vue.component("BIconChatLeft", BIconChatLeft);
Vue.component("BIconChatLeftTextFill", BIconChatLeftTextFill);
Vue.component("BIconCursor", BIconCursor);
Vue.component("BIconGrid", BIconGrid);
Vue.component("BIconLayoutWtf", BIconLayoutWtf);
Vue.component("BIconCalendarDay", BIconCalendarDay);
Vue.component("BIconHandIndex", BIconHandIndex);
