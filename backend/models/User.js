const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const UserSchema = new mongoose.Schema({
  fullName: {
    type: String,
    required: true,
  },

  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
  },

  password: {
    type: String,
    required: function () {
      return this.loginMethod === 'email';
    },
  },

  phone: String,
  address: String,

  picture: {
    type: String,
    default: null,
  },

  role: {
    type: String,
    enum: ['customer', 'admin'],
    default: 'customer',
  },

  firebaseUID: String,

  loginMethod: {
    type: String,
    enum: ['email', 'google'],
    default: 'email',
  },

  isActive: {
    type: Boolean,
    default: true,
  },

  // Optional: For soft deletes if you want to keep user data
  deletedAt: {
    type: Date,
    default: null,
  },

}, { timestamps: true });

// Hash password bago i-save
UserSchema.pre('save', async function () {
  if (!this.isModified('password')) return;

  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
});

// Method para i-compare password
UserSchema.methods.comparePassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

module.exports = mongoose.model('User', UserSchema);