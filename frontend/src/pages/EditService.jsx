import React, { useState, useEffect } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import axios from 'axios';
import { motion } from 'framer-motion';
import {
  PhotoIcon,
  XCircleIcon,
  CurrencyRupeeIcon,
  ShieldCheckIcon,
  ArrowRightIcon,
  ArrowPathIcon,
  BriefcaseIcon,
  AdjustmentsHorizontalIcon,
  SparklesIcon,
  InformationCircleIcon,
  ChevronLeftIcon
} from '@heroicons/react/24/outline';
import { StarIcon } from '@heroicons/react/24/solid';
import toast from 'react-hot-toast';

const API_BASE_URL = 'http://localhost:5000/api/services';

function EditService() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [images, setImages] = useState([]);
  const [existingImages, setExistingImages] = useState([]);
  const [formData, setFormData] = useState({
    name: '',
    category: '',
    description: '',
    price: ''
  });

  useEffect(() => {
    fetchServiceDetails();
  }, [id]);

  const fetchServiceDetails = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/${id}`);
      const service = response.data;
      setFormData({
        name: service.name,
        category: service.category,
        description: service.description,
        price: service.price
      });
      setExistingImages(service.images || []);
    } catch (error) {
      toast.error('Failed to load service details');
      navigate('/provider/services');
    } finally {
      setLoading(false);
    }
  };

  const categories = [
    'Salon for Women', 'Salon for Men', 'Home deep cleaning', 'Appliance Repair',
    'Electrician & Plumbing', 'AC Repair', 'Pest Control', 'House Painting'
  ];

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleImageUpload = (e) => {
    const files = Array.from(e.target.files);
    setImages([...images, ...files]);
  };

  const removeNewImage = (index) => {
    setImages(images.filter((_, i) => i !== index));
  };

  const removeExistingImage = (index) => {
    setExistingImages(existingImages.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);

    try {
      const editFormData = new FormData();
      Object.keys(formData).forEach(key => editFormData.append(key, formData[key]));
      
      // Append remaining existing images
      editFormData.append('existingImages', JSON.stringify(existingImages));
      
      // Append new images
      images.forEach(image => editFormData.append('images', image));

      await axios.put(`${API_BASE_URL}/${id}`, editFormData, {
        headers: {
          'x-auth-token': localStorage.getItem('token'),
          'Content-Type': 'multipart/form-data'
        }
      });

      toast.success('Service updated successfully');
      navigate('/provider/services');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Update failed');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0c0a09] flex flex-col items-center justify-center">
        <ArrowPathIcon className="h-10 w-10 text-emerald-500 animate-spin mb-4" />
        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-stone-600">Retrieving Service Intel...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-stone-50 dark:bg-[#0c0a09] pt-24 pb-32 transition-colors duration-500">
      <div className="section-shell relative z-10">
        
        {/* Header Section */}
        <div className="mb-12 flex flex-col md:flex-row items-center justify-between gap-8">
           <div>
              <Link to="/provider/services" className="group inline-flex items-center gap-2 text-emerald-500 font-black uppercase tracking-widest text-[10px] mb-4">
                <ChevronLeftIcon className="h-4 w-4" /> Back to Inventory
              </Link>
              <h1 className="text-4xl md:text-5xl font-black text-stone-950 dark:text-white tracking-tighter">Edit <span className="text-emerald-500">Service.</span></h1>
              <p className="text-stone-500 font-bold mt-2 dark:text-stone-400">Modify your professional listing and market presence.</p>
           </div>
           
           <div className="hidden lg:flex items-center gap-3 rounded-2xl bg-white/5 border border-stone-200 dark:border-stone-800 p-4 px-6 backdrop-blur-sm">
              <div className="h-10 w-10 flex items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-500">
                <ShieldCheckIcon className="h-6 w-6" />
              </div>
              <div>
                <p className="text-[10px] font-black uppercase text-stone-400">Asset Management</p>
                <p className="text-sm font-black text-stone-900 dark:text-white uppercase tracking-tighter">Live Marketplace Entity</p>
              </div>
           </div>
        </div>

        <div className="grid lg:grid-cols-[1.5fr_1fr] gap-16 items-start">
          <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}>
            <form onSubmit={handleSubmit} className="space-y-10">
              
              <div className="rounded-[2.5rem] bg-white border border-stone-200 p-10 dark:bg-stone-900/40 dark:border-stone-800 shadow-2xl">
                 <div className="flex items-center gap-3 mb-8">
                    <span className="h-10 w-10 flex items-center justify-center rounded-xl bg-stone-950 dark:bg-white text-white dark:text-stone-950">
                       <InformationCircleIcon className="h-6 w-6" />
                    </span>
                    <h2 className="text-xl font-black text-stone-950 dark:text-white">Core Information</h2>
                 </div>
                 
                 <div className="grid gap-8">
                    <div className="space-y-3">
                       <label className="text-xs font-black text-stone-400 uppercase tracking-widest pl-2">Display Name</label>
                       <input
                         type="text"
                         name="name"
                         value={formData.name}
                         onChange={handleChange}
                         required
                         className="w-full bg-stone-50 dark:bg-stone-950/50 border border-stone-200 dark:border-stone-800/50 rounded-2xl px-6 py-5 focus:ring-2 focus:ring-emerald-500 outline-none font-black text-lg dark:text-white"
                         placeholder="e.g., Premium Home Salon"
                       />
                    </div>
                    
                    <div className="grid md:grid-cols-2 gap-8">
                      <div className="space-y-3">
                         <label className="text-xs font-black text-stone-400 uppercase tracking-widest pl-2">Market Sector</label>
                         <div className="relative">
                           <select
                             name="category"
                             value={formData.category}
                             onChange={handleChange}
                             className="w-full bg-stone-50 dark:bg-stone-950/50 border border-stone-200 dark:border-stone-800/50 rounded-2xl px-6 py-5 focus:ring-2 focus:ring-emerald-500 outline-none font-black dark:text-white appearance-none"
                           >
                             {categories.map(cat => <option key={cat} className="bg-stone-900">{cat}</option>)}
                           </select>
                           <AdjustmentsHorizontalIcon className="absolute right-6 top-1/2 -translate-y-1/2 h-5 w-5 text-stone-400 pointer-events-none" />
                         </div>
                      </div>
                      <div className="space-y-3">
                         <label className="text-xs font-black text-stone-400 uppercase tracking-widest pl-2">Market Price (₹)</label>
                         <div className="relative">
                           <CurrencyRupeeIcon className="absolute left-6 top-1/2 -translate-y-1/2 h-6 w-6 text-emerald-500" />
                           <input
                             type="number"
                             name="price"
                             value={formData.price}
                             onChange={handleChange}
                             required
                             className="w-full bg-stone-50 dark:bg-stone-950/50 border border-stone-200 dark:border-stone-800/50 rounded-2xl pl-16 pr-6 py-5 focus:ring-2 focus:ring-emerald-500 outline-none font-black text-xl dark:text-white"
                             placeholder="0.00"
                           />
                         </div>
                      </div>
                    </div>
                 </div>
              </div>

              <div className="rounded-[2.5rem] bg-white border border-stone-200 p-10 dark:bg-stone-900/40 dark:border-stone-800 shadow-2xl">
                 <div className="flex items-center gap-3 mb-8">
                    <span className="h-10 w-10 flex items-center justify-center rounded-xl bg-stone-950 dark:bg-white text-white dark:text-stone-950">
                       <BriefcaseIcon className="h-6 w-6" />
                    </span>
                    <h2 className="text-xl font-black text-stone-950 dark:text-white">Service Specifications</h2>
                 </div>
                 <textarea
                   name="description"
                   value={formData.description}
                   onChange={handleChange}
                   required
                   rows="6"
                   className="w-full bg-stone-50 dark:bg-stone-950/50 border border-stone-200 dark:border-stone-800/50 rounded-2xl px-6 py-5 focus:ring-2 focus:ring-emerald-500 outline-none font-bold dark:text-white resize-none leading-relaxed"
                   placeholder="Update your service description..."
                 />
              </div>

              <div className="rounded-[2.5rem] bg-stone-950 p-10 text-white shadow-2xl">
                 <div className="flex items-center justify-between mb-8">
                    <div className="flex items-center gap-3">
                      <PhotoIcon className="h-6 w-6 text-emerald-500" />
                      <h2 className="text-xl font-black">Visual Media</h2>
                    </div>
                 </div>

                 <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
                    {existingImages.map((img, index) => (
                      <div key={`existing-${index}`} className="relative group rounded-2xl overflow-hidden aspect-square border border-white/10">
                        <img src={`http://localhost:5000/uploads/${img}`} className="w-full h-full object-cover" />
                        <button type="button" onClick={() => removeExistingImage(index)} className="absolute inset-0 bg-red-600/90 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity text-xs font-black uppercase tracking-tighter">
                          Remove
                        </button>
                      </div>
                    ))}
                    {images.map((image, index) => (
                      <div key={`new-${index}`} className="relative group rounded-2xl overflow-hidden aspect-square border border-emerald-500/30">
                        <img src={URL.createObjectURL(image)} className="w-full h-full object-cover" />
                        <button type="button" onClick={() => removeNewImage(index)} className="absolute inset-0 bg-red-600/90 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity text-xs font-black uppercase tracking-tighter">
                          Delete
                        </button>
                      </div>
                    ))}
                    {existingImages.length + images.length < 5 && (
                      <label className="relative flex flex-col items-center justify-center rounded-2xl aspect-square border-2 border-dashed border-white/10 bg-white/5 hover:border-emerald-500/50 hover:bg-emerald-500/5 transition-all cursor-pointer group">
                         <input type="file" multiple accept="image/*" onChange={handleImageUpload} className="hidden" />
                         <PlusIcon className="h-6 w-6 text-stone-600 group-hover:text-emerald-500" />
                         <span className="text-[8px] font-black uppercase text-stone-600 tracking-widest mt-2">Add Photo</span>
                      </label>
                    )}
                 </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-5 pt-10">
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 bg-emerald-500 text-stone-950 py-5 rounded-2xl font-black uppercase tracking-widest text-xs shadow-xl shadow-emerald-500/20 hover:bg-emerald-400 transition-all disabled:opacity-50 flex items-center justify-center gap-3"
                >
                  {saving ? 'Syncing Assets...' : <><SparklesIcon className="h-5 w-5" /> Push Changes Live</>}
                </button>
                <button
                  type="button"
                  onClick={() => navigate('/provider/services')}
                  className="px-12 py-5 rounded-2xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 text-stone-600 dark:text-stone-400 font-black uppercase tracking-widest text-xs hover:bg-stone-50 transition-all"
                >
                  Cancel
                </button>
              </div>
            </form>
          </motion.div>

          {/* Live Preview Column */}
          <div className="sticky top-28 space-y-8 hidden lg:block">
             <div className="flex items-center gap-3 pl-4">
                <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                <h3 className="text-xs font-black uppercase tracking-widest text-stone-500">Market Preview</h3>
             </div>
             
             <div className="rounded-[3rem] overflow-hidden bg-white border border-stone-200 dark:bg-stone-900 dark:border-stone-800 shadow-2xl animate-in fade-in slide-in-from-bottom-4 duration-1000">
                <div className="relative h-64 bg-stone-100 dark:bg-stone-800 flex items-center justify-center">
                   {(images.length > 0 || existingImages.length > 0) ? (
                     <img 
                       src={images.length > 0 ? URL.createObjectURL(images[0]) : `http://localhost:5000/uploads/${existingImages[0]}`} 
                       className="w-full h-full object-cover" 
                     />
                   ) : (
                     <PhotoIcon className="h-16 w-16 text-stone-300 dark:text-stone-700" />
                   )}
                   <div className="absolute top-6 left-6 px-4 py-1.5 rounded-full bg-white/20 backdrop-blur-md border border-white/20 text-[10px] font-black text-white tracking-widest uppercase">
                      {formData.category || 'Category'}
                   </div>
                </div>
                
                <div className="p-10">
                   <h4 className="text-3xl font-black text-stone-900 dark:text-white truncate tracking-tighter">
                      {formData.name || 'Service Title'}
                   </h4>
                   <div className="flex items-center gap-1 mt-3 text-amber-500">
                      {[1,2,3,4,5].map(i => <StarIcon key={i} className="h-3.5 w-3.5" />)}
                      <span className="text-[10px] font-black text-stone-500 ml-2 uppercase tracking-widest">5.0 Rating</span>
                   </div>
                   <p className="mt-8 text-stone-500 font-medium dark:text-stone-400 line-clamp-3 leading-relaxed text-sm">
                      {formData.description || 'Service narrative preview...'}
                   </p>
                   
                   <div className="mt-10 pt-10 border-t border-stone-100 dark:border-stone-800 flex items-center justify-between">
                      <div>
                        <p className="text-[10px] font-black text-stone-400 uppercase tracking-widest">Pricing Model</p>
                        <p className="text-3xl font-black text-stone-950 dark:text-white tracking-tighter">₹{formData.price || '0'}</p>
                      </div>
                      <div className="h-14 w-14 rounded-2xl bg-emerald-500 text-stone-950 flex items-center justify-center">
                         <ArrowRightIcon className="h-6 w-6" />
                      </div>
                   </div>
                </div>
             </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default EditService;

// Add this to the outline icons import if needed in the code block above
const PlusIcon = (props) => (
  <svg fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
  </svg>
);
