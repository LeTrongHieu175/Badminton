const express = require('express');
const userController = require('../controllers/user.controller');
const { requireBodyFields } = require('../middleware/validate.middleware');

const router = express.Router();

router.get('/', userController.getUsers);
router.post('/', requireBodyFields(['username', 'email', 'phone', 'password']), userController.createUser);
router.patch('/:id', userController.updateUser);
router.delete('/:id', userController.deleteUser);
router.patch('/:id/role', requireBodyFields(['role']), userController.updateRole);

module.exports = router;
