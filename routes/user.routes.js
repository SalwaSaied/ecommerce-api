const express = require('express');
const router = express.Router();

const userController = require('../controllers/user.controller');
const validate = require('../middleware/validate.middleware');
const { protect, adminOnly } = require('../middleware/auth.middleware');
const upload = require('../middleware/upload.middleware');

const {
  addUserSchema,
  updateUserSchema,
  changePasswordSchema,
} = require('../validation/user.validation');

// POST /users/add — Admin only
router.post('/add', protect, adminOnly, validate(addUserSchema), userController.addUser);

// POST /users/change-password — 
router.post(
  '/change-password',
  protect,
  validate(changePasswordSchema),
  userController.changePassword
);

// GET /users/all — Admin only: list all users (admin panel)
router.get('/all', protect, adminOnly, userController.getAllUsers);

// GET /users/:id — Admin only: return one user
router.get('/:id', protect, adminOnly, userController.getUserById);

// PATCH /users/:id — Any logged-in user: update their own data
router.patch(
  '/:id',
  protect,
  upload.single('avatar'),
  validate(updateUserSchema),
  userController.updateUser
);

// DELETE /users/:id — Admin only: delete a user (admin panel)
router.delete('/:id', protect, adminOnly, userController.deleteUser);

module.exports = router;