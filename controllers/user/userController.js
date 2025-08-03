
const User = require('../../models/userSchema');
const Category = require("../../models/categorySchema");
const Product = require("../../models/productSchema");
const Brand = require("../../models/brandSchema");
const Coupon = require("../../models/couponSchema");
const env = require('dotenv').config();
const nodemailer = require('nodemailer');
const bcrypt = require('bcrypt');
const generateReferralCode = require('../../helpers/generateReferralCode');



const pageNotFound = async (req, res) => {
    try {
        res.render('page404')

    } catch (error) {
        res.redirect('/pageNotFound')
    }
}


const loadHomePage = async (req, res) => {
    try {
        const user = req.session.user;
        const categories = await Category.find({isListed:true})
        let productData = await Product.find({
            isBlocked: false,
            category: {$in: categories.map(category => category._id)},
            
        })

        productData.sort((a,b) => new Date(b.createdAt) - new Date(a.createdAt))
        productData = productData.slice(0,4);


        if(user){
            const userData = await User.findOne({_id:user});
            res.render('home', {user: userData, products: productData})
            
            
        } else{
            return res.render('home', {products: productData, req: req})
        }
            
        
    } catch (error) {
        console.log('Home Page Not Found')
        res.status(500).send('Server Error')
    }
}


const loadSignUpPage = async (req, res) => {
    try {
        console.log('URL:', req.url);      
        console.log('Query:', req.query);  

        
        const referralCode = req.query.ref;

        
        if (referralCode) {
            req.session.referral = referralCode;
        }

       
        res.render('signup'); 
        } catch (error) {
        console.log('Sign Up Page Not Found');
        res.status(500).send('Server Error');
    }
};





function generateOTP() {
    return Math.floor(100000 + Math.random() * 900000).toString();
}

async function sendVerificationEmail(email,otp){
    try{
        const transporter = nodemailer.createTransport({
            service: 'gmail',
            port:587,
            secure:false,
            requireTLS:true,
            auth:{
                user: process.env.NODEMAILER_EMAIL,
                pass: process.env.NODEMAILER_PASSWORD
            }
        })

        const info = await transporter.sendMail({
            from: process.env.NODEMAIL_EMAIL,
            to: email,
            subject: 'OTP for Verification',
            text: `Your OTP is ${otp}`,
            html: `<b>Your OTP is ${otp}</b>`
        })

        return info.accepted.length > 0



    } catch (error) {
        console.error("Error for sending email",error)
        return false
    }
}



const signUp = async (req, res) => {
   
    try {
        const { name, email, phone, password, cPassword } = req.body
        
        const referralCode = req.session.referral || null;

        
        if(password !== cPassword){
            return res.render('signup',{message:'Password not matched'})
        }

        const findUser = await User.findOne({email:email})

        if(findUser){
            return res.render('signup',{message:'User already exists'})
        }

        const otp = generateOTP()

        const emailSent = await sendVerificationEmail(email,otp);

        if(!emailSent){
            return res.json("email-error")
        }
        
        req.session.userOtp = otp;
        req.session.userData = {name,phone,email,password, referralCode};

        res.render('verify-otp');
        console.log("OTP Send",otp);
        

    } catch (error) {
        console.error('signup error',error)
        res.redirect('/pagenotfound')
    }
}

const securePassword = async (password) => {
    try {
        
        const passwordHash = await bcrypt.hash(password,10);

        return passwordHash;

    } catch (error) {
        
    }
}


