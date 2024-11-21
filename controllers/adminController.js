const User = require("../models/userModel");
const Products = require("../models/productModel");
const Order = require("../models/orderModel");
const Category = require("../models/categoryModel");

const bcrypt = require("bcrypt");

const pdf = require("pdfkit");
const fs = require("fs");
const PDFDocument = require('pdfkit');

const loadLogin = async (req, res) => {
  try {
    res.render("login");
  } catch (error) {
    console.log(error.message);
  }
};

const verifyLogin = async (req, res) => {
  try {
    const email = req.body.email;
    const password = req.body.password;

    const userData = await user.findOne({ email: email });
    if (userData) {
      const passwordMatch = await bcrypt.compare(password, userData.password);

      if (passwordMatch) {
        if (userData.is_admin === 0) {
          res.render("login", { message: "Email and password is incorrect" });
        } else {
          req.session.user_id = userData._id;
          res.redirect("/admin/home");
        }
      } else {
        res.render("login", { message: "Email and password is incorrect." });
      }
    } else {
      res.render("login", { message: "Email and password is incorrect." });
    }
  } catch (error) {
    console.log(error.message);
  }
};

const loadDashboard = async (req, res) => {
  try {
    const user = await User.find({ is_admin: false });
    const orders = await Order.find({});
    const product = await Products.find({});
    const category = await Category.find({});

    //calculate total revenue

    const totalRevenue = orders.reduce((acc, order) => {
      if (
        order.status === "Completed" &&
        order.payment !== "Cash On Delivery"
      ) {
        acc += order.products.reduce(
          (subTotal, product) => subTotal + product.price,
          0
        );
      }
      return acc; // Use += here to accumulate the value
    }, 0);
    //calculate total order

    const totalOrder = orders.reduce((acc, order) => {
      if (order.status !== "Cancelled") {
        acc += order.products.length;
      }
      return acc;
    }, 0);

    //total products
    const totalProducts = product.length;
    const totalCategory = category.length;

    //calculate Monthly Revenue
    const currentDate = new Date();
    const firstDayOfMonth = new Date(
      currentDate.getFullYear(),
      currentDate.getMonth(),
      1
    );

    const MonthlyOrders = await Order.find({
      date: { $gte: firstDayOfMonth },
    });

    const MonthlyRevenue = MonthlyOrders.reduce((acc, order) => {
      if (
        order.status === "Completed" &&
        order.payment !== "Cash On Delivery"
      ) {
        acc += order.products.reduce(
          (subTotal, product) => subTotal + product.price,
          0
        );
      }
      return acc;
    }, 0);

    const topProductDetails = await MostSoldProduct()

    if (user) {
      res.render("dashboard", {
        title: "Admin Dashboard",
        user,
        revenue: totalRevenue,
        orders: totalOrder,
        product: totalProducts,
        category: totalCategory,
        monthlyRevenue: MonthlyRevenue,
        topProductDetails
      });
    }
  } catch (error) {
    console.log(error.message);
  }
};

const logout = async (req, res) => {
  try {
    req.session.destroy();
    res.redirect("/admin");
  } catch (error) {
    console.log(error.message);
  }
};

const loadUserManagement = async (req, res) => {
    try {
      const { page = 0 } = req.query;
      const limit = 5; // Set the number of users to display per page
  
      const currentPage = parseInt(page);
      const nextPage = currentPage + 1;
  
      const users = await User.find({ is_admin: false })
        .skip(currentPage * limit)
        .limit(limit);
  
      const totalUsers = await User.countDocuments({ is_admin: false });
  
      const totalPages = Math.ceil(totalUsers / limit);
  
      res.render("userManagement", {
        users,
        currentPage,
        nextPage,
        totalPages,
      });
    } catch (error) {
      console.log(error.message);
      res.status(500).send("Internal Server Error");
    }
  };

  
const userblock = async (req, res) => {
  try {
    const userId = req.params.id;
    const user = await User.findById(userId);

    if (user) {
      user.is_blocked = !user.is_blocked;
      await user.save();
      res.json({ success: true, isBlocked: user.is_blocked });
    } else {
      res.status(404).json({ success: false, message: "User not found" });
    }
  } catch (error) {
    console.log("Error toggling user block status:", error.message);
    res.status(500).json({ success: false, message: "An error occurred" });
  }
};

