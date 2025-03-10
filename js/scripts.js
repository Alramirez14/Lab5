var map = L.map('raw_counts').setView([39, -98], 4);

L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
    attribution: '&copy; <a href="https://www.esri.com/en-us/legal/terms/data-attributions"> ESRI Satellite Imagery</a> contributors'
}).addTo(map);

function dam_style(data1) {
    var geojsonMarkerOptions = {
        radius: 2,
        color: "black",
        fillColor: "blue",
        weight: 1,
        opacity: 0.8,
        fillOpacity: 0.8
    };

    L.geoJSON(data1, {
        pointToLayer: function (feature, latlng) {
            var pointmarker = L.circleMarker(latlng, geojsonMarkerOptions);
            return pointmarker;
        }
    }).addTo(map);
}

function symbolizeStates(states, dams) {
    let stateCounts = [];

    states.features.forEach(state => {
        let count = 0;
        dams.features.forEach(dam => {
            if (turf.booleanPointInPolygon(dam, state)) {
                count++;
            }
        });

        stateCounts.push(count);

        let fillColor = getColorForCount(count);

        L.geoJSON(state, {
            style: {
                fillColor: fillColor,
                fillOpacity: 0.8,
                weight: 1,
                color: "white"
            }
        })
        .bindPopup(`County: ${state.properties.NAME}<br>Dam Count: ${count}`)
        .addTo(map);
    });

    let minCount = Math.min(...stateCounts);
    let maxCount = Math.max(...stateCounts);
    addLegend(map, minCount, maxCount);
}

function getColorForCount(count) {
    if (count >= 20) return "#F7F700";
    else if (count >= 10) return "#F9F955";
    else if (count >= 1) return "#FCFCAA";
    else return "white";
}

// Function to add the legend for raw counts with a title and color
function addLegend(map, minCount, maxCount) {
    var legend = L.control({ position: 'bottomright' });

    legend.onAdd = function () {
        var div = L.DomUtil.create('div', 'info legend');
        var grades = [0, 1, 10, 20]; // Define the count ranges for the legend
        var labels = [];

        div.innerHTML = "<strong>Dam Count</strong>"; // Title of the legend

        grades.forEach(function (grade, index) {
            var range = grades[index];
            labels.push('<i style="background:' + getColorForCount(grade) + '; width: 20px; height: 20px; display: inline-block;"></i> ' + range);
        });

        div.innerHTML += labels.join('<br>');
        return div;
    };

    legend.addTo(map);
}

fetch('data/US_Dams.geojson')
    .then(response => response.json())
    .then(data1 => {
        return fetch('data/counties.geojson')
            .then(response => response.json())
            .then(data2 => {
                symbolizeStates(data2, data1);
            });
    })
    .catch(error => {
        console.error("Error loading GeoJSON:", error);
    });

// Second map for normalized data

var map2 = L.map('normalized').setView([39, -98], 4);

L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
    attribution: '&copy; <a href="https://www.esri.com/en-us/legal/terms/data-attributions"> ESRI Satellite Imagery</a> contributors'
}).addTo(map2);

function symbolizeStates2(states, dams) {
    let stateNormalizedCounts = [];

    states.features.forEach(state => {
        let count = 0;
        dams.features.forEach(dam => {
            if (turf.booleanPointInPolygon(dam, state)) {
                count++;
            }
        });

        var countyArea = calculateMultiPolygonArea(state.geometry);
        var normalizedCount = count / countyArea;
        stateNormalizedCounts.push(normalizedCount);

        let fillColor = getColorForCount(normalizedCount);

        L.geoJSON(state, {
            style: {
                fillColor: fillColor,
                fillOpacity: 0.8,
                weight: 1,
                color: "white"
            }
        })
        .bindPopup(`County: ${state.properties.NAME}<br>Normalized Dam Count: ${normalizedCount.toFixed(2)}`)
        .addTo(map2);
    });

    let minNormCount = Math.min(...stateNormalizedCounts);
    let maxNormCount = Math.max(...stateNormalizedCounts);
    addLegend2(map2, minNormCount, maxNormCount);
}

function calculateMultiPolygonArea(geometry) {
    let totalArea = 0;
    if (geometry.type === "Polygon") {
        totalArea = turf.area(geometry);
    } else if (geometry.type === "MultiPolygon") {
        for (const polygon of geometry.coordinates) {
            totalArea += turf.area(turf.polygon(polygon));
        }
    }
    return totalArea / 10000000000; // Convert to ten thousands of square kilometers
}

function getColorForNormalizedCount(normalizedCount) {
    if (normalizedCount > 0.5) return "#F7F700";       // High normalized count
    else if (normalizedCount > 0.1) return "#F9F955"; // Mid-range normalized count
    else if (normalizedCount > 0.01) return "#FCFCAA"; // Lower normalized count
    else return "white"; // Very low normalized count
}

// Function to add the legend for normalized counts with a title and color
function addLegend2(map, minNormCount, maxNormCount) {
    var legend2 = L.control({ position: 'bottomright' });

    legend2.onAdd = function () {
        var div = L.DomUtil.create('div', 'info legend');
        var grades = [0, 0.1, 0.5, 1]; // Adjusted for more granular normalized counts
        var labels = [];

        div.innerHTML = "<strong>Dams per 10,000km<sup>2</sup></strong>"; // Title of the legend

        grades.forEach(function (grade, index) {
            var range = grades[index + 1] ? `${grades[index]} - ${grades[index + 1]}` : `>${grades[index]}`;
            labels.push('<i style="background:' + getColorForNormalizedCount(grade) + '; width: 20px; height: 20px; display: inline-block;"></i> ' + range);
        });

        div.innerHTML += labels.join('<br>');
        return div;
    };

    legend2.addTo(map);
}
fetch('data/US_Dams.geojson')
    .then(response => response.json())
    .then(data1 => {
        return fetch('data/counties.geojson')
            .then(response => response.json())
            .then(data2 => {
                symbolizeStates2(data2, data1);
            });
    })
    .catch(error => {
        console.error("Error loading GeoJSON:", error);
    });
