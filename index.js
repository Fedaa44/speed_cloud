const express = require('express');
const axios = require('axios');

const app = express();
const PORT = 3000;

// دالة للحصول على اسم الشارع من Nominatim
async function getStreetName(lat, lon) {
  try {
    const res = await axios.get(`https://nominatim.openstreetmap.org/reverse`, {
      params: {
        format: 'json',
        lat: lat,
        lon: lon,
      },
      headers: {
        'User-Agent': 'speed-checker/1.0'
      }
    });

    return res.data.address.road || "Unknown Street";
  } catch (error) {
    console.error('Error fetching street name:', error.message);
    return "Unknown Street";
  }
}

// دالة للحصول على السرعة المسموحة من Overpass
async function getSpeedLimit(lat, lon) {
  const query = `
    [out:json];
    way(around:50,${lat},${lon})["maxspeed"];
    out tags;
  `;

  try {
    const res = await axios.post('https://overpass-api.de/api/interpreter', `data=${encodeURIComponent(query)}`);
    const ways = res.data.elements;

    if (ways.length > 0 && ways[0].tags.maxspeed) {
      return parseInt(ways[0].tags.maxspeed);
    } else {
      return 80; // القيمة الافتراضية إن لم يتم العثور على حد السرعة
    }
  } catch (error) {
    console.error('Error fetching speed limit:', error.message);
    return 80;
  }
}

app.get('/data', async (req, res) => {
  const { lat, lon, speed } = req.query;

  if (!lat || !lon || !speed) {
    return res.status(400).json({ error: 'Missing parameters: lat, lon, speed' });
  }

  const street = await getStreetName(lat, lon);
  const speedLimit = await getSpeedLimit(lat, lon);
  const actualSpeed = parseFloat(speed);

  const violation = actualSpeed > speedLimit;
  const warning = !violation && (actualSpeed > speedLimit - 10);

  res.json({
    message: 'Data received successfully',
    location: { lat, lon },
    speed: actualSpeed,
    street: street,
    speed_limit: speedLimit,
    violation: violation,
    warning: warning
  });
});

app.listen(PORT, () => {
  console.log(`✅ Server running on port ${PORT}`);
});
