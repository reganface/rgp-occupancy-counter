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

				<v-row justify="center">
					<v-col class="text-center">
						<div class="display-3 mb-12">Contact Tracing</div>
					</v-col>
				</v-row>

				<v-tabs v-model="tab" centered grow background-color="transparent">
					<v-tab>
						Contact with Customer
					</v-tab>
					<v-tab>
						Date Ranges
					</v-tab>
					<v-tab>
						Full Data Export
					</v-tab>
				</v-tabs>

				<v-tabs-items v-model="tab" class="transparent" >
					<v-tab-item>
						<customer-search />
					</v-tab-item>
					<v-tab-item>
						<date-range-search />
					</v-tab-item>
					<v-tab-item>
						<data-export />
					</v-tab-item>
				</v-tabs-items>

			</v-col>
		</v-row>
	</div>
</template>

<script>
import DataExport from '@/components/DataExport.vue';
import CustomerSearch from '@/components/CustomerSearch.vue';
import DateRangeSearch from '@/components/DateRangeSearch.vue';

export default {
	components: {
		DataExport,
		CustomerSearch,
		DateRangeSearch
	},

	data: () => ({
		tab: null
	}),

	beforeDestroy() {
		// clear message if there is one
		this.$store.dispatch('checkins/set_rgp_message', "");
	}
}
</script>

<style scoped>

</style>
