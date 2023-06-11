const jwt = require('jsonwebtoken');
const { Recipe } = require('../models/recipe.js');
const { Comment } = require('../models/comment.js');

const checkRecipeAccess = async (recipeId, userId) => {
    const recipe = await Recipe.findById(recipeId);
    if (!recipe) {
        throw new Error('Recipe not found.');
    }

    const isPublic = recipe.visibility === 'public';
    const isOwner = userId && recipe.createdBy.toString() === userId.toString();
    if (!isPublic && !isOwner) {
        throw new Error('Unauthorized to access this recipe.');
    }
};

const checkCommentAccess = async (commentId, userId) => {
    const comment = await Comment.findById(commentId);
    if (!comment) {
        throw new Error('Comment not found.');
    }

    const isOwner = userId && comment.createdBy.toString() === userId.toString();
    if (!isOwner) {
        throw new Error('Unauthorized to access this comment.');
    }
}

const verify = (req) => {
    const token = req.header('Authorization');
    // Sprawdzenie, czy token istnieje
    if (!token) {
        return false;
    }

    try {
        // Weryfikacja tokenu
        const decodedToken = token.replace('Bearer ', '');
        const decoded = jwt.verify(decodedToken, process.env.JWTPRIVATEKEY);
        // Sprawdzenie, czy istnieje pole user w zdekodowanym tokenie
        if (decoded._id) {
            return decoded._id;
        } else {
            return null;
        }
    } catch (err) {
        return null;
    }
};


module.exports = {checkRecipeAccess, verify, checkCommentAccess};