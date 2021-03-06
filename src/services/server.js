import store from '@/store/store.js';
import { parseISO } from 'date-fns';
import express from 'express';
const app = express();
let server = null;

app.use(express.json());

// start the http server to listen for other clients
export const start_server = () => {
	let port = store.getters['setup/master_port'];
	server = app.listen(port, () => {
		console.log('Server listening on port', port);
	}).on('error', err => {
		if (err.code === 'EADDRINUSE') {
			// this port is in use
			let msg = `Server Error: Port ${port} is in use by another process`;
			store.dispatch('notify/notify', { msg });
		} else {
			store.dispatch('notify/notify', { msg: `Server Error: ${err.code}` });
		}
	});
}

// stop the http server
export const stop_server = () => server.close();



/*******************
 *
 * 	GET Requests
 *
 *******************/


// for testing the connection
app.get('/ping', (request, response) => {
	response.send('pong');
});


// get check-ins that have been updated since last update on date
app.get('/checkins/:last_update', (request, response) => {
	let last_update = request.params.last_update;
	let checkins = store.getters['checkins/all_checkins'];

	// convert to array so we can filter it
	checkins = Object.values(checkins);

	// return only check-ins that have been updated since the provided start date
	checkins = checkins.filter(checkin => parseISO(checkin.last_updated) > parseISO(last_update));

	// convert array back to object keyed by checkin id
	checkins = checkins.reduce((obj, row) => ({ ...obj, [row.checkin_id]: row }), {});

	response.send(checkins);
});


// get max customers and max duration values
app.get('/settings', (request, response) => {
	let max_duration = store.getters['setup/max_duration'];
	let max_customers = store.getters['setup/max_customers'];
	response.send({ max_duration, max_customers });
});



/*******************
 *
 * 	POST Requests
 *
 *******************/


 // add a check out time for a specific checkin id
 app.post('/add-checkout', (request, response) => {
	let checkin_id = request.body.checkin_id;
	store.dispatch('checkins/checkout', { checkin_id });
	response.send();
 });


// remove a check out for a specific checkin id
app.post('/remove-checkout', (request, response) => {
	let checkin_id = request.body.checkin_id;
	store.dispatch('checkins/checkout_remove', { checkin_id });
	response.send();
});
