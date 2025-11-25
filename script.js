// ===== CONFIGURATION & CONSTANTS =====
const CONFIG = {
    MAX_DISTANCE: 20000,
    SAMPLE_INTERVAL: 15,
    SMOOTHING_WINDOW: 21,
    BATCH_SIZE: 100,
    API_DELAY: 1000,
    MAX_SLOPE: 12
};

const MAP_BOUNDS = {
    southwest: [41.5, -5.5],  // Sud-ouest de la France
    northeast: [51.0, 9.5]     // Nord-est de la France
};

// ===== STATE =====
const state = {
    map: null,
    markers: {
        start: null,
        end: null
    },
    points: {
        start: null,
        end: null
    },
    routeLine: [],
    elevationData: [],
    charts: {
        gradient: null
    }
};

// ===== ICONS =====
const icons = {
    start: L.icon({
        iconUrl: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzAiIGhlaWdodD0iNDUiIHZpZXdCb3g9IjAgMCAzMCA0NSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cGF0aCBkPSJNMTUgMEMxMC41IDAgMyA0LjUgMyAxMmMwIDkgMTIgMzMgMTIgMzNzMTItMjQgMTItMzNjMC03LjUtNy41LTEyLTEyLTEyeiIgZmlsbD0iIzRjYWY1MCIgc3Ryb2tlPSJ3aGl0ZSIgc3Ryb2tlLXdpZHRoPSIyIi8+PGNpcmNsZSBjeD0iMTUiIGN5PSIxMiIgcj0iNSIgZmlsbD0id2hpdGUiLz48L3N2Zz4=',
        iconSize: [30, 45],
        iconAnchor: [15, 45]
    }),
    end: L.icon({
        iconUrl: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzAiIGhlaWdodD0iNDUiIHZpZXdCb3g9IjAgMCAzMCA0NSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cGF0aCBkPSJNMTUgMEMxMC41IDAgMyA0LjUgMyAxMmMwIDkgMTIgMzMgMTIgMzNzMTItMjQgMTItMzNjMC03LjUtNy41LTEyLTEyLTEyeiIgZmlsbD0iI2Y0NDMzNiIgc3Ryb2tlPSJ3aGl0ZSIgc3Ryb2tlLXdpZHRoPSIyIi8+PGNpcmNsZSBjeD0iMTUiIGN5PSIxMiIgcj0iNSIgZmlsbD0id2hpdGUiLz48L3N2Zz4=',
        iconSize: [30, 45],
        iconAnchor: [15, 45]
    })
};

// ===== INITIALIZATION =====
/**
 * Initialise l'application au chargement du DOM
 */
document.addEventListener('DOMContentLoaded', () => {
    initMap();
    initEventListeners();
    initTheme();
});

/**
 * Initialise le thème de l'application depuis le localStorage
 */
function initTheme() {
    const savedTheme = localStorage.getItem('theme') || 'dark';
    if (savedTheme === 'light') {
        document.body.classList.add('light-mode');
        updateThemeButton(true);
    }
}

/**
 * Initialise la carte Leaflet avec la vue sur la France entière
 */
function initMap() {
    state.map = L.map('map').fitBounds([MAP_BOUNDS.southwest, MAP_BOUNDS.northeast]);
    
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors'
    }).addTo(state.map);
    
    state.map.on('click', handleMapClick);
}

/**
 * Initialise tous les écouteurs d'événements de l'interface
 */
function initEventListeners() {
    document.getElementById('searchBtn').addEventListener('click', searchLocation);
    document.getElementById('calculateBtn').addEventListener('click', calculateRoute);
    document.getElementById('clearBtn').addEventListener('click', clearRoute);
    document.getElementById('themeToggle').addEventListener('click', toggleTheme);
    document.getElementById('searchLocation').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') searchLocation();
    });
}

// ===== THEME TOGGLE =====
/**
 * Bascule entre le mode clair et sombre
 */
function toggleTheme() {
    const isLight = document.body.classList.toggle('light-mode');
    localStorage.setItem('theme', isLight ? 'light' : 'dark');
    updateThemeButton(isLight);
}

