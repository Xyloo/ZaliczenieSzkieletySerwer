const mongoose = require('mongoose');

const recipeSchema = new mongoose.Schema({
    name: { type: String, required: true },
    ingredients: { type: [String], required: true },
    instructions: { type: String, required: true },
    image: { type: String },
    visibility: { type: String, enum: ['public', 'private'], default: 'public' },
    comments: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Comment' }]
});
