const Product = require("../models/productModel");
const Category = require("../models/categoryModel");
const Wishlist = require("../models/wishlistModel");
const Cart = require("../models/cartModel");

const MAX_QUANTITY_PER_PERSON = 10;

const loadProduct = async (req, res) => {
  try {
    const categories = await Category.find();
    res.render("addproduct", { categories });
  } catch (error) {
    console.log(error.message);
  }
};

const createNewProduct = async (req, res) => {
  console.log("in createproduct");
  try {
    const {
      productName,
      description,
      marketPrice,
      salePrice,
      myCategory,
      quantity,
    } = req.body;

    let allImages = [];

    console.log(req.files, "req.files");

    if (req.files.croppedImage && req.files.croppedImage.length > 0) {
      allImages = allImages.concat(
        req.files.croppedImage.map((file) => ({ filename: file.filename }))
      );
    }

    const categoryData = await Category.findOne({ _id: myCategory });

    if (!categoryData) {
      // Returning here to ensure only one response is sent
      return res
        .status(400)
        .json({ message: "Category not found", success: false });
    }

    const product = new Product({
      productName: productName,
      description: description,
      regularPrice: marketPrice,
      salePrice: salePrice,
      category: categoryData._id,
      quantity: quantity,
      image: allImages,
    });

    const productData = await product.save();

    if (productData) {
      console.log("Product added successfully");
      return res
        .status(200)
        .json({ message: "Product added successfull", success: true });
    }
    console.log("Failed to add product");
    return res
      .status(500)
      .json({ message: "Failed to add product.", success: false });
  } catch (error) {
    console.log("error in add product", error.message);
    // Ensure only one response is sent in case of an error
    return res
      .status(500)
      .json({ message: "An error occurred.", success: false });
  }
};

const deleteProduct = async (req, res) => {
  try {
    const { id } = req.query;
    const productData = await Product.deleteOne({ _id: id });

    if (productData.deletedCount > 0) {
      res.redirect("/admin/product-management");
    } else {
      res.status(404).json({ success: false, message: "Product not found." });
    }
  } catch (error) {
    console.log(error.message);
    res.status(500).json({ success: false, message: "Internal Server Error." });
  }
};

const loadeditProduct = async (req, res) => {
  try {
    console.log("iuiu");
    const { id } = req.query;

    const productData = await Product.findByIdAndUpdate({ _id: id });
    const categoryData = await Category.find({});

    if (productData) {
      res.render("edit-product", {
        title: "Edit Product",
        product: productData,
        category: categoryData,
      });
    }
  } catch (error) {
    console.log(error.message);
  }
};

const UpdateCreateEditProduct = async (req, res) => {
  try {
    const _id = req.query.id;
    const {
      productName,
      description,
      marketPrice,
      salePrice,
      myCategory,
      quantity,
    } = req.body;

    const imageFiles = req.files;

    let imageArray = [];
    if (imageFiles) {
      imageArray = imageFiles.map((file) => ({ filename: file.filename }));
    }

    const existingProduct = await Product.findById(_id);
    if (!existingProduct) {
      return res.status(404).json({ message: "Product not found" });
    }

    const updatedImage = [...existingProduct.image, ...imageArray];

    const productData = await Product.findByIdAndUpdate(
      _id,
      {
        productName,
        description,
        regularPrice: marketPrice,
        salePrice,
        category: myCategory,
        quantity,
        image: updatedImage,
      },
      { new: true }
    );

    if (productData) {
      return res.redirect("/admin/product-management");
    } else {
      return res.status(500).json({ message: "Failed to update the product" });
    }
  } catch (error) {
    console.error(error.message);
    return res.status(500).json({ message: "Internal Server Error" });
  }
};