/**
 * Met à jour le texte du bouton de thème
 * @param {boolean} isLight - true si le mode clair est actif
 */
function updateThemeButton(isLight) {
    const btn = document.getElementById('themeToggle');
    btn.textContent = isLight ? '🌙 Mode Nuit' : '☀️ Mode Jour';
}

// ===== MAP INTERACTIONS =====
/**
 * Gère les clics sur la carte pour placer les marqueurs de départ et d'arrivée
 * @param {Object} e - Événement du clic contenant les coordonnées
 */
function handleMapClick(e) {
    if (!state.points.start) {
        setStartPoint(e.latlng);
    } else if (!state.points.end) {
        setEndPoint(e.latlng);
    }
}

/**
 * Place le marqueur de départ sur la carte
 * @param {Object} latlng - Coordonnées {lat, lng}
 */
function setStartPoint(latlng) {
    state.points.start = latlng;
    if (state.markers.start) state.map.removeLayer(state.markers.start);
    
    state.markers.start = L.marker(latlng, {
        icon: icons.start,
        draggable: true
    }).addTo(state.map);
    
    state.markers.start.on('dragend', (e) => {
        state.points.start = e.target.getLatLng();
    });
}

/**
 * Place le marqueur d'arrivée sur la carte
 * @param {Object} latlng - Coordonnées {lat, lng}
 */
function setEndPoint(latlng) {
    state.points.end = latlng;
    if (state.markers.end) state.map.removeLayer(state.markers.end);
    
    state.markers.end = L.marker(latlng, {
        icon: icons.end,
        draggable: true
    }).addTo(state.map);
    
    state.markers.end.on('dragend', (e) => {
        state.points.end = e.target.getLatLng();
    });
    
    // Ajuster la vue pour montrer les deux marqueurs
    fitMapToMarkers();
}

/**
 * Ajuste la vue de la carte pour afficher les marqueurs de départ et d'arrivée
 */
function fitMapToMarkers() {
    if (state.points.start && state.points.end) {
        const bounds = L.latLngBounds([state.points.start, state.points.end]);
        state.map.fitBounds(bounds, { padding: [50, 50] });
    }
}

// ===== SEARCH =====
/**
 * Recherche un lieu via l'API Nominatim et centre la carte dessus
 * @async
 */
async function searchLocation() {
    const query = document.getElementById('searchLocation').value.trim();
    if (!query) {
        alert('Veuillez entrer un lieu à rechercher');
        return;
    }

    try {
        const response = await fetch(
            `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=1`
        );
        const data = await response.json();

        if (data && data.length > 0) {
            const lat = parseFloat(data[0].lat);
            const lon = parseFloat(data[0].lon);
            state.map.setView([lat, lon], 14);
        } else {
            alert('Lieu non trouvé');
        }
    } catch (error) {
        console.error('Erreur de recherche:', error);
        alert('Erreur lors de la recherche');
    }
}

// ===== ROUTE CALCULATION =====
/**
 * Calcule l'itinéraire complet entre les deux points avec données d'élévation
 * @async
 */
async function calculateRoute() {
    if (!state.points.start || !state.points.end) {
        alert('Veuillez placer les points de départ et d\'arrivée');
        return;
    }

    const distance = getDistance(
        state.points.start.lat,
        state.points.start.lng,
        state.points.end.lat,
        state.points.end.lng
    );
    
    if (distance > CONFIG.MAX_DISTANCE) {
        alert('La distance entre les deux points dépasse 20 km. Veuillez choisir des points plus proches.');
        return;
    }

    toggleLoading(true);

    try {
        const routeData = await fetchRoute();
        const { coordinates, totalDistance } = processRouteData(routeData);
        
        const sampledData = sampleRoute(coordinates, totalDistance);
        const elevations = await getElevations(sampledData.coordinates);
        
        state.elevationData = buildElevationData(sampledData, elevations);
        state.elevationData = smoothElevationData(state.elevationData);
        
        const slopes = calculateSlopes(state.elevationData);
        
        drawRouteOnMap(sampledData.coordinates, slopes);
        calculateStatistics();
        drawChart();
        
        // Ajuster la vue pour montrer tout le tracé
        fitMapToMarkers();
        
    } catch (error) {
        console.error('Erreur:', error);
        alert('Erreur: ' + error.message);
    } finally {
        toggleLoading(false);
    }
}

