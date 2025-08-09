const Product = require("../../models/productSchema");
const Category = require("../../models/categorySchema");
const Brand = require("../../models/brandSchema");
const User = require("../../models/userSchema")
const fs = require("fs");
const path = require("path");
const sharp = require("sharp");


const calculateEffectivePrice = async (product) => {
  const category = await Category.findById(product.category);
  const categoryOffer = category ? category.categoryOffer || 0 : 0;
  const productOffer = product.productOffer || 0;

  const effectiveOffer = Math.max(categoryOffer, productOffer);
  

  if (effectiveOffer > 0) {
    const discountedPrice = product.salePrice * (1 - effectiveOffer / 100);
    return Math.round(discountedPrice * 100) / 100;
  }

  // No offer — use manually set salePrice if available
  return product.salePrice || product.regularPrice;
};


const getProductAddPage = async (req, res) => {
  try {

    const category = await Category.find({ isListed: true });
    const brand = await Brand.find({isBlocked: false});
    res.render("product-add", {
      cat: category,
      brand: brand
    });
  } catch (error) {
    res.redirect("/pageerror")
  }
}


const addProducts = async (req, res) => {
    try {

        const products = req.body;
        const productExists = await Product.findOne({
            productName: products.productName
        });

        if(!productExists) {
            const images = [];

            if(req.files && req.files.length > 0) {
                for(let i = 0; i < req.files.length; i++) {
                    const originalImagePath = req.files[i].path;

                    const resizedImagePath = path.join("public", "uploads", "product-images", req.files[i].filename);
                    await sharp(originalImagePath).resize({width:440, height:440}).toFile(resizedImagePath);
                    images.push(req.files[i].filename)
                }
            }

            const categoryId = await Category.findOne({name:products.category});

            if(!categoryId) {
                return res.status(400).json("Invalid category name")
            }

            const newProduct = new Product({
                productName: products.productName,
                description: products.description,
                brand: products.brand,
                category: categoryId._id,
                regularPrice: products.regularPrice,
                salePrice: products.salePrice,
                createdOn: new Date(),
                quantity: products.quantity,
                size: products.size,
                color: products.color,
                productImage: images,
                status: "Available"
            })

            await newProduct.save();
            return res.redirect("/admin/addProducts")
            
        } else {
            return res.status(400).json("Product already exists. Please try with another name")
        }
        
    } catch (error) {
        console.error("Error saving product");
        return res.redirect("/admin/pageerror")
    }
}



const getAllProducts = async (req, res) => {
  try {
    const search = req.query.search || "";
    const page = parseInt(req.query.page) || 1;
    const limit = 4;

    const query = {
      $or: [
        { productName: { $regex: new RegExp(".*" + search + ".*", "i") } },
        { brand: { $regex: new RegExp(".*" + search + ".*", "i") } }
      ]
    };

    const productData = await Product.find(query)
      .sort({ _id: -1 }) // Newest first
      .skip((page - 1) * limit)
      .limit(limit)
      .populate("category")
      .exec();

    const count = await Product.countDocuments(query);
    const totalPages = Math.ceil(count / limit);
    const category = await Category.find({ isListed: true });
    const productsWithEffectivePrices = await Promise.all(productData.map(async (product) => {
      const effectivePrice = await calculateEffectivePrice(product);
      return {
        ...product.toObject(),
        salePrice: effectivePrice
      };
    }));

    if (category.length > 0) {
      res.render("products", {
        data: productsWithEffectivePrices,
        currentPage: page,
        totalPages: totalPages,
        cat: category,
      });
    } else {
      res.render("page-404");
    }
  } catch (error) {
    console.error("Error fetching products:", error);
    res.render("page-404");
  }
};


const addProductOffer = async (req, res) => {
  try {
    const { productId, percentage } = req.body;
    const product = await Product.findById(productId);

    if (!product) {
      return res.status(404).json({ status: false, message: "Product not found" });
    }

    product.productOffer = parseInt(percentage);
    await product.save();

    res.json({ status: true, message: "Offer added successfully" });
  } catch (error) {
    console.error("Error in addProductOffer:", error);
    res.status(500).json({ status: false, message: "Internal server error" });
  }
};


