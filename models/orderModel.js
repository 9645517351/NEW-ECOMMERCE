


const { ObjectId } = require("mongodb");
const mongoose = require("mongoose");
const moment = require("moment");

// creating order schema
const orderSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  address: {
    city: String,
    zipcode: String,
    streetAddress: String,
  },
  products: [
    {
      productId: { type: mongoose.Schema.Types.ObjectId, ref: "Products" },
      quantity: Number,
      price: Number,
      status: { type: String, default: 'Pending' },
      returnReason: { type: String }, // Added returnReason field
      returnRequest: { type: String, enum: ["Pending", "Accepted", "Rejected"] }, // Added returnRequest field
    },
  ],
  status: { type: String, default: "Pending" },
  payment: String,
  totalPrice: Number,
  couponUsed: String,
  razorpayOrderId: String,
  razorpayPaymentId: String,
  paymentStatus: { type: String, enum: ["Success", "Failed", "Pending","Rejected"], default: "Pending" }, // New field
  date: { type: Date, default: Date.now },
}); 


module.exports = mongoose.model("Orders", orderSchema);