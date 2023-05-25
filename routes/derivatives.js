const express = require('express');
const { authRefreshMiddleware, getDownloadUrls } = require('../services/aps.js');

let router = express.Router();

router.use('/api/derivatives', authRefreshMiddleware);

router.get('/api/derivatives/:derivative_id/downloadurls', async function (req, res, next) {
  try {
    const downloadUrls = await getDownloadUrls(req.params.derivative_id, req.internalOAuthToken);
    res.json(downloadUrls);
  } catch (err) {
    next(err);
  }
});

module.exports = router;