const loadShop = async (req, res) => {
  try {
    const user_id = req.session.user_id;

    const { category, searchQuery, sort, page = 0 } = req.query;
    const categories = await Category.find({listed: true});
    const listedCategoryIds = categories.map(cat => cat._id);

    const wishlist = user_id
      ? await Wishlist.find({ user_id: user_id })
      : await Wishlist.find({ user_id: null });

    const wishlistCount = wishlist.length || 0;

    const cartCount = user_id
      ? await Cart.countDocuments({ user_id: user_id })
      : await Cart.countDocuments({ user_id: null });

    const limit = 6; // Set the number of products to display per page
    const currentPage = parseInt(page);
    const nextPage = currentPage + 1;

    let query = { category: { $in: listedCategoryIds } };

    if (category) {
     
      if (!listedCategoryIds.includes(category)) {
        return res.status(404).send("Category not found or not listed");
      }
      query.category = category;
    }

  
    if (searchQuery) {
      query.productName = { $regex: new RegExp(searchQuery, "i") }; // Case-insensitive search
    }

    let sortOption = {};
    switch (sort) {
      case "price-asc":
        sortOption.salePrice = 1; 
        break;
      case "price-desc":
        sortOption.salePrice = -1; 
        break;
      case "popularity":
        sortOption.popularity = -1; 
        break;
      case "average-ratings":
        sortOption.averageRating = -1; 
        break;
      case "new-arrivals":
        sortOption.createdAt = -1; 
        break;
      case "a-z":
        sortOption.productName = 1; 
        break;
      case "z-a":
        sortOption.productName = -1; 
        break;
      default:
        sortOption = {}; 
    }

    const totalProducts = await Product.countDocuments(query);
    const totalPages = Math.ceil(totalProducts / limit);

    const products = await Product.find(query)
      .sort(sortOption)
      .skip(currentPage * limit)
      .limit(limit);

    res.render("shop", {
      products,
      categories,
      wishlistCount,
      cartCount,
      currentPage,
      nextPage,
      totalPages,
      sort, 
      category // Pass the selected category to the view
    });
  } catch (error) {
    console.error(error.message);
    res.status(500).send("Internal Server Error");
  }
};

  

const loadProductDetail = async (req, res) => {
  try {
    const productId = req.query.id;
    const user_id = req.session.user_id;

    const productData = await Product.findById({ _id: productId });
    const categories = await Category.find({});
    const loggedIn = req.session.isAuth ? true : false;
    const category = await Category.find({});

    const wishlist = user_id
      ? await Wishlist.find({ user_id: user_id })
      : await Wishlist.find({ user_id: null });

    const wishlistCount = wishlist.length || 0;

    const cartCount = user_id
      ? await Cart.countDocuments({ user_id: user_id })
      : await Cart.countDocuments({ user_id: null });

    res.render("productDetail", {
      loggedIn,
      title: "product Details",
      currentPage: "Shop",
      products: productData,
      category: category,
      categories,
      wishlistCount,
      cartCount,
    });
  } catch (error) {
    console.log(error.message);
  }
};

// controllers/productController.js
const fs = require("fs");
const path = require("path");
const { log } = require("console");

const deleteImage = async (req, res) => {
  try {
    const { productId, filename } = req.params;
    const product = await Product.findById(productId);

    if (!product) {
      return res.status(404).send("Product not found");
    }

    // Filter out the image to be deleted
    product.image = product.image.filter((img) => img.filename !== filename);

  
    await product.save();

    const filePath = path.join(
      __dirname,
      "..",
      "public",
      "assets",
      "uploads",
      filename
    );
    fs.unlink(filePath, (err) => {
      if (err) {
        console.error("Error deleting the image file:", err);
        return res.status(500).send("Error deleting the image file");
      }
      res.send("Image deleted successfully");
    });
  } catch (error) {
    console.error("Error deleting the image:", error);
    res.status(500).send("Error deleting the image");
  }
};

const searchProduct = async (req, res) => {
  try {
    const query = req.query.query;
    const products = await Product.find({
      productName: { $regex: query, $options: "i" },
    });
    res.json({ products });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Internal server error" });
  }
};

const addProductOffer = async (req, res) => {
  try {
    const { productId, offer } = req.body;

    if (
      !productId ||
      isNaN(offer) ||
      parseInt(offer) < 0 ||
      parseInt(offer) > 100
    ) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid input." });
    }

    const product = await Product.findById(productId);
    if (product) {
      const discount = Math.floor(product.regularPrice * (offer / 100));
      product.productOffer = discount;
      product.salePrice = product.regularPrice - discount;
      await product.save();

      return res
        .status(200)
        .json({
          success: true,
          salePrice: product.salePrice,
          message: "Offer applied successfully.",
        });
    } else {
      return res
        .status(404)
        .json({ success: false, message: "Product not found." });
    }
  } catch (error) {
    console.error(error.message);
    return res.status(500).json({ success: false, message: "Server error." });
  }
};

const removeOffer = async (req, res) => {
  try {
    const { productId } = req.body;

    const product = await Product.findById(productId);
    if (product) {
      product.salePrice = product.regularPrice;
      product.productOffer = 0;
      await product.save();

      return res
        .status(200)
        .json({
          success: true,
          salePrice: product.salePrice,
          message: "Offer removed successfully.",
        });
    } else {
      return res
        .status(404)
        .json({ success: false, message: "Product not found." });
    }
  } catch (error) {
    console.error(error.message);
    return res.status(500).json({ success: false, message: "Server error." });
  }
};

module.exports = {
  loadProduct,
  createNewProduct,
  deleteProduct,
  loadeditProduct,
  UpdateCreateEditProduct,
  searchProduct,
  loadProductDetail,
  loadShop,
  deleteImage,
  addProductOffer,
  removeOffer,
};