/**
 * Récupère l'itinéraire via l'API OSRM
 * @async
 * @returns {Promise<Object>} Données de l'itinéraire
 * @throws {Error} Si la récupération échoue
 */
async function fetchRoute() {
    const url = `https://router.project-osrm.org/route/v1/driving/${state.points.start.lng},${state.points.start.lat};${state.points.end.lng},${state.points.end.lat}?overview=full&geometries=geojson&steps=true`;
    
    const response = await fetch(url);
    if (!response.ok) throw new Error('Erreur lors de la récupération du tracé');
    
    const data = await response.json();
    if (!data.routes || data.routes.length === 0) throw new Error('Aucun itinéraire trouvé');
    
    return data;
}

/**
 * Extrait les coordonnées et la distance totale des données de l'itinéraire
 * @param {Object} routeData - Données brutes de l'API OSRM
 * @returns {Object} {coordinates: Array, totalDistance: Number}
 */
function processRouteData(routeData) {
    const route = routeData.routes[0];
    return {
        coordinates: route.geometry.coordinates,
        totalDistance: route.distance
    };
}

/**
 * Échantillonne l'itinéraire à intervalles réguliers
 * @param {Array<Array<number>>} coordinates - Coordonnées [lon, lat]
 * @param {number} totalDistance - Distance totale en mètres
 * @returns {Object} {coordinates: Array, distances: Array}
 */
function sampleRoute(coordinates, totalDistance) {
    const line = turf.lineString(coordinates);
    const numSamples = Math.floor(totalDistance / CONFIG.SAMPLE_INTERVAL);
    
    const sampledCoordinates = [];
    const sampledDistances = [];

    for (let i = 0; i <= numSamples; i++) {
        const targetDistanceKm = (i * CONFIG.SAMPLE_INTERVAL) / 1000;
        const point = turf.along(line, targetDistanceKm, { units: 'kilometers' });
        sampledCoordinates.push(point.geometry.coordinates);
        sampledDistances.push(i * CONFIG.SAMPLE_INTERVAL);
    }

    sampledCoordinates.push(coordinates[coordinates.length - 1]);
    sampledDistances.push(totalDistance);

    return { coordinates: sampledCoordinates, distances: sampledDistances };
}

/**
 * Récupère les élévations pour un tableau de coordonnées via l'API open-elevation
 * @async
 * @param {Array<Array<number>>} coordinates - Coordonnées [lon, lat]
 * @returns {Promise<Array<number>>} Tableau des élévations en mètres
 */
async function getElevations(coordinates) {
    const allElevations = [];
    
    for (let i = 0; i < coordinates.length; i += CONFIG.BATCH_SIZE) {
        const batch = coordinates.slice(i, i + CONFIG.BATCH_SIZE);
        const locations = batch.map(c => `${c[1]},${c[0]}`).join('|');
        
        try {
            const response = await fetch(
                `https://api.open-elevation.com/api/v1/lookup?locations=${locations}`,
                {
                    method: 'GET',
                    headers: { 'Accept': 'application/json' }
                }
            );
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const data = await response.json();
            if (data.results) {
                allElevations.push(...data.results.map(r => r.elevation));
            }
            
            if (i + CONFIG.BATCH_SIZE < coordinates.length) {
                await new Promise(resolve => setTimeout(resolve, CONFIG.API_DELAY));
            }
        } catch (error) {
            console.error('Erreur API élévation:', error);
        }
    }
    
    return allElevations;
}

/**
 * Construit le tableau de données d'élévation avec distances
 * @param {Object} sampledData - Données échantillonnées {coordinates, distances}
 * @param {Array<number>} elevations - Tableau des élévations
 * @returns {Array<Object>} Tableau d'objets {distance, elevation, segmentDistance}
 */
