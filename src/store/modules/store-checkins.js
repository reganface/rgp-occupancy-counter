import { config, sync_object } from '@/services/db.js';
import { forEach } from 'lodash';
import { format, parseISO } from 'date-fns';
import { get, post } from '@/services/ajax.js';
import { resolve, reject } from 'q';
let today = format(new Date(), 'yyyy-MM-dd');

export const namespaced = true;

// STATE
export const state = {
	checkins: {},
	in_gym_only: true,
	refresh_interval: null,
	refresh_rate: 20000,		// how often to ping rgp for new check-ins (in milliseconds)
	last_updated: format(new Date(), 'yyyy-MM-dd 00:00:00')		// for clients to sync with master - defaults to the start of today
};



// GETTERS
export const getters = {
	all_checkins: state => state.checkins,	// all checkins, unfiltered
	checkins: state => {
		let checkins_array = Object.values(state.checkins);
		let in_gym = 0;

		if (state.in_gym_only) {
			// filter check-ins down to only customers that are still in the gym
			checkins_array = checkins_array.filter(checkin => !checkin.time_out);
			in_gym = checkins_array.length;
		} else {
			// all check-ins displayed, so we need to use reduce to calculate the in-gym count
			in_gym = checkins_array.reduce((sum, checkin) => {
				return checkin.time_out ? sum : sum + 1;
			}, 0);
		}

		return {
			list: checkins_array,	// filtered list of checkins
			in_gym: in_gym,		// number of customers currently in the gym
			checkins: Object.keys(state.checkins).length	// total checkin count for the day
		};
	},
	in_gym_only: state => state.in_gym_only,
	last_checkin_id: state => Math.max(...Object.keys(state.checkins), 0),
	last_updated: state => state.last_updated
};



