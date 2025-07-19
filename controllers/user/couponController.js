const Coupon = require("../../models/couponSchema");
const User = require("../../models/userSchema");

const loadCoupons = async (req, res) => {
  try {
    const userId = req.session.user;
    const userData = await User.findById(userId);

    const currentDate = new Date();

        const coupons = await Coupon.find({
      $or: [
        { userId: userId }, 
        { isList: true }    
      ],
      expireOn: { $gt: currentDate },
    }).sort({ createdOn: -1 }); 

   
    const couponsWithStatus = coupons.map(coupon => {
      const isUsed = coupon.userId.includes(userId);
      return {
        ...coupon.toObject(), 
        isUsed: isUsed,
        usageMessage: isUsed ? "Already used, can't use this coupon" : "Available to use"
      };
    });
    


    res.render("my-coupons", {
      coupons: couponsWithStatus,
      user: userData,
    });
  } catch (error) {
    console.error("Error in loadCoupons:", error);
    res.redirect("/pageerror");
  }
};

module.exports = {
  loadCoupons,
}