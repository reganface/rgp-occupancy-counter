<template>
	<v-app>
		<v-app-bar app dark color="white" elevate-on-scroll>
			<v-toolbar-title>Occupancy Counter</v-toolbar-title>

			<v-spacer />

			<v-toolbar-title class="display-1 font-weight-bold">{{ in_gym }}</v-toolbar-title>

			<v-spacer />

			<v-btn :to="{name: 'settings'}" icon title="settings">
				<v-icon>mdi-cog-outline</v-icon>
			</v-btn>
		</v-app-bar>

		<v-content>
			<v-container>
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

	computed: {
		in_gym() {
			return this.$store.getters['checkins/checkins'].in_gym;
		}
	},

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
