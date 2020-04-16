<template>
	<v-app>
		<v-app-bar v-if="init" dark app elevate-on-scroll color="appbar">
			<v-toolbar-title>Occupancy Counter</v-toolbar-title>

			<v-spacer />

			<v-toolbar-title :class="{'red--text text--lighten-1': in_gym >= max_customers}" class="display-2 font-weight-bold">{{ in_gym }}</v-toolbar-title>

			<v-spacer />

			<v-btn :to="{name: 'settings'}" icon title="settings" x-large>
				<v-icon>mdi-cog-outline</v-icon>
			</v-btn>

			<v-progress-linear
				:active="loading"
				indeterminate
				absolute
				bottom
				color="accent"
			/>
		</v-app-bar>

		<v-content>
			<v-container class="full-height">
				<transition name="fade" mode="out-in">
					<router-view :key="$route.name + ($route.params.type || '')"/>
				</transition>
			</v-container>
		</v-content>

		<notify-bar />

	</v-app>
</template>

<script>
import NotifyBar from '@/components/NotifyBar.vue';
import { start_server, stop_server } from '@/services/server.js';

export default {
	name: "App",
	components: {
		NotifyBar
	},

	computed: {
		init() {
			return this.$store.getters['setup/settings'].init;
		},

		in_gym() {
			return this.$store.getters['checkins/checkins'].in_gym;
		},

		loading() {
			return this.$store.getters['loading'];
		},

		max_customers() {
			return this.$store.getters['setup/max_customers']
		},

		master() {
			return this.$store.getters['setup/settings'].master;
		}
	},

	async created() {
		await this.$store.dispatch('setup/init');
		if (this.init) {
			// setup has been completed
			if (this.master) {
				this.$store.dispatch('checkins/run');	// start auto refresh
				start_server();		// start http server
			} else {
				this.$store.dispatch('checkins/run_as_client');	// auto refresh from master server
			}
		}

	},

	beforeDestroy() {
		// stop the http server before quitting
		stop_server();
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

.full-height {
	height: 100%;
}
</style>