function buildElevationData(sampledData, elevations) {
    return elevations.map((elevation, i) => ({
        distance: sampledData.distances[i],
        elevation: elevation || 0,
        segmentDistance: i > 0 ? sampledData.distances[i] - sampledData.distances[i - 1] : 0
    }));
}

/**
 * Lisse les données d'élévation pour réduire le bruit
 * @param {Array<Object>} data - Données d'élévation brutes
 * @returns {Array<Object>} Données lissées
 */
function smoothElevationData(data) {
    const rawElevations = data.map(e => e.elevation);
    const smoothedElevations = smoothArray(rawElevations, CONFIG.SMOOTHING_WINDOW);
    
    return data.map((item, i) => ({
        ...item,
        elevation: smoothedElevations[i]
    }));
}

/**
 * Dessine l'itinéraire sur la carte avec un dégradé de couleurs selon la pente
 * @param {Array<Array<number>>} coordinates - Coordonnées [lon, lat]
 * @param {Array<number>} slopes - Pentes en pourcentage
 */
function drawRouteOnMap(coordinates, slopes) {
    state.routeLine.forEach(line => state.map.removeLayer(line));
    state.routeLine = [];

    for (let i = 0; i < coordinates.length - 1; i++) {
        const latlngs = [
            [coordinates[i][1], coordinates[i][0]],
            [coordinates[i + 1][1], coordinates[i + 1][0]]
        ];
        
        const segment = L.polyline(latlngs, {
            color: slopeToColor(slopes[i]),
            weight: 5,
            opacity: 0.7
        }).addTo(state.map);
        
        state.routeLine.push(segment);
    }
}

// ===== CALCULATIONS =====
/**
 * Calcule les pentes pour chaque segment de l'itinéraire
 * @param {Array<Object>} elevationData - Données d'élévation
 * @returns {Array<number>} Pentes en pourcentage (lissées)
 */
function calculateSlopes(elevationData) {
    const slopes = [];

    for (let i = 0; i < elevationData.length - 1; i++) {
        const deltaAlt = elevationData[i + 1].elevation - elevationData[i].elevation;
        const deltaDist = elevationData[i + 1].distance - elevationData[i].distance;
        const slope = (deltaAlt / deltaDist) * 100;
        slopes.push(slope);
    }

    slopes.push(slopes[slopes.length - 1]);
    return smoothArray(slopes, CONFIG.SMOOTHING_WINDOW);
}

/**
 * Calcule toutes les statistiques de l'itinéraire et met à jour l'affichage
 */
function calculateStatistics() {
    if (state.elevationData.length < 2) return;

    const totalDist = state.elevationData[state.elevationData.length - 1].distance;
    let elevGain = 0, elevLoss = 0;
    let maxElev = state.elevationData[0].elevation;

    for (let i = 1; i < state.elevationData.length; i++) {
        const diff = state.elevationData[i].elevation - state.elevationData[i - 1].elevation;
        if (diff > 0) elevGain += diff;
        if (diff < 0) elevLoss += Math.abs(diff);
        if (state.elevationData[i].elevation > maxElev) {
            maxElev = state.elevationData[i].elevation;
        }
    }

    const maxSlope = getMaxSlope(state.elevationData, totalDist);
    const avgSlope = getAverageSlope(state.elevationData, totalDist);

    updateStatisticsDisplay({
        totalDistance: totalDist,
        elevationGain: elevGain,
        elevationLoss: elevLoss,
        maxElevation: maxElev,
        maxSlope,
        avgSlope
    });
}

/**
 * Calcule la pente maximale de l'itinéraire
 * @param {Array<Object>} elevationData - Données d'élévation
 * @param {number} totalDistance - Distance totale en mètres
 * @returns {number} Pente maximale en pourcentage (valeur absolue)
 */
function getMaxSlope(elevationData, totalDistance) {
    if (elevationData.length < 2) return 0;

    const deltaDist = totalDistance / (elevationData.length - 1);
    let maxSlope = 0;

    for (let i = 0; i < elevationData.length - 1; i++) {
        const deltaAlt = elevationData[i + 1].elevation - elevationData[i].elevation;
        const slope = Math.abs((deltaAlt / deltaDist) * 100);
        if (slope > maxSlope) maxSlope = slope;
    }

    return maxSlope;
}

