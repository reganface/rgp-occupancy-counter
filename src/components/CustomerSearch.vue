<template>
	<div>
		<div class="text-center title py-5 font-weight-light">
			Look up a specific customer, and get a list of all other customers who were in the facility at the same time.
		</div>

		<transition :name="disable_transitions ? '' : 'fade'" mode="out-in">
			<!-- customer search box -->
			<v-row v-if="empty(search_result) && empty(contact_result) && !reference_id" key="main">
				<v-col>
					<v-form @submit.prevent="search_customer">
						<v-text-field v-model="customer" label="[Last Name, First Name]" hint="Press Enter to search">
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
			<div v-else-if="!empty(contact_result) || reference_id" key="contact">
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
						<span class="font-weight-bold">{{ master ? contact_count : reference_count | number }}</span> customers found
					</v-col>
				</v-row>

				<!-- contact result/export -->
				<v-row>
					<v-col>
						There are {{ master ? contact_count : reference_count | number }} customers that have overlapping check-ins with <span class="font-weight-bold">{{ selected_customer }}</span>
						You can export a contact list along with each customer's overlapping check-in.  Up to date contact info will be pulled from RGP.
					</v-col>
					<v-col cols="auto">
						<v-btn @click="export_contact_list" color="primary">
							Export Contact List
						</v-btn>
					</v-col>
				</v-row>

				<v-row v-if="contact_count >= 250 || reference_count >= 250">
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
import { isEmpty } from 'lodash';
import Export from '@/services/export.js';
import { get } from '@/services/ajax.js';

export default {
	data: () => ({
		customer: "",
		search_result: {},
		contact_result: {},
		selected_customer: "",
		rgp_loading: false,
		reference_id: null,
		reference_count: 0
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
		},

		master() {
			return this.$store.getters['setup/master'];
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
			this.reference_id = null;
			this.reference_count = 0;
		},

		// search for a specific customer from our check-ins
		async search_customer() {
			if (this.master) {
				this.search_result = lookup_customer(this.customer);
			} else {
				// reqeust search from the master
				let result = await get('/lookup-customer', { search: this.customer });
				this.search_result = result.customers;
			}

		},

		// customer selected, now search for all customers that had overlapping check-ins with this customer
		async select_customer(customer) {
			if (this.master) {
				this.contact_result = find_customer_contacts(customer);
			} else {
				// request lookup from master with the customer guid
				// we just get a reference id back here
				let result = await get('/customer-contacts', { customer_guid: customer.customer_guid });
				this.reference_id = result.reference_id;
				this.reference_count = result.contact_count;
			}

			this.search_result = {};	// clear customer search
			this.customer = "";
			this.selected_customer = customer.name;

		},

		// save the contact list to a csv file
		async export_contact_list() {
			const csv = new Export();
			this.rgp_loading = true;

			if (this.master) {
				// update the list with contact info from RGP
				this.contact_result = await get_customer_contact_info(this.contact_result);
			} else {
				// reqeust this from master with the reference id
				this.contact_result = await get('/contact-info', { reference_id: this.reference_id });
				if (this.contact_result.error) {
					// there was an error
					this.$store.dispatch('notify/notify', { msg: this.contact_result.error });
					this.clear_search();
				}
			}

			this.rgp_loading = false;

			// export the list if there was no error
			if (!this.contact_result.error) csv.export_contact_list(this.contact_result);

		}
	},

	filters: {
		number(n) {
			return n.toLocaleString();
		}
	}
}
</script>

<style scoped>

</style>
