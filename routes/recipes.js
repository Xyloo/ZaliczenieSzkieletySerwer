const router = require("express").Router()
const { Recipe } = require("../models/recipe")
const { auth, verify } = require("../middleware/auth")
const {User} = require("../models/user");

router.get('/recipes', auth, async (req, res) => {
    try {
        const userId = req.user._id;

        const recipes = await Recipe.find({
            $or: [{ visibility: 'public' }, { userId: { $eq: userId } }]
        }).populate('images comments createdBy');
        res.json(recipes);
    } catch (err) {
        console.error('Błąd pobierania przepisów:', err.message);
        res.status(500).json({ error: err.message });
    }
});

router.post('/recipes', auth, async (req, res) => {
    try {
        const { name, ingredients, instructions, images, visibility } = req.body;
        const userId = req.user._id;

        const newRecipe = new Recipe({
            name,
            ingredients,
            instructions,
            images,
            visibility,
            createdBy: userId
        });

        const recipe = await newRecipe.save();
        res.status(201).json(recipe);
    } catch (err) {
        console.error('Błąd tworzenia przepisu:', err.message);
        res.status(400).json({ error: err.message });
    }
});

router.put('/recipes/:id', auth, async (req, res) => {
    try {
        const { name, ingredients, instructions, images, visibility } = req.body;
        const userId = req.user._id;

        const recipe = await Recipe.findById(req.params.id);

        if (!recipe) {
            return res.status(404).json({ error: 'Recipe not found.' });
        }

        if (recipe.createdBy.toString() !== userId.toString()) {
            return res.status(403).json({ error: 'Unauthorized to update this recipe.' });
        }

        recipe.name = name;
        recipe.ingredients = ingredients;
        recipe.instructions = instructions;
        recipe.images = images;
        recipe.visibility = visibility;

        const updatedRecipe = await recipe.save();
        res.json(updatedRecipe);
    } catch (err) {
        console.error('Błąd aktualizacji przepisu:', err.message);
        res.status(400).json({ error: err.message });
    }
});


router.delete('/recipes/:id', auth, async (req, res) => {
    try {
        const userId = req.user._id;

        const recipe = await Recipe.findById(req.params.id);
        if (!recipe) {
            return res.status(404).json({ error: 'Recipe not found.' });
        }
        if (recipe.createdBy.toString() !== userId.toString()) {
            return res.status(403).json({ error: 'Unauthorized to delete this recipe.' });
        }

        await Recipe.findByIdAndDelete(req.params.id);
        res.sendStatus(204);
    } catch (err) {
        console.error('Błąd usuwania przepisu:', err.message);
        res.status(400).json({ error: err.message });
    }
});

router.get('/user/recipes', auth, async (req, res) => {
    try {
        const userId = req.user._id;

        const recipes = await Recipe.find({ createdBy: userId });
        res.json(recipes);
    } catch (err) {
        console.error('Błąd pobierania przepisów użytkownika:', err.message);
        res.status(500).json({ error: err.message });
    }
});

router.get('/recipes/:id', async (req, res) => {
    try {
        const recipeId = req.params.id;
        const userId = verify(req);

        const recipe = await Recipe.findById(recipeId);
        if (!recipe) {
            return res.status(404).json({ error: 'Recipe not found.' });
        }

        const isPublic = recipe.visibility === 'public';
        const isOwner = userId && recipe.createdBy.toString() === userId.toString();

        if (!isPublic && !isOwner) {
            return res.status(403).json({ error: 'Unauthorized to access this recipe.' });
        }

        let isFavorite = false;
        if (userId) {
            isFavorite = recipe.favorites.includes(userId);
        }

        res.json({ recipe, isFavorite });
    } catch (err) {
        console.error('Błąd pobierania przepisu:', err.message);
        res.status(500).json({ error: err.message });
    }
});


router.get('/recipes/search', async (req, res) => {
    try {
        const { query } = req.query;
        const userId = verify(req);

        if (!query) {
            return res.status(400).json({ error: 'Query is required.' });
        }

        const regexQuery = new RegExp(query, 'i');
        const recipes = await Recipe.find({
            $and: [
                {
                    $or: [
                        { name: { $regex: regexQuery } },
                        { ingredients: { $regex: regexQuery } }
                    ]
                },
                {
                    $or: [
                        { visibility: 'public' },
                        { createdBy: userId }
                    ]
                }
            ]
        });

        res.json(recipes);
    } catch (err) {
        console.error('Błąd wyszukiwania przepisów:', err.message);
        res.status(500).json({ error: err.message });
    }
});


router.post('/recipes/:id/favorite', auth, async (req, res) => {
    try {
        const userId = req.user._id;
        const recipeId = req.params.id;

        // Sprawdzenie, czy przepis istnieje
        const recipe = await Recipe.findById(recipeId);
        if (!recipe) {
            return res.status(404).json({ error: 'Recipe not found.' });
        }

        const isPublic = recipe.visibility === 'public';
        const isOwner = userId && recipe.createdBy.toString() === userId.toString();

        if (!isPublic && !isOwner) {
            return res.status(403).json({ error: 'Unauthorized to access this recipe.' });
        }

        await User.findByIdAndUpdate(
            userId,
            { $addToSet: { favorites: recipeId } },
            { new: true }
        );

        //dla pewności że mamy świeże dane
        const user = await User.findById(userId).populate('favorites');
        if (!user) {
            return res.status(404).json({ error: 'User not found.' });
        }

        res.json(user.favorites);
    } catch (err) {
        console.error('Błąd dodawania do ulubionych:', err.message);
        res.status(400).json({ error: err.message });
    }
});

router.delete('/recipes/:id/favorite', auth, async (req, res) => {
    try {
        const userId = req.user._id;
        const recipeId = req.params.id;

        let user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ error: 'User not found.' });
        }

        if (!user.favorites.includes(recipeId)) {
            return res.status(404).json({ error: 'Recipe not found in favorites.' });
        }

        user.favorites.pull(recipeId);
        await user.save();

        //dla pewności że mamy świeże dane
        user = await User.findById(userId).populate('favorites');

        res.json(user.favorites);
    } catch (err) {
        console.error('Błąd usuwania z ulubionych:', err.message);
        res.status(400).json({ error: err.message });
    }
});


module.exports = router
