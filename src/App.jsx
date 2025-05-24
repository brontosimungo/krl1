import React, { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Polyline, Tooltip } from 'react-leaflet';
import L from 'leaflet';

// Marker ikon kereta
const trainIcon = new L.DivIcon({
  className: 'train-marker',
  html: '<b>🚆</b>',
  iconSize: [20, 20],
  iconAnchor: [10, 10],
});

// HH:MM:SS → detik
const timeToSeconds = (timeStr) => {
  const [h, m, s] = timeStr.split(':').map(Number);
  return h * 3600 + m * 60 + s;
};

const getNowInWIBSeconds = () => {
  const now = new Date();
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Jakarta",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false
  }).formatToParts(now);

  const h = parseInt(parts.find(p => p.type === "hour").value, 10);
  const m = parseInt(parts.find(p => p.type === "minute").value, 10);
  const s = parseInt(parts.find(p => p.type === "second").value, 10);
  return h * 3600 + m * 60 + s;
};

const getTrainPosition = (schedule, nowSeconds) => {
  for (let i = 0; i < schedule.length - 1; i++) {
    const dep = schedule[i].departure;
    const arr = schedule[i + 1].arrival;
    if (!dep || !arr) continue;

    const t1 = timeToSeconds(dep);
    const t2 = timeToSeconds(arr);
    if (nowSeconds >= t1 && nowSeconds <= t2) {
      const ratio = (nowSeconds - t1) / (t2 - t1);
      const lat = schedule[i].lat + (schedule[i + 1].lat - schedule[i].lat) * ratio;
      const lng = schedule[i].lng + (schedule[i + 1].lng - schedule[i].lng) * ratio;
      return [lat, lng];
    }
  }
  return null;
};

export default function App() {
  const [schedule, setSchedule] = useState([]);
  const [position, setPosition] = useState(null);

  useEffect(() => {
    fetch('/jadwal_ka_1737.json')
      .then((res) => res.json())
      .then((data) => {
        setSchedule(data);
      });
  }, []);

  useEffect(() => {
    if (!schedule.length) return;

    const updatePosition = () => {
      const seconds = getNowInWIBSeconds();
      const pos = getTrainPosition(schedule, seconds);
      setPosition(pos);
    };

    updatePosition();
    const interval = setInterval(updatePosition, 10000);
    return () => clearInterval(interval);
  }, [schedule]);

  if (!schedule.length) return <div>Loading jadwal...</div>;

  return (
    <MapContainer center={[-6.3, 106.6]} zoom={10} style={{ height: '100vh', width: '100%' }}>
      <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />

      <Polyline
        positions={schedule.map((s) => [s.lat, s.lng])}
        color="green"
        weight={4}
      />

      {schedule.map((s, i) => (
        <Marker key={i} position={[s.lat, s.lng]}>
          <Tooltip direction="top" offset={[0, -10]}>{s.station}</Tooltip>
        </Marker>
      ))}

      {position && <Marker position={position} icon={trainIcon} />}
    </MapContainer>
  );
}
