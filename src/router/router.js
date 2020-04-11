import Vue from 'vue';
import VueRouter from 'vue-router';
import Home from '../views/Home.vue';
import Setup from '@/views/Setup.vue';
import config from '@/services/db.js';

Vue.use(VueRouter);

const routes = [
	{ path: '/', name: 'home', component: Home },
	{ path: '/setup', name: 'setup', component: Setup }
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