const verifyOtp = async (req, res) => {
  try {
    const { otp } = req.body;

    console.log('OTP entered:', otp);

    if (otp === req.session.userOtp) {
      const userData = req.session.userData;

      const passwordHash = await securePassword(userData.password);
      const newReferralCode = generateReferralCode(); 

      const saveUserData = new User({
        name: userData.name,
        email: userData.email,
        phone: userData.phone,
        googleId: userData.googleId || null,
        password: passwordHash,
        referralCode: newReferralCode,
        referredBy: userData.referralCode || null,
        redeemed: !!userData.referralCode,
      });

      const savedUser = await saveUserData.save();

      
      if (userData.referralCode) {
        const referrer = await User.findOne({ referralCode: userData.referralCode });

        if (referrer) {
          referrer.redeemedUsers.push(savedUser._id);

          await Coupon.create({
            userId: [referrer._id],
            name: `REF${referrer._id.toString().slice(-4)}${Date.now().toString().slice(-4)}`,
            offerPrice: 100,
            minimumPrice: 500,
            createdOn: new Date(),
            expireOn: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
            reason: "Referral Reward",
            isReferral: true,
            isUsed: false
          });

          await referrer.save();
        }
      }

      
      req.session.user = savedUser._id;
      req.session.userOtp = null;
      req.session.userData = null;

      res.json({ success: true, redirectUrl: '/' });

    } else {
      res.status(400).json({ success: false, message: 'Invalid OTP. Please try again.' });
    }

  } catch (error) {
    console.error('Error verifying OTP:', error);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};



const resendOtp = async (req, res) => {
    try {
        
        const {email} = req.session.userData;
        if(!email){
            return res.status(400).json({success:false,message:'Email not found in session'})
        }

        const otp = generateOTP();

        req.session.userOtp = otp;

        const emailSent = await sendVerificationEmail(email,otp);

        console.log("Resended OTP:",otp)

        if(!emailSent){
            console.log("Resend OTP",otp);
            res.status(200).json({success:true,message:'OTP Resend Successfully'})
            
        } else{
            res.status(500).json({success:false,message:'Failed to resend OTP Please try again'})
        }

    } catch (error) {

        console.error('Error Resending OTP',error)
        res.status(500).json({success:false,message:'INternal Server Error, Please try again'})
        
    }
}

const loadLoginPage = async (req, res) => {
    try {
        if(!req.session.user){
            return res.render('login')
        } else{
            res.redirect('/')
        }
    } catch (error) {
        res.redirect('/pageNotFound')
    }
}


const login = async (req, res) => {
    try {
        
        const {email,password} = req.body;

        const findUser = await User.findOne({isAdmin:0, email:email});

        if(!findUser){
            return res.render('login', {message:'User not found'})
        }
        if(findUser.isBlocked){
            return res.render('login', {message:'User is Blocked by Admin'})
        }

        const passwordMatch = await bcrypt.compare(password,findUser.password);

        if(!passwordMatch){
            return res.render('login',{message:'Invalid Password'})
        }

        req.session.user = findUser._id;
        res.redirect('/')

    } catch (error) {

        console.error('Login Error',error);
        res.render('login',{message:'Login Failed Try again'})
        
        
    }
}


const logout = async (req, res) => {
    try {
        if (req.session.user) {
            delete req.session.user; 
        }
        res.redirect('/login'); 
    } catch (error) {
        console.log('Logout Error', error);
        res.redirect('/pagenotfound');
    }
};



const loadShoppingPage = async (req, res) => {
    try {

        const user = req.session.user;
        const userData = await User.findOne({ _id: user });
        const categories = await Category.find({ isListed: true });
        const categoryIds = categories.map((category) => category._id.toString());
        
        const page = parseInt(req.query.page) || 1;
        const limit = 9;
        const skip = (page - 1) * limit;
        const products = await Product.find({
            isBlocked: false,
            category: {$in: categoryIds},
            quantity: {$gt: 0}
        }).sort({createdAt: -1}).skip(skip).limit(limit);

        const totalProducts = await Product.countDocuments({
            isBlocked: false,
            category: {$in: categoryIds},
            quantity: {$gt: 0}
        })

        const totalPages = Math.ceil(totalProducts/limit);

        const brands = await Brand.find({isBlocked: false});
        const categoriesWithIds = categories.map(category => ({id: category._id, name: category.name}));
        res.render("shop", {
            user: userData,
            products: products,
            category: categoriesWithIds,
            brand: brands,
            totalProducts: totalProducts,
            currentPage: page,
            totalPages: totalPages
        })
        

    } catch (error) {
        console.error("Error loading shopping page:", error);
        res.status(500).redirect("/pageNotFound");
    }
};



const getFilteredProducts = async (req, res) => {
    try {
        const user = req.session.user;
        const userData = user ? await User.findById(user) : null;

        const search = req.query.search || "";
        const category = req.query.category || "";
        const brand = req.query.brand || "";
        const min = parseInt(req.query.min) || 0;
        const max = parseInt(req.query.max) || 1000000;
        const sort = req.query.sort || "new";
        const page = parseInt(req.query.page) || 1;
        const itemsPerPage = 6;

        const categories = await Category.find({ isListed: true }).lean();
        const brands = await Brand.find({}).lean();

  
        const filter = {
            isBlocked: false,
            
            salePrice: { $gte: min, $lte: max }
        };

        if (search) {
            filter.productName = { $regex: search, $options: "i" };
        }

        if (category) {
            const findCategory = await Category.findById(category);
            if (findCategory) {
                filter.category = findCategory._id;
            }
        }

        if (brand) {
            const findBrand = await Brand.findById(brand);
            if (findBrand) {
                filter.brand = findBrand.brandName;
            }
        }

        // Sorting options
        let sortOption = {};
        switch (sort) {
            case "priceLow":
                sortOption = { salePrice: 1 };
                break;
            case "priceHigh":
                sortOption = { salePrice: -1 };
                break;
            case "az":
                sortOption = { productName: 1 };
                break;
            case "za":
                sortOption = { productName: -1 };
                break;
            case "ratings":
                sortOption = { rating: -1 };
                break;
            case "featured":
                sortOption = { isFeatured: -1 };
                break;
            case "popular":
                sortOption = { soldCount: -1 };
                break;
            default:
                sortOption = { createdAt: -1 }; 
        }

        // Querying products
        const totalProducts = await Product.countDocuments(filter);
        const totalPages = Math.ceil(totalProducts / itemsPerPage);

        const products = await Product.find(filter)
            .sort(sortOption)
            .skip((page - 1) * itemsPerPage)
            .limit(itemsPerPage)
            .lean();

        res.render("shop", {
            user: userData,
            products,
            category: categories,
            brand: brands,
            totalPages,
            currentPage: page,
            selectedCategory: category || null,
            selectedBrand: brand || null,
            search,
            min,
            max,
            sort,
            count: totalProducts
        });

    } catch (error) {
        console.error("Error while filtering products:", error);
        res.redirect("/pageNotFound");
    }
};



module.exports = {
    loadHomePage,
    pageNotFound,
    loadLoginPage,
    loadSignUpPage,
    signUp,
    login,
    verifyOtp,
    resendOtp,
    logout,
    loadShoppingPage,
    getFilteredProducts
}