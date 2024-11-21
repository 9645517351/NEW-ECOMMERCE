

const { TopologyDescription } = require('mongodb');
const Coupon = require('../models/couponModel')


const loadCouponManagement = async(req,res)=>{

    try {
        
      const { page = 0 } = req.query;
      const limit = 5; // Set the number of users to display per page
  
      const currentPage = parseInt(page);
      const nextPage = currentPage + 1;

      const totalCoupons = await Coupon.countDocuments({});
      const totalPages = Math.ceil(totalCoupons / limit);

        const coupon = await Coupon.find ({})
        .skip(currentPage * limit)
        .limit(limit);
        
        res.render('couponManagement',{coupon,
            currentPage,
            nextPage, 
            totalPages, 
            totalCoupons})

    } catch (error) {
        console.log(error.message);
    }
}


const loadAddNewCoupon = async(req,res)=>{

    try {
        
        res.render('add-new-coupon')
    } catch (error) {
        console.log(error.message);
    }
}

const createCoupon = async (req, res) => {
    try {
        const { name, couponCode, discount, minimumAmount, maximumAmount, expiryDate } = req.body;

        // Validate input
        if (!name || !couponCode || !discount || !minimumAmount || !maximumAmount || !expiryDate) {
            return res.status(400).render("add-new-coupon", {
                message: "All fields are required."
            });
        }

        // Check if coupon code already exists
        const couponData = await Coupon.find({ code: couponCode });
        if (couponData.length > 0) {
            return res.render('add-new-coupon', {
                message: 'Coupon code already exists'
            });
        }

        // Create new coupon
        const newCoupon = new Coupon({
            name,
            code: couponCode,
            discount: parseFloat(discount),
            minimumAmount: parseFloat(minimumAmount),
            maximumAmount: parseFloat(maximumAmount),
            expiryDate
        });

        const newcreatedCoupon = await newCoupon.save();
        if (newcreatedCoupon) {
            console.log('Added new coupon');
            return res.status(200).redirect("/admin/add-new-coupon");
        } else {
            return res.status(500).render('add-new-coupon', {
                message: 'Failed to add coupon'
            });
        }
    } catch (error) {
        console.log(error.message);
        return res.status(500).render('add-new-coupon', {
            message: error.message
        });
    }
};



const CheckCoupon = async (req, res) => {
    try {
        const { couponCode, totalsubTotal } = req.body;
        const numericSubtotal = parseFloat(totalsubTotal.replace(/[^\d.-]/g, ""));
        const user_id = req.session.user_id;

        req.session.couponCode = couponCode;

        const validCoupon = await Coupon.findOne({ code: couponCode });

        if (validCoupon) {
            // Ensure minimumAmount is respected
            const meetsMinimum = numericSubtotal >= validCoupon.minimumAmount;
            // Ensure maximumAmount, if defined, is respected
            const meetsMaximum = validCoupon.maximumAmount === undefined || numericSubtotal <= validCoupon.maximumAmount;

            if (meetsMinimum && meetsMaximum) {
                const usedUserCoupon = Array.isArray(validCoupon.usedCoupon) && validCoupon.usedCoupon.some((usedCoupon) =>
                    usedCoupon.user_id.equals(user_id)
                );

                if (usedUserCoupon) {
                    return res.status(400).json({
                        success: false,
                        message: "Sorry, this coupon has already been used."
                    });
                } else {
                    const discountAmount = validCoupon.discount;

                    return res.status(200).json({
                        success: true,
                        message: "Valid Coupon",
                        discountAmount
                    });
                }
            } else {
                // Generate a user-friendly message for invalid amounts
                let message = `Amount must be at least ₹${validCoupon.minimumAmount}`;
                if (validCoupon.maximumAmount !== undefined) {
                    message += ` and not more than ₹${validCoupon.maximumAmount}`;
                }
                return res.status(400).json({ success: false, message });
            }
        } else {
            return res.status(400).json({ success: false, message: "Invalid Coupon" });
        }
    } catch (error) {
        console.log(error.message);
        return res.status(500).json({ success: false, message: "Server error" });
    }
};






const removeCoupon = async (req,res)=>{

    try {
        const { couponCode } = req.body;
        const user_id = req.session.user_id;

        // Find the coupon and check if it has been used by the user
        const couponData = await Coupon.findOne({ code: couponCode });

        if(couponData){
            return res.status(200).json({success:true})
        }
    } catch (error) {
        console.log(error.message);
        res.status(500).json({ success: false, message: "Server error" });
    }
}




const loadEditCoupon = async(req,res)=>{

    try {

        const { id } = req.query
        
        const couponData = await Coupon.findById(id)

        if (!couponData) {
            res.status(404).json({ message : "Coupon Not Found...!" })
        }else{
            res.render("edit-coupon",{
                coupon : couponData
            })
        }
        
    } catch (error) {
        console.log(error.message);
    }
}



const deleteCoupon = async(req,res)=>{
    try {
      
        const { id } = req.params
        console.log('incoming');
       

        const deleteCoupon = await Coupon.findByIdAndDelete(id)

        if (deleteCoupon) {
            res.status(200).json({ success : true , message : "Coupon Deleted Successfully..." })
        }else{
            res.status(400).json({ success : false , message : " Coupon Cancellation Failed... " })
        }
        
    } catch (error) {
        console.log(error.message);
    }
}


const editCoupon = async (req, res) => {
    try {
        const { id } = req.query;
        const { name, couponCode, discount, minimumAmount, maximumAmount, expiryDate } = req.body;

        console.log(req.body);

        // Ensure discount is a valid number
        if (isNaN(discount) || discount <= 0) {
            res.status(400).send("Invalid discount amount");
            return;
        }

        // Update the coupon
        const updatedCoupon = await Coupon.findByIdAndUpdate(
            id,
            {
                name,
                code: couponCode,
                discount,
                minimumAmount,
                maximumAmount,
                expiryDate,
            },
            { new: true }
        );

        if (updatedCoupon) {
            res.redirect("/admin/coupon-management");
        } else {
            // Handle the case where the coupon wasn't found or the update failed
            res.status(404).send("Coupon not found or update failed");
        }
    } catch (error) {
        console.log(error.message);
        // Handle other errors
        res.status(500).send("Internal Server Error");
    }
};


module.exports ={
    loadCouponManagement ,
    loadAddNewCoupon,
    createCoupon,
    CheckCoupon,
    deleteCoupon,
    loadEditCoupon,
    editCoupon,
    removeCoupon

}