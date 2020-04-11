<template>
	<v-app>

		<v-content>
			<v-container fluid>
				<transition name="fade" mode="out-in">
					<router-view :key="$route.name + ($route.params.type || '')"/>
				</transition>
			</v-container>
		</v-content>

	</v-app>
</template>

<script>

export default {
	name: "App",

	async created() {
		await this.$store.dispatch('setup/init');
		this.$store.dispatch('checkins/run');
		this.$vuetify.theme.dark = false;
	}
};
</script>

<style>
.fade-enter-active,
.fade-leave-active {
	transition: opacity 0.25s;
}

.fade-enter,
.fade-leave-to {
	opacity: 0;
}
</style>
