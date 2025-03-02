const jwt = require('jsonwebtoken');
const userModel = require("../models/user.model");
const i18n = require('../config/i18n'); 

const auth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    const secretKey = req.headers.secret_key;

    if (!authHeader || !secretKey) {
      return res.status(401).json({ message: i18n.__('authMiddleware.requiredTokenSecretKey') });
    }

    const token = authHeader.split(" ")[1];
    if (!token) {
      return res.status(401).json({ message: i18n.__('authMiddleware.missingToken') });
    }

    if (secretKey !== process.env.KEY) {
      return res.status(401).json({ message: i18n.__('authMiddleware.invalidSecretKey') });
    }

    const { id } = jwt.verify(token, process.env.KEY);
    const user = await userModel.findById(id, { password: 0 });

    if (!user) {
      return res.status(401).json({ message: i18n.__('authMiddleware.notFoundUser') });
    }

    req.user = user;
    next();
  } catch (error) {
    console.error("Authentication Error:", error);
    res.status(401).json({ message: i18n.__('authMiddleware.error') });
  }
};

module.exports = auth;
