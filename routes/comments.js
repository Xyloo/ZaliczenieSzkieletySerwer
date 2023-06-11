const router = require("express").Router()
const { Recipe } = require("../models/recipe")
const { Comment } = require("../models/comment")
const { auth } = require("../middleware/auth")
const { checkCommentAccess, checkRecipeAccess, verify} = require("../utility/util")

router.post('/recipes/:id/comments', auth, async (req, res) => {
    try {
        const { content } = req.body;
        const userId = req.user._id;
        const recipeId = req.params.id;

        await checkRecipeAccess(recipeId, userId);

        const newComment = new Comment({
            content,
            recipeId,
            createdBy: userId,
        });

        const comment = await newComment.save();
        const recipe = await Recipe.findById(recipeId);
        recipe.comments.push(comment._id);
        await recipe.save();
        res.status(201).json(comment);
    } catch (err) {
        console.error('Błąd dodawania komentarza:', err.message);
        res.status(400).json({ error: err.message });
    }
});

router.get('/recipes/:id/comments', async (req, res) => {
    try {
        const userId = verify(req);
        const recipeId = req.params.id;

        await checkRecipeAccess(recipeId, userId);

        const comments = await Comment.find({ recipeId: recipeId }).populate({
            path: 'createdBy', select: 'firstName lastName'
        });
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
        const commentId = req.params.id;

        await checkCommentAccess(commentId, userId)

        const comment = await Comment.findById(commentId);

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
        const commentId = req.params.id;

        await checkCommentAccess(commentId, userId);

        // Use the deleteOne() method to remove the comment
        const result = await Comment.deleteOne({ _id: commentId, createdBy: userId });

        // Check if the comment was deleted
        if (result.deletedCount === 0) {
            return res.status(404).json({ error: 'Comment not found' });
        }
        const recipe = await Recipe.findOne({ comments: commentId });
        recipe.comments.pull(commentId);
        await recipe.save();
        res.sendStatus(204);
    } catch (err) {
        console.error('Error deleting comment:', err.message);
        res.status(400).json({ error: err.message });
    }
});


module.exports = router

