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
				<div class="display-3 mb-12 text-center">Generate Check-Ins</div>

				<v-row>
					<v-col>
						Start Date
					</v-col>
					<v-col>
						<v-menu v-model="datepicker" :close-on-content-click="false" offset-y min-width="290px">
							<template v-slot:activator="{ on }">
								<v-text-field v-model="start_date" v-on="on" readonly label="Start Date" />
							</template>
							<v-date-picker v-model="start_date" @input="datepicker = false" />
						</v-menu>
					</v-col>
				</v-row>

				<v-row>
					<v-col>
						Number of check-ins per day
					</v-col>
					<v-col>
						<v-text-field v-model="checkins_per_day" type="number" min="0" />
					</v-col>
				</v-row>

				<v-row>
					<v-col>

					</v-col>
					<v-col>
						<v-btn @click="generate" color="primary">Generate</v-btn>
					</v-col>
				</v-row>

				<v-divider class="mt-8" />

				<v-row>
					<v-col>
						Clear all check-ins
					</v-col>
					<v-col>
						<confirm-dialog @confirm="clear()">
							<template v-slot:activator="{ on }">
								<v-btn v-on="on" color="error">Clear Check-Ins</v-btn>
							</template>
							<template v-slot:title>Clear all stored check-in data?</template>
						</confirm-dialog>
					</v-col>
				</v-row>


			</v-col>
		</v-row>

	</div>
</template>

<script>
import { format, subDays, parseISO, eachDayOfInterval, addSeconds, addHours, isSameDay } from 'date-fns';
import { forEach } from 'lodash';
import { config } from '@/services/db.js';
import { createReadStream } from 'fs';
import csv_parser from 'csv-parser';
import ConfirmDialog from '@/components/ConfirmDialog.vue';

export default {
	components: {
		ConfirmDialog
	},

	data: () => ({
		datepicker: false,
		start_date: format(subDays(new Date(), 365), "yyyy-MM-dd"),
		checkins_per_day: 200
	}),

	methods: {
		async generate() {
			let start = parseISO(`${this.start_date} 06:00:00`);
			let now = new Date();
			let dates = eachDayOfInterval({ start: start, end: now });
			let checkin_interval = Math.round(57600 / this.checkins_per_day);	// number of seconds between each checkin in a 16 hour business day
			let checkin_id = 1;
			let checkins = {};

			// get a list of names and guids
			let name_list = [];
			try {
				name_list = await this.load_names_and_guids();
			} catch (err) {
				this.$store.dispatch('notify/notify', { msg: err });
				return;
			}

			// loop through each day
			forEach(dates, day => {
				let start_today = addHours(day, 6);
				let formatted_date = format(day, 'yyyy-MM-dd')
				checkins[formatted_date] = {};

				// loop through number of check-ins per day
				for(let i = 0; i < this.checkins_per_day; i++) {
					let time_in = format(addSeconds(start_today, checkin_interval * i), 'yyyy-MM-dd HH:mm:ss');
					let time_out = format(addHours(parseISO(time_in), 2), 'yyyy-MM-dd HH:mm:ss');

					if (isSameDay(day, now)) {
						// it's today, prevent future check-ins and do not check-out everyone
						if (parseISO(time_in) > now) break;
						if (parseISO(time_out) > now) time_out = null;
					}

					// get random customer from name list
					let rand_index = Math.floor(Math.random() * Math.floor(name_list.length));
					let random_customer = name_list[rand_index];

					let checkin = {
						checkin_id: checkin_id,
						details: "OK",
						postdate: time_in,
						time_out: time_out,
						last_updated: time_out ? time_out : time_in,
						...random_customer
					};

					checkins[formatted_date][checkin_id] = checkin;
					checkin_id++;
				}
			});

			// clear any existing checkins
			this.$store.dispatch('checkins/stop');

			// save checkins to disk
			config.set('checkins', checkins);

			// load from disk into store
			this.$store.dispatch('checkins/run');

		},

		// loads in a csv list of names and guids
		// csv should be two columns - "guid","lastname, firstname"
		async load_names_and_guids() {
			return new Promise((resolve, reject) => {
				let data = [];
				createReadStream('names.csv')
					.pipe(csv_parser(['customer_guid', 'name']))
					.on('data', row => {
						data.push(row);
					})
					.on('end', () => {
						return resolve(data);
					})
					.on('error', err => {
						return reject(err);
					});
			});
		},

		clear() {
			config.delete('checkins');
			this.$store.dispatch('checkins/stop');
		}
	}
}
</script>

<style scoped>

</style>
