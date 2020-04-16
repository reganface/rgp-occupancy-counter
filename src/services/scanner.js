import { resolve, reject } from 'q';
import { get } from '@/services/ajax.js';
import store from '@/store/store.js';
import ip from 'ip';
const subnet = ip.mask(ip.address(), '255.255.255.0');	// assuming a /24 subnet here...
const base = subnet.substring(0, subnet.length - 1);
const port = 3000;

// globals to keep track of which IPs have been scanned
const max_inflight = 150;
let current = 1;
let remaining = 254;
let inflight = 0;
let master_addr = null;


export default async () => {
	const local_addr = ip.address();
	if (local_addr == "127.0.0.1") return reject("No network connection found");

	// set globals back to defaults
	current = 1;
	remaining = 254;
	inflight = 0;
	master_addr = null;

	await search();
	if (!master_addr) return reject("Unable to find Master");
	else return resolve(master_addr);
};


// search through all 254 ip addresses in this subnet and return the master IP if found
const search = async () => {
	return new Promise(resolve => {
		let search_interval = setInterval(() => {
			console.log(current, remaining, inflight);
			if (master_addr || current > 254 && inflight <= 0) {
				// scan is finished
				clearInterval(search_interval);
				return resolve(master_addr);
			} else if (current <= 254 && inflight <= max_inflight) {
				inflight++;
				ping(`${base}${current}`);
				current++;
			}
		}, 20);
	})
};


// check an individual ip address
const ping = async test_ip => {
	try {
		let result = await get(`http://${test_ip}:${port}/ping`);
		if (result !== "pong") throw "Not the correct server";

		// master address found
		master_addr = test_ip;
		inflight = 0;
		remaining = 0;

	} catch (err) {
		// nothing to do here
	} finally {
		inflight--;
		remaining--;
		let progress = Math.round(((254 - remaining) / 254) * 100);
		store.dispatch('setup/update_scan_progress', progress);
	}
}
