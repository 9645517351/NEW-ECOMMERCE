

const Category = require("../models/categoryModel")
const Product = require("../models/productModel")
const User = require("../models/userModel")


const loadCategoryManagement = async (req, res) => {

    try {

      const { page = 0 } = req.query;
      const limit = 5; // Set the number of users to display per page
  
      const currentPage = parseInt(page);
      const nextPage = currentPage + 1;

      const totalCategories = await Category.countDocuments({})
      const totalPages = Math.ceil(totalCategories  / limit);

      const category = await Category.find({})
        .skip(currentPage * limit)
        .limit(limit);;

      res.render('categoryManagement', { category ,
        currentPage,
        totalPages,
        nextPage,
        totalCategories
      })

    } catch (error) {
        console.log(error.message);
    }
}

const loadAddNewCategory = async (req, res) => {

    try {
        res.render('addNewCategory')

    } catch (error) {
        console.log(error.message);
    }
}



// Adjust the path to your model

const addNewCategory = async (req, res) => {
    try {
        const formData = req.body;
        const selectedList = formData["list-unlist"];
        const categoryName = formData.categoryName;
        const listed = selectedList === "list";

        if(categoryName.trim() === '') return res.status(200).json({success:false,message:"Category name is required"})


        // Check if the category already exists

        const existingCategory = await Category.findOne({
            categoryName: { $regex: new RegExp(`^${categoryName}$`, 'i') }
        });

        if (existingCategory) {
            return res.json({ success: false, message: "Category already exists." });
        }

        // Create a new category
        const category = new Category({
            categoryName,
            listed,
        });

        await category.save();

        res.json({
            success: true,
            message: "Category added successfully.",
            newCategory: category
        });

    } catch (error) {
        console.error(error.message);
        res.status(500).json({ success: false, message: "Server error. Please try again later." });
    }
};

const deleteCategory = async (req, res) => {
    try {
        const { categoryId } = req.params;
        const deletedCategory = await Category.findByIdAndDelete(categoryId);
        if (!deletedCategory) {
            return res.status(404).json({ success: false, message: 'Category not found' });
        }

        // Send success response
        res.status(200).json({ success: true, message: 'Category deleted successfully' });



    } catch (error) {
        console.log(error.message);
    }
}



const editCategory = async (req, res) => {
    console.log('Inside edit controller');
    const { categoryId } = req.params;
    const { categoryName, listed } = req.body;

    try {

        if(categoryName.trim() === '') return res.status(200).json({success:false,message:"Category name is required"})

        const trimmedCategoryName = categoryName.trim().toLowerCase();

        // Check if the category name already exists (excluding the current category)
        const existingCategory = await Category.findOne({
            categoryName: { $regex: new RegExp(`^${trimmedCategoryName}$`, 'i') },
            _id: { $ne: categoryId }
        });
        if (existingCategory) {
            return res.status(200).json({ success: false, message: 'Category name already exists' });
        }

        // Proceed to update if the category name is unique
        const updateData = {
            categoryName: trimmedCategoryName,
            listed: listed === 'true'
        };

        const updatedCategory = await Category.findByIdAndUpdate(categoryId, updateData, { new: true });
        if (!updatedCategory) {
            return res.status(404).json({ success: false, message: 'Category not found' });
        }

        return res.json({ success: true, category: updatedCategory });
    } catch (error) {
        console.error('Error updating category:', error);
        return res.status(500).json({ success: false, message: 'Error updating category' });
    }
};


const addCategoryOffer = async (req, res) => {
    console.log('success.........');
    try {
      const {  offer } = req.body;
      const {categoryId} = req.params;
  
      const categoryData = await Category.findById(categoryId);
  
      if (!categoryData) {
        return res.status(404).json({ success: false, message: "Category not found" });
      }
  
      const productCategory = await Product.find({ category : categoryId })
      
      for (const product of productCategory) {
        const discountAmount = Math.floor(product.regularPrice * (offer / 100));
        product.productOffer = discountAmount;
        product.salePrice -= discountAmount; // Reduce from the current sale price
        await product.save();
      }
      
      categoryData.categoryOffer = offer;
      await categoryData.save();
  
      return res.status(200).json({
        success: true,
        message: "Category offer successfully applied.",
      });
  
    } catch (error) {
  
      console.error(error.message);
  
      return res.status(500).json({
        success: false,
        message: "Internal Server Error",
      });
  
    }
  
  };

  const removeCategoryOffer = async(req,res)=>{
    try {
        const {  offer } = req.body;
        const {categoryId} = req.params;
      
      const category = await Category.findById(categoryId)
  
      if (!category) {
        res.status(404).json({ success : false , message : "Category Not Found...!" })
      }
  
  
      const products = await Product.find({ category : categoryId })
  
      for(const product of products){
  
        product.salePrice = Number(product.productOffer) + Number(product.salePrice)
        product.productOffer = 0
        await product.save()
      }
      category.categoryOffer = 0
      await category.save()
      res.status(200).json({
        success : true,
        message : "Category Offer Removed Successfully..."
      })
      
    } catch (error) {
      console.log(error.message);
    }
  }


module.exports = {
    loadCategoryManagement,
    loadAddNewCategory,
    addNewCategory,
    deleteCategory,
    editCategory,
    addCategoryOffer,
    removeCategoryOffer
    
}
