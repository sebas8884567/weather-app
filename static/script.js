const cityInput        = document.getElementById('city');
const suggestionsList  = document.getElementById('suggestions');
const getWeatherButton = document.getElementById('getWeather');
const responseDiv      = document.getElementById('response');
const animBg           = document.getElementById('animation-background');

let selectedCity  = null;
let debounceTimer = null;

// ─── Autocompletado ───────────────────────────────────────────
cityInput.addEventListener('input', function () {
  const query = this.value.trim();
  selectedCity = null;
  clearTimeout(debounceTimer);
  suggestionsList.innerHTML = '';
  if (query.length < 3) return;

  debounceTimer = setTimeout(() => {
    fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(query)}&count=10&language=es&format=json`)
      .then(r => r.json())
      .then(data => {
        const results = data.results || [];
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
      .catch(err => console.error('Error suggest:', err));
  }, 300);
});

function showSuggestions(cities) {
  suggestionsList.innerHTML = '';
  if (!cities || cities.length === 0) return;
  cities.forEach(city => {
    const li    = document.createElement('li');
    li.textContent = `${city.name} (${city.country_code})`;
    li.addEventListener('click', () => {
      cityInput.value = li.textContent;
      selectedCity = { name: city.name, country: city.country_code, lat: city.latitude, lon: city.longitude };
      suggestionsList.innerHTML = '';
    });
    suggestionsList.appendChild(li);
  });
}

// ─── Obtener clima ────────────────────────────────────────────
getWeatherButton.addEventListener('click', fetchWeather);
cityInput.addEventListener('keydown', e => { if (e.key === 'Enter') fetchWeather(); });

function fetchWeather() {
  const raw = cityInput.value.trim();
  if (!raw) { alert('Ingresa una ciudad.'); return; }

  responseDiv.innerHTML = '<p class="loading-text">Buscando...</p>';

  const url = selectedCity
    ? `/weather?lat=${selectedCity.lat}&lon=${selectedCity.lon}`
    : `/weather?city=${encodeURIComponent(raw)}`;

  fetch(url)
    .then(r => r.json())
    .then(data => {
      if (data.error) {
        responseDiv.innerHTML = `<p class="error-msg">⚠ ${data.error}</p>`;
        return;
      }
      renderWeather(data);
      updateTheme(data.temperature, data.description);
    })
    .catch(() => {
      responseDiv.innerHTML = '<p class="error-msg">Error de conexión. Intenta de nuevo.</p>';
    });
}

function renderWeather(d) {
  responseDiv.innerHTML = `
    <div class="weather-card">
      <p class="city-name">${d.city}, ${d.country}</p>
      <p class="description">${d.description}</p>
      <p class="temp-main">${d.temperature}<span>°C</span></p>
      <div class="stats-grid">
        <div class="stat-item">
          <p class="stat-label">Sensación</p>
          <p class="stat-value">${d.feels_like}<span class="stat-unit">°C</span></p>
        </div>
        <div class="stat-item">
          <p class="stat-label">Humedad</p>
          <p class="stat-value">${d.humidity}<span class="stat-unit">%</span></p>
        </div>
        <div class="stat-item">
          <p class="stat-label">Viento</p>
          <p class="stat-value">${d.wind_speed}<span class="stat-unit">m/s</span></p>
        </div>
      </div>
    </div>`;
}

// ─── Tema dinámico ────────────────────────────────────────────
function updateTheme(temp, desc) {
  const d = desc.toLowerCase();
  animBg.innerHTML = '';
  

  // Determinar clase del tema
  const themes = ['weather-clear','weather-hot','weather-rain','weather-clouds','weather-snow','weather-night','weather-default'];
  document.body.classList.remove(...themes);

  let theme;
  const hour = new Date().getHours();
  const isNight = hour < 6 || hour >= 20;

  if (d.includes('lluvia') || d.includes('rain') || d.includes('llovizna') || d.includes('tormenta')) {
    theme = 'weather-rain';
  } else if (d.includes('nieve') || d.includes('snow')) {
    theme = 'weather-snow';
  } else if (d.includes('nublado') || d.includes('cloud') || d.includes('niebla')) {
    theme = 'weather-clouds';
  } else if (isNight) {
    theme = 'weather-night';
  } else if (temp >= 28) {
    theme = 'weather-hot';
  } else {
    theme = 'weather-clear';
  }

  document.body.classList.add(theme);

  // Partículas según tema
  if (theme === 'weather-rain') spawnRain();
  else if (theme === 'weather-snow') spawnSnow();
  else if (theme === 'weather-night') spawnStars();
  else spawnClouds(theme === 'weather-clouds' ? 5 : 2);
}

function spawnRain() {
  for (let i = 0; i < 80; i++) {
    const drop = document.createElement('div');
    drop.className = 'raindrop';
    drop.style.left = `${Math.random() * 100}%`;
    drop.style.animationDuration = `${0.7 + Math.random() * 0.8}s`;
    drop.style.animationDelay = `${Math.random() * 2}s`;
    drop.style.opacity = 0.4 + Math.random() * 0.4;
    animBg.appendChild(drop);
  }
  spawnClouds(4);
}

function spawnSnow() {
  for (let i = 0; i < 50; i++) {
    const flake = document.createElement('div');
    flake.className = 'snowflake';
    flake.style.left = `${Math.random() * 100}%`;
    flake.style.width = flake.style.height = `${3 + Math.random() * 5}px`;
    flake.style.animationDuration = `${3 + Math.random() * 5}s`;
    flake.style.animationDelay = `${Math.random() * 5}s`;
    flake.style.opacity = 0.5 + Math.random() * 0.5;
    animBg.appendChild(flake);
  }
}

function spawnStars() {
  for (let i = 0; i < 80; i++) {
    const star = document.createElement('div');
    star.className = 'star';
    const size = 1 + Math.random() * 2.5;
    star.style.width = star.style.height = `${size}px`;
    star.style.left = `${Math.random() * 100}%`;
    star.style.top  = `${Math.random() * 70}%`;
    star.style.animationDuration = `${2 + Math.random() * 3}s`;
    star.style.animationDelay = `${Math.random() * 3}s`;
    animBg.appendChild(star);
  }
}

function spawnClouds(count) {
  for (let i = 0; i < count; i++) {
    const cloud = document.createElement('div');
    cloud.className = 'cloud';
    cloud.style.top = `${5 + Math.random() * 25}%`;
    cloud.style.animationDuration = `${25 + Math.random() * 20}s`;
    cloud.style.animationDelay = `${Math.random() * 15}s`;
    cloud.style.transform = `scale(${0.6 + Math.random() * 0.7})`;
    cloud.style.opacity = 0.4 + Math.random() * 0.3;
    animBg.appendChild(cloud);
  }
}

// ─── Cerrar sugerencias ───────────────────────────────────────
document.addEventListener('click', e => {
  if (e.target !== cityInput && !suggestionsList.contains(e.target)) {
    suggestionsList.innerHTML = '';
  }
});