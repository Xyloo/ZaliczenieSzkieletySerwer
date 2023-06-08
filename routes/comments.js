const router = require("express").Router()
const { Recipe } = require("../models/recipe")
const { Comment } = require("../models/comment")
const auth = require("../middleware/auth")

router.post('/recipes/:id/comments', auth, async (req, res) => {
    try {
        const { content } = req.body;
        const userId = req.user._id;

        const recipe = await Recipe.findById(req.params.id);
        if (!recipe) {
            return res.status(404).json({ error: 'Recipe not found.' });
        }

        // Sprawdzenie dostępu do przepisu
        if (recipe.userId.toString() !== userId.toString() && recipe.visibility !== 'public') {
            return res.status(403).json({ error: 'Unauthorized to add comment to this recipe.' });
        }

        const newComment = new Comment({
            content,
            userId,
            recipeId: recipe._id
        });

        const comment = await newComment.save();
        res.status(201).json(comment);
    } catch (err) {
        console.error('Błąd dodawania komentarza:', err.message);
        res.status(400).json({ error: err.message });
    }
});

router.get('/recipes/:id/comments', auth, async (req, res) => {
    try {
        const userId = req.user._id;

        const recipe = await Recipe.findById(req.params.id);
        if (!recipe) {
            return res.status(404).json({ error: 'Recipe not found.' });
        }

        // Sprawdzenie dostępu do przepisu
        if (recipe.visibility !== 'public' && recipe.userId.toString() !== userId.toString()) {
            return res.status(403).json({ error: 'Unauthorized to access comments for this recipe.' });
        }

        const comments = await Comment.find({ recipeId: recipe._id });
        res.json(comments);
    } catch (err) {
        console.error('Błąd pobierania komentarzy:', err.message);
        res.status(500).json({ error: err.message });
    }
});

router.put('/comments/:id', auth, async (req, res) => {
    try {
        const { content } = req.body;
        const userId = req.user._id;

        const comment = await Comment.findById(req.params.id);
        if (!comment) {
            return res.status(404).json({ error: 'Comment not found.' });
        }

        // Sprawdzenie, czy użytkownik ma uprawnienia do edycji komentarza
        if (comment.userId.toString() !== userId.toString()) {
            return res.status(403).json({ error: 'Unauthorized to update this comment.' });
        }

        comment.content = content;
        const updatedComment = await comment.save();
        res.json(updatedComment);
    } catch (err) {
        console.error('Błąd aktualizacji komentarza:', err.message);
        res.status(400).json({ error: err.message });
    }
});

router.delete('/comments/:id', auth, async (req, res) => {
    try {
        const userId = req.user._id;

        const comment = await Comment.findById(req.params.id);
        if (!comment) {
            return res.status(404).json({ error: 'Comment not found.' });
        }

        // Sprawdzenie, czy użytkownik ma uprawnienia do usunięcia komentarza
        if (comment.userId.toString() !== userId.toString()) {
            return res.status(403).json({ error: 'Unauthorized to delete this comment.' });
        }

        await comment.remove();
        res.sendStatus(204);
    } catch (err) {
        console.error('Błąd usuwania komentarza:', err.message);
        res.status(400).json({ error: err.message });
    }
});

module.exports = router

