<template>
	<v-dialog v-model="show" persistent max-width="410" :transition="disable_transitions ? false : 'dialog-transition'">
		<template v-slot:activator="{ on }">
			<slot v-bind:on="on" name="activator" />
		</template>
		<v-card>
			<v-card-text class="subtitle-1 pt-3">
				<slot name="title" />
			</v-card-text>
			<v-card-actions>
				<v-spacer />
				<v-btn @click="cancel" text>
					<slot name="cancel">Cancel</slot>
				</v-btn>
				<v-btn @click="confirm" color="primary" :disabled="delayed">
					<template v-if="delayed">Wait...</template>
					<slot v-else name="confirm">Confirm</slot>
				</v-btn>
			</v-card-actions>
		</v-card>
	</v-dialog>
</template>

<script>
export default {
	props: {
		delay: Boolean
	},

	data: () => ({
		show: false,
		delayed: false,
		timeout: null
	}),

	computed: {
		disable_transitions() {
			return this.$store.getters['setup/disable_transitions'];
		}
	},

	methods: {
		cancel() {
			this.$emit('cancel');
			this.show = false;
		},

		confirm() {
			this.$emit('confirm');
			this.show = false;
		}
	},

	watch: {
		// if delay is true, disable the confirm button for the first few seconds
		show(new_value) {
			if (this.delay && new_value) {
				this.delayed = true;
				this.timeout = setTimeout(() => this.delayed = false, 3000);
			} else if (this.delay && !new_value) {
				clearTimeout(this.timeout);
			}
		}
	}
}
</script>

<style scoped>

</style>
