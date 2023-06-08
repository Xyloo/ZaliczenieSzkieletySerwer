const router = require("express").Router()
const { Recipe } = require("../models/recipe")
const auth = require("../middleware/auth")
const {User} = require("../models/user");

router.get('/recipes', auth, async (req, res) => {
    try {
        const userId = req.user._id;

        const recipes = await Recipe.find({
            $or: [{ visibility: 'public' }, { userId: { $eq: userId } }]
        });
        res.json(recipes);
    } catch (err) {
        console.error('Błąd pobierania przepisów:', err.message);
        res.status(500).json({ error: err.message });
    }
});

router.post('/recipes', auth, async (req, res) => {
    try {
        const { name, ingredients, instructions, image, visibility } = req.body;
        const userId = req.user._id;

        const newRecipe = new Recipe({
            name,
            ingredients,
            instructions,
            image,
            visibility,
            userId
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
        const { name, ingredients, instructions, image, visibility } = req.body;
        const userId = req.user._id;

        const recipe = await Recipe.findByIdAndUpdate(
            req.params.id,
            { name, ingredients, instructions, image, visibility },
            { new: true }
        );

        if (!recipe) {
            return res.status(404).json({ error: 'Recipe not found.' });
        }
        if (recipe.userId.toString() !== userId.toString()) {
            return res.status(403).json({ error: 'Unauthorized to update this recipe.' });
        }

        res.json(recipe);
    } catch (err) {
        console.error('Błąd aktualizacji przepisu:', err.message);
        res.status(400).json({ error: err.message });
    }
});

router.delete('/recipes/:id', auth, async (req, res) => {
    try {
        const userId = req.user._id;

        const recipe = await Recipe.findByIdAndDelete(req.params.id);
        if (!recipe) {
            return res.status(404).json({ error: 'Recipe not found.' });
        }
        if (recipe.userId.toString() !== userId.toString()) {
            return res.status(403).json({ error: 'Unauthorized to delete this recipe.' });
        }

        res.sendStatus(204);
    } catch (err) {
        console.error('Błąd usuwania przepisu:', err.message);
        res.status(400).json({ error: err.message });
    }
});

router.get('/user/recipes', auth, async (req, res) => {
    try {
        const userId = req.user._id;

        const recipes = await Recipe.find({ userId });
        res.json(recipes);
    } catch (err) {
        console.error('Błąd pobierania przepisów użytkownika:', err.message);
        res.status(500).json({ error: err.message });
    }
});

router.get('/recipes/:id', async (req, res) => {
    try {
        const recipeId = req.params.id;
        const userId = req.user ? req.user._id : null;

        const recipe = await Recipe.findById(recipeId).populate('comments');
        if (!recipe) {
            return res.status(404).json({ error: 'Recipe not found.' });
        }

        const isPublic = recipe.visibility === 'public';
        const isOwner = userId && recipe.userId.toString() === userId.toString();

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

        const recipes = await Recipe.find({
            $or: [
                { name: { $regex: query, $options: 'i' } },
                { ingredients: { $regex: query, $options: 'i' } }
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

        const user = await User.findByIdAndUpdate(
            userId,
            { $addToSet: { favorites: req.params.id } },
            { new: true }
        );

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

        const user = await User.findByIdAndUpdate(
            userId,
            { $pull: { favorites: req.params.id } },
            { new: true }
        );

        if (!user) {
            return res.status(404).json({ error: 'User not found.' });
        }

        res.json(user.favorites);
    } catch (err) {
        console.error('Błąd usuwania z ulubionych:', err.message);
        res.status(400).json({ error: err.message });
    }
});

module.exports = router
