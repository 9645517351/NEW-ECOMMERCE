

const Address = require("../models/AddressModel")
const User = require("../models/userModel")
const Wishlist = require("../models/wishlistModel")
const Category = require("../models/categoryModel")
const Cart = require("../models/cartModel")




const loadAddress = async(req,res)=>{
    try {
        console.log(req.session);
        const user_id = req.session.user_id
        const loggedIn = req.session.isAuth ? true : false;
        
        const categories = await Category.find({})

        const wishlist = user_id
        ? await Wishlist.find({ user_id: user_id })
        : await Wishlist.find({ user_id: null });

        const wishlistCount = wishlist.length || 0;

        const cartCount = user_id
      ? await Cart.countDocuments({ user_id : user_id})
      : await Cart.countDocuments({ user_id : null })

        res.render("add-Address",{
            loggedIn,
            categories,
            wishlistCount,
            cartCount
        })
        
    } catch (error) {
        console.log(error.message);
    }
}

const createAdress = async(req,res)=>{
    try {
        const{
            firstName,
            lastName,
            city,
            streetAddress,
            state,
            zipcode,
            phone,
            email

        }= req.body

        const user_id = req.session.user_id

        const address = new Address({
            firstName,
            lastName,
            city,
            streetAddress,
            state,
            zipcode,
            phone,
            email,
            user_id
        });
        
        if(address){

            await address.save()
            
            res.redirect('/userProfile')
        }
        

    } catch (error) {
       console.log(error.message); 
    }
}
const loadEditAddress = async(req,res)=>{
    try {
        const address_id = req.query.id
        const user_id = req.session.user_id
        const loggedIn = req.session.isAuth ? true : false

        const cartCount = user_id
        ? await Cart.countDocuments({ user_id : user_id})
        : await Cart.countDocuments({ user_id : null })

        const categories = await Category.find({})

        const wishlist = user_id

            ? await Wishlist.find({ user_id: user_id })
            : await Wishlist.find({ user_id: null });
  
      // Send wishlist count as well
        const wishlistCount = wishlist.length || 0;


        const address = await Address.findById(address_id);
        console.log(address)

        res.render("edit-Address",{
            loggedIn,
            cartCount,
            address,
            categories,
            wishlistCount
        })
    } catch (error) {
        console.log(error.message);
    }
}
const createEditAddress = async(req,res)=>{
    try {
        const { id } = req.query
        const {
            firstName,
            lastName,
            city,
            streetAddress,
            state,
            zipcode,
            phone,
            email,
        } = req.body

        const user_id = req.session.user_id

        const editedAddress = await Address.findByIdAndUpdate(
            id, 
            {
            firstName,
            lastName,
            city,
            streetAddress,
            state,
            zipcode,
            phone,
            email,
            user_id
            },
            { new : true }
        )
        if(editedAddress){
            res.redirect("/check-out")
        }
        
    } catch (error) {
        console.log(error.message);
    }
}


const userProfileAddressDelete = async (req, res) => {
    try {
        console.log('hi');
        const { id } = req.query;

        const addressDeleted = await Address.deleteOne({ _id: id });
        if(addressDeleted){
            res.json({
                success : true
            })
        }
    }catch (error) {
        console.error('Error deleting address:', error.message);
        res.status(500).json({ success: false, error: 'Internal Server Error' });
    }
};



module.exports = {

    loadAddress,
    createAdress,
    loadEditAddress,
    createEditAddress,
    userProfileAddressDelete
}