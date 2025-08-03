const Order = require("../../models/orderSchema");
const User = require("../../models/userSchema");
const Product = require("../../models/productSchema");
const Category = require("../../models/categorySchema");
const Address = require("../../models/addressSchema");
const Coupon = require("../../models/couponSchema");
const Razorpay = require("razorpay");
const crypto = require("crypto");
const env = require("dotenv").config();

const fs = require("fs")
const path = require("path")
const ejs = require("ejs")
const puppeteer = require("puppeteer")


// Initialize Razorpay
const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
})


const DELIVERY_CHARGE = 50

const orderSuccessPage = (req, res) => {
    try {
        const orderIds = req.query.orderIds;
        res.render('order-success', { orderIds });
    } catch (error) {
        console.error('Error loading order success page:', error);
        res.status(500).send('Something went wrong. Please try again.');
    }
};


const distributeDiscount = (cartItems, totalDiscount) => {
  const totalAmount = cartItems.reduce((sum, item) => sum + item.price * item.quantity, 0)
  return cartItems.map((item) => {
    const itemTotal = item.price * item.quantity
    const discountShare = (itemTotal / totalAmount) * totalDiscount
    return {
      ...item,
      discountedPrice: item.price - discountShare / item.quantity,
    }
  })
}

const placeOrder = async (req, res) => {
  try {
    const userId = req.session.user
    const { addressId, paymentMethod, couponCode } = req.body

    const user = await User.findById(userId).populate({
      path: "cart.productId",
      model: "Product",
    })

    if (!user || user.cart.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Cart is empty",
      })
    }

    const address = await Address.findOne({ userId: userId, "address._id": addressId })
    if (!address) {
      return res.status(400).json({
        success: false,
        message: "Address not found",
      })
    }

    const selectedAddress = address.address.find((addr) => addr._id.toString() === addressId)

    const totalAmount = user.cart.reduce((sum, item) => sum + item.productId.salePrice * item.quantity, 0)
    let discount = 0
    let couponApplied = false

    if (couponCode) {
       const coupon = await Coupon.findOne({ name: couponCode, isList: true });

    if (coupon) {
      if (coupon.isReferral) {
      // For referral coupons, check isUsed
      if (!coupon.isUsed) {
        discount = coupon.offerPrice;
        couponApplied = true;
        await Coupon.findByIdAndUpdate(coupon._id, { $set: { isUsed: true } }); 
      }
    } else {
      // For admin coupons, check if user has already used it
      if (!coupon.userId.includes(userId)) {
        discount = coupon.offerPrice;
        couponApplied = true;
        await Coupon.findByIdAndUpdate(coupon._id, { $push: { userId } }); // Push userId into array
      }
    }
  }
}


    const finalAmount = totalAmount - discount + DELIVERY_CHARGE
    const discountedItems = distributeDiscount(
      user.cart.map((item) => ({
        product: item.productId._id,
        productName: item.productId.productName,
        productImages: item.productId.productImage,
        quantity: item.quantity,
        price: item.productId.salePrice,
      })),
      discount,
    )

    if (paymentMethod === "cod" && totalAmount > 35000) {
      return res.status(400).json({
        success: false,
        message: "COD not available for orders above ₹35,000",
      })
    }

    const orders = await Promise.all(
      discountedItems.map(async (item) => {
        const product = await Product.findById(item.product).select("regularPrice productName productImage")
        const order = new Order({
          userId: userId,
          orderedItems: [
            {
              product: item.product,
              productName: product.productName,
              productImages: product.productImage,
              quantity: item.quantity,
              price: item.discountedPrice,
              regularPrice: product.regularPrice,
              status: "Pending",
            },
          ],
          totalPrice: item.price * item.quantity,
          discount: item.price * item.quantity - item.discountedPrice * item.quantity,
          finalAmount: item.discountedPrice * item.quantity + DELIVERY_CHARGE / discountedItems.length,
          address: selectedAddress,
          status: "Pending",
          paymentMethod: paymentMethod,
          couponApplied: couponApplied,
          deliveryCharge: DELIVERY_CHARGE / discountedItems.length,
          createdOn: new Date(),
          updatedOn: new Date(), 
        })

        await Product.findByIdAndUpdate(item.product, {
          $inc: { quantity: -item.quantity },
        })

        return order.save()
      }),
    )

    // Clear cart
    await User.findByIdAndUpdate(userId, { $set: { cart: [] } })

    res.json({
      success: true,
      orderIds: orders.map((order) => order.orderId),
      message: "Orders placed successfully",
    })
  } catch (error) {
    console.error("Error in placeOrder:", error)
    res.status(500).json({
      success: false,
      message: "Failed to place order",
    })
  }
}

