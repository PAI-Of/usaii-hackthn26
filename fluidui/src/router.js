import { createMemoryHistory, createRouter } from 'vue-router'

import AuthPage from './components/AuthPage.vue';
import HomeView from './components/HomeView.vue';
import LandingPage from './components/LandingPage.vue';
import OrderView from './components/OrderView.vue';
import AboutView from './components/AboutView.vue';

const routes = [
    { path: '/', component: LandingPage },
    { path: '/auth', component: AuthPage },
    { path: '/home', component: HomeView },
    { path: '/orders', component: OrderView },
    { path: '/about', component: AboutView }
]

const router = createRouter({
  // Note: We're using createMemoryHistory() here for compatibility
  //       with the Playground. In a real application you'd usually
  //       use createWebHistory() or createWebHashHistory() instead,
  //       tying the route to the browser URL. See the documentation
  //       for more information about history modes.
  history: createMemoryHistory(),
  routes,
})

export default router