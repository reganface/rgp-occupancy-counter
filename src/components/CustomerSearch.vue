<template>
	<div>
		<div class="text-center title py-5 font-weight-light">
			Look up a specific customer, and get a list of all other customers who were in the facility at the same time.
		</div>

		<transition :name="disable_transitions ? '' : 'fade'" mode="out-in">
			<!-- customer search box -->
			<v-row v-if="empty(search_result) && empty(contact_result)" key="main">
				<v-col>
					<v-form @submit.prevent="search_customer">
						<v-text-field v-model="customer" label="[Last Name, First Name]">
							<template v-slot:append-outer>
								<v-btn type="submit" color="primary" small>
									<v-icon>mdi-account-search</v-icon>
									Search
								</v-btn>
							</template>
						</v-text-field>
					</v-form>

				</v-col>
			</v-row>

			<!-- customer search results -->
			<div v-if="!empty(search_result)" key="search">
				<v-row>
					<v-col>
						<v-btn @click="clear_search" color="primary" text>
							<v-icon>mdi-chevron-left</v-icon>
							Clear Search
						</v-btn>
					</v-col>
				</v-row>

				<v-row>
					<v-col>
						<div class="subtitle-2">
							Select a customer below.
							If you have a large dataset and/or a slow computer, the program may appear to freeze up for several seconds while searching for overlapping check-ins.
							Be paitent - it should return the search results shortly!
						</div>
						<v-list>
							<v-list-item @click="select_customer(customer)" v-for="(customer, i) in search_result" :key="i">
								<v-row>
									<v-col>
										{{ customer.name }}
									</v-col>
									<v-col cols="auto">
										{{ customer.checkins.length }} check-in<span v-if="customer.checkins.length != 1">s</span>
									</v-col>
								</v-row>
							</v-list-item>
						</v-list>
					</v-col>
				</v-row>
			</div>


			<!-- contact search results -->
			<div v-else-if="!empty(contact_result)" key="contact">
				<!-- back and export buttons -->
				<v-row>
					<v-col>
						<v-btn @click="clear_search" color="primary" text>
							<v-icon>mdi-chevron-left</v-icon>
							Clear Search
						</v-btn>
					</v-col>
					<v-col cols="auto">
						<v-btn @click="export_contact_list" color="primary">
							Export Contact List
						</v-btn>
					</v-col>
				</v-row>

				<!-- headline showing selected customer -->
				<v-row>
					<v-col class="title text-center">
						<span class="font-weight-light">Overlapping Check-Ins with</span> {{ selected_customer }}
					</v-col>
				</v-row>

				<!-- list of contacts -->
				<v-row>
					<v-col>
						<v-list>
							<v-list-item v-for="(customer, i) in contact_result" :key="i">
								<v-row>
									<v-col>
										{{ customer.name }}
									</v-col>
									<v-col cols="auto">
										{{ customer.checkins.length }} overlapping check-in<span v-if="customer.checkins.length != 1">s</span>
									</v-col>
								</v-row>
							</v-list-item>
						</v-list>
					</v-col>
				</v-row>
			</div>
		</transition>

	</div>
</template>

<script>
import { config } from '@/services/db.js';
import { forEach, isEmpty } from 'lodash';
import { parseISO } from 'date-fns';
import Export from '@/services/export.js';

export default {
	data: () => ({
		customer: "",
		search_result: {},
		contact_result: {},
		selected_customer: ""
	}),

	computed: {
		disable_transitions() {
			return this.$store.getters['setup/disable_transitions'];
		}
	},

	methods: {
		empty(obj) {
			return isEmpty(obj);
		},

		clear_search() {
			this.customer = "";
			this.search_result = {};
			this.contact_result = {};
			this.selected_customer = "";
		},

		// search for a specific customer from our check-ins
		search_customer() {
			// if the search is an empty string, return
			this.customer = this.customer.toLowerCase().trim();
			if (!this.customer) return;

			let customer_list = {};
			let search_lastname = this.customer.split(",")[0];
			let search_firstname = this.customer.split(",")[1];

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

			this.search_result = customer_list;

		},

		// customer selected, now search for all customers that had overlapping check-ins with this customer
		select_customer(customer) {
			this.search_result = {};	// clear customer search
			this.customer = "";
			this.selected_customer = customer.name;
			let customer_list = {};

			forEach(customer.checkins, customer_checkin => {
				let day = customer_checkin.postdate.substring(0, 10);	// get the day of this check-in from the postdate
				let customer_start = parseISO(customer_checkin.postdate);
				let customer_end = parseISO(customer_checkin.time_out);
				let checkins_day = config.get(`checkins.${day}`);	// load all checkins from that day

				// loop through all check-ins on this day and see what matches
				forEach(checkins_day, checkin => {
					if (customer_checkin.customer_guid === checkin.customer_guid) return;	// same customer, ignore
					let checkin_start = parseISO(checkin.postdate);
					let checkin_end = parseISO(checkin.time_out);
					if (customer_end >= checkin_start && customer_start <= checkin_end) {
						// we've got some overlap
						if (customer_list[checkin.customer_guid] === undefined) {
							customer_list[checkin.customer_guid] = {
								name: checkin.name,
								checkins: []
							};
						}

						// get duration of overlap
						let duration = null;
						if (customer_start <= checkin_start && customer_end >= checkin_end) {
							// entire duration of checkin
							duration = checkin_end - checkin_start;
						} else if (customer_start >= checkin_start && customer_end <= checkin_end) {
							// entire duration of customer
							duration = customer_end - customer_start;
						} else if (customer_start >= checkin_start && customer_end >= checkin_end) {
							// from customer start to checkin end
							duration = checkin_end - customer_start;
						} else if (customer_start <= checkin_start && customer_end <= checkin_end) {
							// from checkin start to customer end
							duration = customer_end = checkin_start;
						}

						// add some extra data
						let extra_data = {
							other_customer_time_in: customer_checkin.postdate,
							other_customer_time_out: customer_checkin.time_out,
							overlap_duration_seconds: duration / 1000
						};

						customer_list[checkin.customer_guid].checkins.push({ ...checkin, ...extra_data });
					}
				});

			});

			this.contact_result = customer_list;
		},

		// save the contact list to a csv file TODO: ping rgp with array of customers ids to get the actual contact info
		export_contact_list() {
			const csv = new Export();
			csv.set_default_path("contact-list.csv");
			let max_checkins = 1;	// used to add extra column headers
			const separator = "----------";
			let headers = [
				"Customer GUID",
				"Name"
			];
			let checkin_headers = [
				"Time In",
				"Time Out",
				"Overlap Duration in Seconds",
				"Other Customer Time In",
				"Other Customer Time Out",
				separator
			];

			forEach(this.contact_result, (customer, customer_guid) => {
				let row = [];
				max_checkins = Math.max(max_checkins, customer.checkins.length);
				row.push(customer_guid);
				row.push(customer.name);

				forEach(customer.checkins, checkin => {
					row.push(checkin.postdate);
					row.push(checkin.time_out);
					row.push(checkin.overlap_duration_seconds);
					row.push(checkin.other_customer_time_in);
					row.push(checkin.other_customer_time_out);
					row.push(separator);
				});

				csv.add_row(row);
			});

			// add extra headers as needed
			for (let i = 0; i < max_checkins; i++) {
				headers.push(...checkin_headers);
			}

			csv.set_headers(headers);

			csv.save(err => {
				if (err) this.$store.dispatch('notify/notify', { msg: err });
			});
		}
	}
}
</script>

<style scoped>

</style>
