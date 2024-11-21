    const Product = require("../models/productModel")
    const Category = require("../models/categoryModel")

    const loadProduct = async (req, res) => {
        try {
            const categories = await Category.find()
            res.render("addproduct", { categories })
        } catch (error) {
            console.log(error.message);
        }

    }
    

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
    
    
            if (req.files.croppedImage && req.files.croppedImage.length > 0) {
                allImages = allImages.concat(req.files.croppedImage.map(file => ({ filename: file.filename })));
            }
    
            const categoryData = await Category.findOne({ _id: myCategory });
            
            if (!categoryData) {
                // Returning here to ensure only one response is sent
                return res.status(400).json({ message: "Category not found", success: false });
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
                return res.status(200).json({message:"Product added successfull",success:true})
            }
            console.log("Failed to add product");
            return res.status(500).json({ message: "Failed to add product.", success: false });
        } catch (error) {
            console.log("error in add product", error.message);
            // Ensure only one response is sent in case of an error
            return res.status(500).json({ message: "An error occurred.", success: false });
        }
    };


    const deleteProduct = async (req, res) => {
        try {
        const { id } = req.query;
        const productData = await Product.deleteOne({ _id: id }); 

        if (productData.deletedCount > 0) {
            res.redirect('/admin/product-management')
        } else {
            res.status(404).json({ success: false, message: "Product not found." });
        }
        } catch (error) {
        console.log(error.message);
        res.status(500).json({ success: false, message: "Internal Server Error." });
        }
    };






    const loadeditProduct = async(req,res)=>{
        try {
            console.log("iuiu")
            const { id } = req.query

            const productData = await Product.findByIdAndUpdate({ _id : id })
            const categoryData = await Category.find({})

            if (productData) {
                res.render("edit-product",{
                    title:"Edit Product",
                    product:productData,
                    category:categoryData
                    })
                }
            } catch (error) {
            console.log(error.message);
            }
    }


    const UpdateCreateEditProduct = async(req,res)=>{
        try {
        const _id = req.query.id;
        const {
            productName,
            description,
            marketPrice,
            salePrice,
            myCategory,
            quantity
        } = req.body;

        const imageFiles = req.files;

        let imageArray = [];
        if (imageFiles) {
            imageArray = imageFiles.map((file) => ({ filename: file.filename }));
        }

        const existingProduct = await Product.findById(_id);
        if (!existingProduct) {
            return res.status(404).json({ message: 'Product not found' });
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
                image: updatedImage
            },
            { new: true }
        );

        if (productData) {
            return res.redirect('/admin/product-management');
        } else {
            return res.status(500).json({ message: 'Failed to update the product' });
        }
    } catch (error) {
        console.error(error.message);
        return res.status(500).json({ message: 'Internal Server Error' });
    }
    }


    const loadShop = async(req,res)=>{
        try {
            const products= await Product.find({})
            res.render('shop',{products})
            
        } catch (error) {
            console.log(error.message);
        }
    }
      


    const loadProductDetail = async(req,res)=>{
        try {
            const user_id = req.query.id;
            const productData = await Product.findById({ _id : user_id })
            const loggedIn = req.session.isAuth ? true : false;
            const category = await Category.find({});
            res.render("productDetail",{
                loggedIn,
                title:"product Details",
                currentPage:"Shop",
                products:productData,
                category:category,
            })
            
        } catch (error) {
            console.log(error.message);
        }
    }

    

// controllers/productController.js
const fs = require('fs');
const path = require('path');
const { log } = require("console")

const deleteImage = async (req, res) => {
    try {
        const { productId, filename } = req.params;
        const product = await Product.findById(productId);
        
        if (!product) {
            return res.status(404).send('Product not found');
        }

        // Filter out the image to be deleted
        product.image = product.image.filter(img => img.filename !== filename);

        // Save the updated product
        await product.save();

        // Delete the image file from the server
        const filePath = path.join(__dirname, '..', 'public', 'assets', 'uploads', filename);
        fs.unlink(filePath, (err) => {
            if (err) {
                console.error('Error deleting the image file:', err);
                return res.status(500).send('Error deleting the image file');
            }
            res.send('Image deleted successfully');
        });
    } catch (error) {
        console.error('Error deleting the image:', error);
        res.status(500).send('Error deleting the image');
    }
};


const searchProduct = async (req, res) => {
    try {
        const query = req.query.query;
        const products = await Product.find({
            productName: { $regex: query, $options: 'i' } 
        });
        res.json({ products });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Internal server error' });
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
        deleteImage
        
    };
