import Vue from 'vue';
import VueRouter from 'vue-router';
import { config } from '@/services/db.js';
import Home from '../views/Home.vue';
import Setup from '@/views/Setup.vue';
import Settings from '@/views/Settings.vue';


Vue.use(VueRouter);

const routes = [
	{ path: '/', name: 'home', component: Home },
	{ path: '/setup', name: 'setup', component: Setup },
	{ path: '/settings', name: 'settings', component: Settings }
];

const router = new VueRouter({
	mode: 'history',
	base: process.env.BASE_URL,
	routes
});

router.beforeEach((to, from, next) => {
	if (to.name !== 'setup') {
		// redirect to setup page if init is false
		if (!config.get('settings.init')) {
			// setup not complete, redirect to setup page
			next({ name: 'setup' });
			return;
		}
	}

	next();
});

export default router;
