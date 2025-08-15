const mongoose = require("mongoose");

const DocumentSchema = new mongoose.Schema({
  _id: String,
  content: Object, // Delta format from Quill
});

module.exports = mongoose.model("Document", DocumentSchema);

