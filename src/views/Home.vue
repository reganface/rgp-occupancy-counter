<template>
	<div>
		<v-row>
			<v-col>
				<v-switch v-model="in_gym_only" class="mt-0 pt-0" label="Only show customers still in the gym" />
			</v-col>
			<v-col class="text-right">
				{{ checkins.checkins }} total check-in<span v-if="checkins.checkins != 1">s</span>
			</v-col>
		</v-row>

		<v-data-table :items="checkins.list" class="elevation-1 mb-12" disable-pagination hide-default-footer dense>
			<template v-slot:header>
				<thead>
					<tr>
						<th>Time In</th>
						<th>Customer</th>
						<th>Details</th>
						<th>Duration</th>
						<th class="text-center">Check-Out</th>
					</tr>
				</thead>
			</template>

			<template v-slot:body="{ items }">
				<tbody name="list-complete" is="transition-group">
					<template>
						<tr v-for="item in items" :key="item.checkin_id" :class="{inactive: item.time_out}" class="list-complete-item">
							<td>{{ item.postdate | checkin_time }}</td>
							<td>
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
								<transition name="fade" mode="out-in">
									<confirm-dialog v-if="!item.time_out" @confirm="checkout(item)">
										<template v-slot:activator="{ on }">
											<v-btn v-on="on" icon color="primary" title="Check Out">
												<v-icon>mdi-exit-run</v-icon>
											</v-btn>
										</template>
										<template v-slot:title>Check Out [{{ item.name ? item.name : 'This Customer' }}]?</template>
									</confirm-dialog>
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
			</template>
		</v-data-table>
	</div>
</template>

<script>
import ConfirmDialog from '@/components/ConfirmDialog.vue';
import { formatDistanceStrict, parseISO, format, subHours, subDays, differenceInMinutes } from 'date-fns';
import { isEmpty } from 'lodash';

export default {
	components: {
		ConfirmDialog
	},

	data: () => ({
		now: subDays(subHours(new Date(), 15), 72),
		time_interval: null,
		headers: [
			{ text: "Time", value: "postdate" },
			{ text: "Customer", value: "customer_guid" },
			{ text: "Status", value: "status" },
			{ text: "Details", value: "details" }
		]
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

		max_duration() {
			return this.$store.getters['setup/max_duration'];
		}
	},

	methods: {
		checkout(checkin) {
			this.$store.dispatch('checkins/checkout', { checkin_id: checkin.checkin_id });
		},

		checkout_remove(checkin) {
			this.$store.dispatch('checkins/checkout_remove', { checkin_id: checkin.checkin_id });
		},

		time_in_gym(checkin) {
			let date = checkin.time_out ? parseISO(checkin.time_out) : this.now;
			return formatDistanceStrict(parseISO(checkin.postdate), date);
		},

		empty(obj) {
			return isEmpty(obj);
		},

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
		}
	},

	filters: {
		checkin_time(s) {
			if (!s) return s;
			return format(parseISO(s), "H:mm a");
		}
	},

	mounted() {
		this.time_interval = setInterval(() => this.now = subDays(subHours(new Date(), 15), 72), 60000);
	},

	beforeDestroy() {
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

.list-complete-item {
	transition: all 0.25s;
	display: table-row;
}

.list-complete-item > td {
	transition: all 0.25s;
}

.list-complete-enter,
.list-complete-leave-to {
	opacity: 0;
	transform: scaleY(0);
	height: 1px;
	line-height: 1px;
}

.list-complete-enter > td,
.list-complete-leave-to > td {
	height: 1px;
	line-height: 1px;
}

/*.list-complete-leave-active {
	position: absolute;
}*/
</style>
