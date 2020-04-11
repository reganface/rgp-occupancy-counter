<template>
	<v-row align="center" justify="center" class="fill-height">
		<v-col cols="12" sm="8" md="6" lg="4" xl="3" class="text-center">
			<div class="display-3 mb-12">Setup</div>
			<v-alert v-if="error" type="error">{{ error }}</v-alert>

			<transition name="fade" mode="out-in">

				<!-- Welcome Screen -->
				<div v-if="screen == 'welcome'" key="welcome">
					<div class="subtitle-1 mb-5">Since this is the first time running this application, you'll need to set a few options.</div>
					<v-btn @click="show_options" color="primary">Continue</v-btn>
				</div>

				<!-- Installation type and API info -->
				<div v-else-if="screen == 'step1'" key="step1">
					<v-select v-model="form.master" :items="master_select" label="Installation Type" />
					<v-text-field v-model="form.api_user" label="RGP API User" />
					<v-text-field v-model="form.api_key" label="RGP API Key" type="password" />
					<v-text-field v-model="form.api_base_url" label="RGP API Base URL" />

					<v-btn @click="check_api" color="primary">
						Next
						<v-icon>mdi-chevron-right</v-icon>
					</v-btn>

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
import { update } from '@/services/ajax.js';

export default {
	data: () => ({
		screen: "welcome",
		form: {
			master: null,
			api_user: "",
			api_key: "",
			api_base_url: "",
			location_tag: ""
		},
		master_select: [
			{ text: "This computer will be the Master", value: true},
			{ text: "Connect to another computer that is already setup as the Master", value: false }
		],
		location_select: [],
		error: ""
	}),

	computed: {
		settings() {
			return this.$store.getters['setup/settings'];
		},

		has_errors() {
			return this.errors.length > 0;
		}
	},

	methods: {
		show_options() {
			this.screen = "step1";
			Object.assign(this.form, this.settings);
		},

		async check_api() {
			this.error = "";
			try {
				if (this.form.master !== true && this.form.master !== false) throw "Select an installation type";
				if (!this.form.api_user || !this.form.api_key || !this.form.api_base_url) throw "Enter RGP API Details";

				// update connection details on axios instance
				update(this.form);

				// check connection
				await this.$store.dispatch('setup/check_api', this.form);

				// get locations
				let result = await this.$store.dispatch('setup/get_locations');
				this.location_select = Object.values(result);

				this.screen = "step2"
			} catch (err) {
				this.error = err;
			}

		},

		save() {
			this.error = "";
			try {
				if (!this.form.location_tag) throw 'Select a facility';

				let new_settings = {
					location_tag: this.form.location_tag,
					init: true
				};
				this.$store.dispatch('setup/update_settings', new_settings);
				this.$router.push({name: 'home'});

			} catch (err) {
				this.error = err;
			}
		}
	}
}
</script>

<style scoped>

</style>
