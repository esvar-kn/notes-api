const mongoose = require('mongoose');

const noteSchema = new mongoose.Schema({
    title: { type: String, required: true, trim: true, maxLength: 200 },
    content: { type: String, required: true },
    owner: { type: mongoose.Schema.Types.ObjectId, ref: 'user', required: true }
}, { timestamps: true });

module.exports = mongoose.model('note', noteSchema);