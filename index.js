mapboxgl.accessToken = 'pk.eyJ1Ijoic2ZhMjM0IiwiYSI6ImNsdmhyOGZkNTAxMWgya21rMzFtZWpzajgifQ.CmrrgQGEqG4HPPV3CnlH8A'
var map = new mapboxgl.Map({
	container: 'map',
	style: 'mapbox://styles/mapbox/streets-v11',
	center: [104.2660688, 52.252361],
	zoom: 10
});

var noises;
var polygons;
const matchExpression = [];

map.on('load', function () {
	var gridSize = 0.005;
	var bounds = map.getBounds();
	var nw = bounds.getNorthWest();
	var se = bounds.getSouthEast();
	var columns = Math.ceil((se.lng - nw.lng) / gridSize);
	var rows = Math.ceil((nw.lat - se.lat) / gridSize);

	var gridPolygons = [];
	for (var i = 0; i < columns; i++) {
			for (var j = 0; j < rows; j++) {
					var polygon = {
							type: 'Feature',
							geometry: {
									type: 'Polygon',
									coordinates: [[
											[nw.lng + i * gridSize, nw.lat - j * gridSize],
											[nw.lng + (i + 1) * gridSize, nw.lat - j * gridSize],
											[nw.lng + (i + 1) * gridSize, nw.lat - (j + 1) * gridSize],
											[nw.lng + i * gridSize, nw.lat - (j + 1) * gridSize],
											[nw.lng + i * gridSize, nw.lat - j * gridSize]
									]]
							},
							properties: {
									id: i * rows + j, // Уникальный идентификатор полигона
									avarageNoise: Number(0),
									procentsNoise: Number(0),
									color: "rgb(0, 256, 0)"
							}
					};
					gridPolygons.push(polygon);
			}
			polygons = gridPolygons;
	}

	fetchData();


	map.addLayer({
			id: 'grid',
			type: 'fill',
			source: {
				type: 'geojson',
				data: {
						type: 'FeatureCollection',
						features: gridPolygons
				}
			},
				layout: {},
				paint: {
						'fill-color': ['get', 'color'],
						'fill-opacity': 0.1
			}
	});

	map.on('click', 'grid', function (e) {
			var coordinates = e.lngLat;
			var featureId = e.features[0].properties.id;
			var popupContent = '<h3>Координаты полигона:</h3><p>' + coordinates.lng + ', ' + coordinates.lat + '</p><div id="avarageNoise"></div>';
			new mapboxgl.Popup()
					.setLngLat(coordinates)
					.setHTML('<div class="chart">' + popupContent + '<canvas id="lineChart" style="min-height: 250px; height: 250px; max-height: 250px; max-width: 100%;"></canvas></div>')
					.addTo(map);
			createChart(coordinates);
	});

	map.on('click', 'gridLayer', function (e) {
		var coordinates = e.lngLat;
		var featureId = e.features[0].properties.id;
		var popupContent = '<h3>Координаты полигона:</h3><p>' + coordinates.lng + ', ' + coordinates.lat + '</p><div id="avarageNoise"></div>';
		new mapboxgl.Popup()
				.setLngLat(coordinates)
				.setHTML('<div class="chart">' + popupContent + '<canvas id="lineChart" style="min-height: 250px; height: 250px; max-height: 250px; max-width: 100%;"></canvas></div>')
				.addTo(map);
		createChart(coordinates);
});

	map.on('mouseenter', 'grid', function () {
			map.getCanvas().style.cursor = 'pointer';
	});

	map.on('mouseleave', 'grid', function () {
			map.getCanvas().style.cursor = '';
	});

	map.on('mouseenter', 'gridLayer', function () {
			map.getCanvas().style.cursor = 'pointer';
	});

	map.on('mouseleave', 'gridLayer', function () {
			map.getCanvas().style.cursor = '';
	});
});

async function createChart(coordinates) {
	var label = [];
	var dat = [];
	var avarageNoise = 0;
	var proc = 0;

	polygons.forEach(data =>{
		if (coordinates.lng >= data.geometry.coordinates[0][0][0] && coordinates.lng <= data.geometry.coordinates[0][1][0]) {
			if (coordinates.lat >= data.geometry.coordinates[0][2][1] && coordinates.lat <= data.geometry.coordinates[0][0][1]) {
				avarageNoise = data.properties.avarageNoise;
				proc = data.properties.procentsNoise;
				noises.forEach(data1 => {
					if (data1['longitude'] >= data.geometry.coordinates[0][0][0] && data1['longitude'] <= data.geometry.coordinates[0][1][0]) {
						if (data1['latitude'] >= data.geometry.coordinates[0][2][1] && data1['latitude'] <= data.geometry.coordinates[0][0][1]) {
							dat.push(data1['decibels']);
							label.push(data1['datetime']);
						}
					}
				});
			}
		}
	});

	const chartContainer = document.querySelector('#lineChart');
    
    new Chart(chartContainer, {
      type: 'line',
      data: {
        labels: label,
        datasets: [{
          label: 'Уровень шума',
          data: dat
        }]
      },
    });

	document.getElementById('avarageNoise').innerHTML = '<p>Средний шум: ' + avarageNoise + '</p>';
}

async function updateGridNoiseLevels() {
	var sumNoise = Number(0);
	var count = Number(0);
	var maxAv = 0;
	var minAv = 100;

	polygons.forEach(data => {
		noises.forEach(data1 => {
			if (data1['longitude'] >= data.geometry.coordinates[0][0][0] && data1['longitude'] <= data.geometry.coordinates[0][1][0]) {
				if (data1['latitude'] >= data.geometry.coordinates[0][2][1] && data1['latitude'] <= data.geometry.coordinates[0][0][1]) {
					sumNoise += data1['decibels'];
					count += 1;
				}
			}
		});
		data.properties.avarageNoise = Number(sumNoise / count);
		if (!isNaN(data.properties.avarageNoise)) {
			console.log(data.properties.avarageNoise);	
			minAv = Math.min(minAv, data.properties.avarageNoise);
			maxAv = Math.max(maxAv, data.properties.avarageNoise);
		}
		sumNoise = Number(0);
		count = Number(0);
	});
	console.log(minAv);
	console.log(maxAv);
	maxAv -= minAv;

	polygons.forEach(data => {
		data.properties.procentsNoise = Number((data.properties.avarageNoise - minAv) / maxAv);
		if (data.properties.avarageNoise >= 0)
			console.log(data.properties)
	});

	for (const data of polygons) {
		const red = Math.round(data.properties.procentsNoise * 255);
		const green = 255 - red;
		var color = "";
		if (!isNaN(data.properties.procentsNoise)){
			color =  `rgb(${red}, ${green}, 0)`;
			data.properties.color = color;
		}
	}	

	map.addLayer({
		id: 'gridLayer',
		type: 'fill',
		source: {
			type: 'geojson',
			data: {
					type: 'FeatureCollection',
					features: polygons
			}
		},
			layout: {},
			paint: {
					'fill-color': ['get', 'color'],
					'fill-opacity': 0.1
		}
	});

	map.removeLayer('grid');

	map.setZoom(14);
}

async function fetchData() {
	try {
	  	const response = await fetch('https://2106-92-51-45-202.ngrok-free.app/api/noises/?format=json', {
    		method: "get",
    		headers: new Headers({
     		"ngrok-skip-browser-warning": "69420",
    		}),
   		});
	  	const data = await response.json();
	  	noises = data;
	  	console.log('Received data:', noises);
		updateGridNoiseLevels();
	} catch (error) {
	  	console.error('Error fetching data:', error);
	}
}