<template>
	<v-app>

		<v-content>
			<transition name="fade" mode="out-in">
				<router-view :key="$route.name + ($route.params.type || '')"/>
			</transition>
		</v-content>

	</v-app>
</template>

<script>

export default {
	name: "App",

	created() {
		this.$store.dispatch('setup/init');
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
