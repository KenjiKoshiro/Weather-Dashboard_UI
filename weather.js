'use strict';

const status = document.getElementById('weather-status');
const results = document.getElementById('city-results');
const search = document.getElementById('city-search');
let unit = 'C';
let weather = null;
let locationInfo = null;
let requestNumber = 0;
let requestController;

function condition(code, isDay = true) {
  if (code === 0) return [isDay ? '☀️' : '🌙', 'Clear sky'];
  if (code <= 3) return ['⛅', code === 3 ? 'Overcast' : 'Partly cloudy'];
  if (code <= 48) return ['🌫️', 'Fog'];
  if (code <= 67) return ['🌧️', 'Rain'];
  if (code <= 77 || code === 85 || code === 86) return ['❄️', 'Snow'];
  if (code <= 82) return ['🌦️', 'Rain showers'];
  if (code >= 95) return ['⛈️', 'Thunderstorm'];
  return ['⛅', 'Weather'];
}

function temperature(value) {
  if (typeof value !== 'number') return '—';
  return Math.round(unit === 'F' ? value * 9 / 5 + 32 : value).toString();
}

function number(value, digits = 0) {
  return typeof value === 'number' ? value.toFixed(digits) : '—';
}

function clearReadings() {
  document.querySelectorAll('.hero-stat-val, .highlight-val').forEach(el => { el.textContent = '—'; });
  document.getElementById('temp-val').textContent = '—';
  document.getElementById('datetime-display').textContent = '—';
  document.querySelector('.condition-row').textContent = '';
  document.querySelector('.city-sub').textContent = '';
  document.querySelector('.hourly-scroll').replaceChildren();
  document.querySelector('.week-grid').replaceChildren();
  document.querySelector('.badge').textContent = 'Loading weather';
  document.querySelector('.weather-icon').textContent = '⛅';
  document.getElementById('uv-description').textContent = '';
}

function card(className, items) {
  const el = document.createElement('div');
  el.className = className;
  for (const [className, text] of items) {
    const child = document.createElement('div');
    child.className = className;
    child.textContent = text;
    el.append(child);
  }
  return el;
}

