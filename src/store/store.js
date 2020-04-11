import Vue from 'vue';
import Vuex from 'vuex';
import * as setup from '@/store/modules/store-setup.js';
import * as checkins from '@/store/modules/store-checkins.js';


Vue.use(Vuex);

export default new Vuex.Store({
	modules: {
		setup,
		checkins
	}

});
