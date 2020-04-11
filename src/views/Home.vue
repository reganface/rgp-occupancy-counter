<template>
	<div>
		<div class="body-1">{{ checkins.in_gym }} users</div>
		<v-list dense>
			<v-list-item v-if="empty(checkins.list)">
				<v-list-item-content>
					No checkins
				</v-list-item-content>
			</v-list-item>

			<v-list-item v-else v-for="(checkin, i) in checkins.list" :key="i" :class="{inactive: checkin.time_out}">
				<v-list-item-content>
					<v-row class="no-vertical-gutters">
						<v-col cols="auto">
							{{ checkin.postdate }}
						</v-col>

						<v-col>
							{{ checkin.customer_guid }}
						</v-col>

						<v-col>
							{{ time_in_gym(checkin) }}
						</v-col>

						<v-col>
							<div v-if="checkin.time_out">left</div>
							<div v-else>still here
								<v-dialog v-model="checkin.dialog" persistent max-width="410">
									<template v-slot:activator="{ on }">
										<v-btn v-on="on" icon>
											<v-icon>mdi-exit-run</v-icon>
										</v-btn>
									</template>
									<v-card>
										<v-card-title>Check Out {{ checkin.customer_guid }}?</v-card-title>
										<v-card-actions>
											<v-spacer />
											<v-btn @click="checkin.dialog = false" text>Cancel</v-btn>
											<v-btn @click="checkout(checkin)" color="primary">Check Out</v-btn>
										</v-card-actions>
									</v-card>
								</v-dialog>

							</div>
						</v-col>
					</v-row>
				</v-list-item-content>
			</v-list-item>
		</v-list>

	</div>
</template>

<script>
import { formatDistanceStrict, parseISO } from 'date-fns';
import { isEmpty } from 'lodash';

export default {
	data: () => ({
		now: new Date(),
		time_interval: null
	}),

	computed: {
		location_tag() {
			let settings = this.$store.getters['setup/settings'];
			return settings.location_tag;
		},

		checkins() {
			return this.$store.getters['checkins/checkins'];
		}
	},

	methods: {
		checkout(checkin) {
			this.$store.dispatch('checkins/checkout', { checkin_id: checkin.checkin_id });
		},

		time_in_gym(checkin) {
			let date = checkin.time_out ? parseISO(checkin.time_out) : this.now;
			return formatDistanceStrict(parseISO(checkin.postdate), date);
		},

		empty(obj) {
			return isEmpty(obj);
		}
	},

	mounted() {
		let data = {
			location_tag: this.location_tag,
			//startDateTime: format(new Date(), 'yyyy-MM-dd 00:00:00')
			startDateTime: '2020-02-01 00:00:00',
			endDateTime: '2020-02-01 08:03:00'
		};
		this.$store.dispatch('checkins/get_rgp_checkins', data);

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
</style>