const loadProductManagement = async (req, res) => {
  try {

    const { page = 0 } = req.query;
            const limit = 6; // Set the number of products to display per page

            const currentPage = parseInt(page);
            const nextPage = currentPage + 1;

    
            const totalProducts = await Products.countDocuments({});
            const totalPages = Math.ceil(totalProducts / limit);
    
    const products = await Products.find({})
    .skip(currentPage * limit)
                .limit(limit);


    console.log(products, "all products");
    res.render("productManagement", { products, currentPage, nextPage, totalPages });
  } catch (error) {
    console.log(error.message);
  }
};



const notFoundPage = async (req, res) => {
  console.log("admin side");
  try {
    res.status(404).render("404", {
      message: "Page not found",
      page: "admin",
    });
  } catch (error) {
    console.log(error.message);
    res.status(500).send("An error occurred while handling the 404 page.");
  }
};


const salesReport = async (req, res) => {
  try {
    // Extract query parameters from the request
    const { startDate, endDate, page = 1, pageSize = 5 } = req.query;

    // Create a query object with a default status filter
    let query = { status: "Completed" };

    // If startDate and endDate are provided, add them to the query
    if (startDate && endDate) {
      const startDateTime = new Date(startDate);
      startDateTime.setUTCHours(0, 0, 0, 0);

      const endDateTime = new Date(endDate);
      endDateTime.setUTCHours(23, 59, 59, 999);

      query.date = { $gte: startDateTime, $lt: endDateTime }; // Ensure 'date' matches your schema's date field
    }

    // Log the query for debugging
    console.log("Query:", query);

    // Get total number of matching documents
    const totalCount = await Order.countDocuments(query);
    console.log("Total Count of Orders:", totalCount);

    // Calculate pagination parameters
    const totalPages = Math.ceil(totalCount / pageSize);
    const skip = (page - 1) * pageSize;
    

    // Fetch the orders with population of user and products
    const orders = await Order.find(query)
      .populate("user")
      .populate("products.productId")
      .sort({ date: -1 }) // Sort by date in descending order
      .skip(skip)
      .limit(parseInt(pageSize));


    // Render the page with the orders and pagination details
    res.render("salesReport", {
      orders,
      startDate,
      endDate,
      page: parseInt(page),
      totalPages,
      pageSize: parseInt(pageSize),
    });
  } catch (error) {
    console.log("Error:", error.message);
    res.status(500).send("Internal Server Error");
  }
};


