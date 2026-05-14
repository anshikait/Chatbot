import { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

// Fix for default marker icons in React Leaflet
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

export default function MapWidget() {
  const [position, setPosition] = useState(null);
  const [hospitals, setHospitals] = useState([]);

  useEffect(() => {
    navigator.geolocation.getCurrentPosition((pos) => {
      const { latitude, longitude } = pos.coords;
      setPosition([latitude, longitude]);

      // Free OpenStreetMap Nominatim API
      fetch(`https://nominatim.openstreetmap.org/search?q=hospital+OR+clinic&format=json&lat=${latitude}&lon=${longitude}&zoom=14`)
        .then(res => res.json())
        .then(data => setHospitals(data));
    }, () => alert("Location permission needed to show nearby clinics."));
  },[]);

  if (!position) return <div className="p-4 bg-gray-100 text-center animate-pulse">Detecting your location...</div>;

  return (
    <div className="h-64 w-full mt-4 rounded-xl overflow-hidden border">
      <MapContainer center={position} zoom={13} style={{ height: '100%', width: '100%' }}>
        <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
        <Marker position={position}>
          <Popup>You are here</Popup>
        </Marker>
        {hospitals.map((h, i) => (
          <Marker key={i} position={[h.lat, h.lon]}>
            <Popup><b>{h.display_name}</b></Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
}