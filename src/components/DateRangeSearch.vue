<template>
	<div>
		<div class="text-center title py-5 font-weight-light">
			Look up customers that were in the gym within a given time range.
			You can enter multiple start & end times, and then search for all of them at once.
			Customers that have overlapping check-ins with <i>any</i> of the date ranges provided will be returned.
		</div>

		<v-row>
			<v-col>
				<v-menu v-model="datepicker" :close-on-content-click="false" offset-y min-width="290px">
					<template v-slot:activator="{ on }">
						<v-text-field v-model="selected_date" v-on="on" readonly label="Date" />
					</template>
					<v-date-picker v-model="selected_date" @input="datepicker = false" />
				</v-menu>
			</v-col>
			<v-col>
				<v-dialog v-model="timepicker_start" :return-value.sync="selected_start" ref="start_dialog" persistent width="290px">
					<template v-slot:activator="{ on }">
						<v-text-field v-model="selected_start" v-on="on" readonly label="Start Time" />
					</template>
					<v-time-picker v-if="timepicker_start" v-model="selected_start" ampm-in-title :max="selected_end ? selected_end : null">
						<v-spacer />
						<v-btn text color="primary" @click="timepicker_start = false">Cancel</v-btn>
						<v-btn text color="primary" @click="$refs.start_dialog.save(selected_start)">OK</v-btn>
					</v-time-picker>
				</v-dialog>
			</v-col>
			<v-col>
				<v-dialog v-model="timepicker_end" :return-value.sync="selected_end" ref="end_dialog" persistent width="290px">
					<template v-slot:activator="{ on }">
						<v-text-field v-model="selected_end" v-on="on" readonly label="Start Time" />
					</template>
					<v-time-picker v-if="timepicker_end" v-model="selected_end" ampm-in-title :min="selected_start ? selected_start : null">
						<v-spacer />
						<v-btn text color="primary" @click="timepicker_end = false">Cancel</v-btn>
						<v-btn text color="primary" @click="$refs.end_dialog.save(selected_end)">OK</v-btn>
					</v-time-picker>
				</v-dialog>
			</v-col>
			<v-col cols="auto">
				<v-btn @click="add_date" color="primary">Add Date</v-btn>
			</v-col>
		</v-row>

		<v-row v-if="dates.length > 0">
			<v-col>
				{{ dates.length }} date range<span v-if="dates.length != 1">s</span>
				<v-list>
					<v-list-item v-for="(date, i) in dates" :key="i">
						<v-list-item-title>
							{{ date.start | format_datetime }}
							<span class="grey--text">to</span>
							{{ date.end | format_datetime }}
						</v-list-item-title>
						<v-list-item-action>
							<v-btn @click="remove_date(i)" icon color="primary">
								<v-icon>mdi-delete</v-icon>
							</v-btn>
						</v-list-item-action>
					</v-list-item>
				</v-list>

				<div class="text-right mt-4">
					<v-btn @click="export_data" color="primary">Export Contact List</v-btn>
				</div>

			</v-col>
		</v-row>
	</div>
</template>

<script>
import { format, parseISO } from 'date-fns';
import { date_range_contacts } from '@/services/contact-search.js';
import { forEach } from 'lodash';
import Export from '@/services/export.js';

export default {
	data: () => ({
		dates: [],
		datepicker: false,
		timepicker_start: false,
		timepicker_end: false,
		selected_date: "",
		selected_start: "10:00",
		selected_end: "18:00"
	}),

	methods: {
		// add a selected date to the array of dates to search for
		add_date() {
			try {
				if (!this.selected_date) throw "No date selected";
				if (!this.selected_start) throw "No start time selected";
				if (!this.selected_end) throw "No end time selected";

				// convert to full datetime
				let start = `${this.selected_date} ${this.selected_start}:00`;
				let end = `${this.selected_date} ${this.selected_end}:59`;

				// add to dates array
				this.dates.push({ start, end });

				// reset form
				this.selected_date = "";
				this.selected_start = "10:00";
				this.selected_end = "18:00";

			} catch (err) {
				this.$store.dispatch('notify/notify', { msg: err });
			}
		},

		remove_date(index) {
			if (index > -1) this.dates.splice(index, 1);
		},

		export_data() {
			// search for contacts
			let contact_list = date_range_contacts(this.dates);

			// save as CSV
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
				"Overlap Duration in Minutes",
				"Other Customer Time In",
				"Other Customer Time Out",
				separator
			];

			forEach(contact_list, (customer, customer_guid) => {
				let row = [];
				max_checkins = Math.max(max_checkins, customer.checkins.length);
				row.push(customer_guid);
				row.push(customer.name);

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
		format_datetime(s) {
			if (!s) return s;
			return format(parseISO(s), "MMM do, yyyy - h:mm aaaa");
		}
	}
}
</script>

<style scoped>

</style>
