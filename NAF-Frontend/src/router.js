import { createRouter, createWebHistory } from "vue-router";
import SystemControl from "../pages/SystemControl.vue";
import DatabaseViewer from "../pages/DatabaseViewer.vue";
import Login from "./components/Login.vue";

const routes = [
  { path: "/", redirect: "/login" },
  { path: "/login", component: Login },
  { path: "/system-control", component: SystemControl },
  { path: "/database-viewer", component: DatabaseViewer },
];

export const router = createRouter({
  history: createWebHistory(),
  routes,
});
