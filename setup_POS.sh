#!/bin/bash

echo "🚀 Setting up POS App..."

# ---- Backend setup ----
echo "📦 Creating backend..."
mkdir -p backend && cd backend
npm init -y > /dev/null 2>&1
npm install express mongoose cors dotenv
npm install --save-dev nodemon

# .env file
cat > .env <<EOL
MONGODB_URI=mongodb://localhost:27017/pos-menu
PORT=5000
EOL

# server.js
cat > server.js << 'EOF'
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();
const menuRoutes = require('./routes/menu');

const app = express();
app.use(cors());
app.use(express.json());
app.use('/api/menu', menuRoutes);

const PORT = process.env.PORT || 5000;
mongoose.connect(process.env.MONGODB_URI)
  .then(() => {
    console.log('MongoDB connected');
    app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
  })
  .catch(err => console.error(err));
EOF

# model
mkdir -p models
cat > models/MenuItem.js << 'EOF'
const mongoose = require('mongoose');
const menuItemSchema = new mongoose.Schema({
  name: { type: String, required: true },
  price: { type: Number, required: true }
});
module.exports = mongoose.model('MenuItem', menuItemSchema);
EOF

# routes
mkdir -p routes
cat > routes/menu.js << 'EOF'
const express = require('express');
const router = express.Router();
const MenuItem = require('../models/MenuItem');

router.get('/', async (req, res) => {
  try {
    const items = await MenuItem.find().sort({ name: 1, price: 1 });
    res.json(items);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
module.exports = router;
EOF

# seed script
cat > seed.js << 'EOF'
require('dotenv').config();
const mongoose = require('mongoose');
const MenuItem = require('./models/MenuItem');

const items = [
  { name: "Chocolate Mousse", price: 14.99 },
  { name: "B.B. Mousse", price: 12.99 },
  { name: "Breakfast", price: 16.99 },
  { name: "Fruitstout", price: 15.99 },
  { name: "Sandstorm", price: 13.99 },
  { name: "Dinner", price: 19.99 },
  { name: "Cinnamon Coffee", price: 14.99 },
  ...Array.from({ length: 83 }, (_, i) => ({
    name: "Coconut French Toast",
    price: 17.99 + i
  }))
];

mongoose.connect(process.env.MONGODB_URI)
  .then(async () => {
    await MenuItem.deleteMany({});
    await MenuItem.insertMany(items);
    console.log('Database seeded!');
    process.exit();
  })
  .catch(err => console.error(err));
EOF

cd ..

# ---- Frontend setup ----
echo "📱 Creating frontend with Expo..."
npx create-expo-app@latest frontend --template blank -- --no-install
cd frontend
npm install
npm install axios
cd ..

# Replace App.js with our POS UI
cat > frontend/App.js << 'EOF'
import React, { useState, useEffect } from 'react';
import {
  StyleSheet, Text, View, FlatList, ActivityIndicator,
  SafeAreaView, StatusBar
} from 'react-native';
import axios from 'axios';

// ⚠️ Change this to your machine’s local IP when using a real device
const BASE_URL = 'http://localhost:5000';

export default function App() {
  const [menuItems, setMenuItems] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    axios.get(`${BASE_URL}/api/menu`)
      .then(res => {
        setMenuItems(res.data);
        setLoading(false);
      })
      .catch(err => {
        console.error(err);
        setLoading(false);
      });
  }, []);

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#000" />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />
      <FlatList
        data={menuItems}
        keyExtractor={(item, index) => index.toString()}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <Text style={styles.itemName}>{item.name}</Text>
            <Text style={styles.itemPrice}>${item.price.toFixed(2)}</Text>
          </View>
        )}
        contentContainerStyle={{ paddingVertical: 10 }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  card: {
    paddingVertical: 18,
    paddingHorizontal: 24,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
    backgroundColor: '#fff',
  },
  itemName: {
    fontSize: 22,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 4,
  },
  itemPrice: {
    fontSize: 20,
    fontWeight: '400',
    color: '#444',
  },
});
EOF

# ---- Seeding ----
echo "🌱 Seeding MongoDB..."
cd backend
node seed.js
cd ..

echo ""
echo "✅ Setup complete!"
echo "Start backend:  cd backend && npx nodemon server.js"
echo "Start frontend: cd frontend && npx expo start"
echo "📱 Remember to update BASE_URL in frontend/App.js for your device."