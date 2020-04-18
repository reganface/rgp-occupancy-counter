<template>
	<div>
		<!-- header with switch and check-in numbers -->
		<v-row>
			<v-col>
				<v-switch v-model="in_gym_only" class="mt-0 pt-0" label="Only show customers still in the gym" />
			</v-col>
			<v-col class="text-right">
				<div class="font-weight-bold">{{ now | format_date }}</div>
				<div class="body-2">{{ checkins.checkins }} total check-in<span v-if="checkins.checkins != 1">s</span></div>
				<div :class="{'red--text': checkins.in_gym >= max_customers}" class="body-2">
					{{ checkins.in_gym }} / {{ max_customers }} customers in the gym
				</div>
			</v-col>
		</v-row>

		<v-row>
			<v-col cols="12" sm="6">
				<v-text-field
					v-model="search"
					append-icon="mdi-magnify"
					label="Filter Customers [last name, first name]"
					hint="Filter this list - does not search your RGP database"
					clearable
				/>
			</v-col>
		</v-row>

		<!-- table containing list of all check-ins -->
		<v-data-table
			:items="checkins.list"
			:headers="headers"
			class="elevation-1 mb-12"
			disable-pagination
			hide-default-footer
			dense
			:search="search"
			:custom-filter="filter_customers"
		>
			<template v-slot:body="{ items }">
				<tbody v-if="items.length > 0" :name="disable_transitions ? '' : 'animate-table'" is="transition-group">
					<template>
						<tr v-for="item in items" :key="item.checkin_id" :class="{inactive: item.time_out, 'animate-table-item': !disable_transitions}">
							<td>{{ item.postdate | checkin_time }}</td>
							<td>
								<!-- display button to allow manual name lookup when it failed previously -->
								<div v-if="item.name == '####'" class="red--text font-italic font-weight-light">
									Error loading name
									<v-btn @click="load_name(item)" icon small>
										<v-icon>mdi-refresh</v-icon>
									</v-btn>
								</div>

								<div v-else>{{ item.name }}</div>
							</td>
							<td>{{ item.details }}</td>
							<td :class="{'red--text': check_duration(item)}">{{ time_in_gym(item) }}</td>
							<td class="text-center">
								<transition :name="disable_transitions ? '' : 'fade'" mode="out-in">
									<!-- button and confirmation dialog for check-out -->
									<confirm-dialog v-if="!item.time_out" @confirm="checkout(item)">
										<template v-slot:activator="{ on }">
											<v-btn v-on="on" icon color="primary" title="Check Out">
												<v-icon>mdi-exit-run</v-icon>
											</v-btn>
										</template>
										<template v-slot:title>Check Out [{{ item.name ? item.name : 'This Customer' }}]?</template>
									</confirm-dialog>

									<!-- for removing a check-out -->
									<confirm-dialog v-else @confirm="checkout_remove(item)">
										<template v-slot:activator="{ on }">
											<v-btn v-on="on" icon color="primary" title="Remove Check Out">
												<v-icon>mdi-cancel</v-icon>
											</v-btn>
										</template>
										<template v-slot:title>Remove Check Out for [{{ item.name ? item.name : 'This Customer' }}]?</template>
									</confirm-dialog>
								</transition>
							</td>
						</tr>
					</template>
				</tbody>

				<!-- displayed when there are no check-ins yet -->
				<tbody v-else>
					<tr>
						<td colspan="5" class="text-center grey--text">No check-ins for today</td>
					</tr>
				</tbody>
			</template>
		</v-data-table>
	</div>
</template>

<script>
import ConfirmDialog from '@/components/ConfirmDialog.vue';
import { formatDistanceStrict, parseISO, format, differenceInMinutes } from 'date-fns';
import { isEmpty } from 'lodash';

