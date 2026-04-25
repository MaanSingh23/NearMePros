const ImageKit = require('imagekit');
require('dotenv').config();

const imagekit = new ImageKit({
    publicKey: process.env.IMAGEKIT_PUBLIC_KEY,
    privateKey: process.env.IMAGEKIT_PRIVATE_KEY,
    urlEndpoint: process.env.IMAGEKIT_URL_ENDPOINT
});

/**
 * Uploads a file to ImageKit
 * @param {Buffer} fileBuffer - The file buffer
 * @param {string} fileName - The name of the file
 * @returns {Promise<Object>} - The ImageKit upload response
 */
const uploadToImageKit = async (fileBuffer, fileName) => {
    try {
        const response = await imagekit.upload({
            file: fileBuffer, // required
            fileName: fileName, // required
            folder: '/services'
        });
        return response;
    } catch (error) {
        console.error('ImageKit Upload Error:', error);
        throw error;
    }
};

module.exports = {
    imagekit,
    uploadToImageKit
};
