

import { h } from 'preact';
import { Router } from 'preact-router';
import Papa from 'papaparse';
import Header from './header';

// Code-splitting is automated for `routes` directory
import Home from '../routes/home';
import Profile from '../routes/profile';
import { useMemo, useState } from 'preact/hooks';
import InteractiveFilterableMap from './interactive_filterable_map';


function fetchAndParseCSV() {
	console.log('fetchandparse');
	return new Promise((resolve, reject) => {

		Papa.parse('tidied_map_data.csv', {
			download: true,
			delimiter: ',',
			header: true,
			complete: ({ data, errors, meta }) => {
				if (data.length) {
					resolve(data)
				} else {
					reject({ errors, meta });
				}
			},
		});
	});
	// return fetch('tidied_map_data.csv').then(res => res.text()).then(text => {
	// 	return parse(text, {
	// 		delimiter: ',',
	// 		columns: true,
	// 	})
	// })
}

const App = () => {
	const dataPromise = useMemo(fetchAndParseCSV, []);
	const [data, setData] = useState();
	dataPromise.then(setData);
	console.log('data', data);
	return (
		<div id="app">
			<Header />
			<InteractiveFilterableMap parsed_csv={data ?? []} />
			{/* <Router>
				<Home path="/" />
				<Profile path="/profile/" user="me" />
				<Profile path="/profile/:user" />
			</Router> */}
		</div>
	)
}

export default App;
