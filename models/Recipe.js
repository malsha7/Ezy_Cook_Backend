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
      type: String, // will store file path
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
      required: true,
    },
    ingredients: [ingredientSchema],
    servings: {
      type: Number,
      default: 1,
    },
    description: {
      type: String,
      required: [true, 'Cooking description is required'],
    },
    videoUrl: {
      type: String, // YouTube link or MP4 file path
      default: '',
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Recipe', recipeSchema);