const getOrders = async (req, res) => {

  try {

    const userId = req.session.user
    const search = req.query.search || "";
    const page = parseInt(req.query.page) || 1;
    const limit = 5;
    
    let orders = await Order.find({ userId })
      .sort({ createdOn: -1 })
      .populate("orderedItems.product")
      .exec();

    
    if (search) {
      const searchRegex = new RegExp(search, "i");
      orders = orders.filter(order =>
        order.orderedItems.some(item =>
          searchRegex.test(item.product?.productName)
        )
      );
    }

    // Pagination after filtering
    const totalOrders = orders.length;
    const totalPages = Math.ceil(totalOrders / limit);
    const paginatedOrders = orders.slice((page - 1) * limit, page * limit);

    
    const categories = await Category.find({ isListed: true })
    const productData = await Product.find({
      isBlocked: false,
      category: { $in: categories.map((category) => category._id) },
      quantity: { $gt: 0 },
    })

    const user = await User.findById(userId)

    res.render("orders", {
      orders: paginatedOrders,
      user: user,
      product: productData,
      currentPage: page,
      totalPages,
      search
    })
  } catch (error) {
    console.error("Error in getOrders:", error)
    res.status(500).json({ error: "Internal server error" })
  }
}


const loadOrderDetails = async (req, res) => {
  try {
    const userId = req.session.user
    const orderId = req.query.orderId

    const order = await Order.findOne({ orderId: orderId, userId })
    if (!order) {
      return res.status(404).send("Order not found")
    }

    const user = await User.findById(userId)

    res.render("order-details", {
      order,
      user,
    })
  } catch (error) {
    console.error("Error in loadOrderDetails:", error)
    res.status(500).send("Internal server error")
  }
}


const cancelOrder = async (req, res) => {
  try {
    const { orderId, reason } = req.body
    const userId = req.session.user
console.log(req.session)
    const order = await Order.findOne({ _id: orderId, userId })
    if (!order) {
      return res.status(404).json({ success: false, message: "Order not found" })
    }

    if (order.status !== "Cancelled" && order.status !== "Delivered") {
      order.status = "Cancelled"
      order.cancelReason = reason
      order.orderedItems[0].status = "Cancelled"
      order.orderedItems[0].cancelReason = reason

      
      order.updatedOn = new Date()

      await Product.findByIdAndUpdate(order.orderedItems[0].product, {
        $inc: { quantity: order.orderedItems[0].quantity },
      })

      await order.save()
      res.json({ success: true, message: "Order cancelled successfully" })
    } else {
      res.status(400).json({ success: false, message: "Order cannot be cancelled" })
    }
  } catch (error) {
    console.error("Error in cancelOrder:", error)
    res.status(500).json({ success: false, message: "Internal server error" })
  }
}

const createRazorpayOrder = async (req, res) => {
  try {
    const userId = req.session.user
    const { addressId, couponCode } = req.body

    const user = await User.findById(userId).populate({
      path: "cart.productId",
      model: "Product",
    })

    if (!user || user.cart.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Cart is empty",
      })
    }

    const totalAmount = user.cart.reduce((sum, item) => sum + item.productId.salePrice * item.quantity, 0)
    let discount = 0

    if (couponCode) {
      const coupon = await Coupon.findOne({ name: couponCode, isList: true })
      if (coupon && !coupon.userId.includes(userId)) {
        discount = coupon.offerPrice
      }
    }

    const finalAmount = totalAmount - discount + DELIVERY_CHARGE

    const razorpayOrder = await razorpay.orders.create({
      amount: Math.round(finalAmount * 100),
      currency: "INR",
      receipt: `order_${Date.now()}`,
    })

    res.json({
      success: true,
      razorpayKeyId: process.env.RAZORPAY_KEY_ID,
      orderId: razorpayOrder.id,
      amount: finalAmount * 100,
      currency: "INR",
      customerName: user.name,
      customerEmail: user.email,
      customerPhone: user.phone,
    })
  } catch (error) {
    console.error("Error in createRazorpayOrder:", error)
    res.status(500).json({
      success: false,
      message: "Failed to create order",
    })
  }
}

