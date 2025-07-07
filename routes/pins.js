
const express = require('express');
const fs = require('fs');
const path = require('path');
const router = express.Router();

const restrictedZones = [
  { lat: 28.6129, lng: 77.2295, radius: 200 }
];

function isWithinProtectedZone(lat, lng) {
  return restrictedZones.some(zone => {
    const dx = zone.lat - lat;
    const dy = zone.lng - lng;
    const distance = Math.sqrt(dx * dx + dy * dy) * 111000;
    return distance <= zone.radius;
  });
}

router.get('/', (req, res) => {
  const data = fs.readFileSync(path.join(__dirname, '../data/pins.json'));
  res.json(JSON.parse(data));
});

router.post('/', (req, res) => {
  const { lat, lng, tag, text } = req.body;

  if (!lat || !lng || !tag) {
    return res.status(400).json({ error: 'Missing fields' });
  }

  if (isWithinProtectedZone(lat, lng)) {
    return res.status(403).json({ error: 'Restricted zone for posting' });
  }

  const pins = JSON.parse(fs.readFileSync(path.join(__dirname, '../data/pins.json')));
  const newPin = {
    id: Date.now(),
    lat,
    lng,
    tag,
    text: text || '',
    timestamp: new Date().toISOString()
  };

  pins.push(newPin);
  fs.writeFileSync(path.join(__dirname, '../data/pins.json'), JSON.stringify(pins, null, 2));
  res.status(201).json(newPin);
});

module.exports = router;
