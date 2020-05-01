import Vue from 'vue';
import Vuetify from 'vuetify/lib';
import { colors } from 'vuetify/lib';

Vue.use(Vuetify);

export default new Vuetify({
	theme: {
		themes: {
			light: {
				appbar: '#004358',
				primary: '#004358',
				secondary: '#FD7400',
				accent: '#bedb39',
				error: colors.red.lighten1
			},
			dark: {
				appbar: '#272727',
				primary: colors.blue.darken2,
				secondary: '#FD7400',
				accent: colors.blue.darken3
			}
		}
	}
});
