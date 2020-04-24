<template>
	<div>
		<v-row>
			<v-col>
				<v-btn :to="{name: 'home'}" exact color="primary" text x-large>
					<v-icon>mdi-chevron-left</v-icon>
					Back
				</v-btn>
			</v-col>
		</v-row>

		<v-row justify="center">
			<v-col cols="12" sm="8">

				<v-row justify="center">
					<v-col class="text-center">
						<div class="display-3 mb-12">Contact Tracing</div>
					</v-col>
				</v-row>

				<v-row>
					<v-col cols="4">
						Basic CSV Export
					</v-col>
					<v-col>
						<v-menu v-model="datepicker_start" :close-on-content-click="false" offset-y min-width="290px">
							<template v-slot:activator="{ on }">
								<v-text-field v-model="start_date" v-on="on" readonly label="Start Date" />
							</template>
							<v-date-picker v-model="start_date" @input="datepicker_start = false" :min="min_date" :max="end_date" />
						</v-menu>
					</v-col>
					<v-col>
						<v-menu v-model="datepicker_end" :close-on-content-click="false" offset-y min-width="290px">
							<template v-slot:activator="{ on }">
								<v-text-field v-model="end_date" v-on="on" readonly label="End Date" />
							</template>
							<v-date-picker v-model="end_date" @input="datepicker_end = false" :min="start_date" :max="today" />
						</v-menu>
					</v-col>
					<v-col>
						<v-btn @click="export_csv" color="primary">Save</v-btn>
					</v-col>
				</v-row>

				<v-row>
					<v-col>
						Contact With Customer
					</v-col>
					<v-col>
						<v-form @submit.prevent="search_customer">
							<v-text-field v-model="customer" label="[Last Name, First Name]">
								<template v-slot:append-outer>
									<v-btn type="submit" icon>
										<v-icon>mdi-account-search</v-icon>
									</v-btn>
								</template>
							</v-text-field>
						</v-form>

					</v-col>
				</v-row>

			</v-col>
		</v-row>
	</div>
</template>

<script>
//const { dialog } = require('electron').remote;
//import { writeFile } from 'fs';
import Export from '@/services/export.js';
import { config } from '@/services/db.js';
import { format, parseISO } from 'date-fns';
import { forEach } from 'lodash';

export default {
	data: () => ({
		start_date: "",
		end_date: format(new Date(), "yyyy-MM-dd"),
		datepicker_start: false,
		datepicker_end: false,
		today: format(new Date(), "yyyy-MM-dd"),
		customer: ""
	}),

	computed: {
		all_checkins() {
			return config.get('checkins');
		},

		min_date() {
			let dates = Object.keys(this.all_checkins);		// create array of all dates
			let min_date = dates.reduce((min, cur) => parseISO(cur) < min ? parseISO(cur) : min, new Date());	// return earliest date
			return format(min_date, "yyyy-MM-dd");
		}
	},

	methods: {
		export_csv() {
			const start = parseISO(this.start_date);
			const end = parseISO(this.end_date);
			const csv = new Export();
			csv.set_default_path("checkins.csv");
			csv.set_headers(["Check-In ID","Customer GUID","Name","Check-In Details","Time In","Time Out"]);

			// I don't think the order of dates can be guaranteed
			// we'll need to loop through entire object and check every date
			// rather than just loop through a range
			forEach(this.all_checkins, (checkins, index) => {
				let date = parseISO(index);
				if (date >= start && date <= end) {
					// in our range, loop through each check-in on this day
					forEach(checkins, checkin => {
						let row = [];
						row.push(checkin.checkin_id);
						row.push(checkin.customer_guid);
						row.push(checkin.name);
						row.push(checkin.details);
						row.push(checkin.postdate);
						row.push(checkin.time_out);
						csv.add_row(row);
					});
				}
			});

			csv.save(err => {
				if (err) this.$store.dispatch('notify/notify', { msg: err });
			});


		},

		search_customer() {
			this.customer = this.customer.trim();
			if (!this.customer) return;



		}
	},

	mounted() {
		this.start_date = this.min_date;
	}
}
</script>

<style scoped>

</style>
