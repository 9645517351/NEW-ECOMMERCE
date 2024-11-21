const Product = require("../models/productModel");
const Cart = require("../models/cartModel");
const Address = require("../models/AddressModel");
const Coupon = require("../models/couponModel");
const User = require("../models/userModel");
const Order = require("../models/orderModel");
const crypto = require("crypto");
const Wallet = require("../models/walletModel");
const Category = require("../models/categoryModel");
const Wishlist = require("../models/wishlistModel");
const mongoose = require("mongoose");
const moment = require("moment");
const Razorpay = require("razorpay");

const RazorPayInstance = new Razorpay({
  key_id: process.env.YOUR_ID_KEY,
  key_secret: process.env.YOUR_SECRET_KEY,
});

const loadCheckOut = async (req, res) => {
  try {
    const user_id = req.session.user_id;
    const cart = await Cart.find({ user_id: user_id });
    const productId = cart.map((cart) => cart.product_id);
    const products = await Product.find({ _id: { $in: productId } });
    const cartCount = await Cart.countDocuments({ user_id: user_id });
    const address = await Address.find({ user_id: user_id });
    const coupon = await Coupon.find({});
    const categories = await Category.find({});
    const wishlist = user_id
      ? await Wishlist.find({ user_id: user_id })
      : await Wishlist.find({ user_id: null });

    const wishlistCount = wishlist.length || 0;

    console.log(coupon);
    res.render("checkOut", {
      products,
      cartCount,
      cart,
      address,
      coupon,
      categories,
      wishlistCount,
    });
  } catch (error) {
    console.log(error.message);
  }
};

const CashOnDelivery = async (req, res) => {
  try {
    const user_id = req.session.user_id;
    const formData = req.body.formData;
    const totalPrice = req.body.totalPrice;
    const couponCode = req.body.formData.couponCode;
    const { address, payment } = formData;
    

    // Log totalPrice to ensure it's being passed correctly

    console.log('Total Price:', totalPrice);

    // Restrict COD for orders above ₹1000
    if (totalPrice > 1000) {
      return res.status(400).json({
        success: false,
        message: "Cash On Delivery is only available for orders under 1000 rupees.",
      });
    }

    // Fetch address data
    const addressData = await Address.findById({ _id: address });
    if (!addressData) {
      return res
        .status(404)
        .json({ success: false, message: "Address not found" });
    }

    // Fetch cart items
    const cartItems = await Cart.find({ user_id: user_id });
    if (cartItems.length === 0) {
      return res.status(400).json({ success: false, message: "Cart is empty" });
    }

    console.log(couponCode, "hghghhbkjlbhlgl");

    // Update coupon usage if a coupon code is provided
    if (couponCode) {
      await Coupon.findOneAndUpdate(
        { code: couponCode },
        { $push: { usedCoupon: { user_id: user_id } } },
        { new: true }
      );
    }

    const products = cartItems.map((item) => ({
      productId: item.product_id,
      quantity: item.quantity,
      price: item.totalPrice,
    }));

    // Create a new order
    const order = new Order({
      user: user_id,
      address: {
        city: addressData.city,
        zipcode: addressData.zipcode,
        streetAddress: addressData.streetAddress,
      },
      products: products.map((product) => ({
        productId: product.productId,
        quantity: product.quantity,
        price: product.price,

        status: "Pending",
      })),
      status: "Pending",
      payment: payment,
      totalPrice: totalPrice,
      couponUsed: couponCode,
    });
    console.log(order, "order");

    // Save the order
    await order.save();

    // Update the product quantity and popularity in the database
    for (const product of order.products) {
      const productId = product.productId;
      const orderedQuantity = product.quantity;

      const productData = await Product.findById(productId);
      if (!productData) {
        return res.status(404).json({
          success: false,
          message: `Product with ID ${productId} not found.`,
        });
      }

      const updateQuantity = productData.quantity - orderedQuantity;
      await Product.findByIdAndUpdate(productId, {
        quantity: updateQuantity,
        popularity: productData.popularity + 1,
      });
    }

    // Clear the user's cart
    await Cart.deleteMany({ user_id: user_id });

    // Clear the user's wishlist
    await Wishlist.deleteMany({ user_id: user_id });

    // Respond with success
    res.status(200).json({
      success: true,
      message: "Order placed successfully",
    });
  } catch (error) {
    console.log(error.message);
    res.status(500).json({
      success: false,
      message: "Internal Server Error",
    });
  }
};

