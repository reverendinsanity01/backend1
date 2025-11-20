const mongoose = require("mongoose")

const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true, match: /.+\@.+\..+/ },
  password: { type: String, required: true, minlength: 6 },
  role: { type: String, enum: ["User", "Admin"], default: "User" },
}, { timestamps: true });

const User = mongoose.model("User", userSchema);

module.exports = User;