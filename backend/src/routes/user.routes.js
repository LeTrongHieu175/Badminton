const express = require('express');
const userController = require('../controllers/user.controller');
const { requireBodyFields } = require('../middleware/validate.middleware');

const router = express.Router();

router.get('/', userController.getUsers);
router.patch('/:id/role', requireBodyFields(['role']), userController.updateRole);

module.exports = router;
