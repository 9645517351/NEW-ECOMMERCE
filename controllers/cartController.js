

const Cart = require('../models/cartModel')
const Product = require("../models/productModel")
const Category = require('../models/categoryModel')
const Wishlist = require("../models/wishlistModel");



const MAX_QUANTITY_PER_PERSON = 10;


const loadCart = async (req, res) => {
    try {
        const user_id = req.session.user_id;
        const loggedIn = req.session.isAuth ? true : false;
        const categories = await Category.find({})

        const cartCount = user_id 
            ? await Cart.countDocuments({ user_id })
            : await Cart.countDocuments({ user_id: null });

        const cart = user_id
            ? await Cart.find({ user_id: user_id })
            : await Cart.find({ user_id: null });

        const productIds = cart.map((cart) => cart.product_id);
        const products = await Product.find({ _id: { $in: productIds } });


        const wishlist = user_id
        ? await Wishlist.find({ user_id: user_id })
        : await Wishlist.find({ user_id: null });
  
      // Send wishlist count as well
      const wishlistCount = wishlist.length || 0;

      

        res.render("Add-to-cart", {
            loggedIn,
            cartCount,
            cart,
            products,
            categories,
            wishlistCount
        });

    } catch (error) {
        console.log(error.message);
        res.status(500).json({ success: false, message: "Internal Server Error" });
    }
};

const AddProductToCart = async (req, res) => {
    try {
        const quantity = req.body.quantity;
        const user_id = req.session.user_id;
        const product_id = req.body.productId;

        const productData = await Product.findById({ _id: product_id });

        if (!productData) {
            return res.json({ success: false, message: "Product Not Found" });
        }

        const productPrice = productData.salePrice;
        const category_id = productData.category;

        const cartData = user_id
            ? await Cart.findOne({ user_id: user_id, product_id: product_id })
            : await Cart.findOne({ user_id: null, product_id: product_id });

        const totalcartQuantity = cartData ? cartData.quantity : 0;
        const totalQuantity = Number(totalcartQuantity) + Number(quantity);

        if (totalQuantity > productData.quantity) {
            return res.json({ success: false, message: "Out Of Stock..." });
        }

        if (cartData) {
            await Cart.findOneAndUpdate(
                { user_id: user_id, product_id: product_id },
                { $inc: { quantity: quantity } },
                { new: true }
            );
        } else {
            const cart = new Cart({
                product_id,
                quantity,
                productPrice,
                user_id,
                category_id,
            });
            await cart.save();
        }

        res.json({ success: true, message: "Product Added Successfully" });
        
    } catch (error) {
        console.log(error.message);
        res.status(500).json({ success: false, message: "Internal Server Error" });
    }
};

const deleteCart = async (req, res) => {
    try {
        const user_id = req.session.user_id;
        const product_id = req.query.id;

        const cartDelete = await Cart.deleteOne({
            product_id: product_id,
            user_id: user_id
        });

        if (cartDelete.deletedCount > 0) {
            const cartData = await Cart.find({ user_id: user_id });
            const cartCount = cartData.length;

            const totalSubTotal = cartData.reduce((acc, cartElement) => {
                return acc + cartElement.totalPrice;
            }, 0);

            return res.json({
                success: true,
                message: "Product has been deleted successfully.",
                totalSubTotal,
                cartCount
            });
        } else {
            return res.json({
                success: false,
                message: "Product not found in the cart."
            });
        }
    } catch (error) {
        console.error("Error deleting cart item:", error.message);
        return res.status(500).json({
            success: false,
            message: "An error occurred while deleting the product from the cart."
        });
    }
};



const AddOneItemToCart = async(req,res)=>{
    try {
        const user_id = req.session.user_id
        const quantity = 1
        const product_id = req.query.id
        const productData = await Product.findById({ _id : product_id })
        
        const productPrice = productData.salePrice
        const category_id = productData.category
       
        const cartData = await Cart.findOne({
            user_id : user_id,
            product_id : product_id
        })
        
        if(cartData){
            await Cart.findOneAndUpdate(
            { user_id : user_id , product_id : product_id },
            { $inc :{ quantity : quantity }  },
            { new : true }
            )
        }else{
            
            const cart = new Cart({
                product_id,
                quantity,
                productPrice,
                user_id,
                category_id
            })
           const updatedCart = await cart.save()
            
           const cartCount = user_id
           ? await Cart.countDocuments({ user_id : user_id })
           : await Cart.countDocuments({ user_id : null })
           if(updatedCart){
            res.json({
                success : true,
                count : cartCount
             })
            } else {
             res.json({
             success: false,
            message: "Error adding item to cart"
            });
            }
        }      
    } catch (error) {
        console.log(error.message);
    }
}

const incrememtingCount = async(req,res)=>{
    try {

        const product_id = req.query.id
        const user_id = req.session.user_id
        const quantity = 1;

        const cart = await Cart.findOne({
            user_id : user_id,
            product_id : product_id
        })
        const productData = await Product.findById({ _id : product_id })
      
        if (productData.quantity <= cart.quantity) {
            res.json({ success : false , message:"Out of Stock..." })
        }else{
            if (cart) {
                cart.quantity += quantity;
                cart.totalPrice  = cart.productPrice * cart.quantity
                await cart.save()
            }
            if (cart) {
                const cartData = await Cart.find({ user_id : user_id})
                const totalSubTotal = cartData.reduce((acc , cartElement)=>{
                    return (acc += cartElement.totalPrice)
                },0)
                res.json({
                    success : true,
                    totalSubTotal,
                    quantity: cart.quantity
                })
               
            }else{
                res.josn({ success : false , message:"Product Not found In the Cart" })
            }
        }
    } catch (error) {
        console.log(error.message);
    }
}


const decrementingCount = async(req,res)=>{
    try {

        const product_id = req.query.id
        const user_id = req.session.user_id
        const quantity = 1;

        const cart = await Cart.findOne({
            user_id : user_id,
            product_id : product_id
        })
       
        if(!cart){
            res.json({ success : false , message:"Product Not Found in the Cart..."})
        }
        if (cart) {
            if (cart.quantity - quantity < 1) {
                return res.json({
                    success: false,
                    message: "Quantity cannot be Negative",
                    quantity: cart.quantity
                });
            }
            cart.quantity -= quantity;
            cart.totalPrice  = cart.productPrice * cart.quantity
                
            await cart.save()
        }
         
        const cartData = await Cart.find({ user_id : user_id})
        const totalSubTotal = cartData.reduce((acc , cartElement)=>{
        return (acc += cartElement.totalPrice)
            },0)
            res.json({
            success : true,
            totalSubTotal,
            quantity: cart.quantity
            })
           
    } catch (error) {
        console.log(error.message);

        if (error.message.includes("Quantity cannot be Negetive")) {
            res.json({ success : false , message:"Quantity cannot be Negetive" })
        } else {
            res.json({ success : false , message:"Internal Server Error..."})
        }
    }
}

module.exports = {
    loadCart,
    AddProductToCart,
    AddOneItemToCart,
    deleteCart,
    incrememtingCount,
    decrementingCount

};


