const router = require("express").Router()
const { Recipe } = require("../models/recipe")
const { auth } = require("../middleware/auth")
const {User} = require("../models/user");
const { verify, checkRecipeAccess } = require("../utility/util")
const multer = require('multer');
const fs = require("fs");
const path = require("path");

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'public/uploads'); // Katalog docelowy, gdzie będą przechowywane pliki
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
        const fileExtension = path.extname(file.originalname);
        cb(null, uniqueSuffix + fileExtension); // Nadanie unikalnej nazwy pliku
    },
});

const upload = multer({
    limits: { fileSize: 7 * 1024 * 1024 }, //7 MB
    storage: storage
});

router.get('/recipes', async (req, res) => {
    try {
        const userId = verify(req);

        const recipes = await Recipe.find({
            $or: [{ visibility: 'public' }, { createdBy: { $eq: userId } }]
        }).populate('images comments').populate({
            path: 'createdBy', select: 'firstName lastName'
        });
        res.json(recipes);
    } catch (err) {
        console.error('Błąd pobierania przepisów:', err.message);
        res.status(500).json({ error: err.message });
    }
});

router.post('/recipes', auth, upload.array('images'), async (req, res) => {
    try {
        const { name, ingredients, instructions, visibility } = req.body;
        const userId = req.user._id;
        const images = [];

        if (req.files) {
        if (req.files.length > 5)
        {
            throw new Error('Maksymalna liczba zdjęć to 5');
        }
            for (const file of req.files) {
                const imageUrl = `/uploads/${file.filename}`; // Tworzenie ścieżki do pliku na serwerze
                images.push(imageUrl);
            }
        }

        const newRecipe = new Recipe({
            name,
            ingredients,
            instructions,
            images,
            visibility,
            createdBy: userId,
        });

        const recipe = await newRecipe.save();
        res.status(201).json(recipe);
    } catch (err) {
        console.error('Błąd tworzenia przepisu:', err.message);
        res.status(400).json({ error: err.message });
    }
});

router.put('/recipes/:id', upload.array('images', 5), auth, async (req, res) => {
    try {
        const { name, ingredients, instructions, visibility } = req.body;
        const userId = req.user._id;
        const recipeId = req.params.id;

        await checkRecipeAccess(recipeId, userId);

        const recipe = await Recipe.findById(recipeId);

        if (!recipe) {
            return res.status(404).json({ error: 'Przepis nie został znaleziony.' });
        }

        recipe.name = name;
        recipe.ingredients = ingredients;
        recipe.instructions = instructions;
        recipe.visibility = visibility;

        // Przetwarzanie przesyłanych obrazów
        if (req.files && req.files.length > 0) {
            if (
                (req.files.length > 5) ||
                (recipe.images && recipe.images.length + req.files.length > 5)
            ) {
                throw new Error('Maksymalna liczba zdjęć to 5.');
            }

            const newImageUrls = req.files.map((file) => `/uploads/${file.filename}`);
            recipe.images.push(...newImageUrls);
        }

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
        const recipeId = req.params.id;

        await checkRecipeAccess(recipeId, userId);

        const recipe = await Recipe.findById(recipeId);

        // Usuwanie obrazków z dysku
        if (recipe.images && recipe.images.length > 0) {
            for (let i = 0; i < recipe.images.length; i++) {
                const imageUrl = recipe.images[i];

                // Usuwanie pliku z serwera
                const imagePath = path.join(__dirname, '../public', imageUrl);
                fs.unlinkSync(imagePath);
            }
        }

        await Recipe.findByIdAndDelete(recipeId);
        res.sendStatus(204);
    } catch (err) {
        console.error('Błąd usuwania przepisu:', err.message);
        res.status(400).json({ error: err.message });
    }
});
router.delete('/recipes/:id/images/:imageId', auth, async (req, res) => {
    try {
        const userId = req.user._id;
        const recipeId = req.params.id;
        const imageIndex = req.params.imageId;

        // Sprawdzenie dostępu do przepisu
        await checkRecipeAccess(recipeId, userId);

        // Pobranie przepisu
        const recipe = await Recipe.findById(recipeId);
        if (!recipe) {
            return res.status(404).json({ error: 'Recipe not found.' });
        }

        // Sprawdzenie poprawności indeksu obrazka
        if (imageIndex < 0 || imageIndex >= recipe.images.length) {
            return res.status(404).json({ error: 'Image not found.' });
        }

        // Usunięcie obrazka z dysku
        const imagePath = path.join(__dirname, '../public', recipe.images[imageIndex]);
        fs.unlinkSync(imagePath);

        // Usunięcie obrazka z tablicy images w przepisie
        recipe.images.splice(imageIndex, 1);
        await recipe.save();

        res.sendStatus(204);
    } catch (err) {
        console.error('Błąd usuwania obrazu:', err.message);
        res.status(400).json({ error: err.message });
    }
});



router.get('/user/recipes', auth, async (req, res) => {
    try {
        const userId = req.user._id;

        const recipes = await Recipe.find({ createdBy: userId }).populate('images comments').populate({
            path: 'createdBy', select: 'firstName lastName'
        });
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

        await checkRecipeAccess(recipeId, userId);
        const recipe = await Recipe.findById(recipeId).populate('images comments').populate({
            path: 'createdBy', select: 'firstName lastName'
        });

        let isFavorite = false;
        if (userId) {
            const user = await User.findById(userId);
            isFavorite = user.favorites.includes(recipeId);
        }

        res.json({ recipe, isFavorite });
    } catch (err) {
        console.error('Błąd pobierania przepisu:', err.message);
        res.status(500).json({ error: err.message });
    }
});

router.post('/recipes/search', async (req, res) => {
    try {
        const { query } = req.body;
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
        }).populate('images comments').populate({
            path: 'createdBy', select: 'firstName lastName'
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

        await checkRecipeAccess(recipeId, userId);

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
