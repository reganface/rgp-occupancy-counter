// A makeshift database that uses

import Store from 'electron-store';
import { pick } from 'lodash';
const config = new Store();
export { config };

// sync any new/updated/deleted items within an object
export const sync_object = (name, value) => {
	// first use assign to make sure updated/new rows are handled correctly
	let new_value = Object.assign({}, config.get(name, {}), value);

	// now remove any properties that were deleted
	new_value = pick(new_value, Object.keys(value));

	// save to disk
	config.set(name, new_value);

}