const verifyPayment = async (req, res) => {
  try {
    const { paymentResponse, orderData } = req.body;
    const userId = req.session.user;

    const sign = paymentResponse.razorpay_order_id + "|" + paymentResponse.razorpay_payment_id;
    const expectedSign = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
      .update(sign)
      .digest("hex");

    if (expectedSign !== paymentResponse.razorpay_signature) {
      return res.status(400).json({
        success: false,
        message: "Invalid payment signature",
      });
    }

    // Set payment method
    orderData.paymentMethod = "online";

    // Place order
    const result = await placeOrder(
      {
        session: { user: userId },
        body: orderData,
      },
      {
        json: (data) => {
          res.json(data); // Send order response back to client
        },
        status: (code) => {
          return {
            json: (data) => res.status(code).json(data),
          };
        },
      }
    );
  } catch (error) {
    console.error("Error in verifyPayment:", error);
    res.status(500).json({
      success: false,
      message: "Payment verification failed",
    });
  }
};



const requestReturn = async (req, res) => {
  try {
    const { orderId, returnReason, returnDescription } = req.body
    const userId = req.session.user
    

    const order = await Order.findOne({ _id: orderId, userId })
    if (!order) {
      return res.status(404).json({ success: false, message: "Order not found" })
    }

    const deliveryDate = new Date(order.updatedAt)
    const currentDate = new Date()
    const daysSinceDelivery = Math.floor((currentDate - deliveryDate) / (1000 * 60 * 60 * 24))

    if (order.status !== "Delivered" || daysSinceDelivery > 7) {
      return res.status(400).json({
        success: false,
        message: "Order is not eligible for return",
      })
    }

    order.status = "Return Requested"
    order.returnReason = returnReason
    order.returnDescription = returnDescription
    order.requestStatus = "pending"

    // Update the timestamp when return is requested
    order.updatedOn = new Date()

    await order.save()

    res.json({
      success: true,
      message: "Return request submitted successfully",
    })
  } catch (error) {
    console.error("Error in requestReturn:", error)
    res.status(500).json({
      success: false,
      message: "Internal server error",
    })
  }
}


const generateInvoice = async (req, res) => {
  try {
    const userId = req.session.user
    const orderId = req.query.orderId

    const order = await Order.findOne({ orderId: orderId, userId })
    if (!order) {
      return res.status(404).send("Order not found")
    }

    if (order.status !== "Delivered") {
      return res.status(400).send("Invoice is only available for delivered orders")
    }

    if (!order.invoiceDate) {
      order.invoiceDate = new Date()
      await order.save()
    }

    const templatePath = path.join(__dirname, "../../views/user/invoice-template.ejs")
    const html = await ejs.renderFile(templatePath, { order })

    const browser = await puppeteer.launch({ headless: true })
    const page = await browser.newPage()

    // Set content and generate PDF
    await page.setContent(html, { waitUntil: "networkidle0" })

    // Create directory if it doesn't exist
    const invoiceDir = path.join(__dirname, "../../public/invoices")
    if (!fs.existsSync(invoiceDir)) {
      fs.mkdirSync(invoiceDir, { recursive: true })
    }

    // Generate PDF file name
    const fileName = `invoice-${order.orderId}.pdf`
    const filePath = path.join(invoiceDir, fileName)

    // Generate PDF
    await page.pdf({
      path: filePath,
      format: "A4",
      printBackground: true,
      margin: {
        top: "20px",
        right: "20px",
        bottom: "20px",
        left: "20px",
      },
    })

    await browser.close()

    // Send the PDF file
    res.download(filePath, fileName, (err) => {
      if (err) {
        console.error("Error sending file:", err)
        res.status(500).send("Error generating invoice")
      }

    })
  } catch (error) {
    console.error("Error generating invoice:", error)
    res.status(500).send("Error generating invoice")
  }
}


module.exports = {
orderSuccessPage,
placeOrder,
getOrders,
loadOrderDetails,
cancelOrder,
createRazorpayOrder,
verifyPayment,
requestReturn,
generateInvoice
}