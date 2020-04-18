import { resolve } from 'q';
import { config } from '@/services/db.js';
import { get, update } from '@/services/ajax.js';
import router from '@/router/router.js';
import Vuetify from '@/plugins/vuetify'

export const namespaced = true;

/*******************
 *	STATE
 *******************/
export const state = {
	settings: {
		init: false,
		master: null,
		api_user: "",
		api_key: "",
		api_base_url: "https://api.rockgympro.com/v1",
		location_tag: "",
		master_ip: "",
		master_port: 3000,
		max_duration: 180,		// time in minutes
		max_customers: 50
	},
	client_settings: {
		dark_mode: false,
		disable_transitions: false
	},
	scan_progress: 0,

};



/*******************
 *	GETTERS
 *******************/
export const getters = {
	settings: state => state.settings,
	max_duration: state => state.settings.max_duration,
	max_customers: state => state.settings.max_customers,
	master: state => state.settings.master,
	master_path: state => `http://${state.settings.master_ip}:${state.settings.master_port}`,
	dark_mode: state => state.client_settings.dark_mode,
	disable_transitions: state => state.client_settings.disable_transitions,
	scan_progress: state => state.scan_progress
};



/*******************
 *	ACTIONS
 *******************/
export const actions = {
	// read settings from disk on program load
	init: async store => {
		const settings = config.get('settings');
		store.commit('SET_SETTINGS', settings);
		update(settings);	// update axios settings for get/post

		const client_settings = config.get('client_settings');
		store.commit('SET_CLIENT_SETTINGS', client_settings);
		Vuetify.framework.theme.dark = client_settings.dark_mode;	// apply dark mode from saved settings
	},

	// ping RGP's API - if we get 'pong' save credentials to disk
	check_api: async (store, data) => {
		await get('/ping');
		store.dispatch('update_settings', data)
	},

	// get a list of all facility locations from RGP
	get_locations: async () => {
		let result = await get('/facilities');
		return resolve(result.facilities);
	},

	// update or add any new settings to the vuex state and to disk
	update_settings: (store, data) => {
		store.commit('SET_SETTINGS', data);
		config.set('settings', Object.assign({}, store.state.settings, data));	// save to config (disk)
	},

	// update/add to client settings
	update_client_settings: (store, data) => {
		store.commit('SET_CLIENT_SETTINGS', data);
		config.set('client_settings', Object.assign({}, store.state.client_settings, data));

		// if dark mode is being changed, update the vuetify theme setting
		if ("dark_mode" in data) {
			Vuetify.framework.theme.dark = data.dark_mode;
		}
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
			master_ip: "",
			master_port: 3000,
			max_duration: 180,
			max_customers: 50
		};
		store.commit('SET_SETTINGS', defaults);					// settings to defaults
		config.set('settings', defaults);						// save defaults to disk
		config.delete('checkins');								// remove all checkins from disk
		store.dispatch('checkins/stop', null, { root: true });	// stop auto refresh of check-ins
		router.push({ name: 'setup' });
	},

	update_scan_progress: (store, value) => {
		store.commit('SET_SCAN_PROGRESS', value);
	}
};



/*******************
 *	MUTATIONS
 *******************/
export const mutations = {
	SET_SETTINGS: (state, value) => {
		state.settings = Object.assign({}, state.settings, value);
	},

	SET_CLIENT_SETTINGS: (state, value) => {
		state.client_settings = Object.assign({}, state.client_settings, value);
	},

	SET_SCAN_PROGRESS: (state, value) => {
		state.scan_progress = value;
	}
};
