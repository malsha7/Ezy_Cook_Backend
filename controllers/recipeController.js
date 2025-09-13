const Recipe = require("../models/Recipe");
const User = require("../models/User");
const fs = require("fs");

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
      return res
        .status(400)
        .json({ message: "Title, description, and ingredients are required" });
    }

    // Parse ingredients if it's a string (form-data)
    if (typeof ingredients === "string") {
      try {
        ingredients = JSON.parse(ingredients);
      } catch (err) {
        return res
          .status(400)
          .json({ message: "Ingredients must be a valid JSON array" });
      }
    }
    

    const recipe = new Recipe({
      title,
      description,
      ingredients,
      mealTime: mealTime || null,
      servings: servings || 1,
      image: req.file ? req.file.path : "",
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
    if (!recipe) return res.status(404).json({ message: "Recipe not found" });

    // Only the owner can update
    if (!req.user || recipe.createdBy.toString() !== req.user._id.toString()) {
      return res
        .status(403)
        .json({ message: "Not authorized to update this recipe" });
    }

    // destructure fields from request body
    let {
      title,
      description,
      mealTime,
      servings,
      ingredients,
      tools,
      videoUrl,
    } = req.body;

    // Parse ingredients if sent as string (form-data)
    if (ingredients && typeof ingredients === "string") {
      try {
        ingredients = JSON.parse(ingredients);
      } catch (err) {
        return res
          .status(400)
          .json({ message: "Ingredients must be a valid JSON array" });
      }
    }

    // Parse tools if sent as string (form-data)
    if (tools && typeof tools === "string") {
      try {
        tools = JSON.parse(tools);
      } catch (err) {
        return res
          .status(400)
          .json({ message: "Tools must be a valid JSON array" });
      }
    }

    // Update fields if they exist in request
    //if ('title' in req.body) {recipe.title = String(req.body.title).trim();}
    if ("title" in req.body) {
      recipe.title = String(req.body.title)
        .trim() // remove leading/trailing spaces
        .replace(/^["']+|["']+$/g, ""); // remove starting/ending single or double quotes
    }
    if (description !== undefined) recipe.description = description.trim();
    if (mealTime !== undefined) recipe.mealTime = mealTime;
    if ("servings" in req.body) {
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
    console.error("Error updating recipe:", err);
    res.status(500).json({ message: "Server error" });
  }
};

/**
 * delete a recipe - only user’s my recipes
 */
exports.deleteRecipe = async (req, res) => {
  try {
    const recipe = await Recipe.findById(req.params.id);

    if (!recipe) return res.status(404).json({ message: "Recipe not found" });

    if (recipe.createdBy.toString() !== req.user._id.toString()) {
      return res
        .status(403)
        .json({ message: "Not authorized to delete this recipe" });
    }

    // Delete the recipe
    await Recipe.findByIdAndDelete(req.params.id);

    res.json({ message: "Recipe deleted successfully" });
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
    const recipes = await Recipe.find({ isSystem: true }).populate(
      "createdBy",
      "username email"
    );
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
    const recipes = await Recipe.find({
      createdBy: req.user._id,
      isSystem: false,
    });

    // Convert to plain objects and adjust image paths
    // const formattedRecipes = recipes.map((recipe) => {
    //   const obj = recipe.toObject();
    //   if (obj.image) {
    //     obj.image = `${req.protocol}://${req.get("host")}/${obj.image.replace(/\\/g, "/")}`;
    //   }
    //   return obj;
    // });

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
    const recipe = await Recipe.findById(req.params.id).populate(
      "createdBy",
      "username email"
    );

    if (!recipe) {
      return res.status(404).json({ message: "Recipe not found" });
    }

    // Convert to plain object so we can safely modify
    // const recipeObj = recipe.toObject();

    // Reformat image path → full URL
    // if (recipeObj.image) {
    //   recipeObj.image = `${req.protocol}://${req.get("host")}/${recipeObj.image.replace(/\\/g, "/")}`;
    // }

    res.json(recipe);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

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
      title: { $regex: `^${query}`, $options: "i" },
    }).select("title");

    res.json(recipes);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

//$in = match if first all then two then at least one

/**
 * filter recipes by tools, mealTime, ingredients
 * Only system recipes
 */
// exports.filterRecipes = async (req, res) => {
//   try {
//     const { tools = [], mealTime, ingredients = [] } = req.body;
//     const filter = { isSystem: true }; // restrict to system recipes

//     // mealtime = exact match
//     if (mealTime) filter.mealTime = mealTime;

//     let recipes = [];

//     // helper to count matches
//     const countMatches = (array, selected) => array.filter(x => selected.includes(x)).length;

//     // tiered filtering
//     const toolTiers = [tools.length, 2, 1].filter(n => n > 0);
//     const ingredientTiers = [ingredients.length, 2, 1].filter(n => n > 0);

//     outerLoop:
//     for (let t of toolTiers) {
//       for (let i of ingredientTiers) {
//         const currentFilter = { ...filter };

//         // tools tier
//         if (t === tools.length) currentFilter.tools = { $all: tools };
//         else if (tools.length > 0) currentFilter.tools = { $in: tools };

//         // ingredients tier
//         if (i === ingredients.length) currentFilter['ingredients.name'] = { $all: ingredients };
//         else if (ingredients.length > 0) currentFilter['ingredients.name'] = { $in: ingredients };

//         let result = await Recipe.find(currentFilter);

//         // further filter partial matches
//         if (t < tools.length && result.length > 0) {
//           result = result.filter(r => countMatches(r.tools, tools) >= t);
//         }
//         if (i < ingredients.length && result.length > 0) {
//           result = result.filter(r => countMatches(r.ingredients.map(x => x.name), ingredients) >= i);
//         }

//         if (result.length > 0) {
//           recipes = result;
//           break outerLoop; // stop at first tier with results
//         }
//       }
//     }

//     res.json(recipes);

//   } catch (err) {
//     console.error(err);
//     res.status(500).json({ message: err.message });
//   }
// };

exports.filterRecipes = async (req, res) => {
  try {
    const { tools = [], mealTime, ingredients = [] } = req.body;
    const filter = { isSystem: true }; // restrict to system recipes

    // MealTime: case-insensitive match
    if (mealTime) {
      filter.mealTime = { $regex: `^${mealTime}$`, $options: "i" };
    }

    let recipes = [];

    // Helper to count matches
    const countMatches = (array, selected) =>
      array.filter((x) =>
        selected.some((s) => s.toLowerCase() === x.toLowerCase())
      ).length;

    // Tiered filtering
    const toolTiers = [tools.length, 2, 1].filter((n) => n > 0);
    const ingredientTiers = [ingredients.length, 2, 1].filter((n) => n > 0);

    outerLoop: for (let t of toolTiers) {
      for (let i of ingredientTiers) {
        const currentFilter = { ...filter };

        // Tools tier (case-insensitive)
        if (t === tools.length) {
          currentFilter.tools = {
            $all: tools.map((tool) => new RegExp(`^${tool}$`, "i")),
          };
        } else if (tools.length > 0) {
          currentFilter.tools = {
            $in: tools.map((tool) => new RegExp(`^${tool}$`, "i")),
          };
        }

        // Ingredients tier (case-insensitive)
        if (i === ingredients.length) {
          currentFilter["ingredients.name"] = {
            $all: ingredients.map((ing) => new RegExp(`^${ing}$`, "i")),
          };
        } else if (ingredients.length > 0) {
          currentFilter["ingredients.name"] = {
            $in: ingredients.map((ing) => new RegExp(`^${ing}$`, "i")),
          };
        }

        let result = await Recipe.find(currentFilter);

        // Further filter partial matches
        if (t < tools.length && result.length > 0) {
          result = result.filter((r) => countMatches(r.tools, tools) >= t);
        }
        if (i < ingredients.length && result.length > 0) {
          result = result.filter(
            (r) =>
              countMatches(
                r.ingredients.map((x) => x.name),
                ingredients
              ) >= i
          );
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
    let {
      title,
      description,
      ingredients,
      mealTime,
      servings,
      videoUrl,
      tools,
      image,
    } = req.body;

    // Check required fields
    if (!title || !description || !ingredients) {
      return res
        .status(400)
        .json({ message: "Title, description, and ingredients are required" });
    }

    // --- Parse ingredients if sent as string ---
    if (typeof ingredients === "string") {
      try {
        ingredients = JSON.parse(ingredients);
      } catch (err) {
        return res
          .status(400)
          .json({ message: "Ingredients must be a valid JSON array" });
      }
    }

    // --- Parse tools for string or array ---
    if (tools) {
      if (typeof tools === "string") {
        // Remove wrapping quotes if present
        tools = tools.replace(/^["']+|["']+$/g, "");
        try {
          // Try parsing JSON array string
          tools = JSON.parse(tools);
          if (!Array.isArray(tools)) throw new Error();
        } catch {
          // Fallback: comma-separated string
          tools = tools
            .split(",")
            .map((t) => t.trim())
            .filter((t) => t.length > 0);
        }
      } else if (!Array.isArray(tools)) {
        tools = [];
      }
    } else {
      tools = [];
    }

    // Create recipe
    const recipe = new Recipe({
      title: title.trim().replace(/^["']+|["']+$/g, ""),
      description: description.trim(),
      ingredients,
      tools,
      mealTime: mealTime || null,
      servings: servings ? Number(servings) : 1,
      image: req.file ? req.file.path : image || "",
      videoUrl: videoUrl || "",
      createdBy: req.user ? req.user._id : null,
      isSystem: true,
    });

    await recipe.save();
    res.status(201).json(recipe);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
