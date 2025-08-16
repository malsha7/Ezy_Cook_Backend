const express = require('express');
const router = express.Router();
const recipeController = require('../controllers/recipeController');
const authMiddleware = require('../middleware/authMiddleware');
const upload = require('../middleware/uploadMiddleware'); // for user recipes image uploads

/**
 * My Recipes (user-created)
 */

// Create new recipe (my recipes only)
router.post('/my-recipes',authMiddleware,upload.single('image'),recipeController.createRecipe);

// Update user recipe (my recipes only)
router.put('/my-recipes/:id',authMiddleware,upload.single('image'),recipeController.updateRecipe);

// Delete user recipe (my recipes only)
router.delete('/my-recipes/:id',authMiddleware,recipeController.deleteRecipe);

// Get all my recipes
router.get('/my-recipes', authMiddleware, recipeController.getMyRecipes);

/**
 * 
  System Recipes
 */

// Get all system recipes (Home / Recipe list)
router.get('/', recipeController.getAllRecipes);

//Get single recipe by ID
router.get('/:id', recipeController.getRecipeById);

// Suggest recipes (search bar)
router.get('/suggest/search', recipeController.suggestRecipes);

// Filter recipes - recipe suggesting using tools, mealtime, ingredeints
router.post('/filter', recipeController.filterRecipes);