
const express = require('express');
const router = express.Router();
const passport = require('passport');
const userController = require('../controllers/user/userController');
const productController = require("../controllers/user/productController");
const profileController = require('../controllers/user/profileController');
const cartController = require("../controllers/user/cartController");
const checkoutController = require("../controllers/user/checkoutController");
const orderController = require("../controllers/user/orderController");
const wishlistController = require("../controllers/user/wishlistController");
const couponController = require("../controllers/user/couponController")

const multer = require("multer");
const storage = require("../helpers/multer");
const uploads = multer({storage: storage});

const { userAuth } = require('../middlewares/auth');
const {checkBlockedUser} = require("../middlewares/profileAuth")


router.get('/pageNotFound', userController.pageNotFound);


router.get('/signup',userController.loadSignUpPage);

router.post('/signup', userController.signUp);

router.post('/verify-otp', userController.verifyOtp);

router.post('/resend-otp', userController.resendOtp);


router.get('/auth/google', passport.authenticate('google', { scope: ['profile', 'email'], prompt: 'select_account' }));
router.get('/auth/google/callback', passport.authenticate('google', { failureRedirect: '/signup' }), async (req, res) => {
    try {
        req.session.user = req.user._id;
        res.redirect('/');
    } catch (error) {
        console.log("Google login error:", error);
        res.redirect('/signup');
    }
});


router.get('/login', userController.loadLoginPage);

router.post('/login',userController.login);

router.get('/',checkBlockedUser, userController.loadHomePage);
router.get('/shop', userAuth, userController.getFilteredProducts);


router.get("/productDetails", userAuth, productController.productDetails);



router.get('/logout', userController.logout);
router.get('/forgot-password', profileController.getForgotPassPage);
router.post('/forgot-email-valid', profileController.forgotEmailValid)
router.post('/verify-passForgot-otp', profileController.verifyForgotPassOtp);
router.get('/reset-password', profileController.getResetPassPage);
router.post('/resend-forgot-otp', profileController.resendOtp);
router.post('/reset-password', profileController.postNewPassword);
router.get('/userProfile', userAuth, profileController.userProfile);
router.get('/edit-profile', userAuth, profileController.getEditProfile);
router.post('/edit-profile', userAuth, uploads.single('profileImage'), profileController.editProfile);
router.get('/change-email', userAuth, profileController.changeEmail);
router.post('/change-email', userAuth, profileController.changeEmailValid);
router.post('/verify-email-otp', userAuth, profileController.verifyEmailOtp);
router.post('/resend-changeemail-otp', userAuth, profileController.resendChangeEmailOtp);
router.get('/new-email', userAuth, profileController.getNewEmail);
router.post('/update-email', userAuth, profileController.updateEmail);
router.post('/change-password', userAuth, profileController.changePassword);


router.get("/address", userAuth, profileController.loadAddressPage);
router.get("/addAddress",userAuth,profileController.addAddress);
router.post("/addAddress", userAuth, profileController.postAddAddress);
router.get('/editAddress', userAuth, profileController.editAddress);
router.post("/editAddress", userAuth, profileController.postEditAddress);
router.get("/deleteAddress", userAuth, profileController.deleteAddress);

router.get('/wishlist', userAuth, wishlistController.loadWishlist);
router.post('/addToWishlist', userAuth, wishlistController.addToWishlist);
router.get('/removeFromWishlist', userAuth, wishlistController.removeProduct);



router.get("/cart", userAuth, cartController.getCartPage);
router.post("/addToCart", userAuth, cartController.addToCart);
router.post("/changeQuantity", userAuth, cartController.changeQuantity);
router.get("/deleteItem", userAuth, cartController.deleteProduct);

router.get("/checkout", userAuth, checkoutController.loadCheckoutPage);
router.get("/addAddressCheckout",userAuth,checkoutController.addAddressCheckout);
router.post("/addAddressCheckout",userAuth,checkoutController.postAddAddressCheckout);
router.get('/check-stock',userAuth, checkoutController.checkStock);

router.get('/order-success', userAuth, orderController.orderSuccessPage);
router.post("/placeOrder", userAuth, orderController.placeOrder);
router.get("/orders", userAuth, orderController.getOrders);
router.get("/order-details", userAuth, orderController.loadOrderDetails);

router.post('/create-razorpay-order', userAuth, orderController.createRazorpayOrder);
router.post('/verify-payment', userAuth, orderController.verifyPayment);

router.get("/download-invoice", userAuth, orderController.generateInvoice);
router.post("/orders/cancel", userAuth, orderController.cancelOrder);
router.post("/orders/return", userAuth, orderController.requestReturn);


router.get("/mycoupons",userAuth,couponController.loadCoupons);
router.post("/apply-coupon", userAuth, checkoutController.applyCoupon);

module.exports = router;