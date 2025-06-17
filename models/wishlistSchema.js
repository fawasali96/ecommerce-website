const mongoose = require("mongoose");
const {Schema} = mongoose;

const wishlistSchema = new Schema({
    userId: {
        type: Schema.Types.objectId,
        ref: "User",
        required: true
    },
    product: [{
        productId: {
            type: Schema.Types.objectId,
            ref: "Product",
            required: true
        },
        addedOn: {
            type: Date,
            default: Date.now
        }
    }]
})



const Wishlist = mongoose.model("Wishlist", wishlistSchema);

module.exports = Wishlist;