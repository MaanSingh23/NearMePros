import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';
import {
  BriefcaseIcon,
  PlusIcon,
  PencilSquareIcon,
  TrashIcon,
  ArrowPathIcon,
  MagnifyingGlassIcon,
  TagIcon,
  CurrencyRupeeIcon,
  EyeIcon,
  ChevronLeftIcon
} from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';

const API_BASE_URL = `${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/services`;

function ManageServices() {
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [deleteLoading, setDeleteLoading] = useState(null);

  useEffect(() => {
    fetchServices();
  }, []);

  const fetchServices = async () => {
    setLoading(true);
    try {
      const response = await axios.get(`${API_BASE_URL}/provider`, {
        headers: { 'x-auth-token': localStorage.getItem('token') }
      });
      setServices(response.data);
    } catch (error) {
      toast.error('Failed to load services catalogue');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to retire this service? This action is permanent.')) return;
    setDeleteLoading(id);
    try {
      await axios.delete(`${API_BASE_URL}/${id}`, {
        headers: { 'x-auth-token': localStorage.getItem('token') }
      });
      toast.success('Service successfully removed');
      setServices(services.filter(s => s._id !== id));
    } catch (error) {
      toast.error('Failed to delete service');
    } finally {
      setDeleteLoading(null);
    }
  };

  const filteredServices = services.filter(service =>
    service.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    service.category.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-stone-50 dark:bg-[#0c0a09] pt-24 pb-20 transition-colors duration-500">
      <div className="section-shell">
        
        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-8 mb-12">
          <div>
            <Link to="/provider/dashboard" className="group inline-flex items-center gap-2 text-emerald-500 font-black uppercase tracking-widest text-[10px] mb-4">
              <ChevronLeftIcon className="h-4 w-4" /> Back to Intelligence
            </Link>
            <h1 className="text-4xl md:text-6xl font-black text-stone-950 dark:text-white tracking-tighter">Services <span className="text-emerald-500">Inventory.</span></h1>
            <p className="text-stone-500 font-bold mt-2 dark:text-stone-400">Total active listings: {services.length}</p>
          </div>
          
          <Link to="/provider/services/new" className="btn-primary inline-flex items-center gap-3 py-4 px-8">
            <PlusIcon className="h-5 w-5" /> Add New Offering
          </Link>
        </div>

        {/* Global Toolbar */}
        <div className="flex flex-col md:flex-row gap-4 mb-10">
          <div className="relative flex-1">
            <MagnifyingGlassIcon className="absolute left-6 top-1/2 -translate-y-1/2 h-5 w-5 text-stone-400" />
            <input 
              type="text" 
              placeholder="Filter by name or industry sector..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-3xl pl-14 pr-6 py-5 focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 outline-none transition-all font-bold dark:text-white"
            />
          </div>
          <button onClick={fetchServices} className="px-8 py-5 rounded-3xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 text-stone-600 dark:text-stone-400 font-bold hover:bg-stone-50 transition-all flex items-center justify-center gap-3">
             <ArrowPathIcon className={`h-5 w-5 ${loading ? 'animate-spin' : ''}`} /> Sync Data
          </button>
        </div>

        {/* Service Grid */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-40">
            <ArrowPathIcon className="h-12 w-12 text-emerald-500 animate-spin" />
            <p className="mt-4 text-xs font-black uppercase tracking-widest text-stone-500">Syncing Catalog...</p>
          </div>
        ) : filteredServices.length === 0 ? (
          <div className="text-center py-40 rounded-[3rem] border-2 border-dashed border-stone-200 dark:border-stone-800">
             <BriefcaseIcon className="h-16 w-16 text-stone-300 mx-auto mb-6" />
             <h3 className="text-2xl font-black text-stone-950 dark:text-white">No services detected</h3>
             <p className="text-stone-500 font-bold mt-2">Try adjusting your filters or launch a new service offering.</p>
          </div>
        ) : (
          <div className="grid gap-6">
            <AnimatePresence>
              {filteredServices.map((service, index) => (
                <motion.div 
                  key={service._id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className="group relative overflow-hidden rounded-[2.5rem] bg-white border border-stone-200 p-6 dark:bg-stone-900 dark:border-stone-800 shadow-xl shadow-stone-900/5 hover:border-emerald-500/30 transition-all"
                >
                  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-8">
                    <div className="flex items-center gap-6">
                      <div className="relative h-20 w-20 flex-shrink-0 overflow-hidden rounded-2xl border border-stone-100 dark:border-stone-800 shadow-lg">
                        <img 
                          src={service.images?.[0] ? `${import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:5000'}/uploads/${service.images[0]}` : 'https://via.placeholder.com/150'} 
                          className="h-full w-full object-cover transition duration-500 group-hover:scale-110" 
                          alt={service.name} 
                        />
                      </div>
                      <div>
                        <div className="flex items-center gap-3 mb-1">
                          <span className="text-[10px] font-black uppercase tracking-widest text-emerald-500 bg-emerald-500/10 px-2.5 py-1 rounded-full">{service.category}</span>
                          <span className="text-[10px] font-black uppercase tracking-widest text-stone-400">ID: {service._id.slice(-6)}</span>
                        </div>
                        <h3 className="text-2xl font-black text-stone-950 dark:text-white group-hover:text-emerald-500 transition-colors">{service.name}</h3>
                        <p className="text-sm font-bold text-stone-500 line-clamp-1 max-w-xl dark:text-stone-400">{service.description}</p>
                      </div>
                    </div>

                    <div className="flex flex-wrap lg:flex-nowrap items-center gap-10">
                      <div className="text-right border-r border-stone-100 dark:border-stone-800 pr-10">
                         <p className="text-[10px] font-black uppercase text-stone-400 tracking-widest mb-1">Base Price</p>
                         <p className="text-3xl font-black text-stone-950 dark:text-white flex items-center justify-end gap-1">
                           <CurrencyRupeeIcon className="h-6 w-6 text-emerald-500" /> {service.price}
                         </p>
                      </div>

                      <div className="flex items-center gap-3">
                        <Link to={`/service/${service._id}`} className="flex h-12 w-12 items-center justify-center rounded-2xl bg-stone-50 text-stone-600 hover:bg-stone-100 dark:bg-stone-800 dark:text-stone-400 dark:hover:bg-stone-700 transition-all">
                           <EyeIcon className="h-5 w-5" />
                        </Link>
                        <Link to={`/provider/services/${service._id}/edit`} className="flex h-12 w-12 items-center justify-center rounded-2xl bg-stone-50 text-stone-600 hover:bg-emerald-500 hover:text-white dark:bg-stone-800 dark:text-stone-400 dark:hover:bg-emerald-500 dark:hover:text-white transition-all shadow-lg shadow-black/5">
                           <PencilSquareIcon className="h-5 w-5" />
                        </Link>
                        <button 
                          onClick={() => handleDelete(service._id)} 
                          disabled={deleteLoading === service._id}
                          className="flex h-12 w-12 items-center justify-center rounded-2xl bg-rose-50 text-rose-600 hover:bg-rose-500 hover:text-white dark:bg-rose-900/10 dark:text-rose-400 dark:hover:bg-rose-500 dark:hover:text-white transition-all disabled:opacity-50 shadow-lg shadow-black/5"
                        >
                           {deleteLoading === service._id ? <ArrowPathIcon className="h-5 w-5 animate-spin" /> : <TrashIcon className="h-5 w-5" />}
                        </button>
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>
    </div>
  );
}

export default ManageServices;