const calculateOrderPrice = (products) => {
  return products.reduce((total, product) => {
    return total + product.productId.salePrice * product.quantity;
  }, 0);
};

//-----------order cancel-----------------

const orderCancel = async (req, res) => {
  try {
    const { orderId } = req.params;
    const { productId } = req.body;
    const user_id = req.session.user_id;

    // Find the order
    const order = await Order.findOne({ _id: orderId, user: user_id }).populate(
      "products.productId"
    );

    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }

    // Find the product in the order
    const productIndex = order.products.findIndex(
      (product) => product._id.toString() === productId
    );

    if (productIndex === -1) {
      return res.status(404).json({ message: "Product not found in order" });
    }

    const cancelledProduct = order.products[productIndex];
    order.products[productIndex].status = "Cancelled";

    // Update product quantity in the inventory
    await Product.findOneAndUpdate(
      { _id: cancelledProduct.productId },
      { $inc: { quantity: cancelledProduct.quantity } },
      { new: true }
    );

    let userWallet = await Wallet.findOne({ userId: user_id });

    if (!userWallet) {
      userWallet = await Wallet.create({
        userId: user_id,
        balance: 0, // Set initial balance as needed
        transactions: [],
        date: Date.now(),
      });
    }

    // Calculate the refund amount
    let refundAmount = cancelledProduct.productId.salePrice * cancelledProduct.quantity;

    if (order.products.every((p) => p.status === "Cancelled" || p.status === "Returned")) {
      const couponCode = order.couponUsed;
      if (couponCode) {
        const coupon = await Coupon.findOne({ code: couponCode });
        if (coupon) {
          const discount = coupon.discount;
          refundAmount -= discount;
        }
      }
    }

    console.log(refundAmount, "refundAmount");

    // Update the wallet with the refund amount if payment method is not 'Cash on Delivery'
    if (order.payment !== "Cash on Delivery") {
      await Wallet.findOneAndUpdate(
        { userId: user_id },
        {
          $inc: { balance: refundAmount },
          $push: {
            transactions: {
              amount: refundAmount,
              transactionType: "credit",
              date: Date.now(),
            },
          },
        },
        { new: true }
      );
    }


    // Check if all products are cancelled
    const allProductsCancelled = order.products.every(
      (product) => product.status === "Cancelled"
    );
    if (allProductsCancelled) {
      order.status = "Cancelled";
    }

    // Save the updated order
    await order.save();

    return res
      .status(200)
      .json({ message: "Product cancelled successfully", refundAmount });
  } catch (error) {
    console.log(error.message);
    return res.status(500).json({ message: "Internal Server Error" });
  }
};



const orderSuccessfull = async (req, res) => {
  try {
    const user_id = req.session.user_id;
    const categories = await Category.find({});
    const wishlist = user_id
      ? await Wishlist.find({ user_id: user_id })
      : await Wishlist.find({ user_id: null });

    const wishlistCount = wishlist.length || 0;

    const cartCount = user_id
      ? await Cart.countDocuments({ user_id: user_id })
      : await Cart.countDocuments({ user_id: null });

    res.render("orderCompleted", { categories, wishlistCount, cartCount });
  } catch (error) {
    console.log(error.message);
  }
};



