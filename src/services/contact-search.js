import { resolve } from 'q';
import { config } from '@/services/db.js';
import { forEach } from 'lodash';
import { parseISO } from 'date-fns';
import { get } from '@/services/ajax.js';
import store from '@/store/store.js';

// take a partial name search and return a list of possible matches
export const lookup_customer = search => {
	// if the search is an empty string, return
	search = search.toLowerCase().trim();
	if (!search) return {};

	let customer_list = {};
	let search_lastname = search.split(",")[0];
	let search_firstname = search.split(",")[1];

	let all_checkins = config.get('checkins');
	forEach(all_checkins, checkins => {
		// looping through each day of check-ins
		forEach(checkins, checkin => {
			// looping through each check-in for this day
			if (!checkin.name) return;
			let lastname = checkin.name.split(",")[0];
			let firstname = checkin.name.split(",")[1];
			let last_test = search_lastname ? lastname.toLowerCase().includes(search_lastname.trim()) : true;
			let first_test = search_firstname ? firstname.toLowerCase().includes(search_firstname.trim()) : true;

			if (last_test && first_test) {
				// we've got a match!
				// store the customer in an object as an array of all their check-ins

				// check if we've come across this customer already
				if (customer_list[checkin.customer_guid] === undefined) {
					// new customer in search
					customer_list[checkin.customer_guid] = {
						name: checkin.name,
						customer_guid: checkin.customer_guid,
						checkins: []
					};
				}
				customer_list[checkin.customer_guid].checkins.push(checkin);
			}
		});
	});

	return customer_list;
}


// take a customer with all their check-ins
// return list of customers that were in the gym at the same time
export const find_customer_contacts = customer => {
	let dates = [];

	// build array of check-in dates
	forEach(customer.checkins, checkin => {
		dates.push({ start: checkin.postdate, end: checkin.time_out });
	});

	// use date range contacts functions to do the contact serach
	return date_range_contacts(dates, customer.customer_guid);
}


// take an array of date ranges
// return a list of customers in the gym at those times
// matches with ignore_guid will be skipped
export const date_range_contacts = (dates, ignore_guid) => {
	let customer_list = {};

	forEach(dates, date => {
		let day = date.start.substring(0, 10);	// get the day of this check-in from the postdate
		let date_start = parseISO(date.start);
		let date_end = date.end ? parseISO(date.end) : parseISO(`${day} 23:59:59`);		// if there is no end date, make it the end of the day
		let checkins_day = config.get(`checkins.${day}`);	// load all checkins from that day

		// loop through all check-ins on this day and see what matches
		forEach(checkins_day, checkin => {
			if (checkin.customer_guid === ignore_guid) return;	// ignore this customer
			let checkin_start = parseISO(checkin.postdate);
			let checkin_end = checkin.time_out ? parseISO(checkin.time_out) : parseISO(`${day} 23:59:59`);
			if (date_end >= checkin_start && date_start <= checkin_end) {
				// we've got some overlap
				if (customer_list[checkin.customer_guid] === undefined) {
					customer_list[checkin.customer_guid] = {
						name: checkin.name,
						checkins: []
					};
				}

				// get duration of overlap
				let duration = null;
				if (date_start <= checkin_start && date_end >= checkin_end) {
					// entire duration of checkin
					duration = checkin_end - checkin_start;
				} else if (date_start >= checkin_start && date_end <= checkin_end) {
					// entire duration of customer
					duration = date_end - date_start;
				} else if (date_start >= checkin_start && date_end >= checkin_end) {
					// from customer start to checkin end
					duration = checkin_end - date_start;
				} else if (date_start <= checkin_start && date_end <= checkin_end) {
					// from checkin start to customer end
					duration = date_end - checkin_start;
				}

				// add some extra data
				let extra_data = {
					other_customer_time_in: date.start,
					other_customer_time_out: date.end,
					overlap_duration_minutes: Math.round(duration / 1000 / 60)
				};

				customer_list[checkin.customer_guid].checkins.push({ ...checkin, ...extra_data });
			}
		});
	});

	return customer_list;
}


// get all customer guids in the list and get their contact info from RGP
export const get_customer_contact_info = async customer_list => {
	// this end point has a limit to the amount of guids you can request at once
	// we need to split up the array into chunks and perform multiple requests
	const limit = 25;
	let guid_array = Object.keys(customer_list);
	let guids = [];
	let total_customers = guid_array.length;
	let total_downloaded = 0;

	// create array of comma separated guids
	for (let i = 0; i < total_customers; i += limit) {
		guids.push(guid_array.slice(i, i+limit).join());
	}

	// loop through each guid list and get contact info
	for (const guid_list of guids) {
		// set message
		let msg = `Getting contact info from RGP. ${total_downloaded} of ${total_customers} downloaded...`;
		store.dispatch('checkins/set_rgp_message', msg);

		// it's very possible we can hit the api rate limit here for a large list
		// if we do, wait a bit, then try again
		let exit = false;
		do {
			try {
				// use var here so result is hoisted out of this try block
				var result = await get('/customers', { customerGuid: guid_list }, true);
				exit = true;
			}
			catch (response) {
				if (response.status == 429) {
					// we've hit the rate limit, retry again after 15 second delay
					let msg = `Rate limit reached, resuming in roughly 60 seconds... ${total_downloaded} of ${total_customers} downloaded...`;
					store.dispatch('checkins/set_rgp_message', msg);
					await delay(15000);
				}
				else {
					// this was a different error, don't try again
					exit = true;
				}
			}
		} while (!exit);

		// use reduce to loop through all customer data we just got
		// take the needed contact info
		// and add in the name/check-in info already in customer_list
		let contact_info = result.customer.reduce((new_data, customer) => ({
			[customer.customerGuid]: {
				address1: customer.address1,
				address2: customer.address2,
				city: customer.city,
				state: customer.state,
				zip: customer.zip,
				country: customer.country,
				email: customer.email,
				home_phone: customer.homePhone,
				work_phone: customer.workPhone,
				cell_phone: customer.cellPhone,
				...customer_list[customer.customerGuid]
			},
			...new_data
		}), {});

		// update the customer_list object
		Object.assign(customer_list, contact_info);

		// update count
		total_downloaded = Math.min(total_downloaded + limit, total_customers);
	}

	// set message
	store.dispatch('checkins/set_rgp_message', "All contact info downloaded.");
	return resolve(customer_list);

}


// helper function to be able to use setTimeout with async/await
function delay(x) {
	return new Promise(resolve => setTimeout(resolve, x));
}
