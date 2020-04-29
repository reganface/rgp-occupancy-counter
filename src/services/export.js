const { dialog } = require('electron').remote;
import { writeFile } from 'fs';
import { forEach } from 'lodash';
import store from '@/store/store.js';

export default class {
	constructor() {
		this.headers = [];
		this.rows = [];
		this.title = "Save File As...";
		this.default_path = "data.csv";
		this.csv_data = "";
	}

	// sets the title of the save dialog
	set_title(title) {
		this.title = title;
	}

	// sets the default path/filename of the saved file
	set_default_path(path) {
		this.default_path = path;
	}

	// takes an array of values for the header row
	set_headers(headers) {
		this.headers = headers;
	}

	// takes an array of values (as a row of data) and appends them to the rows array
	add_row(row) {
		this.rows.push(row);
	}

	// save the csv file
	save(cb) {
		// convert all data to csv format
		this.convert();

		// prompt the user where to save the file
		let save_path = dialog.showSaveDialog({
			title: this.title,
			defaultPath: this.default_path,
			filters: [
				{ name: 'CSV Files', extensions: ['csv'] }
			]
		});

		// save file if save was selected
		if (save_path) {
			// write file and pipe writeFile callback to cb
			writeFile(save_path, this.csv_data, 'utf8', cb);
		}
	}

	// convert data to csv format
	convert() {
		// make sure we start with an empty string
		this.csv_data = "";

		// add headers
		if (this.headers.length > 0) {
			forEach(this.headers, (header, index) => {
				let comma = index > 0 ? ',' : '';
				this.csv_data += comma + this.escape_field(header);
			});
			this.csv_data += "\r\n";
		}

		// add all rows
		if (this.rows.length > 0) {
			forEach(this.rows, row => {
				if (row.length > 0) {
					forEach(row, (field, index) => {
						let comma = index > 0 ? ',' : '';
						this.csv_data += comma + this.escape_field(field);
					});
					this.csv_data += "\r\n";
				}
			});
		}
	}

	// escape and quote all fields
	escape_field(s) {
		s = s + '';	// make sure we treat this as a string
		s = s.replace('"', '"""');
		return `"${s}"`;
	}


	// export a standard contact list
	export_contact_list(contact_list) {
		this.set_default_path("contact-list.csv");
		let max_checkins = 1;	// used to add extra column headers
		const separator = "----------";
		const headers = [
			"Customer GUID",
			"Name",
			"Email",
			"Home Phone",
			"Work Phone",
			"Cell Phone",
			"Address 1",
			"Address 2",
			"City",
			"State",
			"Postal Code",
			"Country"
		];
		const checkin_headers = [
			"Time In",
			"Time Out",
			"Overlap Duration in Minutes",
			"Other Customer Time In",
			"Other Customer Time Out",
			separator
		];

		forEach(contact_list, (customer, customer_guid) => {
			let row = [];
			max_checkins = Math.max(max_checkins, customer.checkins.length);
			row.push(customer_guid);
			row.push(customer.name);
			row.push(customer.email);
			row.push(customer.home_phone);
			row.push(customer.work_phone);
			row.push(customer.cell_phone);
			row.push(customer.address1);
			row.push(customer.address2);
			row.push(customer.city);
			row.push(customer.state);
			row.push(customer.zip);
			row.push(customer.country);

			forEach(customer.checkins, checkin => {
				row.push(checkin.postdate);
				row.push(checkin.time_out);
				row.push(checkin.overlap_duration_minutes);
				row.push(checkin.other_customer_time_in);
				row.push(checkin.other_customer_time_out);
				row.push(separator);
			});

			this.add_row(row);
		});

		// add extra headers as needed
		for (let i = 0; i < max_checkins; i++) {
			headers.push(...checkin_headers);
		}

		this.set_headers(headers);

		this.save(err => {
			if (err) store.dispatch('notify/notify', { msg: err });
		});
	}


}
