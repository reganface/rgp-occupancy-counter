<template>
	<div>
		<div class="text-center title py-5 font-weight-light">
			Look up customers that were in the gym within a given time range.
			You can enter multiple start & end times, and then search for all of them at once.
			Customers that have overlapping check-ins with <i>any</i> of the date ranges provided will be returned.
		</div>

		<!-- selecte date ranges and start the search -->
		<template v-if="!search_complete">
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
						<v-btn @click="search_date_ranges" color="primary">Search Date Ranges</v-btn>
					</div>

				</v-col>
			</v-row>
		</template>

		<!-- show number of customer found and button to export -->
		<template v-else>
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

			<v-row>
				<v-col>
					There are {{ contact_count | number }} customers that have overlapping check-ins with these date ranges.
					You can export a contact list along with each customer's overlapping check-in.
					Up to date contact info will be pulled from RGP.
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
		</template>
	</div>
</template>

<script>
import { format, parseISO } from 'date-fns';
import { date_range_contacts, get_customer_contact_info } from '@/services/contact-search.js';
import Export from '@/services/export.js';

export default {
	data: () => ({
		dates: [],
		datepicker: false,
		timepicker_start: false,
		timepicker_end: false,
		selected_date: "",
		selected_start: "10:00",
		selected_end: "18:00",
		contact_list: {},
		search_complete: false,
		rgp_loading: false
	}),

	computed: {
		contact_count() {
			return Object.keys(this.contact_list).length;
		},

		rgp_message() {
			return this.$store.getters['checkins/rgp_message'];
		}
	},

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

		search_date_ranges() {
			this.contact_list = date_range_contacts(this.dates);
			this.search_complete = true;
		},

		clear_search() {
			this.search_complete = false;
			this.contact_list = {};
		},

		// save as csv file
		async export_contact_list() {
			const csv = new Export();

			// update the list with contact info from rgp
			this.rgp_loading = true;
			this.contact_list = await get_customer_contact_info(this.contact_list);
			this.rgp_loading = false;

			// export the list
			csv.export_contact_list(this.contact_list);

		}
	},

	filters: {
		format_datetime(s) {
			if (!s) return s;
			return format(parseISO(s), "MMM do, yyyy - h:mm aaaa");
		},

		number(n) {
			return n.toLocaleString();
		}
	}
}
</script>

<style scoped>

</style>
