const cityInput        = document.getElementById('city');
const suggestionsList  = document.getElementById('suggestions');
const getWeatherButton = document.getElementById('getWeather');
const responseDiv      = document.getElementById('response');
const animationBackground = document.getElementById('animation-background');

// ─── Estado ───────────────────────────────────────────────────────────────────
let selectedCity  = null;
let debounceTimer = null;

// ─── Autocompletado con Open-Meteo Geocoding ──────────────────────────────────
cityInput.addEventListener('input', function () {
    const query = this.value.trim();
    selectedCity = null;
    clearTimeout(debounceTimer);
    suggestionsList.innerHTML = '';

    if (query.length < 3) return;

    debounceTimer = setTimeout(() => {
        fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(query)}&count=10&language=es&format=json`)
            .then(res => res.json())
            .then(data => {
                const results = data.results || [];

                // Deduplicar por nombre+país y ordenar por población
                const seen = new Set();
                const final = results
                    .sort((a, b) => (b.population || 0) - (a.population || 0))
                    .filter(c => {
                        const key = `${c.name.toLowerCase()}-${c.country_code}`;
                        if (seen.has(key)) return false;
                        seen.add(key);
                        return true;
                    })
                    .slice(0, 4);

                showSuggestions(final);
            })
            .catch(err => console.error('Error en suggest:', err));
    }, 300);
});

// ─── Mostrar sugerencias ──────────────────────────────────────────────────────
function showSuggestions(cities) {
    suggestionsList.innerHTML = '';
    if (!cities || cities.length === 0) return;

    cities.forEach(city => {
        const li    = document.createElement('li');
        const label = `${city.name} (${city.country_code})`;
        li.textContent = label;

        li.addEventListener('click', function () {
            cityInput.value = label;
            selectedCity = {
                name:    city.name,
                country: city.country_code,
                lat:     city.latitude,
                lon:     city.longitude,
            };
            suggestionsList.innerHTML = '';
        });

        suggestionsList.appendChild(li);
    });
}

// ─── Obtener clima ────────────────────────────────────────────────────────────
getWeatherButton.addEventListener('click', fetchWeather);

cityInput.addEventListener('keydown', function (e) {
    if (e.key === 'Enter') fetchWeather();
});

function fetchWeather() {
    const rawInput = cityInput.value.trim();

    if (!rawInput) {
        alert('Por favor, ingrese una ciudad.');
        return;
    }

    responseDiv.innerHTML = 'Buscando el clima...';

    const url = selectedCity
        ? `/weather?lat=${selectedCity.lat}&lon=${selectedCity.lon}`
        : `/weather?city=${encodeURIComponent(rawInput)}`;

    fetch(url)
        .then(res => res.json())
        .then(data => {
            if (data.error) {
                responseDiv.innerHTML = `<p class="error">⚠️ ${data.error}</p>`;
                return;
            }

            responseDiv.innerHTML = `
                <h2>Clima en ${data.city}, ${data.country}</h2>
                <p>Temperatura: ${data.temperature}°C</p>
                <p>Sensación térmica: ${data.feels_like}°C</p>
                <p>Descripción: ${data.description}</p>
                <p>Humedad: ${data.humidity}%</p>
                <p>Viento: ${data.wind_speed} m/s</p>
            `;

            updateBackgroundAnimation(data.temperature, data.description);
        })
        .catch(err => {
            console.error('Error:', err);
            responseDiv.innerHTML = 'Error al obtener el clima. Por favor, intente de nuevo.';
        });
}

// ─── Animaciones (sin cambios) ────────────────────────────────────────────────
function updateBackgroundAnimation(temperature, description) {
    animationBackground.innerHTML = '';
    animationBackground.className = '';

    for (let i = 0; i < 3; i++) {
        const cloud = document.createElement('div');
        cloud.className = 'cloud';
        cloud.style.top = `${Math.random() * 20}%`;
        cloud.style.animationDelay = `${Math.random() * 15}s`;
        animationBackground.appendChild(cloud);
    }

    if (temperature < 10) {
        animationBackground.classList.add('cold-bg');
    } else if (temperature > 25) {
        animationBackground.classList.add('warm-bg');
        const sun = document.createElement('div');
        sun.className = 'sun';
        animationBackground.appendChild(sun);
    } else {
        animationBackground.classList.add('warm-bg');
    }

    if (description.toLowerCase().includes('rain') || description.toLowerCase().includes('lluvia')) {
        for (let i = 0; i < 100; i++) {
            const raindrop = document.createElement('div');
            raindrop.className = 'raindrop';
            raindrop.style.left = `${Math.random() * 100}%`;
            raindrop.style.animationDelay = `${Math.random() * 2}s`;
            animationBackground.appendChild(raindrop);
        }
    }
}

// ─── Cerrar sugerencias al hacer click fuera ─────────────────────────────────
document.addEventListener('click', function (e) {
    if (e.target !== cityInput && e.target !== suggestionsList) {
        suggestionsList.innerHTML = '';
    }
});