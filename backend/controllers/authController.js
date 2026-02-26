const User = require('../models/User');
const jwt = require('jsonwebtoken');
const admin = require('firebase-admin');
const cloudinary = require('cloudinary').v2;  // ← ADD THIS
const streamifier = require('streamifier');     // ← ADD THIS

// Generate JWT Token
const generateToken = (user) => {
  return jwt.sign(
    {
      id: user._id,
      email: user.email,
      role: user.role,
    },
    process.env.JWT_SECRET,
    { expiresIn: '30d' }
  );
};

// ================= LOGIN =================
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;
    console.log('Login attempt:', email);

  
    
    if (!email || !password) {
      return res.status(400).json({ message: 'Please provide email and password' });
    }

    let user = await User.findOne({ email });
    
    if (!user) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    // Check password
    const isPasswordCorrect = await user.comparePassword(password);
    
    if (!isPasswordCorrect) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    if (!user.isActive) {
      return res.status(403).json({ message: 'Account is deactivated' });
    }

    const token = generateToken(user);
    
    res.json({
      message: 'Login successful',
      token,
      user: {
        id: user._id,
        fullName: user.fullName,
        email: user.email,
        role: user.role,
        picture: user.picture,
        phone: user.phone,
        address: user.address,
      },
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: error.message });
  }
};

// ================= REGISTER =================
exports.register = async (req, res) => {
  try {
    const { fullName, email, password, phone, address } = req.body;

    if (!fullName || !email || !password || !phone || !address) {
      return res.status(400).json({ message: 'Please fill all fields' });
    }

    let existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: 'User already exists' });
    }

    let imageUrl = null;

    // 🔥 If user uploaded profile image
    if (req.file) {
      const uploadFromBuffer = () => {
        return new Promise((resolve, reject) => {
          const uploadStream = cloudinary.uploader.upload_stream(
            { folder: 'roseluxe_profiles' },
            (error, result) => {
              if (result) resolve(result);
              else reject(error);
            }
          );
          streamifier.createReadStream(req.file.buffer).pipe(uploadStream);
        });
      };

      const result = await uploadFromBuffer();
      imageUrl = result.secure_url;
    }

    const user = new User({
      fullName,
      email,
      password,
      phone,
      address,
      picture: imageUrl,
      loginMethod: 'email',
    });

    await user.save();

    const token = generateToken(user);

    res.status(201).json({
      message: 'User registered successfully',
      token,
      user: {
        id: user._id,
        fullName: user.fullName,
        email: user.email,
        role: user.role,
        picture: user.picture,
      },
    });

  } catch (error) {
    console.log(error);
    res.status(500).json({ message: error.message });
  }
};

// ================= GOOGLE LOGIN =================
exports.googleLogin = async (req, res) => {
  try {
    const { idToken } = req.body;

    const decodedToken = await admin.auth().verifyIdToken(idToken);
    const { uid, email, name, picture } = decodedToken;

    let user = await User.findOne({ email });

    if (user && !user.isActive) {
      return res.status(403).json({ message: 'Account is deactivated' });
    }

    if (!user) {
      user = new User({
        fullName: name,
        email,
        firebaseUID: uid,
        picture: picture, // save Google profile picture
        loginMethod: 'google',
      });

      await user.save();
    } else {
      if (!user.firebaseUID) {
        user.firebaseUID = uid;
        await user.save();
      }
    }

    const token = generateToken(user);

    res.json({
      message: 'Google login successful',
      token,
      user: {
        id: user._id,
        fullName: user.fullName,
        email: user.email,
        role: user.role,
        picture: user.picture,
      },
    });

  } catch (error) {
    res.status(500).json({
      message: 'Google login failed',
      error: error.message,
    });
  }
};

// ================= GET CURRENT USER =================
exports.getCurrentUser = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password');
    res.json(user);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ================= UPDATE PROFILE =================
exports.updateProfile = async (req, res) => {
  try {
    const { fullName, email, phone, address } = req.body;
    const userId = req.user.id; // From auth middleware

    // Validate all required fields
    if (!fullName || !email || !phone || !address) {
      return res.status(400).json({ 
        message: 'All fields are required: fullName, email, phone, address' 
      });
    }

    // Validate phone length
    if (phone.length < 7) {
      return res.status(400).json({ 
        message: 'Phone number must be at least 7 digits' 
      });
    }

    // Validate address length
    if (address.length < 10) {
      return res.status(400).json({ 
        message: 'Address must be at least 10 characters' 
      });
    }

    // Check if email is being changed and if it's already in use
    if (email) {
      const existingUser = await User.findOne({ 
        email: email.toLowerCase(),
        _id: { $ne: userId } // Exclude current user
      });
      
      if (existingUser) {
        return res.status(400).json({ message: 'Email is already in use' });
      }
    }

    // Find user
    let user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Update basic fields
    if (fullName) user.fullName = fullName;
    if (email) user.email = email.toLowerCase();
    if (phone) user.phone = phone;
    if (address) user.address = address;

    // 🔥 If user uploaded new profile image
    if (req.file) {
      const uploadFromBuffer = () => {
        return new Promise((resolve, reject) => {
          const uploadStream = cloudinary.uploader.upload_stream(
            { 
              folder: 'roseluxe_profiles',
              public_id: `user_${userId}`, // Save with consistent ID
            },
            (error, result) => {
              if (result) resolve(result);
              else reject(error);
            }
          );
          streamifier.createReadStream(req.file.buffer).pipe(uploadStream);
        });
      };
      
      const result = await uploadFromBuffer();
      user.picture = result.secure_url;
      console.log('Profile picture updated:', result.secure_url);
    }

    // Save user
    await user.save();

    res.json({
      message: 'Profile updated successfully',
      user: {
        id: user._id,
        fullName: user.fullName,
        email: user.email,
        phone: user.phone,
        address: user.address,
        picture: user.picture,
        role: user.role,
      },
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: error.message });
  }
};
