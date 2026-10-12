# Atmos Weather

Static weather dashboard with city search, current weather, hourly forecasts,
seven-day forecasts, and Celsius/Fahrenheit conversion. Data comes from
Open-Meteo and GeoNames; no API key is required for personal, non-commercial use.

Serve this directory with a local HTTP server and open `index.html`.
On Vercel use the Other framework preset, no build command, and output directory `.`.
The checked-in `vercel.json` supplies these defaults.

The first city is Chiang Mai. Search for another city, then select the matching
location. Errors are shown without replacing missing weather with fixed numbers.
The UV reading is the day's forecast maximum. Times use the selected city's timezone.

Before commercial use, choose an Open-Meteo plan suitable for your traffic and use:
https://open-meteo.com/en/pricing
