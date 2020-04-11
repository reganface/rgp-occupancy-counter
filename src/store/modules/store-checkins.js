//import config from '@/services/db.js';
import { forEach } from 'lodash';
import { format } from 'date-fns';
import { get } from '@/services/ajax.js';

export const namespaced = true;

// STATE
export const state = {
	checkins: {}
};



// GETTERS
export const getters = {
	checkins: state => {
		let checkins_array = Object.values(state.checkins);
		let in_gym = checkins_array.reduce((sum, checkin) => {
			return checkin.time_out ? sum : sum + 1;
		}, 0);

		return {
			list: checkins_array,
			in_gym: in_gym
		};
	}
};



// ACTIONS
export const actions = {
	get_rgp_checkins: async (store, data) => {
		let result = await get(`/checkins/facility/${data.location_tag}`, data);
		let checkins = {};
		forEach(result.checkins, value => {
			checkins[value.checkinId] = {
				checkin_id: value.checkinId,
				customer_guid: value.customerGuid,
				details: value.details,
				level: value.level,
				postdate: value.postDate,
				time_out: null
			};
		});
		store.commit('SET_CHECKINS', checkins);
	},

	checkout: (store, data) => {
		let row = store.state.checkins[data.checkin_id];
		row.time_out = format(new Date(), "yyyy-MM-dd HH:mm:ss");
		let obj = {};
		obj[data.checkin_id] = row;
		store.commit('SET_CHECKINS', obj);
	}
};



// MUTATIONS
export const mutations = {
	SET_CHECKINS: (state, value) => {
		state.checkins = Object.assign({}, state.checkins, value);
	}
};
