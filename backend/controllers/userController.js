const User = require('../models/User');

/* ===============================
   GET ALL USERS
================================ */
exports.getAllUsers = async (req, res) => {
  try {
    const users = await User.find().select('-password');

    res.json({
      success: true,
      users,
    });
  } catch (error) {
    console.error('Get Users Error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

/* ===============================
   UPDATE USER (Role & Status)
================================ */
exports.updateUser = async (req, res) => {
  try {
    const { role, isActive } = req.body;
    const updateData = {};

    // Validate and add role if provided
    if (role !== undefined) {
      if (!['admin', 'customer'].includes(role)) {
        return res.status(400).json({ message: 'Invalid role' });
      }
      updateData.role = role;
    }

    // Add isActive if provided
    if (isActive !== undefined) {
      updateData.isActive = isActive;
    }

    // If no valid data to update
    if (Object.keys(updateData).length === 0) {
      return res.status(400).json({ message: 'No valid fields to update' });
    }

    const user = await User.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true }
    ).select('-password');

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json({
      success: true,
      user,
    });
  } catch (error) {
    console.error('Update User Error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

/* ===============================
   UPDATE ROLE
================================ */
exports.updateUserRole = async (req, res) => {
  try {
    const { role } = req.body;

    if (!['admin', 'customer'].includes(role)) {
      return res.status(400).json({ message: 'Invalid role' });
    }

    const user = await User.findByIdAndUpdate(
      req.params.id,
      { role },
      { new: true }
    ).select('-password');

    res.json({
      success: true,
      user,
    });
  } catch (error) {
    console.error('Update Role Error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

/* ===============================
   UPDATE STATUS
================================ */
exports.updateUserStatus = async (req, res) => {
  try {
    const { isActive } = req.body;

    const user = await User.findByIdAndUpdate(
      req.params.id,
      { isActive },
      { new: true }
    ).select('-password');

    res.json({
      success: true,
      user,
    });
  } catch (error) {
    console.error('Update Status Error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};