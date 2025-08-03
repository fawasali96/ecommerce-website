const mongoose = require("mongoose");
const {Schema} = mongoose;

const couponSchema = new Schema({
    name: {
        type: String,
        required: true,
        unique: true
    },
    isReferral: {
        type: Boolean,
        default: false 
    },
    createdOn: {
        type: Date,
        default: Date.now,
        required: true
    },
    expireOn: {
        type: Date,
        required: true
    },
    reason: {
        type: String,
        default: null
    },
    offerPrice: {
      type: Number,
      required: true  
    },
    minimumPrice: {
      type: Number,
      required: true
    },
    isList:{
        type: Boolean,
        default: true
    },
    isUsed: {
        type: Boolean,
        default: false
    },
    userId:[{
        type: mongoose.Schema.Types.ObjectId,
        ref:'User',
    }]
    
},)

const Coupon = mongoose.model("Coupon", couponSchema);

module.exports = Coupon;