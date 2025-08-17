const express = require('express');
const dotenv = require('dotenv');
const connectDB = require('./config/db');

dotenv.config();

// MongoDB connection
connectDB();

const app = express();

// Middleware to parse JSON bodies
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Add routes
app.use('/api/users', require('./routes/userRoutes')); 
app.use('/api/recipes', require('./routes/recipeRoutes'));

//Default test route
app.get('/', (req, res) => {
    res.status(200).json({ message: 'Welcome to the Ezy Cook API!' });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));