/**
 * Calcule la pente moyenne de l'itinéraire
 * @param {Array<Object>} elevationData - Données d'élévation
 * @param {number} totalDistance - Distance totale en mètres
 * @returns {number} Pente moyenne en pourcentage (valeur absolue)
 */
function getAverageSlope(elevationData, totalDistance) {
    if (elevationData.length < 2) return 0;

    const deltaAlt = elevationData[elevationData.length - 1].elevation - elevationData[0].elevation;
    return Math.abs((deltaAlt / totalDistance) * 100);
}

// ===== CHART =====
/**
 * Dessine le graphique de profil d'altitude avec gradient de couleurs selon la pente
 */
function drawChart() {
    if (state.elevationData.length < 2) return;

    const altitudes = state.elevationData.map(e => e.elevation);
    const labels = state.elevationData.map(e => (e.distance / 1000).toFixed(2));
    const slopes = calculateSlopes(state.elevationData);
    const minAlt = Math.min(...altitudes);

    const datasets = [];

    for (let i = 0; i < altitudes.length - 1; i++) {
        const segmentData = new Array(altitudes.length).fill(null);
        segmentData[i] = altitudes[i];
        segmentData[i + 1] = altitudes[i + 1];

        const fillData = new Array(altitudes.length).fill(null);
        fillData[i] = minAlt;
        fillData[i + 1] = minAlt;

        datasets.push({
            data: segmentData,
            borderColor: 'rgba(0, 0, 0, 0.3)',
            borderWidth: 1,
            fill: '+1',
            pointRadius: 0,
            tension: 0.8,
            backgroundColor: slopeToColor(slopes[i])
        });

        datasets.push({
            data: fillData,
            borderWidth: 0,
            pointRadius: 0,
            fill: false
        });
    }

    const ctx = document.getElementById('penteChart').getContext('2d');

    if (state.charts.gradient) state.charts.gradient.destroy();

    state.charts.gradient = new Chart(ctx, {
        type: 'line',
        data: { labels, datasets },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false },
                tooltip: {
                    callbacks: {
                        title: (context) => `Distance: ${context[0].label} km`,
                        label: (context) => {
                            const idx = context.dataIndex;
                            const altitude = altitudes[idx].toFixed(1);
                            const slope = slopes[idx] ? slopes[idx].toFixed(1) : '0.0';
                            return [
                                `Altitude: ${altitude} m`,
                                `Pente: ${slope} %`
                            ];
                        }
                    }
                }
            },
            scales: {
                x: {
                    title: { display: true, text: 'Distance (km)' },
                    grid: { color: 'rgba(0,0,0,0.05)' }
                },
                y: {
                    title: { display: true, text: 'Altitude (m)' },
                    grid: { color: 'rgba(0,0,0,0.05)' }
                }
            }
        }
    });
}

// ===== UTILITIES =====
/**
 * Calcule la distance entre deux points géographiques (formule Haversine)
 * @param {number} lat1 - Latitude du point 1
 * @param {number} lon1 - Longitude du point 1
 * @param {number} lat2 - Latitude du point 2
 * @param {number} lon2 - Longitude du point 2
 * @returns {number} Distance en mètres
 */
function getDistance(lat1, lon1, lat2, lon2) {
    const R = 6371000;
    const φ1 = lat1 * Math.PI / 180;
    const φ2 = lat2 * Math.PI / 180;
    const Δφ = (lat2 - lat1) * Math.PI / 180;
    const Δλ = (lon2 - lon1) * Math.PI / 180;

    const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
              Math.cos(φ1) * Math.cos(φ2) *
              Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c;
}

/**
 * Lisse un tableau de valeurs avec une moyenne glissante
 * @param {Array<number>} data - Données à lisser
 * @param {number} [windowSize=9] - Taille de la fenêtre de lissage
 * @returns {Array<number>} Données lissées
 */
