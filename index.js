const express = require('express');
const axios = require('axios');
const app = express();
const port = 3000;

let latestData = null; // لحفظ آخر بيانات تم استقبالها

app.get('/data', async (req, res) => {
  const { lat, lon, speed } = req.query;

  if (!lat || !lon || !speed) {
    return res.status(400).json({ message: 'Missing parameters' });
  }

  try {
    // استخدام Nominatim لتحديد اسم الشارع
    const nominatimUrl = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lon}`;
    const response = await axios.get(nominatimUrl);
    const street = response.data.address.road || 'Unknown Street';

    // تحديد السرعة المسموحة (مثال: حسب اسم الشارع)
    const speedLimits = {
      'Test Street': 80,
      'Spandauer Straße': 30
    };
    const speed_limit = speedLimits[street] || 60;

    const violation = parseInt(speed) > speed_limit;
    const warning = parseInt(speed) >= speed_limit - 5;

    // حفظ آخر البيانات
    latestData = {
      location: { lat, lon },
      speed: parseInt(speed),
      street,
      speed_limit,
      violation,
      warning
    };

    // إرسال البيانات إلى تطبيق الموبايل
    await axios.post('https://your-mobile-app-endpoint.com/api/data', latestData)
      .then(() => console.log('✅ Data sent to mobile app'))
      .catch(err => console.error('❌ Error sending to mobile app:', err.message));

    // إرسال البيانات إلى الهاردوير (مثال: ESP8266 HTTP endpoint)
    await axios.post('http://192.168.1.50/hardware', latestData)
      .then(() => console.log('✅ Data sent to hardware'))
      .catch(err => console.error('❌ Error sending to hardware:', err.message));

    res.json({
      message: 'Data received and forwarded successfully',
      ...latestData
    });

  } catch (error) {
    console.error(error.message);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Endpoint لتطبيق الموبايل يسحب أحدث البيانات
app.get('/latest', (req, res) => {
  if (!latestData) {
    return res.status(404).json({ message: 'No data available' });
  }
  res.json(latestData);
});

app.listen(port, () => {
  console.log(`✅ Server running on port ${port}`);
});

