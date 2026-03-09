const express = require('express');
const courtController = require('../controllers/court.controller');
const { requireQueryFields } = require('../middleware/validate.middleware');

const router = express.Router();

router.get('/', courtController.getCourts);
router.get('/:id', courtController.getCourtById);
router.get('/:id/availability', requireQueryFields(['date']), courtController.getCourtAvailability);

module.exports = router;
