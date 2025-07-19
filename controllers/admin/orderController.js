const Order = require("../../models/orderSchema");
const User = require("../../models/userSchema");
const Product = require("../../models/productSchema");

const getOrders = async (req, res) => {
  try {
    
    const page = parseInt(req.query.page) || 1;
    const limit = 3;
    const skip = (page - 1) * limit;

    const orders = await Order.find().sort({ createdOn: -1 }).skip(skip).limit(limit);
    const totalOrders = await Order.countDocuments();
    const totalPages = Math.ceil(totalOrders / limit);

    res.render("admin-orders", {
      orders,
      currentPage: page,
      totalPages: totalPages,
      totalOrders: totalOrders,
      title: "Order Management",
    });
    
  } catch (error) {
    console.error("Error fetching orders:", error);
    res.status(500).send("Internal Server Error");
  }
};


const getOrderDetails = async (req, res) => {
  try {
    const orderId = req.params.id
    const order = await Order.findById(orderId)

    if (!order) {
      return res.status(404).send("Order not found")
    }

    res.render("admin-order-details", {
      order,
      title: "Order Details",
    })
  } catch (error) {
    console.error("Error fetching order details:", error)
    res.status(500).send("Internal Server Error")
  }
}


const updateOrderStatus = async (req, res) => {
  try {
    const { orderId, status } = req.body
    const order = await Order.findById(orderId)

    if (!order) {
      return res.status(404).json({ success: false, message: "Order not found" })
    }

    if (order.status === "Cancelled") {
      return res.status(400).json({ success: false, message: "Cannot update cancelled order" })
    }

    order.status = status
    order.orderedItems[0].status = status

    order.updatedOn = new Date()

    if (status === "Delivered") {
      order.deliveredOn = new Date()
    }

    await order.save()
    res.json({ success: true, message: "Order status updated successfully" })
  } catch (error) {
    console.error("Error updating order status:", error)
    res.status(500).json({ success: false, message: "Internal server error" })
  }
}


const cancelOrder = async (req, res) => {
  try {
    const { orderId } = req.body
    const order = await Order.findById(orderId)

    if (!order) {
      return res.status(404).json({ success: false, message: "Order not found" })
    }

    if (order.status !== "Cancelled" && order.status !== "Delivered") {
      order.status = "Cancelled"
      order.orderedItems[0].status = "Cancelled"

      order.updatedOn = new Date()

      await Product.findByIdAndUpdate(order.orderedItems[0].product, {
        $inc: { quantity: order.orderedItems[0].quantity },
      })



      await order.save()
      res.json({ success: true, message: "Order cancelled" })
    } else {
      res.status(400).json({ success: false, message: "Order cannot be cancelled" })
    }
  } catch (error) {
    console.error("Error cancelling order:", error)
    res.status(500).json({ success: false, message: "Internal server error" })
  }
}

const handleReturnRequest = async (req, res) => {
  try {
    const { orderId, action, message, category } = req.body
    const order = await Order.findById(orderId)

    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Order not found",
      })
    }

    if (action === "approve") {
      order.status = "Returning"
      order.requestStatus = "approved"
    } else if (action === "reject") {
      order.status = "Delivered"
      order.requestStatus = "rejected"
      order.rejectionCategory = category
      order.rejectionReason = message
    }

    order.updatedOn = new Date()

    await order.save()
    res.json({
      success: true,
      message: `Return request ${action}d successfully`,
    })
  } catch (error) {
    console.error("Error handling return request:", error)
    res.status(500).json({
      success: false,
      message: "Internal server error",
    })
  }
}

const updateReturnStatus = async (req, res) => {
  try {
    const { orderId, status } = req.body
    const order = await Order.findById(orderId)

    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Order not found",
      })
    }

    if (order.status !== "Returning" && status === "Returned") {
      return res.status(400).json({
        success: false,
        message: "Order must be in returning status first",
      })
    }

    order.status = status
    
    order.updatedOn = new Date()

    await order.save()
    res.json({
      success: true,
      message: "Return status updated successfully",
    })
  } catch (error) {
    console.error("Error updating return status:", error)
    res.status(500).json({
      success: false,
      message: "Internal server error",
    })
  }
}





module.exports = {
    getOrders,
    getOrderDetails,
    updateOrderStatus,
    cancelOrder,
    handleReturnRequest,
    updateReturnStatus
}