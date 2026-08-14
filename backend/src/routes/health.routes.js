const express = require('express')
const { getHealth, getReadiness } = require('../controllers/health.controller')
const { asyncHandler } = require('../utils/async-handler')

const router = express.Router()
router.get('/', getHealth)
router.get('/ready', asyncHandler(getReadiness))
module.exports = router
