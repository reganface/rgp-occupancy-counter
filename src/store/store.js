import Vue from 'vue';
import Vuex from 'vuex';
import * as setup from '@/store/modules/store-setup.js';
import * as checkins from '@/store/modules/store-checkins.js';
import * as notify from '@/store/modules/store-notify.js';


Vue.use(Vuex);

export default new Vuex.Store({
	modules: {
		setup,
		checkins,
		notify
	},

	state: {
		loading: 0
	},

	getters: {
		loading: state => state.loading > 0
	},

	actions: {
		start_loading: store => {
			store.commit('SET_LOADING', 1);
		},

		stop_loading: store => {
			store.commit('SET_LOADING', -1);
		}
	},

	mutations: {
		SET_LOADING: (state, value) => {
			state.loading = Math.max(state.loading + value, 0);
		}
	}

});
