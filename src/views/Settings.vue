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
				<div class="display-3 mb-12 text-center">Settings</div>

				<!-- only show these options on the master -->
				<template v-if="master">
					<v-row>
						<v-col>
							Maximum duration that a customer is allowed in the facility
						</v-col>
						<v-col>
							<v-slider
								v-model="max_duration"
								min="0"
								max="360"
								inverse-label
								:label="duration_text"
							/>
						</v-col>
					</v-row>

					<v-row>
						<v-col>
							Maximun number of customers allowed in the facility at once
						</v-col>
						<v-col>
							<v-slider
								v-model="max_customers"
								min="0"
								max="150"
								inverse-label
								:label="max_customers + ''"
							/>
						</v-col>
					</v-row>
				</template>

				<v-row>
					<v-col>
						Disable transitions. Can be helpful for slower computers
					</v-col>
					<v-col>
						<v-switch v-model="disable_transitions" hide-details class="mt-0 pt-0" />
					</v-col>
				</v-row>

				<v-row>
					<v-col>
						My Eyes! The goggles do nothing! (Dark Mode)
					</v-col>
					<v-col>
						<v-switch v-model="dark_theme" hide-details class="mt-0 pt-0" />
					</v-col>
				</v-row>

				<v-row v-if="master" class="mt-5">
					<v-col>
						Purge data and reset configuration.
					</v-col>
					<v-col>
						<confirm-dialog @confirm="purge">
							<template v-slot:activator="{ on }">
								<v-btn v-on="on" color="error">Purge Data</v-btn>
							</template>
							<template v-slot:title>
								Are you sure you want to purge all check-in data from this computer and reset the configuration?
								In order to use this application again, you will need to go through the inital program setup.
							</template>
						</confirm-dialog>
					</v-col>
				</v-row>
			</v-col>
		</v-row>

		<v-row justify="center" class="my-12">
			<v-col cols="12" sm="8">
				<v-divider />
			</v-col>
		</v-row>

		<v-row justify="center">
			<v-col cols="12" sm="8">
				<div class="caption text-center">
					Created by <a @click="open_link('mailto:chris@onpointtiming.com')">Chris Regan</a> to help with reopening efforts after COVID-19
					<v-icon small color="pink" >mdi-heart</v-icon> <br />
					This project is Open Source &mdash; <a @click="open_link('https://github.com/reganface/rgp-occupancy-counter')">GitHub</a> <br />
					Mesa Rim Climbing Centers &mdash; <a @click="open_link('https://mesarim.com')">https://mesarim.com</a> <br />
					On Point Timing (Speed Timers) &mdash; <a @click="open_link('https://onpointtiming.com')">https://onpointtiming.com</a>
				</div>
			</v-col>
		</v-row>

	</div>
</template>

<script>
import ConfirmDialog from '@/components/ConfirmDialog.vue';

export default {
	components: {
		ConfirmDialog
	},

	computed: {
		max_duration: {
			get() { return this.$store.getters['setup/max_duration'] },
			set(value) { this.$store.dispatch('setup/update_settings', { max_duration: value }) }
		},

		max_customers: {
			get() { return this.$store.getters['setup/max_customers'] },
			set(value) { this.$store.dispatch('setup/update_settings', { max_customers: value }) }
		},

		duration_text() {
			let hours = Math.floor(this.max_duration / 60);
			let minutes = this.max_duration % 60;
			minutes = minutes < 10 ? `0${minutes}` : minutes;
			return `${hours}:${minutes}`;
		},

		disable_transitions: {
			get() { return this.$store.getters['setup/disable_transitions'] },
			set(value) { this.$store.dispatch('setup/update_client_settings', { disable_transitions: value }) }
		},

		dark_theme: {
			get() { return this.$store.getters['setup/dark_mode'] },
			set(value) { this.$store.dispatch('setup/update_client_settings', { dark_mode: value }) }
		},

		master() {
			return this.$store.getters['setup/master'];
		}
	},

	methods: {
		open_link(link) {
			require("electron").shell.openExternal(link);
		},

		purge() {
			this.$store.dispatch('setup/purge');
		}
	}
}
</script>

<style scoped>

</style>
