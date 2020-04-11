import axios from 'axios';
import { resolve, reject } from 'q';

const api_client = axios.create({
	validateStatus: () => true
});


// update the connection details
export function update(params) {
	const token = Buffer.from(`${params.api_user}:${params.api_key}`, 'utf8').toString('base64');
	api_client.defaults.headers.common = {
		"Authorization": `Basic ${token}`,
		"Accept": "application/json",
		"Content-Type": "application/json"
	};
	api_client.defaults.baseURL = params.api_base_url;
}


// GET
export async function get(path, params) {
	try {
		let { data, status, statusText } = await api_client.get(path, { params: params });
		if (status === 500) throw `There was a server error: ${data.exception[0].message}`;
		if (status !== 200) throw statusText;
		return resolve(data);
	} catch (err) {
		console.warn("Error in ajax.js get: ", err);
		return reject(err);
	}
}

// POST
export async function post(path, form_data) {
	try {
		let { data, status, statusText } = await api_client.post(path, form_data);
		if (status === 500) throw `There was a server error: ${data.exception[0].message}`;
		if (status !== 200) throw statusText;
		return resolve(data);
	} catch (err) {
		console.warn("Error in ajax.js post: ", err);
		return reject(err);
	}
}
