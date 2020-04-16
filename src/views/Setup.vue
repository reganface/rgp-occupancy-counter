<template>
	<v-row align="center" justify="center" class="fill-height">
		<v-col cols="12" sm="8" md="6" lg="4" xl="3" class="text-center">
			<div class="display-3 mb-12">Setup</div>
			<v-fade-transition>
				<v-alert v-if="error" type="error">{{ error }}</v-alert>
			</v-fade-transition>

			<transition name="fade" mode="out-in">

				<!-- Welcome Screen -->
				<div v-if="screen == 'welcome'" key="welcome">
					<div class="subtitle-1 mb-5">Since this is the first time running this application, you'll need to set a few options.</div>
					<v-btn @click="show_options" color="primary">Continue</v-btn>
				</div>

				<!-- Installation type and API info -->
				<div v-else-if="screen == 'step1'" key="step1" class="loading-container">
					<v-select v-model="form.master" :items="master_select" label="Installation Type" />

					<v-fade-transition mode="out-in">
						<!-- options for master -->
						<div v-if="form.master === true" key="master">
							<v-text-field v-model="form.api_user" label="RGP API User" />
							<v-text-field v-model="form.api_key" label="RGP API Key" type="password" />
							<v-text-field v-model="form.api_base_url" label="RGP API Base URL" />
						</div>

						<!-- advanced options for client -->
						<div v-else-if="form.master === false && manual_ip" key="advanced">
							<div class="caption">
								<a @click="manual_ip = false">Hide Advanced Options</a>
							</div>
							<v-text-field v-model="form.ip_addr" label="Server IP Address" />
							<v-text-field v-model="form.port" type="number" label="Server Port" />
						</div>

						<!-- link to show advanced options -->
						<div v-else-if="form.master === false" class="text-center caption mb-8" key="link">
							<a @click="manual_ip = true">Advanced Options</a>
						</div>
					</v-fade-transition>

					<v-btn @click="master_or_client" :loading="loading" color="primary">
						Next
						<v-icon>mdi-chevron-right</v-icon>
					</v-btn>

					<!-- progress bar for network scanning -->
					<div v-if="!form.master && loading" class="loading-bar">
						<v-progress-linear v-model="progress" color="primary" />
						<div class="caption">Scanning Network...</div>
					</div>

				</div>

				<!-- Location Select -->
				<div v-else-if="screen == 'step2'">
					<v-select
						v-model="form.location_tag"
						:items="location_select"
						item-text="code"
						item-value="code"
						label="Choose Your Facility"
					/>

					<v-btn @click="screen = 'step1'" text>
						<v-icon>mdi-chevron-left</v-icon>
						Back
					</v-btn>
					<v-btn @click="save" color="primary">Finish</v-btn>
				</div>

			</transition>
		</v-col>
	</v-row>
</template>

<script>
import { update, get } from '@/services/ajax.js';
import scan from '@/services/scanner.js';

export default {
	data: () => ({
		screen: "welcome",
		form: {
			master: null,
			api_user: "",
			api_key: "",
			api_base_url: "",
			location_tag: "",
			ip_addr: "",
			port: 3000
		},
		master_select: [
			{ text: "This computer will be the Master", value: true},
			{ text: "This is an additional client", value: false }
		],
		location_select: [],
		error: "",
		loading: false,
		manual_ip: false
	}),

	computed: {
		settings() {
			return this.$store.getters['setup/settings'];
		},

		has_errors() {
			return this.errors.length > 0;
		},

		progress() {
			return this.$store.getters['setup/scan_progress'];
		}
	},

	methods: {
		show_options() {
			this.screen = "step1";
			Object.assign(this.form, this.settings);
		},

		// determing if we are setting up as master or as a client
		master_or_client() {
			if (this.form.master) this.check_api();
			else this.find_master();
		},

		// validate and test rgp api credentials
		async check_api() {
			this.error = "";
			this.loading = true;
			try {
				if (this.form.master !== true && this.form.master !== false) throw "Select an installation type";
				if (!this.form.api_user || !this.form.api_key || !this.form.api_base_url) throw "Enter RGP API Details";

				// update connection details on axios instance
				update(this.form);

				// check connection & save details
				await this.$store.dispatch('setup/check_api', this.form);

				// get locations
				let result = await this.$store.dispatch('setup/get_locations');
				this.location_select = Object.values(result);

				this.screen = "step2"
			} catch (err) {
				this.error = err;
			} finally {
				this.loading = false;
			}

		},

		// find master server on the network and finalize setup
		async find_master() {
			try {
				this.loading = true;
				this.error = "";

				if (this.form.ip_addr && this.manual_ip) {
					// do not scan, just test the entered ip address
					let result = await get(`http://${this.form.ip_addr}:${this.form.port}/ping`);
					if (result !== "pong") throw "Could not find master at this IP and Port";

				} else {
					let result = await scan();	// scan for master
					this.form.ip_addr = result;	// ip found
				}

				// update axios connection details to be for the master server
				update(this.form);

				// save connection info to disk
				this.form.init = true;
				await this.$store.dispatch('setup/update_settings', this.form);
				this.$router.push({ name: 'home' });	// redirect to home page

			} catch (err) {
				this.error = err;
			} finally {
				this.loading = false;
			}

		},

		// finalize master setup
		async save() {
			this.error = "";
			try {
				if (!this.form.location_tag) throw 'Select a facility';

				let new_settings = {
					location_tag: this.form.location_tag,
					init: true
				};
				await this.$store.dispatch('setup/update_settings', new_settings);
				this.$router.push({ name: 'home' });

				// start auto refresh
				this.$store.dispatch('checkins/run');

			} catch (err) {
				this.error = err;
			}
		}
	}
}
</script>

<style scoped>
.loading-container {
	position: relative;
}

.loading-bar {
	position: absolute;
	bottom: -50px;
	left: 0;
	right: 0;
}
</style>
