const User = require('../../models/userSchema');
const nodemailer = require("nodemailer");
const bcrypt = require("bcrypt");
const env = require("dotenv").config();
const session = require("express-session");
const path = require("path");
const fs = require('fs');


function generateOtp() {
    const digits = "1234567890";
    let otp = "";
    for(let i = 0; i < 6; i++) {
        otp += digits[Math.floor(Math.random() * 10)]
    }
    return otp
}

const sendVerificationEmail = async (email, otp) => {
    try {

        const transporter = nodemailer.createTransport({
            service: "gmail",
            port: 587,
            secure: false,
            requireTLS: true,
            auth: {
                user: process.env.NODEMAILER_EMAIL,
                pass: process.env.NODEMAILER_PASSWORD
            }
        })

        const mailOptions = {
            from: process.env.NODEMAILER_EMAIL,
            to: email,
            subject: "Your OTP for password reset",
            text: `Your OTP is ${otp}`,
            html: `<b><h4>YourOTP: ${otp}</h4><br></b>`
        }

        const info = await transporter.sendMail(mailOptions);
        console.log("Email sent:", info.messageId);
        return true;
        
    } catch (error) {

        console.error("Error sending email", error);
        return false
        
    }
}


const securePassword = async (password) => {
    try {

        const passwordHash = await bcrypt.hash(password, 10);
        return passwordHash;
        
    } catch (error) {
        
    }
}

const getForgotPassPage = async (req, res) => {
    try {

        res.render("forgot-password")

        
    } catch (error) {
        
        res.redirect('/pageNotFound');
    }
}


const forgotEmailValid = async (req, res) => {
    try {

        const {email} = req.body;
        const findUser = await User.findOne({email: email});
        if(findUser) {
            const otp = generateOtp();
            const emailSent = await sendVerificationEmail(email, otp);
            if(emailSent) {
                req.session.userOtp = otp;
                req.session.email = email;
                res.render("forgotPass-otp");
                console.log(`OTP: ${otp}`);
                
            } else {
                res.json({success: false, message: "Failed to send OTP. Please try again"})
            }
        } else {
            res.render("forgot-password", {message: "User with this email does not exist"})
        }
         
    } catch (error) {

        res.redirect("/pageNotFound");
        
    }
}

const verifyForgotPassOtp = async (req, res) => {
    try {

        const enteredOtp = req.body.otp;
        if(enteredOtp === req.session.userOtp) {
            res.json({success: true, redirectUrl: "/reset-password"})
        } else {
            res.json({success: false, message: "OTP not matching"})
        }
    } catch (error) {
        res.status(500).json({success: false, message: "An error occured. Please ry again"})
        
    }
}

const getResetPassPage = async (req, res) => {
    try {

        res.render("reset-password");
        
    } catch (error) {
        res.redirect("/pageNotFound")
    }
}


const resendOtp = async (req, res) => {
     try {

        const otp = generateOtp();
        req.session.userOtp = otp;
        const email = req.session.email;
        console.log("Resending OTP to email:", email);
        const emailSent = await sendVerificationEmail(email, otp);
        if(emailSent) {
            console.log("Resend OTP:", otp);
            res.status(200).json({success: true, message: "Resend OTP successfull"})
        }
        
        
     } catch (error) {
        console.error("Error in resend otp", error);
        res.status(500).json({success: false, message: "Internal server error"});
        
     }
}


const postNewPassword = async (req, res) => {
    try {

        const {newPass1, newPass2} = req.body;
        const email = req.session.email;
        if(newPass1 === newPass2) {
            const passwordHash = await securePassword(newPass1);
            await User.updateOne({email: email}, {$set: {password: passwordHash}});
            res.redirect("/login");
        } else {
            res.render("reset-password", {message: "Passwords do not match"});
        }
  

    } catch (error) {

        res.redirect('/pageNotFound');
    }
}


const userProfile = async (req, res) => {
    try {

        const userId = req.session.user;
        const userData = await User.findById(userId);
        res.render("profile", {
            user: userData,
        })
        
    } catch (error) {
        console.error("Error for retrieve profile data", error);
        res.redirect('/pageNotFound');
    }
}

const getEditProfile = async (req, res) => {
    try {
        const userId = req.session.user;
        const userData = await User.findById(userId);
        res.render("edit-profile", {
            user: userData,
        });

    } catch (error) {
        console.error("Error retrieving profile data:", error);
        res.redirect('/pageNotFound');
    }
};


const editProfile = async (req, res) => {
  try {
    const userId = req.session.user;
    const { name, phone } = req.body;

    // Validate phone number
    const phoneRegex = /^\d{10}$/;
    if (!phoneRegex.test(phone)) {
      return res.status(400).json({
        success: false,
        message: 'Please enter a valid 10-digit phone number'
      });
    }

    // Fetch the user
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Prepare updated data
    const updatedData = { name, phone };

    // Handle profile image upload
    if (req.file) {
      // Delete old profile image if exists
      if (user.profileImage) {
        const oldImagePath = path.join(__dirname, '../public/uploads/re-image', user.profileImage);
        if (fs.existsSync(oldImagePath)) {
          fs.unlinkSync(oldImagePath);
        }
      }

      // Save new image filename
      updatedData.profileImage = req.file.filename;
    }

    // Update user
    const updatedUser = await User.findByIdAndUpdate(
      userId,
      updatedData,
      { new: true, runValidators: true }
    );

    res.json({
      success: true,
      message: 'Profile updated successfully',
      data: updatedUser
    });

  } catch (error) {
    console.error('Error updating profile:', error);
    res.status(500).json({
      success: false,
      message: 'An error occurred while updating your profile'
    });
  }
};

