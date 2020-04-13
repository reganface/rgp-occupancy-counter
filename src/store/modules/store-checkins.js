import config from '@/services/db.js';
import { forEach } from 'lodash';
import { format, subHours } from 'date-fns';
import { get } from '@/services/ajax.js';
import { resolve, reject } from 'q';

export const namespaced = true;

// STATE
export const state = {
	checkins: {},
	in_gym_only: true,
	refresh_interval: null,
	refresh_rate: 20000
};



// GETTERS
export const getters = {
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
			list: checkins_array,
			in_gym: in_gym,
			checkins: Object.keys(state.checkins).length
		};
	},
	in_gym_only: state => state.in_gym_only,
	last_checkin_id: state => Math.max(...Object.keys(state.checkins), 0)
};



// ACTIONS
export const actions = {
	run: store => {
		let today = "2020-02-01";
		store.commit('SET_CHECKINS', config.get(`checkins.${today}`, {}));		// load any saved checkins from disk
		let last_checkin_id = store.getters['last_checkin_id'];					// get most recent checkin id

		store.state.refresh_interval = setInterval(async () => {
			await store.dispatch('get_rgp_checkins', last_checkin_id);
			last_checkin_id = store.getters['last_checkin_id'];
		}, store.state.refresh_rate);
	},

	get_rgp_checkins: async (store, last_checkin_id) => {
		let location_tag = store.rootState.setup.settings.location_tag;
		let params = {
			//startDateTime: format(new Date(), 'yyyy-MM-dd 00:00:00')
			startDateTime: '2020-02-01 00:00:00',
			//endDateTime: '2020-02-01 08:10:00',
			endDateTime: format(subHours(new Date(), 17), "2020-02-01 HH:mm:ss"),
			startId: last_checkin_id
		};
		let result = await get(`/checkins/facility/${location_tag}`, params);
		let checkins = {};
		forEach(result.checkins, value => {
			checkins[value.checkinId] = {
				checkin_id: value.checkinId,
				customer_guid: value.customerGuid,
				name: value.remoteCustomerName ? value.remoteCustomerName : "",
				status: value.status,
				details: value.details,
				level: value.level,
				postdate: value.postDate,
				time_out: null
			};
		});
		store.commit('UPDATE_CHECKINS', checkins);
		store.dispatch('lookup_new_names', checkins);
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

	get_name: async (store, checkin) => {
		let error = false;
		try {
			let result = await get(`/customers/${checkin.customer_guid}`);	// fetch name from api
			let customer = result.customer;
			checkin.name = `${customer.lastName}, ${customer.firstName} ${customer.middleName}`.trim();
		} catch (err) {
			console.log(err);
			checkin.name = "####";
			error = true;
		} finally {
			let checkin_object = { [checkin.checkin_id]: checkin };		// turn array into object in order to update the global checkin object
			store.commit('UPDATE_CHECKINS', checkin_object);
		}

		if (error) return reject();
		return resolve();
	},

	checkout: (store, data) => {
		let row = store.state.checkins[data.checkin_id];
		row.time_out = format(new Date(), "yyyy-MM-dd HH:mm:ss");
		let obj = {};
		obj[data.checkin_id] = row;
		store.commit('UPDATE_CHECKINS', obj);
	},

	checkout_remove: (store, data) => {
		let row = store.state.checkins[data.checkin_id];
		row.time_out = null;
		let obj = {};
		obj[data.checkin_id] = row;
		store.commit('UPDATE_CHECKINS', obj);
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
	},

	SET_IN_GYM_ONLY: (state, value) => {
		state.in_gym_only = value;
	}
};


function delay(x) {
	return new Promise(resolve => setTimeout(resolve, x));
}
