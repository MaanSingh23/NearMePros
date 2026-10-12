import toast from 'react-hot-toast';

// Must match the upload rules in backend/routes/services.js
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
const MAX_SIZE = 10 * 1024 * 1024; // 10MB

// Returns only the files the server will accept, with a toast for each rejected one
export const validateImages = (files) =>
  files.filter((file) => {
    if (!ALLOWED_TYPES.includes(file.type)) {
      toast.error(`${file.name}: only JPG, PNG, GIF or WEBP images are allowed`);
      return false;
    }
    if (file.size > MAX_SIZE) {
      toast.error(`${file.name}: image must be 10MB or smaller`);
      return false;
    }
    return true;
  });
