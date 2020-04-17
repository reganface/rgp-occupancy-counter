# RGP Occupancy Counter
This is a simple tool that ties into Rock Gym Pro to help keep track of how many people are in the facility at any one time.  It was created for use during the COVID-19 recovery period where gyms will almost certainly be forced to limit the amount of people in the gym at once.  The current day's check-ins are loaded from the RGP API and then staff are able to "check-out" a customer when they leave.

## API Keys
You will need to generate an API key before being able to use this program.  This [Google Doc](https://docs.google.com/document/d/1J_r1QkUphSsaPa-KdqsUv0xd7r39qp3M4169ouv6rXc/edit) from RGP has instructions on how to generate your key for both cloud and locally hosted servers.  You'll be asked for this info upon initial setup.

## Download and Install
`TODO: Add link and basic instructions to download packaged application`


## Building From Source
There are several technologies in use here
- [Electron](https://electronjs.org) - Build desktop applications using Javascript, HTML, and CSS
- [VueJS](https://vuejs.org) - Front end framework
- [Vuetify](https://vuetifyjs.com) - Components for VueJS based on the Material Design spec

You'll need [NodeJS](https://nodejs.org) installed.  I've only tested it on 8.x.x so far.

Once you've downloaded the repo, you'll need to install any dependencies with `npm install`.  After than, you can build and run a development version with hot refresh and dev tools enabled with `npm run electron:serve`.


# Goals
- Easily track current occupancy with minimal added workload for staff
- Ease of installation so that any gym can install and run with simple instructions
	- No external dependencies, if possible
- Tools for contact tracing.  Possible solutions:
	- Export data to CSV for end user processing
	- Customer lookup: Select a customer and return a list of all other customers who have been in the gym at the same time

# TODO
- Polish up and test current features.  Add in any missing error handlers.
- Data is being stored in a JSON file via Electron-Store.  Stress test this with a year's worth of check-ins
- Implement solution(s) for contact tracing
- If RGP's check-in API is updated to include customer details, remove the customer lookup functions
- Encrypt api key for storage?  There is an NPM package that can use the built in Windows Data Protection API so that it could be encrypted by the user profile. `windows.security.cryptography.dataprotection`
- Add some UI indication on whether the current instance is setup as master or client.  Also connection status and info?
- Tweak production build settings for electron-builder.  Seems to be building multiple package styles right now.
