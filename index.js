mapboxgl.accessToken = 'pk.eyJ1Ijoic2ZhMjM0IiwiYSI6ImNsdmhyOGZkNTAxMWgya21rMzFtZWpzajgifQ.CmrrgQGEqG4HPPV3CnlH8A'
var map = new mapboxgl.Map({
	container: 'map',
	style: 'mapbox://styles/mapbox/streets-v11',
	center: [104.2807, 52.2864],
	zoom: 8
});

var noises;
var polygons;

map.on('load', function () {
	var gridSize = 0.01;
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
									id: i * rows + j // Уникальный идентификатор полигона
							}
					};
					gridPolygons.push(polygon);
			}
			polygons = gridPolygons;
	}

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
					'fill-color': '#088',
					'fill-opacity': 0.2
			}
	});

	map.on('click', 'grid', function (e) {
			var coordinates = e.lngLat;
			var featureId = e.features[0].properties.id;
			var popupContent = '<h3>Координаты полигона:</h3><p>' + coordinates.lng + ', ' + coordinates.lat + '</p>';
			new mapboxgl.Popup()
					.setLngLat(coordinates)
					.setHTML('<div class="chart">' + popupContent + '<canvas id="lineChart" style="min-height: 25px; height: 25px; max-height: 25px; max-width: 100%;"></canvas></div>')
					.addTo(map);
			createChart(coordinates);
	});

	map.on('mouseenter', 'grid', function () {
			map.getCanvas().style.cursor = 'pointer';
	});

	map.on('mouseleave', 'grid', function () {
			map.getCanvas().style.cursor = '';
	});
});

async function createChart(coordinates) {
	var label = [];
	var dat = [];

	polygons.forEach(data =>{
		if (coordinates.lng >= data.geometry.coordinates[0][0][0] && coordinates.lng <= data.geometry.coordinates[0][1][0]) {
			if (coordinates.lat >= data.geometry.coordinates[0][2][1] && coordinates.lat <= data.geometry.coordinates[0][0][1]) {
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
}

async function updateGridNoiseLevels() {
	//polygons.forEach(data => {
	//	noises.forEach(data1 => {
	//		if (data.coordinates.lng == data1['longitude'] && data.coordinates.lat == data1['latitude']) {
	//			data.type = ''
	//		}
	//	});
	//});
	console.log(polygons[0]);
}

async function fetchData() {
	try {
	  	const response = await fetch('https://05c1-92-51-45-202.ngrok-free.app/api/noises/?format=json', {
    		method: "get",
    		headers: new Headers({
     		"ngrok-skip-browser-warning": "69420",
    		}),
   		});
	  	const data = await response.json();
	  	noises = data;
	  	console.log('Received data:', data);
		updateGridNoiseLevels();
	} catch (error) {
	  	console.error('Error fetching data:', error);
	}
}

fetchData();