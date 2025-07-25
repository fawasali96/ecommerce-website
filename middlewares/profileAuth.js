const User = require("../models/userSchema")

const blockLoggedInUsers = (req, res, next) => {
    
    if (req.session.user) { 
        return res.redirect("/"); 
    }
    next();  
};

const checkBlockedUser = async (req, res, next) => {
    try {
        
        if (req.session.user) {
            const user = await User.findById(req.session.user);

            
            if (user && user.isBlocked) {
                delete req.session.user;
                return res.redirect('/login'); 
            }
        }

        
        next();
    } catch (error) {
        console.error("Error checking blocked user:", error);
        res.status(500).send('Server Error');
    }
};








module.exports = {
    blockLoggedInUsers,
    checkBlockedUser,
    
}