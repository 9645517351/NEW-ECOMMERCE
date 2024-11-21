const User = require("../models/userModel")
const Products = require("../models/productModel")
const bcrypt = require("bcrypt")

const loadLogin = async(req,res)=>{

    try {
        
        res.render('login')

    } catch (error) {
        console.log(error.message);
    }
}

const verifyLogin = async(req,res)=>{

    try {
        
        const email = req.body.email
        const password = req.body.password

        const userData = await user.findOne({email:email})
        if (userData) {

            const passwordMatch = await bcrypt.compare(password, userData.password)

            if (passwordMatch) {

                if (userData.is_admin === 0) {
                    res.render('login',{message:'Email and password is incorrect'})
                }else{
                    req.session.user_id = userData._id 
                    res.redirect('/admin/home')
                }
                
            }
            else{

                res.render('login',{message:'Email and password is incorrect.'})
        
            }
            
        }else{
            res.render('login',{message:'Email and password is incorrect.'})
        }


    } catch (error) {
        console.log(error.message);
    }
}



const loadDashboard = async(req,res)=>{
    
    try {
        
        res.render('dashboard')

    } catch (error) {
        console.log(error.message);
    }
}

const logout = async(req,res)=>{

    try {
        
        req.session.destroy()
        res.redirect('/admin')

    } catch (error) {
        console.log(error.message);
    }
}

const loadUserManagement = async(req,res)=>{

    try {
        const user = await User.find({is_admin:false}) 
        res.render('userManagement',{user})

    } catch (error) {
        console.log(error.message);
    }
}
const userblock = async(req, res) => {
    try {
        const userId = req.params.id;
        const user = await User.findById(userId);

        if (user) {
            user.is_blocked = !user.is_blocked;
            await user.save();
            res.json({ success: true, isBlocked: user.is_blocked });
        } else {
            res.status(404).json({ success: false, message: 'User not found' });
        }
    } catch (error) {
        console.log('Error toggling user block status:', error.message);
        res.status(500).json({ success: false, message: 'An error occurred' });
    }
};

const loadProductManagement= async(req,res)=>{
    try {
        const products = await Products.find({})
        console.log(products,'all products')
        res.render('productManagement',{products})

    } catch (error) {
        console.log(error.message);
    }
}

const notFoundPage = async (req,res)=>{
    console.log("admin side")
    try {
        res.status(404).render("404", {
          message: "Page not found",
          page:"admin"
        });
      } catch (error) {
        console.log(error.message);
        res.status(500).send("An error occurred while handling the 404 page.");
      }
}







module.exports = {
    
    loadLogin,
    verifyLogin,
    loadDashboard,
    logout,
    loadUserManagement,
    userblock,
    loadProductManagement,
    notFoundPage
}


