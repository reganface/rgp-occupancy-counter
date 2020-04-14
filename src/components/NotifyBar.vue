<template>
	<v-alert
		v-model="show"
		:type="type"
		tile
		dismissible
		transition="slide-y-reverse-transition"
		class="notify-bar text-center"
	>
		{{ msg }}
	</v-alert>
</template>

<script>
export default {
	computed: {
		show: {
			get() { return this.$store.getters['notify/show'] },
			set() { this.$store.dispatch('notify/hide') }
		},

		type() {
			return this.$store.getters['notify/type'];
		},

		msg() {
			return this.$store.getters['notify/msg'];
		}
	}
}
</script>

<style scoped>
.notify-bar {
	position: fixed;
	left: 0;
	right: 0;
	bottom: 0;
	margin: 0;
}
</style>
