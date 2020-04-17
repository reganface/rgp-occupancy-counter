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
				<div class="display-3 mb-12 text-center">Generate Check-Ins</div>

				<v-row>
					<v-col>
						Start Date
					</v-col>
					<v-col>
						<v-menu v-model="datepicker" :close-on-content-click="false" offset-y min-width="290px">
							<template v-slot:activator="{ on }">
								<v-text-field v-model="start_date" v-on="on" readonly label="Start Date" />
							</template>
							<v-date-picker v-model="start_date" @input="datepicker = false" />
						</v-menu>
					</v-col>
				</v-row>

				<v-row>
					<v-col>
						Number of check-ins per day
					</v-col>
					<v-col>
						<v-text-field v-model="checkins_per_day" type="number" min="0" />
					</v-col>
				</v-row>

				<v-row>
					<v-col>

					</v-col>
					<v-col>
						<v-btn @click="generate" color="primary">Generate</v-btn>
					</v-col>
				</v-row>

				<v-divider class="mt-8" />

				<v-row>
					<v-col>
						Clear all check-ins
					</v-col>
					<v-col>
						<confirm-dialog @confirm="clear()">
							<template v-slot:activator="{ on }">
								<v-btn v-on="on" color="error">Clear Check-Ins</v-btn>
							</template>
							<template v-slot:title>Clear all stored check-in data?</template>
						</confirm-dialog>
					</v-col>
				</v-row>


			</v-col>
		</v-row>

	</div>
</template>

<script>
import { format, subDays, parseISO, eachDayOfInterval, addSeconds, addHours } from 'date-fns';
import { forEach } from 'lodash';
import { config } from '@/services/db.js';
import ConfirmDialog from '@/components/ConfirmDialog.vue';

export default {
	components: {
		ConfirmDialog
	},

	data: () => ({
		datepicker: false,
		start_date: format(subDays(new Date(), 365), "yyyy-MM-dd"),
		checkins_per_day: 200
	}),

	methods: {
		generate() {
			let start = parseISO(`${this.start_date} 06:00:00`);
			let now = new Date();
			let dates = eachDayOfInterval({ start: start, end: now });
			let checkin_interval = Math.round(57600 / this.checkins_per_day);	// number of seconds between each checkin in a 16 hour business day
			let checkin_id = 1;
			let checkins = {};

			// loop through each day
			forEach(dates, day => {
				let start_today = addHours(day, 6);
				let formatted_date = format(day, 'yyyy-MM-dd')
				checkins[formatted_date] = {};

				// loop through number of check-ins per day
				for(let i = 0; i < this.checkins_per_day; i++) {
					let customer_guid = this.fake_uuid();
					let name = this.fake_name();
					let time_in = format(addSeconds(start_today, checkin_interval * i), 'yyyy-MM-dd HH:mm:ss');
					let time_out = format(addHours(parseISO(time_in), 2), 'yyyy-MM-dd HH:mm:ss');

					let checkin = {
						checkin_id: checkin_id,
						customer_guid: customer_guid,
						name: name,
						details: "OK",
						postdate: time_in,
						time_out: time_out,
						last_updated: time_out
					}

					checkins[formatted_date][checkin_id] = checkin;
					checkin_id++;
				}
			});

			// save checkins to disk
			config.set('checkins', checkins);

		},

		fake_uuid() {
			// https://stackoverflow.com/questions/105034/create-guid-uuid-in-javascript
			return ([1e7]+-1e3+-4e3+-8e3+-1e11).replace(/[018]/g, c =>
				(c ^ crypto.getRandomValues(new Uint8Array(1))[0] & 15 >> c / 4).toString(16)
			);
		},

		fake_name() {
			let firstnames = ["Adam", "Alex", "Aaron", "Ben", "Carl", "Dan", "David", "Edward", "Fred", "Frank", "George", "Hal", "Hank", "Ike", "John", "Jack", "Joe", "Larry", "Monte", "Matthew", "Mark", "Nathan", "Otto", "Paul", "Peter", "Roger", "Roger", "Steve", "Thomas", "Tim", "Ty", "Victor", "Walter"];
			let lastnames = ["Anderson", "Ashwoon", "Aikin", "Bateman", "Bongard", "Bowers", "Boyd", "Cannon", "Cast", "Deitz", "Dewalt", "Ebner", "Frick", "Hancock", "Haworth", "Hesch", "Hoffman", "Kassing", "Knutson", "Lawless", "Lawicki", "Mccord", "McCormack", "Miller", "Myers", "Nugent", "Ortiz", "Orwig", "Ory", "Paiser", "Pak", "Pettigrew", "Quinn", "Quizoz", "Ramachandran", "Resnick", "Sagar", "Schickowski", "Schiebel", "Sellon", "Severson", "Shaffer", "Solberg", "Soloman", "Sonderling", "Soukup", "Soulis", "Stahl", "Sweeney", "Tandy", "Trebil", "Trusela", "Trussel", "Turco", "Uddin", "Uflan", "Ulrich", "Upson", "Vader", "Vail", "Valente", "Van Zandt", "Vanderpoel", "Ventotla", "Vogal", "Wagle", "Wagner", "Wakefield", "Weinstein", "Weiss", "Woo", "Yang", "Yates", "Yocum", "Zeaser", "Zeller", "Ziegler", "Bauer", "Baxster", "Casal", "Cataldi", "Caswell", "Celedon", "Chambers", "Chapman", "Christensen", "Darnell", "Davidson", "Davis", "DeLorenzo", "Dinkins", "Doran", "Dugelman", "Dugan", "Duffman", "Eastman", "Ferro", "Ferry", "Fletcher", "Fietzer", "Hylan", "Hydinger", "Illingsworth", "Ingram", "Irwin", "Jagtap", "Jenson", "Johnson", "Johnsen", "Jones", "Jurgenson", "Kalleg", "Kaskel", "Keller", "Leisinger", "LePage", "Lewis", "Linde", "Lulloff", "Maki", "Martin", "McGinnis", "Mills", "Moody", "Moore", "Napier", "Nelson", "Norquist", "Nuttle", "Olson", "Ostrander", "Reamer", "Reardon", "Reyes", "Rice", "Ripka", "Roberts", "Rogers", "Root", "Sandstrom", "Sawyer", "Schlicht", "Schmitt", "Schwager", "Schutz", "Schuster", "Tapia", "Thompson", "Tiernan", "Tisler"];
			let first_index = Math.floor(Math.random() * Math.floor(firstnames.length));
			let last_index = Math.floor(Math.random() * Math.floor(lastnames.length));
			return `${firstnames[first_index]} ${lastnames[last_index]}`;
		},

		clear() {
			config.delete('checkins');
		}
	}
}
</script>

<style scoped>

</style>
