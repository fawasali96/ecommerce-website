const Category = require("../../models/categorySchema");
const Product = require("../../models/productSchema");
const { calculateEffectivePrice } = require("./productController");

const categoryInfo = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = 4;
    const skip = (page - 1) * limit;

    const categoryData = await Category.find({})
    .sort({createdAt: -1})
    .skip(skip)
    .limit(limit);

    const totalCategories = await Category.countDocuments();
    const totalPages = Math.ceil(totalCategories/limit);
    res.render("category", {
      cat: categoryData,
      currentPage: page,
      totalPages: totalPages,
      totalCategories: totalCategories
    });
    
  }
     catch (error) {
    console.error(error)
      res.redirect("/pageerror")
    }
  }



const addCategory = async (req, res) => {
  
    const { name, description } = req.body;

    try {

      const existingCategory = await Category.findOne({name});
      if(existingCategory) {
        return res.status(400).json({error: "Category already exists"});
      }
      const newCategory = new Category({
        name,
        description
      })
      await newCategory.save();
      return res.json({message: "Category added successfully"})
      
    } catch (error) {
      return res.status(500).json({error: "Internal server error"})
      
    }
    
}

const addCategoryOffer = async (req, res) => {
  try {
    const { categoryId, percentage } = req.body;
    const category = await Category.findById(categoryId);
    if (!category) {
      return res.status(404).json({ status: false, message: "Category not found" });
    }
    if (isNaN(percentage) || percentage < 0 || percentage > 99) {
      return res.json({ status: false, message: "Invalid percentage value" });
    }
    await Category.updateOne({ _id: categoryId }, { $set: { categoryOffer: percentage } });

    category.categoryOffer = percentage;
    await category.save();

    res.json({ status: true, message: "Offer added successfully" });
  } catch (error) {
    console.error("Error in addCategoryOffer:", error);
    return res.status(500).json({ status: false, message: "Internal Server Error" });
  }
};


const removeCategoryOffer = async (req, res) => {
  try {
    const categoryId = req.body.categoryId;
    const category = await Category.findById(categoryId);
    if (!category) {
      return res.status(404).json({ status: false, message: "Category not found" });
    }
    await Category.updateOne({ _id: categoryId }, { $set: { categoryOffer: null } });

    // Update all products in this category
    const products = await Product.find({ category: categoryId });
    for (const product of products) {
      product.salePrice = await calculateEffectivePrice(product);
      await product.save();
    }

    res.json({ status: true, message: "Offer removed successfully" });
  } catch (error) {
    console.error("Error in removeCategoryOffer:", error);
    return res.status(500).json({ status: false, message: "Internal Server Error" });
  }
};


const editCategoryOffer = async (req, res) => {
  try {
    const percentage = Number.parseInt(req.body.percentage);
    const categoryId = req.body.categoryId;

    if (isNaN(percentage) || percentage < 0 || percentage > 99) {
      return res.json({ status: false, message: "Invalid percentage value" });
    }

    const category = await Category.findById(categoryId);
    if (!category) {
      return res.status(404).json({ status: false, message: "Category not found" });
    }

    category.categoryOffer = percentage;
    await category.save();

    res.json({ status: true, message: "Offer updated successfully" });
  } catch (error) {
    console.error("Error in editCategoryOffer:", error);
    return res.status(500).json({ status: false, message: "Internal Server Error" });
  }
};


const getListCategory = async (req, res) => {
  try {
    let id = req.query.id;
    await Category.updateOne({_id: id}, {$set: {isListed: false }})
    res.redirect("/admin/category");
  } catch (error) {
    console.error(error)
    
    res.redirect("/pageerror");
  }
}

const getUnlistCategory = async (req, res) => {
  try {

    let id = req.query.id
    await Category.updateOne({_id: id}, {$set: {isListed: true }})
    
    res.redirect("/admin/category");

  } catch (error) {
    console.error(error)
    
    res.redirect("/pageerror");
  }
}

const getEditCategory = async (req, res) => {
  try {
    
    const id = req.query.id
    const category = await Category.findOne({_id: id})

       res.render("edit-category", {category: category})
} catch (error) {
    res.redirect("/pageerror")
}
}


const editCategory = async (req, res) => {
  try {
    const id = req.params.id
    const { categoryName, description } = req.body;
    const existingCategory = await Category.findOne({name: categoryName});

    if(existingCategory) {
        return res.status(400).json({error: "Category exists, please choose another name"})
    }

    const updateCategory = await Category.findByIdAndUpdate(id, {
        name: categoryName,
        description: description
    },{new: true});

    if(updateCategory) {
        res.redirect("/admin/category")
    } else {
        res.status(404).json({error: "Category not found"})
    }

   } catch (error) {
    console.error(error)
    res.status(500).json({ error: " Internal server error" })
  }
}


const deleteCategory = async (req, res) => {
    try {
      const id = req.params.id
      const deletedCategory = await Category.findByIdAndDelete(id)
      if (!deletedCategory) {
        return res.status(404).json({ success: false, message: "Category not found" })
      }
      res.json({ success: true, message: "Category deleted successfully" })
    } catch (error) {
      console.error("Error in deleteCategory:", error)
      res.status(500).json({ success: false, message: "Failed to delete category" })
    }
  }



module.exports = {
  categoryInfo,
  addCategory,
  addCategoryOffer,
  removeCategoryOffer,
  editCategoryOffer,
  getListCategory,
  getUnlistCategory,
  getEditCategory,
  editCategory,
  deleteCategory
}