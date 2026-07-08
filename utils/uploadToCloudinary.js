const cloudinary = require('../config/cloudinary');

// Uploads a file buffer (from Multer's memoryStorage) to Cloudinary.
// Returns { public_id, url } — the same shape used for product images.
const uploadToCloudinary = (fileBuffer, folder = 'ecommerce/avatars') => {
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      { folder },
      (error, result) => {
        if (error) return reject(error);
        resolve({ public_id: result.public_id, url: result.secure_url });
      }
    );
    uploadStream.end(fileBuffer);
  });
};

// Deletes a previously uploaded image by its public_id
const deleteFromCloudinary = (publicId) => {
  return cloudinary.uploader.destroy(publicId);
};

module.exports = { uploadToCloudinary, deleteFromCloudinary };