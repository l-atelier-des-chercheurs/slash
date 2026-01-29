/**
 * Icons used only by slash components (FolderView, ViewModeBar, CanvasItem, etc.).
 * Loaded after icons.js so b-icon is already registered.
 */
import Vue from "vue";
import {
  BIconChatLeft,
  BIconChatLeftTextFill,
  BIconGrid,
  BIconLayoutWtf,
  BIconCalendarDay,
} from "bootstrap-vue";

Vue.component("BIconChatLeft", BIconChatLeft);
Vue.component("BIconChatLeftTextFill", BIconChatLeftTextFill);
Vue.component("BIconGrid", BIconGrid);
Vue.component("BIconLayoutWtf", BIconLayoutWtf);
Vue.component("BIconCalendarDay", BIconCalendarDay);
