import axios from 'axios';
import { resolve, reject } from 'q';
import store from '@/store/store';

const api_client = axios.create({
	validateStatus: () => true,
	timeout: 10000,
});


// update the connection details
export function update(params) {
	if (params.master) {
		// set up to connect to RGP API
		const token = Buffer.from(`${params.api_user}:${params.api_key}`, 'utf8').toString('base64');
		api_client.defaults.headers.common = {
			"Authorization": `Basic ${token}`,
			"Accept": "application/json",
			"Content-Type": "application/json"
		};
		api_client.defaults.baseURL = params.api_base_url;

	} else {
		// connect to a master server
		api_client.defaults.headers.common = {
			"Accept": "application/json",
			"Content-Type": "application/json"
		};
		api_client.defaults.baseURL = `http://${params.master_ip}:${params.port}`;
	}

}


// GET
export async function get(path, params) {
	try {
		store.dispatch('start_loading');
		let response = await api_client.get(path, { params: params });
		if (response.status !== 200) throw response;
		return resolve(response.data);
	} catch (response) {
		let msg = response.status ? `${response.status} - ${response.data.message}` : response;
		store.dispatch('notify/notify', { msg });
		return reject(msg);
	} finally {
		store.dispatch('stop_loading');
	}
}

// POST
export async function post(path, form_data) {
	try {
		store.dispatch('start_loading');
		let response = await api_client.post(path, form_data);
		if (response.status !== 200) throw response;
		return resolve(response.data);
	} catch (response) {
		let msg = response.status ? `${response.status} - ${response.data.message}` : response;
		store.dispatch('notify/notify', { msg });
		return reject(msg);
	} finally {
		store.dispatch('stop_loading');
	}
}
