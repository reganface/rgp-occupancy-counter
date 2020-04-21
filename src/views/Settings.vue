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

				<v-row>
					<v-col class="text-center">
						<a v-if="!advanced_options" @click="advanced_options = true">Advanced Options</a>
						<a v-else @click="advanced_options = false">Hide Advanced Options</a>
					</v-col>
				</v-row>

				<transition :name="disable_transitions ? '' : 'fade'" mode="out-in">
					<div v-if="advanced_options">

						<!-- advanced options for master -->
						<template v-if="master">
							<v-row>
								<v-col cols="6">
									Port that other clients will connect to.
									Default is 3000
								</v-col>
								<v-col cols="3">
									<v-text-field v-model="master_port" type="number" label="Server Port" />
								</v-col>
								<v-col cols="3">
									<v-btn @click="restart_server" color="primary" :disabled="!port_changed">Restart Server</v-btn>
								</v-col>
							</v-row>

							<v-row class="mt-5">
								<v-col>
									Purge all check-in data and reset configuration
								</v-col>
								<v-col>
									<confirm-dialog @confirm="purge" delay>
										<template v-slot:activator="{ on }">
											<v-btn v-on="on" color="error">Purge Data</v-btn>
										</template>
										<template v-slot:title>
											Are you sure you want to purge all check-in data from this computer and reset the configuration?
											In order to use this application again, you will need to go through the inital program setup.
											Check-in data cannot be recovered.
										</template>
									</confirm-dialog>
								</v-col>
							</v-row>
						</template>

						<!-- advanced options for client only -->
						<template v-else>
							<v-row>
								<v-col cols="6">
									IP and Port of the Master Server
									<v-btn @click="test_connection" color="primary" text>Test</v-btn>
									<v-progress-circular v-if="test_loading" indeterminate />
									<div v-if="test_success" class="success--text">Success!</div>
									<div v-else-if="test_error" class="error--text">{{ test_error }}</div>
								</v-col>
								<v-col cols="4">
									<v-text-field v-model="master_ip" label="Server IP" />
								</v-col>
								<v-col cols="2">
									<v-text-field v-model="master_port" type="number" label="Server Port" />
								</v-col>
							</v-row>

							<v-row class="mt-5">
								<v-col>
									Reset configuration
								</v-col>
								<v-col>
									<confirm-dialog @confirm="reset" delay>
										<template v-slot:activator="{ on }">
											<v-btn v-on="on" color="error">Reset</v-btn>
										</template>
										<template v-slot:title>
											Are you sure you want to reset the configuration for this computer?
										</template>
									</confirm-dialog>
								</v-col>
							</v-row>
						</template>

					</div>
				</transition>

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
import { start_server, stop_server } from '@/services/server.js';
import { get, update } from '@/services/ajax.js';
import ConfirmDialog from '@/components/ConfirmDialog.vue';

export default {
	components: {
		ConfirmDialog
	},

	data: () => ({
		advanced_options: false,
		port_changed: false,
		test_success: false,
		test_error: "",
		test_loading: false
	}),

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
		},

		master_port: {
			get() { return this.$store.getters['setup/master_port'] },
			set(value) { this.$store.dispatch('setup/update_settings', { master_port: value }) }
		},

		master_ip: {
			get() { return this.$store.getters['setup/master_ip'] },
			set(value) { this.$store.dispatch('setup/update_settings', { master_ip: value }) }
		}
	},

	methods: {
		open_link(link) {
			require("electron").shell.openExternal(link);
		},

		purge() {
			this.$store.dispatch('setup/purge');
		},

		reset() {
			this.$store.dispatch('setup/reset');
		},

		restart_server() {
			stop_server();
			start_server();
			this.port_changed = false;
		},

		async test_connection() {
			this.test_loading = true;
			this.test_success = false;
			this.test_error = "";
			try {
				let result = await get(`http://${this.master_ip}:${this.master_port}/ping`);
				if (result !== "pong") throw "Could not find master at this IP and Port";

				this.test_success = true;

				// update axios path
				let params = {
					master: false,
					master_ip: this.master_ip,
					master_port: this.master_port
				};
				update(params);

			} catch (err) {
				this.test_error = err;
			} finally {
				this.test_loading = false;
			}
		}
	},

	watch: {
		master_port() {
			this.port_changed = true;
		}
	},

	async created() {
		// if this is a client, refresh the max customers/duration settings from the master
		if (!this.master) {
			try {
				let settings = await get('/settings');
				this.$store.dispatch('setup/update_settings', settings);
			} catch (err) {
				// do nothing
			}
		}
	}
}
</script>

<style scoped>

</style>
