const mongoose = require('mongoose');

const imageSchema = new mongoose.Schema({
    recipe: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Recipe',
        required: true
    },
    data: {
        type: Buffer,
        required: true
    },
    contentType: {
        type: String,
        required: true
    }
});

const Image = mongoose.model('Image', imageSchema);

module.exports = Image;
