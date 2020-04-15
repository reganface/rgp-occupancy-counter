import { resolve } from 'q';
import { config } from '@/services/db.js';
import { get, update } from '@/services/ajax.js';
import router from '@/router/router.js';

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
		max_duration: 180,		// time in minutes
		max_customers: 50
	}
};



// GETTERS
export const getters = {
	settings: state => state.settings,
	max_duration: state => state.settings.max_duration,
	max_customers: state => state.settings.max_customers
};



// ACTIONS
export const actions = {
	init: async store => {
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
	},

	// remove all check-ins and reset settings to defaults
	purge: store => {
		let defaults = {
			init: false,
			master: null,
			api_user: "",
			api_key: "",
			api_base_url: "https://api.rockgympro.com/v1",
			location_tag: "",
			max_duration: 180,
			max_customers: 50
		};
		store.commit('SET_SETTINGS', defaults);					// settings to defaults
		config.set('settings', defaults);						// save defaults to disk
		config.delete('checkins');								// remove all checkins from disk
		store.dispatch('checkins/stop', null, { root: true });	// stop auto refresh of check-ins
		router.push({name: 'setup'});
	}
};



// MUTATIONS
export const mutations = {
	SET_SETTINGS: (state, value) => {
		state.settings = Object.assign({}, state.settings, value);
	}
};
