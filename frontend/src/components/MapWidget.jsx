import { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix Leaflet marker icons
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

const clinicIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
});

export default function MapWidget({ userLocation = null }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [clinics, setClinics] = useState([]);
  const [mapCenter, setMapCenter] = useState([20.5937, 78.9629]); // India center
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  // ✅ Auto-populate search field with user's location
  useEffect(() => {
    if (userLocation?.city && userLocation?.state) {
      const initialQuery = `${userLocation.city}, ${userLocation.state}`;
      setSearchQuery(initialQuery);
      // Auto-search on mount with user's location
      searchClinics(initialQuery);
    }
  }, [userLocation]);

  const searchClinics = async (query) => {
    if (!query.trim()) return;
    
    setLoading(true);
    try {
      // Use Nominatim (OpenStreetMap) for geocoding
      const geoResponse = await fetch(
        `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=1`
      );
      const geoData = await geoResponse.json();

      if (geoData.length === 0) {
        alert('Location not found. Please try a different search.');
        setLoading(false);
        return;
      }

      const { lat, lon } = geoData[0];
      setMapCenter([parseFloat(lat), parseFloat(lon)]);

      // Fetch nearby clinics using Overpass API
      const overpassQuery = `
        [bbox:-85.051129,${lon}-0.05,85.051129,${lon}+0.05];
        (
          node["amenity"="clinic"](around:5000,${lat},${lon});
          node["amenity"="hospital"](around:5000,${lat},${lon});
          node["healthcare"="clinic"](around:5000,${lat},${lon});
        );
        out center;
      `;

      const overpassResponse = await fetch(
        'https://overpass-api.de/api/interpreter',
        {
          method: 'POST',
          body: overpassQuery,
        }
      );
      const overpassData = await overpassResponse.json();

      const clinicList = (overpassData.elements || []).map((element, idx) => ({
        id: idx,
        name: element.tags?.name || `Clinic ${idx + 1}`,
        lat: element.lat || element.center?.lat,
        lon: element.lon || element.center?.lon,
        amenity: element.tags?.amenity || element.tags?.healthcare || 'clinic',
        address: element.tags?.['addr:street'] || 'Address not available',
      }));

      // Filter out entries without coordinates
      const validClinics = clinicList.filter(c => c.lat && c.lon);
      setClinics(validClinics);
      setSearched(true);

      if (validClinics.length === 0) {
        alert('No clinics found in this area. Try a nearby city.');
      }
    } catch (error) {
      console.error('Map search error:', error);
      alert('Error searching for clinics. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e) => {
    e.preventDefault();
    searchClinics(searchQuery);
  };

  return (
    <div className="w-full space-y-3 rounded-xl overflow-hidden">
      {/* Search Bar */}
      <form onSubmit={handleSearch} className="flex gap-2">
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="🏥 Enter city or location..."
          className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <button
          type="submit"
          disabled={loading}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:bg-blue-400 transition"
        >
          {loading ? '🔄 Searching…' : '🔍 Search'}
        </button>
      </form>

      {/* Info message */}
      {userLocation?.city && (
        <div className="text-xs text-gray-600 bg-blue-50 px-3 py-2 rounded-lg border border-blue-100">
          📍 <strong>Your Location:</strong> {userLocation.city}, {userLocation.state}
        </div>
      )}

      {/* Map */}
      <div className="h-96 rounded-lg overflow-hidden border border-gray-300 shadow">
        <MapContainer center={mapCenter} zoom={12} style={{ height: '100%', width: '100%' }}>
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution='&copy; OpenStreetMap contributors'
          />

          {/* User's location marker */}
          {userLocation?.city && (
            <Marker position={mapCenter}>
              <Popup>
                <div className="text-sm font-semibold">
                  📍 Your Location<br />
                  {userLocation.city}, {userLocation.state}
                </div>
              </Popup>
            </Marker>
          )}

          {/* Clinic markers */}
          {clinics.map((clinic) => (
            <Marker
              key={clinic.id}
              position={[clinic.lat, clinic.lon]}
              icon={clinicIcon}
            >
              <Popup>
                <div className="text-sm">
                  <strong>🏥 {clinic.name}</strong><br />
                  <span className="text-xs text-gray-600">{clinic.address}</span><br />
                  <span className="text-xs bg-red-50 px-2 py-0.5 rounded inline-block mt-1">
                    {clinic.amenity}
                  </span>
                </div>
              </Popup>
            </Marker>
          ))}
        </MapContainer>
      </div>

      {/* Results summary */}
      {searched && (
        <div className="text-xs text-gray-600 bg-gray-50 px-3 py-2 rounded-lg">
          {clinics.length > 0
            ? `✅ Found ${clinics.length} clinic(s) nearby`
            : `❌ No clinics found. Try a different location.`
          }
        </div>
      )}

      {/* Auto-search notice */}
      {userLocation?.city && !searched && (
        <div className="text-xs text-blue-600 bg-blue-50 px-3 py-2 rounded-lg">
          💡 Auto-searching clinics in {userLocation.city}…
        </div>
      )}
    </div>
  );
}
