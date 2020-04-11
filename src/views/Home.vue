<template>
	<div>
		<div class="body-1">{{ checkins.in_gym }} in the gym - {{ checkins.checkins }} total check-ins</div>
		<div>
			<v-switch v-model="in_gym_only" label="Only show customers still in the gym" />
		</div>

		<v-data-table :items="checkins.list" class="elevation-1" dense>
			<template v-slot:header>
				<thead>
					<tr>
						<th>Time In</th>
						<th>Customer</th>
						<th>Status</th>
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
							<td>{{ item.customer_guid }}</td>
							<td>{{ item.status }}</td>
							<td>{{ item.details }}</td>
							<td>{{ time_in_gym(item) }}</td>
							<td class="text-center">
								<transition name="fade" mode="out-in">
									<confirm-dialog v-if="!item.time_out" @confirm="checkout(item)">
										<template v-slot:activator="{ on }">
											<v-btn v-on="on" icon color="primary">
												<v-icon>mdi-exit-run</v-icon>
											</v-btn>
										</template>
										<template v-slot:title>Check Out {{ item.customer_guid }}?</template>
									</confirm-dialog>
									<confirm-dialog v-else @confirm="checkout_remove(item)">
										<template v-slot:activator="{ on }">
											<v-btn v-on="on" icon>
												<v-icon>mdi-cancel</v-icon>
											</v-btn>
										</template>
										<template v-slot:title>Remove Check Out for {{ item.customer_guid }}?</template>
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
import { formatDistanceStrict, parseISO, format } from 'date-fns';
import { isEmpty } from 'lodash';

export default {
	components: {
		ConfirmDialog
	},

	data: () => ({
		now: new Date(),
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
		}
	},

	filters: {
		checkin_time(s) {
			if (!s) return s;
			return format(parseISO(s), "H:mm a");
		}
	},

	mounted() {
		/*let data = {
			location_tag: this.location_tag,
			//startDateTime: format(new Date(), 'yyyy-MM-dd 00:00:00')
			startDateTime: '2020-02-01 00:00:00',
			endDateTime: '2020-02-01 08:03:00'
		};*/
//		this.$store.dispatch('checkins/get_rgp_checkins');

		// update "now"
		this.time_interval = setInterval(() => (this.now = new Date()), 60000);
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

.list-complete-leave-active {
	/*position: absolute;*/
}
</style>
