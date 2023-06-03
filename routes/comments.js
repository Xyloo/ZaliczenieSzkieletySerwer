const router = require("express").Router()
const { Recipe } = require("../models/recipe")
const { Comment } = require("../models/comment")
const auth = require("../middleware/auth")

router.post('/recipes/:id/comments', auth, (req, res) => {
    const { content } = req.body;
    const userId = req.user._id;

    Recipe.findById(req.params.id)
        .then((recipe) => {
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

            return newComment.save();
        })
        .then((comment) => {
            res.status(201).json(comment);
        })
        .catch((err) => {
            res.status(400).json({ error: err.message });
        });
});

router.get('/recipes/:id/comments', auth, (req, res) => {
    const userId = req.user._id;

    Recipe.findById(req.params.id)
        .then((recipe) => {
            if (!recipe) {
                return res.status(404).json({ error: 'Recipe not found.' });
            }

            // Sprawdzenie dostępu do przepisu
            if (recipe.visibility !== 'public' && recipe.userId.toString() !== userId.toString()) {
                return res.status(403).json({ error: 'Unauthorized to access comments for this recipe.' });
            }

            Comment.find({ recipeId: recipe._id })
                .then((comments) => {
                    res.json(comments);
                })
                .catch((err) => {
                    res.status(500).json({ error: err.message });
                });
        })
        .catch((err) => {
            res.status(500).json({ error: err.message });
        });
});


router.put('/comments/:id', auth, (req, res) => {
    const { content } = req.body;
    const userId = req.user._id;

    Comment.findById(req.params.id)
        .then((comment) => {
            if (!comment) {
                return res.status(404).json({ error: 'Comment not found.' });
            }

            // Sprawdzenie, czy użytkownik ma uprawnienia do edycji komentarza
            if (comment.userId.toString() !== userId.toString()) {
                return res.status(403).json({ error: 'Unauthorized to update this comment.' });
            }

            comment.content = content;
            return comment.save();
        })
        .then((updatedComment) => {
            res.json(updatedComment);
        })
        .catch((err) => {
            res.status(400).json({ error: err.message });
        });
});

router.delete('/comments/:id', auth, (req, res) => {
    const userId = req.user._id;

    Comment.findById(req.params.id)
        .then((comment) => {
            if (!comment) {
                return res.status(404).json({ error: 'Comment not found.' });
            }

            // Sprawdzenie, czy użytkownik ma uprawnienia do usunięcia komentarza
            if (comment.userId.toString() !== userId.toString()) {
                return res.status(403).json({ error: 'Unauthorized to delete this comment.' });
            }

            return comment.remove();
        })
        .then(() => {
            res.sendStatus(204);
        })
        .catch((err) => {
            res.status(400).json({ error: err.message });
        });
});

module.exports = router

