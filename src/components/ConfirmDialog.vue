<template>
	<v-dialog v-model="show" persistent max-width="410">
		<template v-slot:activator="{ on }">
			<slot v-bind:on="on" name="activator" />
		</template>
		<v-card>
			<v-card-title class="subtitle-1">
				<slot name="title" />
			</v-card-title>
			<v-card-actions>
				<v-spacer />
				<v-btn @click="cancel" text>
					<slot name="cancel">Cancel</slot>
				</v-btn>
				<v-btn @click="confirm" color="primary">
					<slot name="confirm">Confirm</slot>
				</v-btn>
			</v-card-actions>
		</v-card>
	</v-dialog>
</template>

<script>
export default {
	data: () => ({
		show: false
	}),

	methods: {
		cancel() {
			this.$emit('cancel');
			this.show = false;
		},

		confirm() {
			this.$emit('confirm');
			this.show = false;
		}
	}
}
</script>

<style scoped>

</style>
