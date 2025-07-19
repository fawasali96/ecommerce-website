const Sale = require("../../models/salesSchema");
const Order = require("../../models/orderSchema");
const Product = require("../../models/productSchema");


const puppeteer = require('puppeteer');
const ejs = require('ejs');
const path = require('path');



const loadSalesPage = async (req, res) => {
  try {
      const { reportType, startDate, endDate, format } = req.query;
      let query = {};
      
      const now = new Date();
      switch (reportType) {
          case 'daily':
              query.createdOn = {
                  $gte: new Date(now.setHours(0, 0, 0, 0)),
                  $lt: new Date(now.setHours(23, 59, 59, 999))
              };
              break;
          case 'weekly':
              const weekStart = new Date(now.setDate(now.getDate()));
              query.createdOn = {
                  $gte: new Date(weekStart.setHours(0, 0, 0, 0)),
                  $lt: new Date(now)
              };
              break;
          case 'yearly':
              query.createdOn = {
                  $gte: new Date(now.getFullYear(), 0, 1), 
                  $lt: new Date(now.getFullYear() + 1, 0, 1) 
              };
              break;
          case 'custom':
              if (startDate && endDate) {

                if(endDate < startDate) {
                  return res.status(400).json({ error: "End date cannot be earlier than start date" });
                }
                  query.createdOn = {
                      $gte: new Date(startDate),
                      $lt: new Date(new Date(endDate).setHours(23, 59, 59, 999))
                  };
              }
              break;
      }
  
      query.status = 'Delivered';
  
      const orders = await Order.find(query)
          .populate('orderedItems.product')
          .sort({ createdOn: -1 });
      
      let totalRegularPrice = 0;
      let totalFinalAmount = 0;
  
      const sales = orders.map(order => {
    
          const orderRegularPrice = order.orderedItems.reduce((sum, item) => {
              return sum + (item.regularPrice * item.quantity);
          }, 0);

          const finalAmountWithoutDelivery = order.finalAmount - 50;
          
          totalRegularPrice += orderRegularPrice;
          totalFinalAmount += finalAmountWithoutDelivery;
          
          
          const actualDiscount = orderRegularPrice - finalAmountWithoutDelivery;
          const couponDiscount = order.couponApplied ? 
              (order.totalPrice - order.finalAmount) : 0;
            
          
          return {
              orderId: order.orderId,
              amount: finalAmountWithoutDelivery,
              discount: order.discount || 0,
              coupon: couponDiscount,
              lessPrice: actualDiscount,
              date: order.createdOn,
              items: order.orderedItems.map(item => ({
                  name: item.product?.name || 'Deleted Product',
                  quantity: item.quantity,
                  regularPrice: item.regularPrice,
                  finalPrice: item.finalPrice
              }))
          };
      });
      
      const salesData = {
          sales,
          totalSales: totalFinalAmount,
          orderCount: sales.length,
          discounts: sales.reduce((sum, sale) => sum + sale.discount, 0),
          coupons: sales.reduce((sum, sale) => sum + sale.coupon, 0),
          lessPrices: totalRegularPrice - totalFinalAmount
      };
    

  
      if (format === 'pdf') {
          return generatePDF(res, salesData);
      } 
  
      res.render('sales-report', { salesData, selectedType: reportType });

  } catch (error) {
      console.error('Error in loadSalesPage:', error);
      res.status(500).render('admin/pageerror', { 
          message: 'Error loading sales report', 
          error: error.message 
      });
  }
};


const generatePDF = async (res, salesData) => {
  try {
  
    const html = await ejs.renderFile(
      path.join(__dirname, '../../views/admin/sales-report-pdf.ejs'),
      { salesData }
    );

    
    const browser = await puppeteer.launch();
    const page = await browser.newPage();

   
    await page.setContent(html, { waitUntil: 'networkidle0' });

    
    const pdfBuffer = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: {
        top: '20px',
        right: '20px',
        bottom: '20px',
        left: '20px'
      }
    });

    await browser.close();

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename=sales-report.pdf');
    res.send(pdfBuffer);
  } catch (error) {
    console.error('Error generating PDF:', error);
    res.status(500).send('Failed to generate PDF');
  }
};



const createSaleRecord = async (order) => {
  try {
    const sale = new Sale({
      orderId: order._id,
      amount: order.totalAmount,
      discount: order.discount || 0,
      coupon: order.couponDiscount || 0,
      date: order.orderDate || new Date()
    });
    
    await sale.save();
    return sale;
  } catch (error) {
    console.error('Error creating sale record:', error);
    throw error;
  }
};


module.exports = {
    loadSalesPage,
    createSaleRecord
}