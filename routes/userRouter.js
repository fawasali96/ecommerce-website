
const express = require('express');
const router = express.Router();
const passport = require('passport');
const userController = require('../controllers/user/userController');
const productController = require("../controllers/user/productController");
const profileController = require('../controllers/user/profileController');
const multer = require("multer")
const upload = require('../config/multer');

const { userAuth,addCartWishlist,checkUserAuthWish,ajaxAuth } = require('../middlewares/auth');
const {resetPasswordMiddleware,blockLoggedInUsers, checkBlockedUser,checkLoggedIn,forgotPassLogout} = require("../middlewares/profileAuth")


router.get('/pagenotfound', userController.pageNotFound);


router.get('/signup',checkLoggedIn, userController.loadSignUpPage);

router.post('/signup',checkLoggedIn, userController.signUp);

router.post('/verify-otp', userController.verifyOtp);

router.post('/resend-otp', userController.resendOtp);


router.get('/auth/google', passport.authenticate('google', { scope: ['profile', 'email'] }));
router.get('/auth/google/callback', passport.authenticate('google', { failureRedirect: '/signup' }), async (req, res) => {
    try {
        req.session.user = req.user._id;
        res.redirect('/');
    } catch (error) {
        console.log("Google login error:", error);
        res.redirect('/signup');
    }
});


router.get('/login',checkLoggedIn, userController.loadLoginPage);

router.post('/login',checkLoggedIn, userController.login);

router.get('/',checkBlockedUser, userController.loadHomePage);

router.get("/shop",userController.loadShoppingPage);
router.get("/filter",userController.filterProduct);


router.get("/productDetails",productController.productDetails);
router.get('/search', userController.searchProducts);


router.get('/logout', userController.logout);
router.get('/forgot-password', profileController.getForgotPassPage);
router.post('/forgot-email-valid', profileController.forgotEmailValid)
router.post('/verify-passForgot-otp', profileController.verifyForgotPassOtp);
router.get('/reset-password', profileController.getResetPassPage);
router.post('/resend-forgot-otp', profileController.resendOtp);
router.post('/reset-password', profileController.postNewPassword);






module.exports = router;