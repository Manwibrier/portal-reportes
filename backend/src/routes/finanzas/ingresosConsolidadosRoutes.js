const express = require('express');
const router = express.Router();
const { getIngresosConsolidados } = require('../../controllers/finanzas/ingresosConsolidadosController');

router.get('/ingresos-consolidados', getIngresosConsolidados);

module.exports = router;
