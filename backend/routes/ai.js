const express = require('express');
const router = express.Router();
const Service = require('../models/Service');

// Synonym dictionary mapped to exact service categories in our DB
const intentDictionary = {
  'plumb': 'Plumbing',
  'leak': 'Plumbing',
  'pipe': 'Plumbing',
  'water': 'Plumbing',
  'tap': 'Plumbing',
  'sink': 'Plumbing',
  
  'electric': 'Electrical',
  'wire': 'Electrical',
  'light': 'Electrical',
  'switch': 'Electrical',
  'fan': 'Electrical',
  'power': 'Electrical',
  
  'clean': 'Cleaning Services',
  'maid': 'Cleaning Services',
  'sweep': 'Cleaning Services',
  'mop': 'Cleaning Services',
  'wash': 'Cleaning Services',
  
  'ac': 'AC & Appliance Repair',
  'air condition': 'AC & Appliance Repair',
  'cooler': 'AC & Appliance Repair',
  'fridge': 'AC & Appliance Repair',
  'washing machine': 'AC & Appliance Repair',
  'appliance': 'AC & Appliance Repair',
  'repair': 'AC & Appliance Repair',
  
  'salon': 'Salon for Women',
  'beauty': 'Beauty Services',
  'facial': 'Facial & Skincare',
  'skin': 'Facial & Skincare',
  'makeup': 'Beauty Services',
  
  'hair': 'Haircut & Styling',
  'cut': 'Haircut & Styling',
  'style': 'Haircut & Styling',
  
  'massage': 'Spa & Massage',
  'spa': 'Spa & Massage',
  'relax': 'Spa & Massage',
  
  'paint': 'Painting',
  'wall': 'Painting',
  'color': 'Painting',
  
  'pest': 'Pest Control',
  'bug': 'Pest Control',
  'insect': 'Pest Control',
  'cockroach': 'Pest Control',
  'termite': 'Pest Control',
  
  'move': 'Moving',
  'pack': 'Moving',
  'shift': 'Moving',
  'relocate': 'Moving',
  
  'carpenter': 'Carpentry',
  'wood': 'Carpentry',
  'furniture': 'Carpentry',
  'door': 'Carpentry'
};

const findCategory = (message) => {
  const lowerMsg = message.toLowerCase();
  for (const [key, category] of Object.entries(intentDictionary)) {
    if (lowerMsg.includes(key)) {
      return category;
    }
  }
  return null;
};

// Global AI Chat Endpoint
router.post('/chat', async (req, res) => {
  try {
    const { message, lat, lng } = req.body;
    
    if (!message) {
      return res.status(400).json({ error: 'Message is required' });
    }

    // Time-based greeting
    const hour = new Date().getHours();
    let timeGreeting = 'Good day';
    if (hour < 12) timeGreeting = 'Good morning';
    else if (hour < 18) timeGreeting = 'Good afternoon';
    else timeGreeting = 'Good evening';

    const lowerMessage = message.toLowerCase();
    if (['hi', 'hello', 'hey', 'help'].includes(lowerMessage.trim())) {
      return res.json({
        reply: `${timeGreeting}! I'm your NearMe Pros assistant. I can help you find services near your location. What are you looking for today? (e.g., 'I need a plumber' or 'My AC is broken').`,
        services: []
      });
    }

    const detectedCategory = findCategory(message);

    let services = [];
    let reply = '';

    // Base query
    let query = { isActive: true };
    if (detectedCategory) {
      query.category = detectedCategory;
    } else {
      query.$or = [
        { name: { $regex: message, $options: 'i' } },
        { description: { $regex: message, $options: 'i' } }
      ];
    }

    // Location query if provided
    if (lat && lng) {
      query.location = {
        $near: {
          $geometry: {
            type: 'Point',
            coordinates: [parseFloat(lng), parseFloat(lat)]
          },
          $maxDistance: 15000 // 15km radius
        }
      };
    }

    services = await Service.find(query)
      .populate('providerId', 'name rating avatar')
      .limit(3);
      
    // Note: When using $near, MongoDB automatically sorts by distance, so we don't need .sort({ rating: -1 })
    // If not using location, we should sort by rating. Let's handle that:
    if (!lat || !lng) {
      services = await Service.find(query)
        .populate('providerId', 'name rating avatar')
        .sort({ rating: -1 })
        .limit(3);
    }

    if (services.length > 0) {
      const locationText = (lat && lng) ? " nearby" : "";
      if (detectedCategory) {
        reply = `I can help with that! Here are some of the best-rated professionals for **${detectedCategory}**${locationText}:`;
      } else {
        reply = `I found some services${locationText} that might match what you're looking for:`;
      }
    } else {
      if (detectedCategory) {
        reply = `I understand you're looking for **${detectedCategory}**, but it looks like all our professionals in this category are currently busy or out of range. Please try again later!`;
      } else {
        reply = "I'm not quite sure what service you need, or there are no providers nearby. Could you describe it differently? (For example: 'I need a haircut', 'Electrician', or 'House Cleaning').";
      }
    }

    res.json({
      reply,
      services
    });

  } catch (error) {
    console.error('AI Chat Error:', error);
    res.status(500).json({ error: 'Something went wrong with the AI assistant.' });
  }
});

module.exports = router;
