

const Category = require("../models/categoryModel")

const loadCategoryManagement = async (req, res) => {

    try {
        const category = await Category.find();
        res.render('categoryManagement', { category })

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

// Assuming you are using a database like MongoDB with Mongoose




module.exports = {
    loadCategoryManagement,
    loadAddNewCategory,
    addNewCategory,
    deleteCategory,
    editCategory,
    
}
