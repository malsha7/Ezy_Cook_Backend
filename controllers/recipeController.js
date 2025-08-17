const Recipe = require('../models/Recipe');
const User = require('../models/User');

/**
 * Create a new recipe
 *  Used in "My Recipes"
 *  Required: title, description, ingredients
 *  Optional: image, videoUrl, tools, mealTime, servings
 */
exports.createRecipe = async (req, res) => {
  try {
    let { title, description, ingredients, mealTime, servings } = req.body;

    if (!title || !description || !ingredients) {
      return res.status(400).json({ message: 'Title, description, and ingredients are required' });
    }

    // Parse ingredients if it's a string (form-data)
if (typeof ingredients === 'string') {
  try {
    ingredients = JSON.parse(ingredients);
  } catch (err) {
    return res.status(400).json({ message: 'Ingredients must be a valid JSON array' });
  }
}

    const recipe = new Recipe({
      title,
      description,
      ingredients,
      mealTime: mealTime || null,
      servings: servings || 1,
      image: req.file ? req.file.path : '',
      createdBy: req.user._id, // logged-in user
      isSystem: false, //ensure user recipes are not system recipes
    });

    await recipe.save();
    res.status(201).json(recipe);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

/**
 * update a recipe - only user’s my recipes
 */
exports.updateRecipe = async (req, res) => {
  try {
    // Find recipe by ID
    const recipe = await Recipe.findById(req.params.id);
    if (!recipe) return res.status(404).json({ message: 'Recipe not found' });

    // Only the owner can update
    if (!req.user || recipe.createdBy.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized to update this recipe' });
    }

    // Destructure fields from request body
    let { title, description, mealTime, servings, ingredients, tools, videoUrl } = req.body;

    // Parse ingredients if sent as string (form-data)
    if (ingredients && typeof ingredients === 'string') {
      try {
        ingredients = JSON.parse(ingredients);
      } catch (err) {
        return res.status(400).json({ message: 'Ingredients must be a valid JSON array' });
      }
    }

    // Parse tools if sent as string (form-data)
    if (tools && typeof tools === 'string') {
      try {
        tools = JSON.parse(tools);
      } catch (err) {
        return res.status(400).json({ message: 'Tools must be a valid JSON array' });
      }
    }

    // Update fields if they exist in request
   //if ('title' in req.body) {recipe.title = String(req.body.title).trim();}
   if ('title' in req.body) {
  recipe.title = String(req.body.title)
    .trim()                  // remove leading/trailing spaces
    .replace(/^["']+|["']+$/g, ''); // remove starting/ending single or double quotes
}
    if (description !== undefined) recipe.description = description.trim();
    if (mealTime !== undefined) recipe.mealTime = mealTime;
   if ('servings' in req.body) {
  recipe.servings = Number(req.body.servings) || recipe.servings;
}
    if (ingredients !== undefined) recipe.ingredients = ingredients;
    if (tools !== undefined) recipe.tools = tools;
    if (videoUrl !== undefined) recipe.videoUrl = videoUrl;
    if (req.file) recipe.image = req.file.path;

    // Save updated recipe
    await recipe.save();
    res.json(recipe);
  } catch (err) {
    console.error('Error updating recipe:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

/**
 * delete a recipe - only user’s my recipes
 */
exports.deleteRecipe = async (req, res) => {
  try {
    const recipe = await Recipe.findById(req.params.id);

    if (!recipe) return res.status(404).json({ message: 'Recipe not found' });

    if (recipe.createdBy.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized to delete this recipe' });
    }

    // Delete the recipe
    await Recipe.findByIdAndDelete(req.params.id);

    res.json({ message: 'Recipe deleted successfully' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

/**
 * get all recipes
 * Only system recipes for Home / Recipe plan screens
 */
exports.getAllRecipes = async (req, res) => {
  try {
    const recipes = await Recipe.find({ isSystem: true }).populate('createdBy', 'username email');
    res.json(recipes);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

/**
 * get all recipes created by logged-in user
 * "My Recipes" screen
 */
exports.getMyRecipes = async (req, res) => {
  try {
    const recipes = await Recipe.find({ createdBy: req.user._id, isSystem: false });
    res.json(recipes);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

/**
 * get single recipe by ID
 *works for both system + my recipes
 */
exports.getRecipeById = async (req, res) => {
  try {
    const recipe = await Recipe.findById(req.params.id).populate('createdBy', 'username email');
    if (!recipe) return res.status(404).json({ message: 'Recipe not found' });
    res.json(recipe);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};


/**
 * Suggest recipes for search bar
 * Example: typing "p" -> returns ["pasta", "paste noodles", ...]
 */
// exports.suggestRecipes = async (req, res) => {
//   try {
//     const { query } = req.query;
//     if (!query) return res.json([]);

//     const recipes = await Recipe.find({ title: { $regex: query, $options: 'i' } }).select('title');
//     res.json(recipes);
//   } catch (err) {
//     res.status(500).json({ message: err.message });
//   }
// };


// only start letter for suggest recipes 
/**
 * suggest recipes for search bar
 * only system recipes
 */
exports.suggestRecipes = async (req, res) => {
  try {
    const { query } = req.query;
    if (!query) return res.json([]);

    const recipes = await Recipe.find({
      isSystem: true,
      title: { $regex: `^${query}`, $options: 'i' },
    }).select('title');

    res.json(recipes);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};


/**
 * Filter recipes by tools, mealTime, ingredients
 * Tools: array  - aleast one 
 *  MealTime: one option
 * Ingredients: array -  atleast one
 */
// exports.filterRecipes = async (req, res) => {
//   try { // $all  - should all are match
//     const { tools, mealTime, ingredients } = req.body;
//     const filter = {};

//     if (mealTime) filter.mealTime = mealTime;
//     if (tools && tools.length > 0) filter.tools = { $all: tools };
//     if (ingredients && ingredients.length > 0) {
//       filter['ingredients.name'] = { $all: ingredients };
//     }

//     const recipes = await Recipe.find(filter);
//     res.json(recipes);
//   } catch (err) {
//     res.status(500).json({ message: err.message });
//   }
// };


//$in = match if first all then two then at least one 

/**
 * filter recipes by tools, mealTime, ingredients
 * Only system recipes
 */
exports.filterRecipes = async (req, res) => {
  try {
    const { tools = [], mealTime, ingredients = [] } = req.body;
    const filter = { isSystem: true }; // 🔹 restrict to system recipes

    // mealtime = exact match
    if (mealTime) filter.mealTime = mealTime;

    let recipes = [];

    // helper to count matches
    const countMatches = (array, selected) => array.filter(x => selected.includes(x)).length;

    // tiered filtering
    const toolTiers = [tools.length, 2, 1].filter(n => n > 0);
    const ingredientTiers = [ingredients.length, 2, 1].filter(n => n > 0);

    outerLoop:
    for (let t of toolTiers) {
      for (let i of ingredientTiers) {
        const currentFilter = { ...filter };

        // tools tier
        if (t === tools.length) currentFilter.tools = { $all: tools };
        else if (tools.length > 0) currentFilter.tools = { $in: tools };

        // ingredients tier
        if (i === ingredients.length) currentFilter['ingredients.name'] = { $all: ingredients };
        else if (ingredients.length > 0) currentFilter['ingredients.name'] = { $in: ingredients };

        let result = await Recipe.find(currentFilter);

        // further filter partial matches
        if (t < tools.length && result.length > 0) {
          result = result.filter(r => countMatches(r.tools, tools) >= t);
        }
        if (i < ingredients.length && result.length > 0) {
          result = result.filter(r => countMatches(r.ingredients.map(x => x.name), ingredients) >= i);
        }

        if (result.length > 0) {
          recipes = result;
          break outerLoop; // stop at first tier with results
        }
      }
    }

    res.json(recipes);

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: err.message });
  }
};

exports.addSystemRecipe = async (req, res) => {
  try {
    let { title, description, ingredients, mealTime, servings, videoUrl, image } = req.body;

    if (!title || !description || !ingredients) {
      return res.status(400).json({ message: 'Title, description, and ingredients are required' });
    }

    // Parse ingredients if sent as string
    if (typeof ingredients === 'string') {
      try {
        ingredients = JSON.parse(ingredients);
      } catch (err) {
        return res.status(400).json({ message: 'Ingredients must be a valid JSON array' });
      }
    }

    const recipe = new Recipe({
      title,
      description,
      ingredients,
      mealTime: mealTime || null,
      servings: servings || 1,
      image: image || '',       // existing
      videoUrl: videoUrl || '', // add this
      createdBy: req.user ? req.user._id : null, // for system recipe use null
      isSystem: true            // mark as system
    });

    await recipe.save();
    res.status(201).json(recipe);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};