import { resolve } from 'q';
import config from '@/services/db.js';
import { get, update } from '@/services/ajax.js';

export const namespaced = true;

// STATE
export const state = {
	settings: {
		init: false,
		master: null,
		api_user: "",
		api_key: "",
		api_base_url: "https://api.rockgympro.com/v1",
		location_tag: "",
		max_duration: 10800		// default to 3 hours
	}
};



// GETTERS
export const getters = {
	settings: state => state.settings,
	max_duration: state => state.settings.max_duration
};



// ACTIONS
export const actions = {
	init: store => {
		const settings = config.get('settings');
		store.commit('SET_SETTINGS', settings);
		update(settings);
	},

	check_api: async (store, data) => {
		await get('/ping');
		store.dispatch('update_settings', data)
	},

	get_locations: async () => {
		let result = await get('/facilities');
		return resolve(result.facilities);
	},

	update_settings: (store, data) => {
		store.commit('SET_SETTINGS', data);
		config.set('settings', Object.assign({}, store.state.settings, data));	// save to config (disk)
	}
};



// MUTATIONS
export const mutations = {
	SET_SETTINGS: (state, value) => {
		state.settings = Object.assign({}, state.settings, value);
	}
};