const returnOrderRequest = async (req, res) => {
  try {
    const { orderId } = req.params;
    const { productId, reason } = req.body;
    const user_id = req.session.user_id;

    const order = await Order.findOne({ _id: orderId, user: user_id });

    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }

    const productIndex = order.products.findIndex(
      (product) => product._id.toString() === productId
    );

    if (productIndex === -1) {
      return res.status(404).json({ message: "Product not found in order" });
    }

    // Set return request to pending
    order.products[productIndex].returnRequest = "Pending";
    order.products[productIndex].returnReason = reason;

    await order.save();

    return res
      .status(200)
      .json({ message: "Return request submitted successfully" });
  } catch (error) {
    console.log(error.message);
    return res.status(500).json({ message: "Internal Server Error" });
  }
};

//------------------------load Admin Order Management----------------------//

const loadAdminOrderManagement = async (req, res) => {
  try {
    
    const { page = 0 } = req.query;
    const limit = 5;

    const currentPage = parseInt(page);
    const nextPage = currentPage + 1;

    const totalOrders = await Order.countDocuments({});
    const totalPages = Math.ceil(totalOrders / limit);

    const order = await Order.find({})
      .populate("user")
      .sort({ date: -1 })
      .skip(currentPage * limit)
      .limit(limit);
     
      
  

    res.render("orderManagement", {
      order,
      currentPage,
      totalPages,
      nextPage,
      totalOrders,
      moment,
    });
  } catch (error) {
    console.log(error.message);
    res.status(500).send("Internal Server Error");
  }
};


const loadAdnimOrderveiw = async (req, res) => {
  try {
    const orderId = req.params.orderId;

    const orderData = await Order.findById(orderId)
      .populate("user")
      .populate("products.productId");

    // Calculating the subtotal
    const subTotal = orderData.products.reduce(
      (acc, product) => acc + product.productId.salePrice * product.quantity,
      0
    );

    const canceledProductPrice = orderData.products.reduce((acc, product) => {
      if (product.status === "Cancelled") {
        return acc + product.productId.salePrice * product.quantity;
      }
      return acc;
    }, 0);

    const returnedProductPrice = orderData.products.reduce((acc, product) => {
      if (product.status === "Returned") {
        return acc + product.productId.salePrice * product.quantity;
      }
      return acc;
    }, 0);

    // Calculating discound amount
    let discountAmount = subTotal - parseInt(orderData.totalPrice);

    
    // Calculating grand total
    
    let grandTotal =
      subTotal - discountAmount 
   

    const returnReasons = orderData.products
      .filter((product) => product.status === "Returned")
      .map((product) => ({
        productId: product.productId._id,
        returnReason: product.returnReason,
      }));
    console.log(returnReasons);

    res.render("adminOrderView", {
      order: orderData,
      canceledProductPrice,
      returnedProductPrice,
      discountAmount,
      grandTotal,
      subTotal,
      returnReasons,
    });
  } catch (error) {
    console.log(error.message);
  }
};

const adminUpdateProductStatus = async (req, res) => {
  try {
    const { productId, orderId } = req.params;
    const { newStatus } = req.body;

    const orderData = await Order.findOne({ _id: orderId }).populate(
      "products.productId"
    );

    if (!orderData) {
      return res.status(404).json({ message: "Order Not Found!" });
    }

    const productObjectId = new mongoose.Types.ObjectId(productId);
    const product = orderData.products.find((p) =>
      p.productId._id.equals(productObjectId)
    );

    if (!product) {
      return res.status(404).json({ message: "Product Not Found!" });
    }

    product.status = newStatus;

    // Update overall order status if all products have the same status
    if (orderData.products.every((p) => p.status === newStatus)) {
      orderData.status = newStatus;
    }

    await orderData.save();
    return res.redirect(`/admin/view-orderDetails/${orderId}`);
  } catch (error) {
    console.error("Error updating product status:", error);
    return res.status(500).json({ message: "Internal Server Error" });
  }
};

