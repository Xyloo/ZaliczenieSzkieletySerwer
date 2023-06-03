const router = require("express").Router()
const { Recipe } = require("../models/recipe")
const auth = require("../middleware/auth")
const {User} = require("../models/user");

router.get('/recipes', auth, (req, res) => {
    const userId = req.user._id;

    Recipe.find({ $or: [{ visibility: 'public' }, { userId: { $eq: userId } }] })
        .then((recipes) => {
            res.json(recipes);
        })
        .catch((err) => {
            res.status(500).json({ error: err.message });
        });
});

router.post('/recipes', auth, (req, res) => {
    const { name, ingredients, instructions, image, visibility } = req.body;
    const userId = req.user._id;

    const newRecipe = new Recipe({ name, ingredients, instructions, image, visibility, userId });

    newRecipe
        .save()
        .then((recipe) => {
            res.status(201).json(recipe);
        })
        .catch((err) => {
            res.status(400).json({ error: err.message });
        });
});

router.put('/recipes/:id', auth, (req, res) => {
    const { name, ingredients, instructions, image, visibility } = req.body;
    const userId = req.user._id;

    Recipe.findByIdAndUpdate(
        req.params.id,
        { name, ingredients, instructions, image, visibility },
        { new: true }
    )
        .then((recipe) => {
            if (!recipe) {
                return res.status(404).json({ error: 'Recipe not found.' });
            }
            if (recipe.userId.toString() !== userId.toString()) {
                return res.status(403).json({ error: 'Unauthorized to update this recipe.' });
            }
            res.json(recipe);
        })
        .catch((err) => {
            res.status(400).json({ error: err.message });
        });
});


router.delete('/recipes/:id', auth, (req, res) => {
    const userId = req.user._id;

    Recipe.findByIdAndDelete(req.params.id)
        .then((recipe) => {
            if (!recipe) {
                return res.status(404).json({ error: 'Recipe not found.' });
            }
            if (recipe.userId.toString() !== userId.toString()) {
                return res.status(403).json({ error: 'Unauthorized to delete this recipe.' });
            }
            res.sendStatus(204);
        })
        .catch((err) => {
            res.status(400).json({ error: err.message });
        });
});

// Get all recipes for a specific user
router.get('/user/recipes', auth, (req, res) => {
    const userId = req.user._id;

    Recipe.find({ userId })
        .then((recipes) => {
            res.json(recipes);
        })
        .catch((err) => {
            res.status(500).json({ error: err.message });
        });
});

// Get a specific recipe for a specific user
router.get('/recipes/:id', (req, res) => {
    const recipeId = req.params.id;
    const userId = req.user ? req.user._id : null; // Pobierz identyfikator użytkownika, jeśli jest zalogowany

    Recipe.findById(recipeId)
        .populate('comments') // Opcjonalnie, jeśli chcesz pobierać komentarze wraz z przepisem
        .then((recipe) => {
            if (!recipe) {
                return res.status(404).json({ error: 'Recipe not found.' });
            }

            // Sprawdź, czy przepis jest publiczny lub należy do użytkownika
            const isPublic = recipe.visibility === 'public';
            const isOwner = userId && recipe.userId.toString() === userId.toString();

            if (!isPublic && !isOwner) {
                return res.status(403).json({ error: 'Unauthorized to access this recipe.' });
            }

            let isFavorite = false;
            if (userId) {
                // Sprawdź, czy przepis należy do ulubionych użytkownika
                isFavorite = recipe.favorites.includes(userId);
            }

            res.json({ recipe, isFavorite });
        })
        .catch((err) => {
            res.status(500).json({ error: err.message });
        });
});



// Search for recipes by name or ingredients
router.get('/recipes/search', (req, res) => {
    const { query } = req.query;

    Recipe.find({
        $or: [
            { name: { $regex: query, $options: 'i' } },
            { ingredients: { $regex: query, $options: 'i' } },
        ],
    })
        .then((recipes) => {
            res.json(recipes);
        })
        .catch((err) => {
            res.status(500).json({ error: err.message });
        });
});

router.post('/recipes/:id/favorite', auth, (req, res) => {
    const userId = req.user._id;

    User.findByIdAndUpdate(
        userId,
        { $addToSet: { favorites: req.params.id } },
        { new: true }
    )
        .then((user) => {
            if (!user) {
                return res.status(404).json({ error: 'User not found.' });
            }
            res.json(user.favorites);
        })
        .catch((err) => {
            res.status(400).json({ error: err.message });
        });
});

router.delete('/recipes/:id/favorite', auth, (req, res) => {
    const userId = req.user._id;

    User.findByIdAndUpdate(
        userId,
        { $pull: { favorites: req.params.id } },
        { new: true }
    )
        .then((user) => {
            if (!user) {
                return res.status(404).json({ error: 'User not found.' });
            }
            res.json(user.favorites);
        })
        .catch((err) => {
            res.status(400).json({ error: err.message });
        });
});

module.exports = router
