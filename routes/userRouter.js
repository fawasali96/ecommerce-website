
const express = require('express');
const router = express.Router();
const passport = require('passport');
const userController = require('../controllers/user/userController');
const productController = require("../controllers/user/productController");
const profileController = require('../controllers/user/profileController');
const multer = require("multer");
const storage = require("../helpers/multer");
const uploads = multer({storage: storage});

const { userAuth,addCartWishlist,checkUserAuthWish,ajaxAuth } = require('../middlewares/auth');
const {blockLoggedInUsers, checkBlockedUser,checkLoggedIn} = require("../middlewares/profileAuth")


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
// router.get('/shop', userAuth, userController.loadShoppingPage);
// router.get("/filter", userAuth, userController.filterProduct);
// router.get("/filterPrice", userAuth, userController.filterByPrice);
// router.post('/search', userAuth, userController.searchProducts);
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
router.get('/change-password-forgot', userAuth, profileController.changePasswordForgot);
router.post('/change-password-forgot', userAuth, profileController.changePasswordValid);
router.post('/verify-changepassword-otp', userAuth, profileController.verifyChangePassOtp);


router.get("/address", userAuth, profileController.loadAddressPage);
router.get("/addAddress",userAuth,profileController.addAddress);
router.post("/addAddress", userAuth, profileController.postAddAddress);
router.get('/editAddress', userAuth, profileController.editAddress);
router.post("/editAddress", userAuth, profileController.postEditAddress);
router.get("/deleteAddress", userAuth, profileController.deleteAddress);





module.exports = router;