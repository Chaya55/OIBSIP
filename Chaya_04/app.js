const cityInput = document.getElementById('cityInput');
const searchBtn = document.getElementById('searchBtn');
const locationBtn = document.getElementById('locationBtn');
const statusEl = document.getElementById('status');
const currentEl = document.getElementById('currentWeather');
const forecastEl = document.getElementById('forecast');

const weatherIcons = {
  0: '☀️', 1: '🌤️', 2: '⛅', 3: '☁️',
  45: '🌫️', 48: '🌫️', 51: '🌦️', 53: '🌦️', 55: '🌧️',
  61: '🌧️', 63: '🌧️', 65: '🌧️', 71: '🌨️', 73: '🌨️', 75: '❄️',
  80: '🌦️', 81: '🌧️', 82: '⛈️', 95: '⛈️', 96: '⛈️', 99: '⛈️'
};

function icon(code) { return weatherIcons[code] || '🌡️'; }

function setStatus(message, error = false) {
  statusEl.textContent = message;
  statusEl.style.color = error ? '#fee2e2' : '#fff';
}

async function geocode(city) {
  const url = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(city)}&count=1&language=en&format=json`;
  const res = await fetch(url);
  if (!res.ok) throw new Error('Unable to contact weather service.');
  const data = await res.json();
  if (!data.results?.length) throw new Error('City not found. Try another city.');
  return data.results[0];
}

async function getWeather(latitude, longitude) {
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,relative_humidity_2m,apparent_temperature,is_day,precipitation,weather_code,wind_speed_10m&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max&timezone=auto&forecast_days=6`;
  const res = await fetch(url);
  if (!res.ok) throw new Error('Unable to fetch weather data.');
  return res.json();
}

function renderWeather(place, data) {
  const c = data.current;
  const unit = data.current_units.temperature_2m || '°C';
  const daily = data.daily;

  currentEl.innerHTML = `
    <div class="current-top">
      <div>
        <h2>${place.name}${place.country ? ', ' + place.country : ''}</h2>
        <div class="condition">${icon(c.weather_code)} Weather code ${c.weather_code}</div>
      </div>
      <div class="temp">${Math.round(c.temperature_2m)}${unit}</div>
    </div>
    <div class="details">
      <div class="detail"><b>Feels like</b><br>${Math.round(c.apparent_temperature)}${unit}</div>
      <div class="detail"><b>Humidity</b><br>${c.relative_humidity_2m}%</div>
      <div class="detail"><b>Wind</b><br>${Math.round(c.wind_speed_10m)} km/h</div>
      <div class="detail"><b>Precipitation</b><br>${c.precipitation} mm</div>
    </div>
  `;

  const cards = daily.time.map((date, i) => `
    <div class="day">
      <b>${new Date(date + 'T12:00:00').toLocaleDateString(undefined, {weekday:'short', month:'short', day:'numeric'})}</b>
      <div class="icon">${icon(daily.weather_code[i])}</div>
      <strong>${Math.round(daily.temperature_2m_max[i])}° / ${Math.round(daily.temperature_2m_min[i])}°</strong>
      <p>Rain: ${daily.precipitation_probability_max[i] ?? 0}%</p>
    </div>
  `).join('');

  forecastEl.innerHTML = `<h2>6-Day Forecast</h2><div class="forecast-grid">${cards}</div>`;
  currentEl.classList.remove('hidden');
  forecastEl.classList.remove('hidden');
}

async function searchCity(city) {
  if (!city.trim()) {
    setStatus('Please enter a city name.', true);
    return;
  }
  try {
    setStatus('Loading weather...');
    const place = await geocode(city);
    const data = await getWeather(place.latitude, place.longitude);
    renderWeather(place, data);
    setStatus(`Updated for ${place.name}.`);
  } catch (err) {
    setStatus(err.message, true);
  }
}

searchBtn.addEventListener('click', () => searchCity(cityInput.value));
cityInput.addEventListener('keydown', e => {
  if (e.key === 'Enter') searchCity(cityInput.value);
});

locationBtn.addEventListener('click', () => {
  if (!navigator.geolocation) {
    setStatus('Geolocation is not supported by this browser.', true);
    return;
  }
  setStatus('Getting your location...');
  navigator.geolocation.getCurrentPosition(async pos => {
    try {
      const { latitude, longitude } = pos.coords;
      const data = await getWeather(latitude, longitude);
      const place = { name: 'Your Location' };
      renderWeather(place, data);
      setStatus('Weather updated for your location.');
    } catch (err) {
      setStatus(err.message, true);
    }
  }, () => setStatus('Location permission was denied.', true));
});

// Demo default city so the page is useful immediately.
searchCity('Bengaluru');
