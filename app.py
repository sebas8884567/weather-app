from flask import Flask, request, jsonify, render_template
import requests
import os
from dotenv import load_dotenv

# ─── Carga variables de entorno ───────────────────────────────────────────────
load_dotenv()

app = Flask(__name__)

# ─── Configuración ────────────────────────────────────────────────────────────
OPENWEATHERMAP_API_KEY = os.getenv("OPENWEATHERMAP_API_KEY")
OPENWEATHERMAP_API_URL  = "https://api.openweathermap.org/data/2.5/weather"
OPENWEATHERMAP_GEO_URL  = "https://api.openweathermap.org/geo/1.0/direct"


# ─── Rutas ────────────────────────────────────────────────────────────────────

@app.route('/')
def home():
    return render_template('index.html')


@app.route('/suggest')
def suggest_cities():
    query = request.args.get('city', '').strip()

    if not query:
        return jsonify([])

    if len(query) > 100:
        return jsonify({"error": "Query demasiado larga"}), 400

    # ── Geocoding API: busca ciudades reales ───────────────────────────────────
    try:
        response = requests.get(OPENWEATHERMAP_GEO_URL, params={
            'q': query,
            'limit': 3,
            'appid': OPENWEATHERMAP_API_KEY
        }, timeout=5)
    except requests.exceptions.Timeout:
        return jsonify({"error": "Timeout buscando ciudades"}), 504
    except requests.exceptions.ConnectionError:
        return jsonify({"error": "Sin conexión"}), 503

    if response.status_code != 200:
        return jsonify([])

    results = response.json()

    # Devuelve nombre + país para que el frontend pueda mostrar "Cartagena, CO"
    # y además lat/lon para usarlos directamente en /weather
    suggestions = [
        {
            'name':    item['name'],
            'country': item.get('country', ''),
            'state':   item.get('state', ''),
            'lat':     item['lat'],
            'lon':     item['lon'],
        }
        for item in results
    ]
    return jsonify(suggestions)


@app.route('/weather')
def get_weather():
    lat  = request.args.get('lat', '').strip()
    lon  = request.args.get('lon', '').strip()
    city = request.args.get('city', '').strip()

    # ── Validación: necesita coordenadas o nombre de ciudad ───────────────────
    if lat and lon:
        # Modo preciso: el usuario eligió una sugerencia del autocompletado
        try:
            params = {
                'lat':   float(lat),
                'lon':   float(lon),
                'appid': OPENWEATHERMAP_API_KEY,
                'units': 'metric',
                'lang':  'es'
            }
        except ValueError:
            return jsonify({"error": "Coordenadas inválidas"}), 400

    elif city:
        # Modo fallback: búsqueda por nombre (escribió a mano sin elegir sugerencia)
        if len(city) > 100:
            return jsonify({"error": "Nombre de ciudad demasiado largo"}), 400
        params = {
            'q':     city,
            'appid': OPENWEATHERMAP_API_KEY,
            'units': 'metric',
            'lang':  'es'
        }
    else:
        return jsonify({"error": "Se requiere 'city' o 'lat'+'lon'"}), 400

    # ── Llamada a la API externa ───────────────────────────────────────────────
    try:
        response = requests.get(OPENWEATHERMAP_API_URL, params=params, timeout=5)
    except requests.exceptions.Timeout:
        return jsonify({"error": "La API tardó demasiado. Intenta de nuevo."}), 504
    except requests.exceptions.ConnectionError:
        return jsonify({"error": "No se pudo conectar a OpenWeatherMap. Revisa tu conexión."}), 503

    # ── Manejo de errores por status code ─────────────────────────────────────
    if response.status_code == 404:
        return jsonify({"error": f"Ciudad '{city}' no encontrada"}), 404

    if response.status_code == 401:
        return jsonify({"error": "API key inválida o no autorizada"}), 401

    if response.status_code == 429:
        return jsonify({"error": "Demasiadas solicitudes. Espera un momento."}), 429

    if response.status_code != 200:
        return jsonify({"error": f"Error externo (código {response.status_code})"}), 502

    # ── Procesamiento de datos ─────────────────────────────────────────────────
    try:
        data = response.json()
        weather_data = {
            'city':        data['name'],
            'country':     data['sys']['country'],
            'temperature': round(data['main']['temp'], 1),
            'feels_like':  round(data['main']['feels_like'], 1),
            'description': data['weather'][0]['description'].capitalize(),
            'humidity':    data['main']['humidity'],
            'wind_speed':  data['wind']['speed'],
            'icon':        data['weather'][0]['icon'],
        }
        return jsonify(weather_data)

    except (KeyError, ValueError):
        return jsonify({"error": "Error al procesar la respuesta de la API"}), 500


# ─── Entry point ──────────────────────────────────────────────────────────────
if __name__ == '__main__':
    debug_mode = os.getenv("FLASK_DEBUG", "false").lower() == "true"
    app.run(debug=debug_mode)