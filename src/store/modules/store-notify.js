export const namespaced = true;
let timeout = null;

/*******************
 *	STATE
 *******************/
export const state = {
	show: false,
	type: "error",
	duration: 10000,
	msg: ""
};



/*******************
 *	GETTERS
 *******************/
export const getters = {
	show: state => state.show,
	type: state => state.type,
	duration: state => state.duration,
	msg: state => state.msg,
};



/*******************
 *	ACTIONS
 *******************/
export const actions = {
	notify: (store, data) => {
		clearTimeout(timeout);
		store.commit('SET_NOTIFY', data);
		timeout = setTimeout(() => {
			store.commit('HIDE');
		}, store.state.duration);
	},

	hide: store => {
		clearTimeout(timeout);
		store.commit('HIDE');
	}
};



/*******************
 *	MUTATIONS
 *******************/
export const mutations = {
	HIDE: state => {
		state.show = false;
	},

	SET_NOTIFY: (state, value) => {
		state.show = true;
		state.type = value.type ? value.type : state.type;
		state.duration = value.duration ? value.duration : state.duration,
		state.msg = value.msg
	}
};