function render() {
  if (!weather) return;
  const { current, hourly, daily } = weather;
  const [icon, text] = condition(current.weather_code, current.is_day === 1);
  document.querySelector('.location-meta').textContent = `${locationInfo.name}, ${locationInfo.country || ''}`;
  document.querySelector('.weather-icon').textContent = icon;
  document.querySelector('.city-sub').textContent = text;
  document.querySelector('.badge').textContent = 'Current Weather';
  document.getElementById('temp-val').textContent = temperature(current.temperature_2m);
  document.getElementById('unit-hero').textContent = `°${unit}`;
  document.querySelector('.condition-row').textContent = `H: ${temperature(daily.temperature_2m_max[0])}° · L: ${temperature(daily.temperature_2m_min[0])}° · Feels like ${temperature(current.apparent_temperature)}°${unit}`;
  const hourIndex = Math.max(0, hourly.time.findIndex(time => time >= current.time.slice(0, 13) + ':00'));
  const visibility = hourly.visibility[hourIndex];
  const uv = daily.uv_index_max[0];
  const stats = document.querySelectorAll('.hero-stat-val');
  stats[0].textContent = `${number(current.relative_humidity_2m)}%`;
  stats[1].textContent = `${number(current.wind_speed_10m, 1)} km/h`;
  stats[2].textContent = `${number(uv, 1)} UV max`;
  const highlights = document.querySelectorAll('.highlight-val');
  highlights[0].textContent = stats[0].textContent;
  highlights[1].textContent = stats[1].textContent;
  highlights[2].textContent = number(uv, 1);
  highlights[3].textContent = `${temperature(current.apparent_temperature)}°${unit}`;
  highlights[4].textContent = `${number(typeof visibility === 'number' ? visibility / 1000 : null, 1)} km`;
  highlights[5].textContent = `${number(current.pressure_msl)} hPa`;
  document.querySelector('.uv-needle').style.left = `${Math.min(100, Math.max(0, (uv || 0) / 11 * 100))}%`;
  document.getElementById('uv-description').textContent = typeof uv !== 'number' ? 'Unavailable' : uv < 3 ? 'Low' : uv < 6 ? 'Moderate' : uv < 8 ? 'High' : uv < 11 ? 'Very high' : 'Extreme';
  const fills = document.querySelectorAll('.prog-fill');
  [current.relative_humidity_2m, current.wind_speed_10m / 80 * 100, (visibility || 0) / 20000 * 100].forEach((value, i) => { fills[i].style.width = `${Math.min(100, Math.max(0, value || 0))}%`; });
  document.querySelector('.hourly-scroll').replaceChildren(...hourly.time.slice(hourIndex, hourIndex + 12).map((time, offset) => {
    const index = hourIndex + offset;
    return card('hour-card' + (offset === 0 ? ' active' : ''), [
      ['hour-time', offset === 0 ? 'Now' : time.slice(11, 16)],
      ['hour-icon', condition(hourly.weather_code[index], hourly.is_day[index] === 1)[0]],
      ['hour-temp', `${temperature(hourly.temperature_2m[index])}°`],
    ]);
  }));
  document.querySelector('.week-grid').replaceChildren(...daily.time.map((date, i) => card('day-card' + (i === 0 ? ' today' : ''), [
    ['day-name', i === 0 ? 'TODAY' : new Date(date + 'T12:00:00Z').toLocaleDateString('en-US', { weekday: 'short', timeZone: 'UTC' }).toUpperCase()],
    ['day-icon', condition(daily.weather_code[i])[0]],
    ['day-hi', `${temperature(daily.temperature_2m_max[i])}°`],
    ['day-lo', `${temperature(daily.temperature_2m_min[i])}°`],
  ])));
  document.getElementById('datetime-display').textContent = new Intl.DateTimeFormat('en-US', { weekday: 'long', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit', timeZone: weather.timezone }).format(new Date());
}

function setUnit(value) {
  unit = value;
  document.getElementById('cel-btn').classList.toggle('active', unit === 'C');
  document.getElementById('fah-btn').classList.toggle('active', unit === 'F');
  document.getElementById('cel-btn').setAttribute('aria-pressed', String(unit === 'C'));
  document.getElementById('fah-btn').setAttribute('aria-pressed', String(unit === 'F'));
  render();
}

async function getJson(url, signal) {
  const response = await fetch(url, { signal });
  if (!response.ok) throw new Error('The weather service is unavailable. Please try again.');
  return response.json();
}

function startRequest() {
  requestController?.abort();
  requestController = new AbortController();
  return { signal: requestController.signal, number: ++requestNumber };
}

async function loadWeather(location) {
  const request = startRequest();
  weather = null;
  clearReadings();
  results.replaceChildren();
  document.querySelector('.location-meta').textContent = `${location.name}, ${location.country || ''}`;
  status.textContent = `Loading weather for ${location.name}...`;
  try {
    const params = new URLSearchParams({
      latitude: String(location.latitude), longitude: String(location.longitude), timezone: 'auto', forecast_days: '7',
      current: 'temperature_2m,relative_humidity_2m,apparent_temperature,is_day,weather_code,pressure_msl,wind_speed_10m',
      hourly: 'temperature_2m,weather_code,visibility,is_day',
      daily: 'weather_code,temperature_2m_max,temperature_2m_min,uv_index_max',
    });
    const data = await getJson(`https://api.open-meteo.com/v1/forecast?${params}`, request.signal);
    if (request.number !== requestNumber) return;
    if (!data.current || !data.hourly || !data.daily) throw new Error('Weather data is incomplete. Please try again.');
    weather = data;
    locationInfo = location;
    render();
    status.textContent = `Updated for ${location.name}. Times shown in ${weather.timezone}.`;
  } catch (error) {
    if (request.number !== requestNumber || error.name === 'AbortError') return;
    status.textContent = error.message;
    document.querySelector('.badge').textContent = 'Weather unavailable';
  }
}

search.addEventListener('submit', async event => {
  event.preventDefault();
  const name = document.getElementById('city-input').value.trim();
  if (name.length < 2) { status.textContent = 'Enter at least two characters.'; return; }
  const request = startRequest();
  status.textContent = 'Searching cities...';
  results.replaceChildren();
  try {
    const params = new URLSearchParams({ name, count: '5', language: 'en', format: 'json' });
    const data = await getJson(`https://geocoding-api.open-meteo.com/v1/search?${params}`, request.signal);
    if (request.number !== requestNumber) return;
    if (!data.results?.length) { status.textContent = 'No matching city. Try another name.'; return; }
    if (data.results.length === 1) { await loadWeather(data.results[0]); return; }
    status.textContent = 'Choose a city:';
    for (const location of data.results) {
      const button = document.createElement('button');
      button.type = 'button';
      button.textContent = [location.name, location.admin1, location.country].filter(Boolean).join(', ');
      button.style.cssText = 'background:var(--glass);color:var(--text);border:1px solid var(--glass-border);border-radius:12px;padding:10px;cursor:pointer';
      button.addEventListener('click', () => loadWeather(location));
      results.append(button);
    }
  } catch (error) {
    if (request.number === requestNumber && error.name !== 'AbortError') status.textContent = error.message;
  }
});

loadWeather({ name: 'Chiang Mai', country: 'Thailand', latitude: 18.7883, longitude: 98.9853 });
