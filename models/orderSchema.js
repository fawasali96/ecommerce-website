const mongoose = require("mongoose");
const {Schema} = mongoose;
const {v4:uuidv4} = require("uuid");

const orderSchema = new Schema({
    orderId: {
        type: String,
        default: () => Math.floor(1000000000 + Math.random() * 9000000000).toString(), 
        unique: true
    },
    userId: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    orderedItems: [{
        product: {
        type: Schema.Types.ObjectId,
        ref: "Product",
        required: true
    },
    productName: {
        type: String },
    productImages: [{
        type: String }],
    quantity: {
        type: Number,
        required: true
        },
    price: {
        type: Number,
        default: 0
        },
    regularPrice: {
        type: Number,
        default: 0
        }
    }],
    totalPrice: {
        type: Number,
        required: true
    },
    discount: {
        type: Number,
        default: 0
    },
    deliveryCharge: {
        type: Number,
        default: 50
    },
    finalAmount: {
       type: Number,
       required: true 
    },
    address: {
        type: Schema.Types.Mixed, 
        // ref: "User",
        required: true
    },
    paymentMethod: {
        type: String,
        enum: ['cod', 'online', 'wallet'],
        required: true
    },
    invoiceDate: {
        type: Date
    },
    status: {
        type: String,
        required: true,
        enum: ["Pending", "Confirmed", "Shipped", "Delivered", "Cancelled", "Return Requested", "Returning", "Returned"]
    },
    cancelReason: {
        type: String
    },
    returnReason: {
        type: String
    },
    returnDescription: {
        type: String
    },
     requestStatus: {
        type: String,
        enum: ['pending', 'approved', 'rejected'],
        default: 'pending'
    },
    rejectionCategory: {
        type: String
    },
    rejectionReason: {
        type: String
    },
    createdOn: {
        type: Date,
        required: true,
        default: Date.now
    },
    updatedOn: {
        type: Date,
    },
    deliveredOn: {
        type: Date
    },
    couponApplied: {
        type: Boolean,
        default: false    }
})


const Order = mongoose.model("Order", orderSchema);

module.exports = Order;