import store from '@/store/store.js';
import { parseISO } from 'date-fns';
import express from 'express';
const app = express();
const port = 3000;
let server = null;

// start the http server to listen for other clients
export const start_server = () => {
	server = app.listen(port, () => {
		console.log('Server listening on port ', port);
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
	let checkins = store.getters['checkins/checkins'].list;

	// return only check-ins that have been updated since the provided start date
	checkins = checkins.filter(checkin => parseISO(checkin.last_updated) > parseISO(last_update));

	// convert array to object keyed by checkin id
	checkins = checkins.reduce((obj, row) => ({ ...obj, [row.checkin_id]: row }), {});

	response.send(checkins);
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
