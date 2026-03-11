const express = require('express');
const courtController = require('../controllers/court.controller');
const roleMiddleware = require('../middleware/role.middleware');
const Role = require('../models/role');
const { requireBodyFields, requireQueryFields } = require('../middleware/validate.middleware');

const router = express.Router();

router.get('/', courtController.getCourts);
router.get('/:id', courtController.getCourtById);
router.get('/:id/availability', requireQueryFields(['date']), courtController.getCourtAvailability);
router.post('/', roleMiddleware(Role.ADMIN), requireBodyFields(['name']), courtController.createCourt);
router.patch('/:id', roleMiddleware(Role.ADMIN), courtController.updateCourt);
router.delete('/:id', roleMiddleware(Role.ADMIN), courtController.deleteCourt);
router.post(
  '/:id/slots',
  roleMiddleware(Role.ADMIN),
  requireBodyFields(['startTime', 'endTime', 'priceVnd']),
  courtController.createCourtSlot
);
router.patch('/:id/slots/:slotId', roleMiddleware(Role.ADMIN), courtController.updateCourtSlot);
router.delete('/:id/slots/:slotId', roleMiddleware(Role.ADMIN), courtController.deleteCourtSlot);

module.exports = router;
