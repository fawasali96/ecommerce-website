
const User = require('../../models/userSchema');
const Product = require('../../models/productSchema');
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');


const pageError = async (req, res) => {
    res.render('admin-error')
}


const loadLogin = (req, res) => {
    if(req.session.admin){
        
        return res.redirect('/admin')
        
    } else {
       res.render("admin-login", {message: null})
    }
    
}

const login = async (req, res) => {
    try {
        const { email, password } = req.body;
        const admin = await User.findOne({ isAdmin: true, email});

        if (admin) {
            const passwordMatch = await bcrypt.compare(password, admin.password);
            if (passwordMatch) {
                
                req.session.admin = admin._id;
                return res.redirect('/admin');
                
            } else {
                return res.redirect('/admin/login');
            }
        } else {
            return res.redirect('/admin/login');
        }
    } catch (error) {
        console.log("Login Error", error);
        return res.redirect('/pageerror');
    }
};

const loadDashboard = async (req, res) => {
    if(req.session.admin) {
        try {
            
            res.render("dashboard")

        } catch (error) {
            res.redirect("/pageerror");
        }
    }
}


const logout = async (req, res) => {

    try {

       req.session.destroy((err) => {
        if(err) {
            console.log("Error destroying session");
            return res.redirect("/pageerror")
        }
        res.redirect("/admin/login");
       })
        
    } catch (error) {

        console.log("Error during logout");
        res.redirect("/pageerror");
        
    }
}


module.exports = {
    loadLogin,
    login,
    loadDashboard,
    pageError,
    logout
}

