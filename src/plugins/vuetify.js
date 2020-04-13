import Vue from 'vue';
import Vuetify from 'vuetify/lib';
import { colors } from 'vuetify/lib';

Vue.use(Vuetify);

export default new Vuetify({
	theme: {
		themes: {
			light: {
				appbar: '#673AB7',
				primary: '#673AB7',
				secondary: '#009688',
				accent: colors.grey.darken4
			},
			dark :{
				appbar: '#272727',
				primary: '#9d46ff',
				secondary: '#009688',
				accent: '#9d46ff'
			}
		}
	}
});
