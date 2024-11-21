const express = require('express')
const admin_route = express()
const nocache = require("nocache")

const couponController = require('../controllers/couponController')
const session = require('express-session')
const config= require('../config/config')
admin_route.use(nocache())

admin_route.use(session({
    secret:'secret-key',
    resave:false,
    saveUninitialized:false
}))


const bodyParser = require('body-parser')
admin_route.use(bodyParser.json())
admin_route.use(bodyParser.urlencoded({extended:true}))

admin_route.set('view engine','ejs')
admin_route.set('views','./views/admin')


const adminController = require('../controllers/adminController')
const productController = require("../controllers/productController")
const categoryController = require('../controllers/categoryController')
const adminAuth = require('../middleware/adminAuth')
 
admin_route.get('/',adminAuth.isLogin,adminController.loadLogin)
admin_route.post('/',adminAuth.isLogin,adminController.verifyLogin)

admin_route.get('/home',adminAuth.isLogin,adminController.loadDashboard)
admin_route.get('/user-management',adminAuth.isLogin,adminController.loadUserManagement)
admin_route.post('/toggle-block/:id',adminAuth.isLogin, adminController.userblock);

admin_route.get('/product-management',adminAuth.isLogin,adminController.loadProductManagement)
admin_route.get('/add-product',adminAuth.isLogin,productController.loadProduct)

const uploadFields = ['images', 'croppedImage'];
admin_route.post(
    "/products/create-new-product",
    adminAuth.isLogin,
    config.upload.fields(uploadFields.map(field => ({ name: field, maxCount: 10 }))),
    productController.createNewProduct
);

admin_route.get('/product-search',productController.searchProduct)
    
admin_route.get('/delete-product',adminAuth.isLogin,productController.deleteProduct)
admin_route.get('/products/create-edit-products',adminAuth.isLogin,productController.loadeditProduct)    
admin_route.post('/products/create-edit-products',
config.upload.array("newImages", 10),adminAuth.isLogin,productController.UpdateCreateEditProduct)    

admin_route.delete('/products/delete-image/:productId/:filename',adminAuth.isLogin, productController.deleteImage);


admin_route.get('/category-management',adminAuth.isLogin,categoryController.loadCategoryManagement)
admin_route.get('/add-New-Category',adminAuth.isLogin,categoryController.loadAddNewCategory)
admin_route.post('/add-New-Category',adminAuth.isLogin,categoryController.addNewCategory)
admin_route.post('/edit-category/:categoryId',adminAuth.isLogin,categoryController.editCategory)
admin_route.delete('/delete-category/:categoryId',adminAuth.isLogin,categoryController.deleteCategory)



admin_route.get('/logout',adminAuth.isLogin,adminController.logout)

admin_route.get('/coupon-management',adminAuth.isLogin,couponController.loadCouponManagement)
admin_route.get('/add-new-coupon',adminAuth.isLogin,couponController.loadAddNewCoupon)
admin_route.post('/add-new-coupon',adminAuth.isLogin,couponController.createCoupon)
admin_route.get('/edit-coupon',adminAuth.isLogin,couponController.loadEditCoupon)
admin_route.post('/edit-coupon',adminAuth.isLogin,couponController.editCoupon)
admin_route.delete('/coupons/delete-coupon/:id',adminAuth.isLogin,couponController.deleteCoupon)


module.exports = admin_route;