const razorPayPayment = async (req, res) => {
  try {
    const { formData, totalPrice, address } = req.body;
    const user_id = req.session.user_id;

    const options = {
      amount: totalPrice * 100,
      currency: "INR",
      receipt: "order_receipt",
    };

    RazorPayInstance.orders.create(options, (err, order) => {
      if (!err) {
        res.status(200).send({
          success: true,
          message: "Order Created",
          order_id: order.id,
          amount: totalPrice * 100,
          key_id: process.env.YOUR_ID_KEY,
          productName: req.body.name,
          contact: "9645517351",
          name: "Shijildas.k",
          email: "shijil369@gmail.com",
          formData,
        });
      } else {
        res.status(500).json({ success: false, message: "Payment initialization failed." });
      }
    });
  } catch (error) {
    console.log(error.message);
    res.status(500).json({ success: false, message: "Internal Server Error" });
  }
};





const razorpayCompleteOrder = async (req, res) => {
  try {
    const user_id = req.session.user_id;
    const { formData, totalPrice, paymentMethod, paymentDetails, isSuccess, orderId } = req.body;
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = paymentDetails;
    const { address, couponCode } = formData;

    // Verify payment success
    let paymentVerified = false;
    if (isSuccess && razorpay_payment_id && razorpay_signature) {
      const generatedSignature = crypto
        .createHmac("sha256", process.env.YOUR_SECRET_KEY)
        .update(razorpay_order_id + "|" + razorpay_payment_id)
        .digest("hex");
      paymentVerified = generatedSignature === razorpay_signature;
    }

    let order;
    
    // Handle repayment for existing failed order
    if (orderId) {
      order = await Order.findById(orderId);
      if (!order) {
        console.error("Failed order not found:", orderId);
        return res.status(404).json({ success: false, message: "Order not found." });
      }

      if (order.status === "Failed") {
        if (paymentVerified) {
          // Update existing failed order to pending
          order.status = "Pending";
          order.paymentStatus = "Success";
          order.razorpayPaymentId = razorpay_payment_id;
          order.razorpayOrderId = razorpay_order_id;
          order.products.forEach(product => {
            product.status = "Pending";
          });
          
          await order.save();
          console.log("Failed order updated to pending:", order._id);

          // Process inventory for repaid order
          for (const product of order.products) {
            const productData = await Product.findById(product.productId);
            if (productData) {
              await Product.findByIdAndUpdate(product.productId, {
                quantity: productData.quantity - product.quantity,
                popularity: productData.popularity + 1,
              });
            }
          }
          // Clear cart after repayment
          await Cart.deleteMany({ user_id })

          return res.status(200).json({ 
            success: true, 
            message: "Payment successful, order updated.",
            orderId: order._id 
          });
        }
      }
    } 
    
    // Handle new order creation
    const cartItems = await Cart.find({ user_id });
    if (!cartItems || cartItems.length === 0) {
      return res.status(400).json({ success: false, message: "Cart is empty" });
    }

    const addressData = await Address.findById(address);
    if (!addressData) {
      return res.status(400).json({ success: false, message: "Address not found" });
    }

    // Create new order
    const products = cartItems.map((item) => ({
      productId: item.product_id,
      quantity: item.quantity,
      price: item.totalPrice,
      status: paymentVerified ? "Pending" : "Failed"
    }));

    order = new Order({
      user: user_id,
      address: {
        city: addressData.city,
        zipcode: addressData.zipcode,
        streetAddress: addressData.streetAddress,
      },
      products: products,
      status: paymentVerified ? "Pending" : "Failed",
      payment: paymentMethod,
      totalPrice: totalPrice,
      couponUsed: couponCode,
      razorpayOrderId: razorpay_order_id,
      razorpayPaymentId: razorpay_payment_id,
      paymentStatus: paymentVerified ? "Success" : "Failed",
      date: new Date()
    });

    // Save the order regardless of payment status
    await order.save();
    console.log(`New order created with status: ${order.status}, ID: ${order._id}`);

    // Process successful payment
    if (paymentVerified) {
      // Update product inventory
      for (const product of order.products) {
        const productData = await Product.findById(product.productId);
        if (productData) {
          await Product.findByIdAndUpdate(product.productId, {
            quantity: productData.quantity - product.quantity,
            popularity: productData.popularity + 1,
          });
        }
      }

      // Clear cart
      await Cart.deleteMany({ user_id });

      // Handle coupon
      if (couponCode) {
        await Coupon.findOneAndUpdate(
          { code: couponCode },
          { $push: { usedCoupon: { user_id } } },
          { new: true }
        );
      }

      return res.status(200).json({ 
        success: true, 
        message: "Order placed successfully",
        orderId: order._id 
      });
    }

    // Return appropriate response for failed payment
    return res.status(200).json({ 
      success: false, 
      message: "Payment failed",
      orderId: order._id,
      paymentStatus: "Failed"
    });

  } catch (error) {
    console.error("Order processing error:", error);
    res.status(500).json({ 
      success: false, 
      message: "Server error during order processing",
      error: error.message 
    });
  }
};