export default {
	components: {
		ConfirmDialog
	},

	data: () => ({
		now: new Date(),
		time_interval: null,
		headers: [
			{ text: "Time In", value: "postdate", filterable: false},
			{ text: "Customer", value: "name" },
			{ text: "Details", value: "details", filterable: false },
			{ text: "Duration", value: "time_out", sortable: false, filterable: false },
			{ text: "Check-Out", value: "actions", sortable: false, filterable: false }
		],
		search: ""
	}),

	computed: {
		location_tag() {
			let settings = this.$store.getters['setup/settings'];
			return settings.location_tag;
		},

		checkins() {
			return this.$store.getters['checkins/checkins'];
		},

		in_gym_only: {
			get() { return this.$store.getters['checkins/in_gym_only'] },
			set(value) { this.$store.dispatch('checkins/set_in_gym_only', value) }
		},

		max_customers() {
			return this.$store.getters['setup/max_customers'];
		},

		max_duration() {
			return this.$store.getters['setup/max_duration'];
		},

		disable_transitions() {
			return this.$store.getters['setup/disable_transitions'];
		}
	},

	methods: {
		checkout(checkin) {
			this.$store.dispatch('checkins/checkout', { checkin_id: checkin.checkin_id });
		},

		checkout_remove(checkin) {
			this.$store.dispatch('checkins/checkout_remove', { checkin_id: checkin.checkin_id });
		},

		// returns the visit duration for the provided check-in
		time_in_gym(checkin) {
			let date = checkin.time_out ? parseISO(checkin.time_out) : this.now;
			return formatDistanceStrict(parseISO(checkin.postdate), date);
		},

		empty(obj) {
			return isEmpty(obj);
		},

		// allows manual lookup of check-in name
		load_name(checkin) {
			this.$store.dispatch('checkins/get_name', checkin);
		},

		// determin if this checkin is beyond the max duration
		// returns true if they are, false if they are not, or have already left
		check_duration(checkin) {
			if (this.max_duration == 0) return false; 	// highlighting is off
			if (checkin.time_out) return false;		// they've already left
			let diff = differenceInMinutes(this.now, parseISO(checkin.postdate));
			if (diff > this.max_duration) return true;	// they've been here too long
			return false;
		},

		// customer filter function to emulate the search in rgp
		filter_customers(value, search, item) {
			if (!item.name) return false;	// this customer doesn't have a name, don't bother testing this row
			search = search.toString().toLowerCase().trim();
			let search_lastname = search.split(",")[0];
			let search_firstname = search.split(",")[1];
			let lastname = item.name.split(",")[0];
			let firstname = item.name.split(",")[1];
			let last_test = search_lastname ? lastname.toLowerCase().includes(search_lastname.trim()) : true;
			let first_test = search_firstname ? firstname.toLowerCase().includes(search_firstname.trim()) : true;
			return last_test && first_test;
		}
	},

	filters: {
		// used for the Time In column
		checkin_time(s) {
			if (!s) return s;
			return format(parseISO(s), "h:mm a");
		},

		// used for today's date
		format_date(s) {
			if (!s) return s;
			return format(s, "MMMM do, yyyy");
		}
	},

	mounted() {
		// update "now" every 60 seconds so that the calculated duration gets updated
		this.time_interval = setInterval(() => this.now = new Date(), 60000);
	},

	beforeDestroy() {
		// we don't need to update this if we're on another page
		clearInterval(this.time_interval);
	}
}
</script>

<style scoped>
.no-vertical-gutters > .col {
	padding-top: 0;
	padding-bottom: 0;
}

.inactive {
	opacity: 0.3;
}

.animate-table-item {
	transition: all 0.25s;
	display: table-row;
}

.animate-table-item > td {
	transition: all 0.25s;
}

.animate-table-enter,
.animate-table-leave-to {
	opacity: 0;
	transform: scaleY(0);
	height: 1px;
	line-height: 1px;
}

.animate-table-enter > td,
.animate-table-leave-to > td {
	height: 1px;
	line-height: 1px;
}
</style>
