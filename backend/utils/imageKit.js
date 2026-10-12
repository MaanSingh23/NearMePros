const ImageKit = require('imagekit');
require('dotenv').config();

// Created on first use so a missing key only breaks uploads,
// not the whole server at startup
let imagekit = null;

const getImageKit = () => {
    if (imagekit) return imagekit;

    const { IMAGEKIT_PUBLIC_KEY, IMAGEKIT_PRIVATE_KEY, IMAGEKIT_URL_ENDPOINT } = process.env;
    if (!IMAGEKIT_PUBLIC_KEY || !IMAGEKIT_PRIVATE_KEY || !IMAGEKIT_URL_ENDPOINT) {
        throw new Error('ImageKit is not configured. Set IMAGEKIT_PUBLIC_KEY, IMAGEKIT_PRIVATE_KEY and IMAGEKIT_URL_ENDPOINT.');
    }

    imagekit = new ImageKit({
        publicKey: IMAGEKIT_PUBLIC_KEY,
        privateKey: IMAGEKIT_PRIVATE_KEY,
        urlEndpoint: IMAGEKIT_URL_ENDPOINT
    });
    return imagekit;
};

if (!process.env.IMAGEKIT_PUBLIC_KEY || !process.env.IMAGEKIT_PRIVATE_KEY || !process.env.IMAGEKIT_URL_ENDPOINT) {
    console.warn('⚠️  ImageKit keys are missing - image uploads will fail until they are set.');
}

/**
 * Uploads a file to ImageKit
 * @param {Buffer} fileBuffer - The file buffer
 * @param {string} fileName - The name of the file
 * @returns {Promise<Object>} - The ImageKit upload response
 */
const uploadToImageKit = async (fileBuffer, fileName) => {
    try {
        const response = await getImageKit().upload({
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
    getImageKit,
    uploadToImageKit
};
