const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();
app.use(cors());
app.use(express.json());

const users = [
  { id: 'u1', phone: '+351912345678', name: 'João' },
  { id: 'u2', phone: '+351923456789', name: 'Maria' },
];

const listings = [
  {
    id: '1',
    title: 'Plástico PET reciclável',
    type: 'plastic',
    weight: 12.4,
    price: 18.0,
    latitude: 38.716946,
    longitude: -9.142685,
    address: 'Rua da Reciclagem, Lisboa',
    status: 'available',
  },
  {
    id: '2',
    title: 'Latas de alumínio',
    type: 'metal',
    weight: 7.2,
    price: 12.5,
    latitude: 38.722252,
    longitude: -9.139337,
    address: 'Avenida Verde, Lisboa',
    status: 'available',
  },
  {
    id: '3',
    title: 'Papelão para reciclagem',
    type: 'paper',
    weight: 15.0,
    price: 10.0,
    latitude: 38.726528,
    longitude: -9.150300,
    address: 'Praça do Reciclar, Lisboa',
    status: 'available',
  },
];

app.get('/', (req, res) => {
  res.send(`
    <html>
      <head><title>Reciclagem Marketplace</title></head>
      <body style="font-family:Arial,sans-serif; margin:40px;">
        <h1>Reciclagem Marketplace</h1>
        <p>API disponível em <strong>http://localhost:4000/api</strong></p>
        <p>Endpoint de login: <code>POST /api/login</code></p>
        <p>Endpoint de listagens: <code>GET /api/listings</code></p>
        <p>Endpoint de mapa: <code>GET /api/listings</code></p>
      </body>
    </html>
  `);
});

app.post('/api/login', (req, res) => {
  const { phone } = req.body;
  if (!phone) {
    return res.status(400).json({ error: 'Phone is required' });
  }
  const user = users.find((item) => item.phone === phone);
  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }
  return res.json({ data: user });
});

app.get('/api/listings', (req, res) => {
  res.json({ data: listings });
});

app.get('/api/listings/:id', (req, res) => {
  const listing = listings.find((item) => item.id === req.params.id);
  if (!listing) {
    return res.status(404).json({ error: 'Listing not found' });
  }
  res.json({ data: listing });
});

const port = process.env.PORT || 4000;
app.listen(port, () => {
  console.log(`Reciclagem Marketplace API running at http://localhost:${port}`);
});
