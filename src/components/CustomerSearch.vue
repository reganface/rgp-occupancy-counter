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
				<!-- back button -->
				<v-row>
					<v-col>
						<v-btn @click="clear_search" color="primary" text>
							<v-icon>mdi-chevron-left</v-icon>
							Clear Search
						</v-btn>
					</v-col>
				</v-row>

				<v-row>
					<v-col class="text-center title font-weight-light">
						<span class="font-weight-bold">{{ contact_count | number }}</span> customers found
					</v-col>
				</v-row>

				<!-- contact result/export -->
				<v-row>
					<v-col>
						There are {{ contact_count | number }} customers that have overlapping check-ins with <span class="font-weight-bold">{{ selected_customer }}</span>
						You can export a contact list along with each customer's overlapping check-in.  Up to date contact info will be pulled from RGP.
					</v-col>
					<v-col cols="auto">
						<v-btn @click="export_contact_list" color="primary">
							Export Contact List
						</v-btn>
					</v-col>
				</v-row>

				<v-row v-if="contact_count >= 250">
					<v-col>
						<v-alert type="warning" outlined>
							Due to the size of this list, it's possible we will hit RGP's rate limit for their API.
							As a result, this may take several minutes to acquire all contact info.
							You may also see a "429 - Too Many Requests" error pop up during this time, which is normal.
							As soon as all data has been collected, the Save File dialog will pop up.
						</v-alert>

					</v-col>
				</v-row>

				<v-row v-if="rgp_message">
					<v-col>
						{{ rgp_message }}
						<v-progress-circular v-if="rgp_loading" indeterminate />
					</v-col>
				</v-row>
			</div>
		</transition>

	</div>
</template>

<script>
import { lookup_customer, find_customer_contacts, get_customer_contact_info } from '@/services/contact-search.js';
import { forEach, isEmpty } from 'lodash';
import Export from '@/services/export.js';

export default {
	data: () => ({
		customer: "",
		search_result: {},
		contact_result: {},
		selected_customer: "",
		rgp_loading: false
	}),

	computed: {
		disable_transitions() {
			return this.$store.getters['setup/disable_transitions'];
		},

		contact_count() {
			return Object.keys(this.contact_result).length;
		},

		rgp_message() {
			return this.$store.getters['checkins/rgp_message'];
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
			this.search_result = lookup_customer(this.customer);
		},

		// customer selected, now search for all customers that had overlapping check-ins with this customer
		select_customer(customer) {
			this.search_result = {};	// clear customer search
			this.customer = "";
			this.selected_customer = customer.name;
			this.contact_result = find_customer_contacts(customer);
		},

		// save the contact list to a csv file TODO: ping rgp with array of customers ids to get the actual contact info
		async export_contact_list() {
			const csv = new Export();
			csv.set_default_path("contact-list.csv");
			let max_checkins = 1;	// used to add extra column headers
			const separator = "----------";
			let headers = [
				"Customer GUID",
				"Name",
				"Email",
				"Home Phone",
				"Work Phone",
				"Cell Phone",
				"Address 1",
				"Address 2",
				"City",
				"State",
				"Postal Code",
				"Country"
			];
			let checkin_headers = [
				"Time In",
				"Time Out",
				"Overlap Duration in Minutes",
				"Other Customer Time In",
				"Other Customer Time Out",
				separator
			];

			// update the list with contact info from RGP
			this.rgp_loading = true;
			this.contact_result = await get_customer_contact_info(this.contact_result);
			this.rgp_loading = false;

			forEach(this.contact_result, (customer, customer_guid) => {
				let row = [];
				max_checkins = Math.max(max_checkins, customer.checkins.length);
				row.push(customer_guid);
				row.push(customer.name);
				row.push(customer.email);
				row.push(customer.home_phone);
				row.push(customer.work_phone);
				row.push(customer.cell_phone);
				row.push(customer.address1);
				row.push(customer.address2);
				row.push(customer.city);
				row.push(customer.state);
				row.push(customer.zip);
				row.push(customer.country);

				forEach(customer.checkins, checkin => {
					row.push(checkin.postdate);
					row.push(checkin.time_out);
					row.push(checkin.overlap_duration_minutes);
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
	},

	filters: {
		number(n) {
			return n.toLocaleString();
		}
	},

	beforeDestroy() {
		// clear message if there is one
		this.$store.dispatch('checkins/set_rgp_message', "");
	}
}
</script>

<style scoped>

</style>
