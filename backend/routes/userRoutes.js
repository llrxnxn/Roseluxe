const express = require('express');
const router = express.Router();
const {
  getAllUsers,
  updateUserRole,
  updateUserStatus,
  updateUser,
} = require('../controllers/userController');

router.get('/', getAllUsers);
router.put('/:id', updateUser); // Single endpoint for both role and status
router.put('/:id/role', updateUserRole); // Keep these for backwards compatibility
router.put('/:id/status', updateUserStatus);

module.exports = router;