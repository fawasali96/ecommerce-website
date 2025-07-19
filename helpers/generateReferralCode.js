const crypto = require("crypto");

function generateReferralCode() {
  return crypto.randomBytes(4).toString("hex"); 
}

module.exports = generateReferralCode;