// ACTIONS
export const actions = {
	run: async store => {
		store.commit('SET_CHECKINS', config.get(`checkins.${today}`, {}));	// load any saved checkins from disk
		await store.dispatch('get_rgp_checkins', store.getters['last_checkin_id']);	// initial load

		store.state.refresh_interval = setInterval(() => {
			store.dispatch('get_rgp_checkins', store.getters['last_checkin_id']);
		}, store.state.refresh_rate);
	},

	run_as_client: async store => {
		await store.dispatch('get_master_checkins', store.getters['last_updated']);

		store.state.refresh_interval = setInterval(() => {
			store.dispatch('get_master_checkins', store.getters['last_updated']);
		}, store.state.refresh_rate);
	},

	stop: store => {
		// stop auto refresh and clear checkins that are already loaded
		clearInterval(store.state.refresh_interval);
		store.commit('SET_CHECKINS', {});
	},

	get_rgp_checkins: async (store, last_checkin_id) => {
		let location_tag = store.rootState.setup.settings.location_tag;
		let params = {
			startDateTime: format(new Date(), 'yyyy-MM-dd 00:00:00'),
			endDateTime: format(new Date(), 'yyyy-MM-dd HH:mm:ss'),
			startId: last_checkin_id
		};
		let result = await get(`/checkins/facility/${location_tag}`, params);
		let checkins = {};
		forEach(result.checkins, value => {
			checkins[value.checkinId] = {
				checkin_id: value.checkinId,
				customer_guid: value.customerGuid,
				name: value.remoteCustomerName ? value.remoteCustomerName : "",
				details: value.details,
				postdate: value.postDate,
				time_out: null,
				last_updated: format(new Date(), "yyyy-MM-dd HH:mm:ss")
			};
		});
		store.commit('UPDATE_CHECKINS', checkins);
		store.dispatch('lookup_new_names', checkins);
	},

	get_master_checkins: async (store, last_updated) => {
		// get new/updated checkins from master
		let checkins = await get(`/checkins/${last_updated}`);

		// get the most recent last_updated from
		// convert to array, then reduce that to the max last_updated
		let new_time = Object.values(checkins).reduce((acc, cur) => {
			return parseISO(cur.last_updated) > parseISO(acc) ? cur.last_updated : acc;
		}, last_updated);

		store.commit('UPDATE_CHECKINS', checkins);
		store.commit('SET_LAST_UPDATED', new_time);
	},


	lookup_new_names: async (store, checkins) => {
		let checkins_array = Object.values(checkins);
		let need_names = checkins_array.filter(checkin => checkin.customer_guid && !checkin.name);
		let count = need_names.length;
		let lookup_delay = count > 10 ? 4500 : 1500;

		// loop through all checkins that need a name
		for (const need_name of need_names) {
			try {
				await store.dispatch('get_name', need_name);
				await delay(lookup_delay);
			} catch (err) {
				// most likely hit the API rate limit, extra delay
				await delay(65000);
			}
		}
	},

	// get a customer name from RGP for a specific check-in
	get_name: async (store, checkin) => {
		let now = format(new Date(), "yyyy-MM-dd HH:mm:ss");
		let error = false;
		try {
			let result = await get(`/customers/${checkin.customer_guid}`);	// fetch name from api
			let customer = result.customer;
			checkin.name = `${customer.lastName}, ${customer.firstName} ${customer.middleName}`.trim();
			checkin.last_updated = now;
		} catch (err) {
			checkin.name = "####";
			error = true;
		} finally {
			let checkin_object = { [checkin.checkin_id]: checkin };		// turn array into object in order to update the global checkin object
			store.commit('UPDATE_CHECKINS', checkin_object);
		}

		if (error) return reject();
		return resolve();
	},

	checkout: async (store, data) => {
		let now = format(new Date(), "yyyy-MM-dd HH:mm:ss");
		let master = store.rootGetters['setup/master'];

		if (master) {
			// this is the master server, update here
			let row = store.state.checkins[data.checkin_id];
			row.time_out = now;
			row.last_updated = now;
			store.commit('UPDATE_CHECKINS', { [data.checkin_id]: row });
		} else {
			// this is just a client, send POST to master server
			await post('/add-checkout', { checkin_id: data.checkin_id });

			// update local copy of check-ins so that UI is updated now
			// times might slightly differ from master, but it will be synced on next refresh
			let row = store.state.checkins[data.checkin_id];
			row.time_out = now;
			store.commit('UPDATE_CHECKINS', { [data.checkin_id]: row });
		}

	},

	checkout_remove: async (store, data) => {
		let now = format(new Date(), "yyyy-MM-dd HH:mm:ss");
		let master = store.rootGetters['setup/master'];

		if (master) {
			// this is the master, update here
			let row = store.state.checkins[data.checkin_id];
			row.time_out = null;
			row.last_updated = now;
			store.commit('UPDATE_CHECKINS', { [data.checkin_id]: row });
		} else {
			// this is a client, POST to master
			await post('/remove-checkout', { checkin_id: data.checkin_id });

			// update local copy of check-ins so that UI is updated now
			// times might slightly differ from master, but it will be synced on next refresh
			let row = store.state.checkins[data.checkin_id];
			row.time_out = null;
			store.commit('UPDATE_CHECKINS', { [data.checkin_id]: row });
		}

	},

	set_in_gym_only: (store, value) => {
		store.commit('SET_IN_GYM_ONLY', value);
	}
};



// MUTATIONS
export const mutations = {
	SET_CHECKINS: (state, value) => {
		state.checkins = value;
	},

	UPDATE_CHECKINS: (state, value) => {
		state.checkins = Object.assign({}, state.checkins, value);
		sync_object(`checkins.${today}`, state.checkins);
	},

	SET_IN_GYM_ONLY: (state, value) => {
		state.in_gym_only = value;
	},

	SET_LAST_UPDATED: (state, value) => {
		state.last_updated = value;
	}
};


function delay(x) {
	return new Promise(resolve => setTimeout(resolve, x));
}