const removeProductOffer = async (req, res) => {
  try {
    const { productId } = req.body;
    const product = await Product.findById(productId);

    if (!product) {
      return res.status(404).json({ status: false, message: "Product not found" });
    }

    product.productOffer = 0;
    product.salePrice = await calculateEffectivePrice(product);
    await product.save();

    res.json({ status: true, message: "Offer removed successfully" });
  } catch (error) {
    console.error("Error in removeProductOffer:", error);
    res.status(500).json({ status: false, message: "Internal server error" });
  }
};



const blockProduct = async (req, res) => {
    try {

        let id = req.query.id;
        await Product.updateOne({_id: id}, {$set: {isBlocked: true}})
        res.redirect("/admin/products");
    } catch (error) {
       res.redirect("/pageerror"); 
    }
}

const unBlockProduct = async (req, res) => {
    try {

        let id = req.query.id;
        await Product.updateOne({_id: id}, {$set: {isBlocked: false}})
        res.redirect("/admin/products");
        
    } catch (error) {
        res.redirect("/pageerror"); 
    }
}


const getEditProduct = async (req, res) => {
    try {

        const id = req.query.id;
        const product = await Product.findOne({_id: id});
        const category = await Category.find({});
        const brand = await Brand.find({});
        res.render("edit-product", {
            product: product,
            cat: category,
            brand: brand
        })
        
    } catch (error) {
        
        res.redirect("/pageerror")
    }
}


const editProduct = async (req, res) => {
    try {

        const id = req.params.id;
        console.log("Editing product ID:", id);
        const product = await Product.findOne({_id: id});
        const data = req.body;
        console.log("Received form data:", data);
        const existingProduct = await Product.findOne({
            productName: data.productName,
            _id: {$ne: id}
        })
        
        if(existingProduct) {
            return res.status(400).json({error: "Product with this name already exists. Please try with another name"});
        }
        const images = [];
        if(req.files && req.files.length > 0) {
            for(let i = 0; i < req.files.length; i++) {
                const originalImagePath = req.files[i].path;
                const resizedImagePath = path.join("public", "uploads", "product-images", req.files[i].filename);
                await sharp(originalImagePath).resize({width:440, height:440}).toFile(resizedImagePath);
                images.push(req.files[i].filename);
            }
        }

        const updateFields = {
            productName: data.productName,
            description: data.description,
            brand: data.brand,
            category: data.category,
            regularPrice: data.regularPrice,
            salePrice: data.salePrice,
            quantity: data.quantity,
            size: data.size,
            color: data.color
        }

        const updateQuery = { $set: updateFields };

        if (images.length > 0) {
            updateQuery.$push = { productImage: { $each: images } };
        }

        const updated = await Product.findByIdAndUpdate(id, updateQuery, { new: true });
        console.log("Product updated:", updated);
        res.redirect("/admin/products");

    } catch (error) {
        
        console.error(error);
        res.redirect("/pageerror");
    }
  
}


const deleteSingleImage = async (req, res) => {
    try {

        const {imageNameToServer, productIdToServer} = req.body;
        const product = await Product.findByIdAndUpdate(productIdToServer, {$pull: {productImage: imageNameToServer}});
        const imagePath = path.join("public", "uploads", "re-image", imageNameToServer);
        if(fs.existsSync(imagePath)) {
            fs.unlinkSync(imagePath);
            console.log(`Image ${imageNameToServer} deleted successfully`);
            
        } else {
            console.log(`Image ${imageNameToServer} not found`);
            
        }
        res.json({ success: true, message: "Image deleted successfully" });

        
    } catch (error) {
        
        res.redirect("/pageerror")
    }
}

module.exports = {
    calculateEffectivePrice,
    getProductAddPage,
    addProducts,
    getAllProducts,
    addProductOffer,
    removeProductOffer,
    blockProduct,
    unBlockProduct,
    getEditProduct,
    editProduct,
    deleteSingleImage
}