const { dialog } = require('electron').remote;
import { writeFile } from 'fs';
import { forEach } from 'lodash';

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


}