const saleChart = async (req, res) => {
  try {
    if (!req.query.interval) {
      return res.status(400).json({ error: "Missing interval parameter" });
    }
    const interval = req.query.interval.toLowerCase();
    let dateFormat, groupByFormat;

    switch (interval) {
      case "yearly":
        dateFormat = "%Y";
        groupByFormat = { $dateToString: { format: "%Y", date: "$date" } };
        break;
      case "monthly":
        dateFormat = "%Y-%m";
        groupByFormat = { $dateToString: { format: "%m-%Y", date: "$date" } };
        break;
      case "daily":
        dateFormat = "%Y-%m-%d";
        groupByFormat = { $dateToString: { format: "%Y-%m-%d", date: "$date" } };
        break;
      default:
        return res.status(400).json({ error: "Invalid time interval" });
    }

    // Run aggregation with $unwind
    const salesData = await Order.aggregate([
      { $unwind: "$products" }, // Decompose products array
      {
        $group: {
          _id: groupByFormat,
          totalSales: { $sum: "$products.price" }, // Sum nested product prices
          topProduct: { $first: "$products.productId" }, // Get top product ID
        },
      },
      { $sort: { _id: 1 } },
    ]);

    // Format labels for monthly interval
    const monthNames = [
      "January", "February", "March", "April", "May", "June",
      "July", "August", "September", "October", "November", "December"
    ];
    const labels = salesData.map(item => {
      if (interval === "monthly") {
        const [month, year] = item._id.split("-");
        return `${monthNames[parseInt(month) - 1]} ${year}`;
      }
      return item._id;
    });

    const values = salesData.map(item => item.totalSales);

    res.json({ labels, values, topProductDetails: salesData });
  } catch (error) {
    console.error("Error in sales chart:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};




const MostSoldProduct = async () => {
  try {
    const mostSoldProducts = await Order.aggregate([
      { $unwind: '$products' },
      {
        $group: {
          _id: '$products.productId',
          totalQuantity: { $sum: '$products.quantity' },
        },
      },
      { $sort: { totalQuantity: -1 } },
      { $limit: 3 }, // Fetch top 3 products
    ]);

    const topProductsDetails = await Promise.all(
      mostSoldProducts.map(async (product) => {
        const productDetails = await Products.findById(product._id);
        const categoryId = productDetails.category;
        const categoryDetails = await Category.findById(categoryId);
        return {
          productName: productDetails.productName,
          productPhoto: productDetails.image,
          category: categoryDetails.categoryName,
          // Add more details if needed
        };
      })
    );

    return topProductsDetails;
  } catch (error) {
    console.error('Error fetching most sold products:', error.message);
    return []; // Return an empty array in case of an error
  }
};




const downloadSalesPdf = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    let query = { status: "Completed" };

    if (startDate && endDate) {
      const startDateTime = new Date(startDate);
      startDateTime.setUTCHours(0, 0, 0, 0);

      const endDateTime = new Date(endDate);
      endDateTime.setUTCHours(23, 59, 59, 999);

      query.createdOn = { $gte: startDateTime, $lt: endDateTime };
    }

    const orders = await Order.find(query)
      .populate("user")
      .populate("products.productId")
      .sort({ createdOn: -1 });

    const pdfPath = 'sales-report.pdf';
    const doc = new PDFDocument({ margin: 50 });

    // Set response headers for PDF download
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=${pdfPath}`);

    // Pipe the PDF stream to the response
    doc.pipe(res);

    // Add header
    doc.fontSize(20).text('Sales Report', { align: 'center' }).moveDown();

    // Add date range if provided
    if (startDate && endDate) {
      doc.fontSize(12).text(`From: ${startDate} To: ${endDate}`, { align: 'center' }).moveDown();
    }

    const lineHeight = 15;

    orders.forEach((order, index) => {
      if (index > 0) {
        doc.moveDown(2); // Add extra space before each new order
      }

      // Add order details with equal line spacing
      const orderDetailsTop = doc.y;

      doc.fontSize(12).text(`Order ID: ${order._id}`, 50, orderDetailsTop);
      doc.text(`User: ${order.user.name}`, 50, orderDetailsTop + lineHeight);
      doc.text(`Date: ${new Date(order.date).toLocaleString()}`, 50, orderDetailsTop + 2 * lineHeight);
      doc.text(`Total Price: ₹${order.totalPrice}`, 50, orderDetailsTop + 3 * lineHeight).moveDown(2);

      // Add product table header
      const tableTop = doc.y;
      doc.fontSize(10);
      doc.text('Product Name', 50, tableTop);
      doc.text('Quantity', 300, tableTop);
      doc.text('Price', 400, tableTop);

      // Add a line below the headers
      doc.moveTo(50, tableTop + 15).lineTo(550, tableTop + 15).stroke();
      doc.moveDown(1);

      // Add product details
      order.products.forEach((product, i) => {
        if (doc.y > 700) { // Check if we are close to the bottom of the page
          doc.addPage(); // Add a new page if we are
        }
        const rowY = doc.y;
        doc.text(product.productId.productName, 50, rowY);
        doc.text(product.quantity.toString(), 300, rowY);
        doc.text(`₹${product.price}`, 400, rowY);
        doc.moveDown(1.5);
      });

      // Add a separator between orders
      if (index < orders.length - 1) {
        doc.moveDown(2).moveTo(50, doc.y).lineTo(550, doc.y).stroke();
        doc.moveDown();
      }
    });

    // Add footer
    const range = doc.bufferedPageRange();
    for (let i = range.start; i < range.start + range.count; i++) {
      doc.switchToPage(i);
      doc.fontSize(8).text(`Page ${i + 1} of ${range.count}`, { align: 'center' }, 0, doc.page.height - 50);
    }

    // Finalize the PDF and end the stream
    doc.end();
  } catch (error) {
    console.log(error.message);
    res.status(500).json({ message: "Internal Server Error" });
  }
};





module.exports = {
  loadLogin,
  verifyLogin,
  loadDashboard,
  logout,
  loadUserManagement,
  userblock,
  loadProductManagement,
  notFoundPage,
  salesReport,
  saleChart,
  downloadSalesPdf
};