const changeEmail = async (req, res) => {
    try {
        const userId = req.session.user;
        const userData = await User.findById(userId);

        res.render("change-email",
            {user: userData})
        
    } catch (error) {
        res.redirect("/pageNotFound");
    }
}

const changeEmailValid = async (req, res) => {
    try {
        const userId = req.session.user; // Logged-in user's ID
        const { email } = req.body;

        // Fetch logged-in user's current email
        const user = await User.findById(userId);

        if (!user || user.email !== email) {
            return res.render("change-email", { message: "Entered email does not match your current email" });
        }

        const otp = generateOtp();
        const emailSent = await sendVerificationEmail(email, otp);

        if (emailSent) {
            req.session.userOtp = otp;
            req.session.email = email;
            res.render("change-email-otp");
            console.log("OTP sent to:", email);
        } else {
            res.json("email-error");
        }
    } catch (error) {
        console.error("Error in changeEmailValid:", error);
        res.redirect("/pageNotFound");
    }
};



const verifyEmailOtp = async (req, res) => {
    try {
        const enteredOtp = req.body.otp;
        if(enteredOtp === req.session.userOtp) {
            req.session.userData = req.body.userData;
            res.json({success: true, redirectUrl: "/new-email"})
        } else {
            res.render("change-email-otp", {
                message: "OTP not matching",
                userData: req.session.userData
            });
        }


    } catch (error) {
        res.redirect("pageNotFound")
    }
}


const resendChangeEmailOtp = async (req, res) => {
     try {

        const otp = generateOtp();
        req.session.userOtp = otp;
        const email = req.session.email;
        console.log("Resending OTP to email:", email);
        const emailSent = await sendVerificationEmail(email, otp);
        if(emailSent) {
            console.log("Resend OTP:", otp);
            res.status(200).json({success: true, message: "Resend OTP successfull"})
        }
        
        
     } catch (error) {
        console.error("Error in resend otp", error);
        res.status(500).json({success: false, message: "Internal server error"});
        
     }
}



const getNewEmail = async (req, res) => {
    try {

        res.render("new-email")
    } catch (error) {
        res.redirect('/pageNotFound')
    }
}


const updateEmail = async (req, res) => {
    try {

        const newEmail = req.body.newEmail;
        const userId = req.session.user;
        await User.findByIdAndUpdate(userId, {email: newEmail});
        res.redirect("/userProfile");
        
    } catch (error) {
        res.redirect("/pageNotFound")
    }
}

const changePassword = async (req, res) => {
    try {
        const { currentPassword, newPassword, confirmPassword } = req.body;
        const userId = req.session.user;
        

        
        if (newPassword.length < 8 || !/[a-zA-Z]/.test(newPassword) || !/\d/.test(newPassword)) {
            return res.status(400).json({ success: false, message: 'Password must be at least 8 characters long and contain both letters and numbers.' });
        }

        if (newPassword !== confirmPassword) {
            return res.status(400).json({ success: false, message: 'Passwords do not match.' });
        }

        
        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found.' });
        }

        // Check if the current password is correct
        const isMatch = await bcrypt.compare(currentPassword, user.password);
        if (!isMatch) {
            return res.status(400).json({ success: false, error: 'current_password_incorrect', message: 'Current password is incorrect.' });
        }

        // Hash the new password
        const hashedPassword = await bcrypt.hash(newPassword, 10);

        // Update the user's password
        user.password = hashedPassword;
        await user.save();

        res.json({ success: true, message: 'Password changed successfully.' });
    } catch (error) {
        console.error('Error changing password:', error);
        res.status(500).json({ success: false, message: 'An error occurred while changing the password.' });
    }
};


const changePasswordForgot = async (req, res) => {
    try {

        res.render('change-password-forgot');
        
    } catch (error) {
        res.redirect("pageNotFound");
    }
}

const changePasswordValid = async (req, res) => {
    try {

        const {email} = req.body;
        const userExists = await User.findOne({email});
        if(userExists) {
            const otp = generateOtp();
            const emailSent = await sendVerificationEmail(email, otp);
            if(emailSent) {
                req.session.userOtp = otp;
                req.session.userData = req.body;
                req.session.email = email;
                res.render("change-password-otp");
                console.log("OTP: ", otp);
                
            } else {
                res.json({success: false, message: "Failed to send OTP. Please try again"})
            }
        } else {
            res.render("change-password-forgot", {message: "User with this email does not exists"})
        }
        
    } catch (error) {
        console.log("Error in validation", error);
        res.redirect("/pageNotFound");
        
    }
}

const verifyChangePassOtp = async (req, res) => {
    try {
        const enteredOtp = req.body.otp;
        if(enteredOtp === req.session.userOtp) {
            res.json({success: true, redirectUrl: "/reset-password"})
        } else {
            res.json({success: false, message: "OTP not matching"});
        }
    } catch (error) {
        res.status(500).json({success: false, message: "An error occured. Please try again later"});
    }
}

module.exports = {
    getForgotPassPage,
    forgotEmailValid,
    verifyForgotPassOtp,
    getResetPassPage,
    resendOtp,
    postNewPassword,
    userProfile,
    getEditProfile,
    editProfile, 
    changeEmail,
    changeEmailValid,
    verifyEmailOtp,
    resendChangeEmailOtp,
    getNewEmail,
    updateEmail,
    changePassword,
    changePasswordForgot,
    changePasswordValid,
    verifyChangePassOtp
} 