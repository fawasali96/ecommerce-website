const User = require("../../models/userSchema");
const Order = require("../../models/orderSchema");

const loadWallet = async (req, res) => {
    try {
        const userId = req.session.user;
    
        // Fetch user with wallet
        const user = await User.findById(userId, { wallet: 1, name: 1 });

        if (!user) {
            return res.status(404).send('User not found');
        }

        // Fetch refund orders for history
        const refundOrders = await Order.find({
            userId,
            $or: [
                { status: "Cancelled", paymentMethod: "online" },
                { status: "Returned" }
            ]
        }).sort({ updatedOn: -1 }); 

        res.render('wallet', {
            title: "My Wallet",
            user,
            refundOrders
        });

    } catch (error) {
        console.error("Error loading wallet:", error);
        res.status(500).send('Internal Server Error');
    }
};




module.exports = { loadWallet };