function smoothArray(data, windowSize = 9) {
    const smoothed = [];
    const half = Math.floor(windowSize / 2);

    for (let i = 0; i < data.length; i++) {
        let sum = 0, count = 0;
        for (let j = i - half; j <= i + half; j++) {
            if (j >= 0 && j < data.length) {
                sum += data[j];
                count++;
            }
        }
        smoothed.push(sum / count);
    }

    return smoothed;
}

/**
 * Convertit une pente en couleur RGB (gradient bleu → cyan → vert → jaune → rouge)
 * @param {number} slope - Pente en pourcentage
 * @returns {string} Couleur au format 'rgb(r, g, b)'
 */
function slopeToColor(slope) {
    const absSlope = Math.abs(slope);
    let t = absSlope / CONFIG.MAX_SLOPE;

    if (t >= 1) return 'rgb(139, 0, 0)';

    let r, g, b;

    if (t < 0.25) {
        const localT = t / 0.25;
        r = 0;
        g = Math.round(255 * localT);
        b = 255;
    } else if (t < 0.5) {
        const localT = (t - 0.25) / 0.25;
        r = 0;
        g = 255;
        b = Math.round(255 * (1 - localT));
    } else if (t < 0.75) {
        const localT = (t - 0.5) / 0.25;
        r = Math.round(255 * localT);
        g = 255;
        b = 0;
    } else {
        const localT = (t - 0.75) / 0.25;
        r = 255;
        g = Math.round(255 * (1 - localT));
        b = 0;
    }

    return `rgb(${r}, ${g}, ${b})`;
}

/**
 * Affiche ou masque l'indicateur de chargement
 * @param {boolean} show - true pour afficher, false pour masquer
 */
function toggleLoading(show) {
    const loading = document.getElementById('loading');
    if (show) {
        loading.classList.add('active');
    } else {
        loading.classList.remove('active');
    }
}

/**
 * Met à jour l'affichage des statistiques dans l'interface
 * @param {Object} stats - Objet contenant toutes les statistiques
 * @param {number} stats.totalDistance - Distance totale en mètres
 * @param {number} stats.elevationGain - Dénivelé positif en mètres
 * @param {number} stats.elevationLoss - Dénivelé négatif en mètres
 * @param {number} stats.maxElevation - Altitude maximale en mètres
 * @param {number} stats.maxSlope - Pente maximale en pourcentage
 * @param {number} stats.avgSlope - Pente moyenne en pourcentage
 */
function updateStatisticsDisplay(stats) {
    document.getElementById('totalDistance').textContent = `${(stats.totalDistance / 1000).toFixed(2)} km`;
    document.getElementById('elevationGain').textContent = `${stats.elevationGain.toFixed(0)} m`;
    document.getElementById('elevationLoss').textContent = `${stats.elevationLoss.toFixed(0)} m`;
    document.getElementById('maxElevation').textContent = `${stats.maxElevation.toFixed(0)} m`;
    document.getElementById('maxPente').textContent = `${stats.maxSlope.toFixed(2)} %`;
    document.getElementById('moyennePente').textContent = `${stats.avgSlope.toFixed(2)} %`;
}

/**
 * Réinitialise complètement l'application (marqueurs, tracé, graphiques, statistiques)
 */
function clearRoute() {
    state.points.start = null;
    state.points.end = null;
    state.elevationData = [];

    if (state.markers.start) state.map.removeLayer(state.markers.start);
    if (state.markers.end) state.map.removeLayer(state.markers.end);
    state.markers.start = null;
    state.markers.end = null;

    state.routeLine.forEach(line => state.map.removeLayer(line));
    state.routeLine = [];

    if (state.charts.gradient) state.charts.gradient.destroy();

    updateStatisticsDisplay({
        totalDistance: 0,
        elevationGain: 0,
        elevationLoss: 0,
        maxElevation: 0,
        maxSlope: 0,
        avgSlope: 0
    });
    
    state.map.fitBounds([MAP_BOUNDS.southwest, MAP_BOUNDS.northeast]);
}