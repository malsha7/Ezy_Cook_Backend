const express = require('express');
const router = express.Router();
const recipeController = require('../controllers/recipeController');
const authMiddleware = require('../middleware/authMiddleware');
const upload = require('../middleware/uploadMiddleware'); // for user recipes image uploads

// Create new recipe (my recipes only)
router.post(  '/my-recipes',authMiddleware,upload.single('image'),recipeController.createRecipe);

