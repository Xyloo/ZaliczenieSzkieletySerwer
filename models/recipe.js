const mongoose = require('mongoose');

const recipeSchema = new mongoose.Schema({
    name: { type: String, required: true },
    ingredients: { type: String, required: true },
    instructions: { type: String, required: true },
    images: { type: [String] },
    visibility: { type: String, enum: ['public', 'private'], default: 'public' },
    comments: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Comment' }],
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    createdAt: { type: Date, default: Date.now },
});

const Recipe = mongoose.model('Recipe', recipeSchema);

module.exports = { Recipe };