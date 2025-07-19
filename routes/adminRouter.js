const express = require('express');
const router = express.Router();
const adminController = require('../controllers/admin/adminController');
const customerController = require('../controllers/admin/customerController');
const categoryController = require('../controllers/admin/categoryController');
const brandController = require('../controllers/admin/brandController');
const productController = require('../controllers/admin/productController');
const couponController = require('../controllers/admin/couponController');
const orderController = require('../controllers/admin/orderController');
const salesController = require('../controllers/admin/salesController');
const {userAuth, adminAuth} = require("../middlewares/auth")
const multer = require("multer");
const storage = require("../helpers/multer");
const uploads = multer({storage: storage});

router.get('/pageerror', adminController.pageError);
router.get('/login', adminController.loadLogin);
router.post('/login', adminController.login);
router.get('/', adminAuth, adminController.loadDashboard);
router.get('/logout', adminController.logout);

router.get('/users', adminAuth, customerController.customerInfo);
router.get('/blockCustomer', adminAuth, customerController.customerBlocked);
router.get('/unBlockCustomer', adminAuth, customerController.customerUnblocked);

router.get('/category', adminAuth, categoryController.categoryInfo);
router.post('/addCategory', adminAuth, categoryController.addCategory);
router.post('/addCategoryOffer', adminAuth, categoryController.addCategoryOffer);
router.post('/removeCategoryOffer', adminAuth, categoryController.removeCategoryOffer);
router.post("/editCategoryOffer", adminAuth, categoryController.editCategoryOffer)
router.get('/listCategory', adminAuth, categoryController.getListCategory);
router.get('/unlistCategory', adminAuth, categoryController.getUnlistCategory);
router.get('/editCategory', adminAuth, categoryController.getEditCategory);
router.post('/editCategory/:id', adminAuth, categoryController.editCategory);
router.delete("/deleteCategory/:id", adminAuth, categoryController.deleteCategory);

router.get('/brands', adminAuth, brandController.getBrandPage);
router.post('/addBrand', adminAuth, uploads.single("image"), brandController.addBrand);
router.get('/blockBrand', adminAuth, brandController.blockBrand);
router.get('/unBlockBrand', adminAuth, brandController.unBlockBrand);
router.get('/deleteBrand', adminAuth, brandController.deleteBrand);

router.get("/addProducts", adminAuth, productController.getProductAddPage);
router.post("/addProducts", adminAuth, uploads.array("images", 3), productController.addProducts);
router.get("/products", adminAuth, productController.getAllProducts);
router.post("/addProductOffer",adminAuth,productController.addProductOffer);
router.post("/removeProductOffer",adminAuth,productController.removeProductOffer);

router.get("/blockProduct", adminAuth, productController.blockProduct);
router.get("/unBlockProduct", adminAuth, productController.unBlockProduct);
router.get("/editProduct", adminAuth, productController.getEditProduct);
router.post("/editProduct/:id", adminAuth, uploads.array("images", 3), productController.editProduct);
router.post("/deleteImage", adminAuth, productController.deleteSingleImage);

router.get("/coupon", adminAuth, couponController.loadCoupon);
router.post("/createCoupon", adminAuth, couponController.createCoupon);
router.get("/editCoupon", adminAuth, couponController.editCoupon);
router.post("/updateCoupon", adminAuth, couponController.updateCoupon);
router.get("/deletecoupon", adminAuth, couponController.deleteCoupon);

router.get('/orders', adminAuth, orderController.getOrders);
router.get('/orders/:id', adminAuth, orderController.getOrderDetails);
router.post('/orders/update-status', adminAuth, orderController.updateOrderStatus);
router.post('/orders/handle-return', adminAuth, orderController.handleReturnRequest);
router.post('/orders/update-return-status', adminAuth, orderController.updateReturnStatus);
router.post('/orders/cancel', adminAuth, orderController.cancelOrder);

router.get('/sales', adminAuth, salesController.loadSalesPage);
router.get('/sales/report', adminAuth, salesController.loadSalesPage);


router.get("/dashboard",adminAuth,async (req,res)=>{
    try {
        res.redirect("/admin")
        
    } catch (error) {
        res.redirect("/admin/pageerror")
        
    }
})


router.use((req, res) => {
    res.status(404).redirect("/admin/pageerror");
});


module.exports = router;