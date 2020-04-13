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

				<v-row>
					<v-col>
						Maximum duration that a customer is allowed in the facility
					</v-col>
					<v-col>
						<v-slider
							v-model="max_duration"
							min="0"
							max="480"
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
							max="200"
							inverse-label
							:label="max_customers + ''"
						/>
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





			</v-col>
		</v-row>

	</div>
</template>

<script>
export default {

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

		dark_theme: {
			get() { return this.$vuetify.theme.dark },
			set(value) { this.$vuetify.theme.dark = value }
		}
	}
}
</script>

<style scoped>

</style>