const WalletPlaceOrder = async (req, res) => {
  try {
    const user_id = req.session.user_id;
    const formData = req.body.formData;
    const totalPrice = req.body.totalPrice; // This should be the final total price after all calculations
    const couponCode = req.body.formData.couponCode;
    const { address } = formData;
    const payment = req.body.paymentMethod;

    // Fetch address data
    const addressData = await Address.findById(address);
    if (!addressData) {
      return res.status(400).json({ success: false, message: "Address not found" });
    }

    // Fetch cart items
    const cartItems = await Cart.find({ user_id: user_id });
    const products = cartItems.map((item) => ({
      productId: item.product_id,
      quantity: item.quantity,
      price: item.totalPrice / item.quantity, // Ensure price is per item
    }));

    // Calculate initial order total
    let orderTotal = products.reduce((acc, item) => acc + item.price * item.quantity, 0);

    // Apply coupon discount if applicable
    if (couponCode) {
      const couponData = await Coupon.findOne({ code: couponCode });
      if (couponData) {
        orderTotal -= couponData.discount;
      }
    }

    // Fetch wallet data
    let walletData = await Wallet.findOne({ userId: user_id });
    if (!walletData) {
      walletData = await Wallet.create({
        userId: user_id,
        balance: 0,
        transactions: [],
        date: Date.now(),
      });
    }

    // Check wallet balance
    if (walletData.balance < orderTotal) {
      return res.status(400).json({ success: false, message: "Insufficient Balance...!" });
    }

    // Create new order
    const order = new Order({
      user: user_id,
      address: {
        city: addressData.city,
        zipcode: addressData.zipcode,
        streetAddress: addressData.streetAddress,
      },
      products: products.map((product) => ({
        productId: product.productId,
        quantity: product.quantity,
        price: product.price,
        status: "Pending",
      })),
      status: "Pending",
      payment: payment,
      totalPrice: orderTotal, // This should be the total after applying any discounts
      couponUsed: couponCode,
    });

    await order.save();

    // Update wallet balance and add transaction record
    walletData.balance -= orderTotal;
    walletData.transactions.push({
      amount: orderTotal,
      transactionType: "debit",
      date: Date.now(),
    });
    await walletData.save();

    // Update product quantities
    for (const product of order.products) {
      const productId = product.productId;
      const orderedQuantity = product.quantity;

      const productData = await Product.findById(productId);
      if (!productData) {
        return res.status(404).json({
          success: false,
          message: `Product with ID ${productId} not found.`,
        });
      }

      productData.quantity -= orderedQuantity;
      productData.popularity += 1;
      await productData.save();
    }

    // Clear the cart and update coupon usage if applicable
    await Cart.deleteMany({ user_id: user_id });
    if (couponCode) {
      await Coupon.findOneAndUpdate(
        { code: couponCode },
        { $push: { usedCoupon: { user_id: user_id } } },
        { new: true }
      );
    }

    await Wishlist.deleteMany({ user_id: user_id });

    res.status(200).json({ success: true });
  } catch (error) {
    console.log(error.message);
    res.status(500).json({ success: false, message: "Internal Server Error" });
  }
};


