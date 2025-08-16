const mongoose = require('mongoose');

const ingredientSchema = new mongoose.Schema({
  name: { type: String, required: true },
  quantity: { type: String, required: true },
});

const recipeSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Recipe title is required'],
      trim: true,
    },
    image: {
      type: String, // file path or URL
      default: '',
    },
    tools: [
      {
        type: String,
        trim: true,
      },
    ],
    mealTime: {
      type: String,
      enum: ['breakfast', 'lunch', 'evening', 'dinner', 'special occasion'],
      required: false, // user-created recipes don’t need mealTime
    },
    ingredients: [ingredientSchema], // ingredients + quantity
    servings: {
      type: Number,
      default: 1,
    },
    description: {
      type: String,
      required: [true, 'Cooking description is required'],
    },
    videoUrl: {
      type: String,
      default: '',
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: false, // allow recipes without strict user if needed
    },
    isSystem: {
      type: Boolean,
      default: false, // system recipes vs user recipes
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Recipe', recipeSchema);