// Function for handle the product return
const handleReturnRequest = async (req, res) => {
  try {
    const { orderId, productId } = req.params;
    const { returnAction } = req.body;

    const order = await Order.findById(orderId).populate("products.productId");
    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }

    const product = order.products.find(
      (p) => p.productId._id.toString() === productId
    );
    if (!product) {
      return res
        .status(404)
        .json({ message: "Product not found in the order" });
    }

    if (returnAction === "Reject") {
      // If request is rejected, change the product return request to Rejected
      product.returnRequest = "Rejected";
    } else if (returnAction === "Accept") {
      // Change the product status to Returned
      product.status = "Returned";
      product.returnRequest = "Accepted";

      // Calculate the product sales price
      let refundAmount = product.productId.salePrice * product.quantity;

      // Check if there are no other products in the order that are pending or completed
      if (order.products.every((p) => p.status === "Returned" || p.status === "Cancelled")) {
        const couponCode = order.couponUsed;
        if (couponCode) {
          const coupon = await Coupon.findOne({ code: couponCode });
          if (coupon) {
            const discount = coupon.discount;
            refundAmount -= discount;
          }
        }
      }

      // Add the refund amount to the user's wallet
      const userWallet = await Wallet.findOne({ userId: order.user });

      if (!userWallet) {
        return res.status(404).json({ message: "User wallet not found" });
      }

      userWallet.balance += refundAmount;
      userWallet.transactions.push({
        amount: refundAmount,
        transactionType: "credit",
        date: Date.now(),
      });

      await userWallet.save();
    } else {
      return res.status(400).json({ message: "Invalid return action" });
    }

    // If the status of all products is the same, then change the order status
    if (order.products.every((p) => p.status === "Returned")) {
      order.status = "Returned";
    }

    // Save the updated order
    await order.save();

    // Redirect to the order details page
    res.redirect(`/admin/view-orderDetails/${orderId}`);
  } catch (error) {
    console.error("Error handling return request:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
};


const getInvoice = async(req,res)=>{
  try {
    const orderId = req.query.id
    const user_id = req.session.user_id


    const userData = await User.findById(user_id)

    const order = await Order.findOne({ _id : orderId , user : user_id })
    .populate('address').populate({
        path: 'products.productId',
    });

    const categories = await Category.find({});

    const wishlist = await Wishlist.findOne({ user: user_id });
    const wishlistCount = wishlist ? wishlist.items.length : 0;

    const cart = await Cart.findOne({ user: user_id });
    const cartCount = cart ? cart.items.length : 0;


    //calculating subtotal
    const subTotal = order.products.reduce(
      
      (acc, product) => acc + product.productId.salePrice * product.quantity,
      0
    );

    // Calculating discound amount

    let discountAmount = subTotal - parseInt(order.totalPrice);
 
    //calculating total
    const grandTotal = subTotal - discountAmount;
    
    res.render("invoicePage",{
      order,
      user : userData,
      categories,
      wishlistCount,
      cartCount,  
      subTotal,
      discountAmount,
      grandTotal
    })
    
  } catch (error) {
    console.log(error.message);
  }
}



module.exports = {
  loadCheckOut,
  CashOnDelivery,
  orderSuccessfull,
  orderCancel,
  loadAdminOrderManagement,
  loadAdnimOrderveiw,
  adminUpdateProductStatus,
  razorPayPayment,
  razorpayCompleteOrder,
  WalletPlaceOrder,
  returnOrderRequest,
  handleReturnRequest,
  getInvoice
};
