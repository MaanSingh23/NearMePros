import React, { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  CameraIcon,
  CheckBadgeIcon,
  MapPinIcon,
  PencilSquareIcon,
  PhoneIcon,
  EnvelopeIcon,
  ShieldCheckIcon,
  UserCircleIcon
} from '@heroicons/react/24/outline';
import axios from 'axios';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';

const API_BASE_URL = `${import.meta.env.VITE_API_URL || ''}/api`;

function Profile() {
  const { user, updateUser } = useAuth();
  const fileInputRef = useRef(null);
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [avatarFile, setAvatarFile] = useState(null);
  const [avatarPreview, setAvatarPreview] = useState('');
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    address: ''
  });

  useEffect(() => {
    setFormData({
      name: user?.name || '',
      phone: user?.phone || '',
      address: user?.location?.address || ''
    });
    setAvatarPreview(user?.avatar || '');
    setAvatarFile(null);
  }, [user]);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleAvatarChange = (event) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    setAvatarFile(file);
    setAvatarPreview(URL.createObjectURL(file));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setLoading(true);

    try {
      const payload = new FormData();
      payload.append('name', formData.name);
      payload.append('phone', formData.phone);
      payload.append('address', formData.address);

      if (avatarFile) {
        payload.append('avatar', avatarFile);
      }

      const response = await axios.put(`${API_BASE_URL}/users/profile`, payload, {
        headers: {
          'x-auth-token': localStorage.getItem('token'),
          'Content-Type': 'multipart/form-data'
        }
      });

      updateUser(response.data.user);
      setIsEditing(false);
      setAvatarFile(null);
      toast.success('Profile updated successfully');
    } catch (error) {
      console.error('Profile update error:', error);
      toast.error(error.response?.data?.message || 'Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-80px)] bg-stone-50 dark:bg-[#0c0a09] py-10">
      <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          className="overflow-hidden rounded-[2.5rem] border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 shadow-xl"
        >
          <div className="relative overflow-hidden bg-gradient-to-r from-primary-700 to-primary-500 dark:from-stone-950 dark:via-primary-900/30 dark:to-stone-900 px-8 pb-16 pt-10 text-white">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.1),transparent_35%)] mix-blend-overlay" />
            <div className="relative flex flex-col gap-8 md:flex-row md:items-end md:justify-between">
              <div className="flex items-end gap-5">
                <div className="relative z-10">
                  {avatarPreview ? (
                    <img
                      src={avatarPreview}
                      alt={user?.name}
                      className="h-36 w-36 rounded-[2rem] border-4 border-white/20 dark:border-white/10 object-cover object-top shadow-2xl bg-stone-800"
                      onError={(e) => { e.target.src = 'https://images.unsplash.com/photo-1633332755192-727a05c4013d?w=150'; }}
                    />
                  ) : (
                    <div className="flex h-36 w-36 items-center justify-center rounded-[2rem] border-4 border-white/20 bg-white/10 shadow-2xl backdrop-blur-sm">
                      <UserCircleIcon className="h-20 w-20 text-white" />
                    </div>
                  )}

                  {isEditing && (
                    <>
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={handleAvatarChange}
                      />
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="absolute -bottom-2 -right-2 rounded-2xl bg-white dark:bg-stone-800 p-3 text-primary-600 dark:text-primary-500 shadow-xl transition hover:scale-105 border border-stone-200 dark:border-stone-700"
                      >
                        <CameraIcon className="h-6 w-6" />
                      </button>
                    </>
                  )}
                </div>

                <div>
                  <p className="text-sm uppercase tracking-[0.25em] text-primary-100 dark:text-stone-400 font-bold mb-1">
                    {user?.role === 'admin' ? 'Administrator' : 'Account Profile'}
                  </p>
                  <h1 className="mt-1 text-4xl font-black">{user?.name}</h1>
                  <p className="mt-2 text-base text-primary-50 dark:text-stone-300 font-medium">{user?.email}</p>
                </div>
              </div>

              <div className="grid gap-4 text-sm sm:grid-cols-2">
                <div className="rounded-2xl bg-black/20 dark:bg-white/5 border border-white/10 px-5 py-4 backdrop-blur shadow-inner">
                  <p className="text-primary-100 dark:text-stone-400 font-medium">Role</p>
                  <p className="mt-1 font-black capitalize text-white text-lg">{user?.role || 'user'}</p>
                </div>
                <div className="rounded-2xl bg-black/20 dark:bg-white/5 border border-white/10 px-5 py-4 backdrop-blur shadow-inner">
                  <p className="text-primary-100 dark:text-stone-400 font-medium">Status</p>
                  <p className="mt-1 flex items-center font-black text-white text-lg">
                    <CheckBadgeIcon className="mr-2 h-6 w-6 text-emerald-400" />
                    {user?.isVerified ? 'Verified' : 'Pending'}
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="grid gap-0 lg:grid-cols-[1.1fr_1.6fr]">
            <div className="border-b border-stone-200 dark:border-stone-800 bg-stone-50/50 dark:bg-stone-900/50 p-8 lg:border-b-0 lg:border-r">
              <h2 className="text-xl font-black text-stone-900 dark:text-white">Profile Snapshot</h2>
              <p className="mt-1 text-sm font-medium text-stone-500 dark:text-stone-400">Quick overview of your active account details.</p>

              <div className="mt-8 space-y-5">
                <div className="rounded-[1.5rem] bg-white dark:bg-stone-800/50 p-5 shadow-sm border border-stone-200 dark:border-stone-700/50">
                  <div className="flex items-center text-stone-500 dark:text-stone-400 font-bold text-sm uppercase tracking-wide">
                    <PhoneIcon className="mr-3 h-5 w-5 text-primary-600 dark:text-primary-500" />
                    Phone
                  </div>
                  <p className="mt-2 text-lg font-black text-stone-900 dark:text-white">{user?.phone || 'Not provided'}</p>
                </div>

                <div className="rounded-[1.5rem] bg-white dark:bg-stone-800/50 p-5 shadow-sm border border-stone-200 dark:border-stone-700/50">
                  <div className="flex items-center text-stone-500 dark:text-stone-400 font-bold text-sm uppercase tracking-wide">
                    <MapPinIcon className="mr-3 h-5 w-5 text-primary-600 dark:text-primary-500" />
                    Address
                  </div>
                  <p className="mt-2 text-lg font-black text-stone-900 dark:text-white">{user?.location?.address || 'Not provided'}</p>
                </div>

                <div className="rounded-[1.5rem] bg-white dark:bg-stone-800/50 p-5 shadow-sm border border-stone-200 dark:border-stone-700/50">
                  <div className="flex items-center text-stone-500 dark:text-stone-400 font-bold text-sm uppercase tracking-wide">
                    <EnvelopeIcon className="mr-3 h-5 w-5 text-primary-600 dark:text-primary-500" />
                    Email
                  </div>
                  <p className="mt-2 text-lg font-black text-stone-900 dark:text-white">{user?.email}</p>
                </div>

                {user?.role === 'provider' && !user?.isVerified && (
                  <Link
                    to="/verification"
                    className="flex mt-6 items-center justify-center rounded-2xl bg-amber-500 px-4 py-3 font-bold text-stone-900 transition hover:bg-amber-400"
                  >
                    <ShieldCheckIcon className="mr-2 h-5 w-5" />
                    Complete Verification
                  </Link>
                )}
              </div>
            </div>

            <div className="p-8">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                   <h2 className="text-2xl font-black text-stone-900 dark:text-white">Edit Profile</h2>
                   <p className="mt-1 text-sm font-medium text-stone-500 dark:text-stone-400">Update your details and upload a new profile photo.</p>
                </div>
                {!isEditing && (
                  <button
                    onClick={() => setIsEditing(true)}
                    className="inline-flex items-center rounded-xl border-2 border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-800 px-5 py-2.5 text-sm font-bold text-stone-700 dark:text-stone-300 shadow-sm transition hover:bg-stone-50 dark:hover:bg-stone-700 hover:border-stone-300"
                  >
                    <PencilSquareIcon className="mr-2.5 h-4 w-4" />
                    Edit Profile
                  </button>
                )}
              </div>

              <form onSubmit={handleSubmit} className="mt-8 space-y-6">
                <div className="grid gap-6 md:grid-cols-2">
                  <div>
                    <label className="mb-2 block text-sm font-bold text-stone-700 dark:text-stone-300">Full Name</label>
                    <input
                      type="text"
                      name="name"
                      value={formData.name}
                      onChange={handleChange}
                      disabled={!isEditing}
                      className="input-field disabled:opacity-75 disabled:bg-stone-100 dark:disabled:bg-stone-800"
                      required
                    />
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-bold text-stone-700 dark:text-stone-300">Phone Number</label>
                    <input
                      type="tel"
                      name="phone"
                      value={formData.phone}
                      onChange={handleChange}
                      disabled={!isEditing}
                      className="input-field disabled:opacity-75 disabled:bg-stone-100 dark:disabled:bg-stone-800"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="mb-2 block text-sm font-bold text-stone-700 dark:text-stone-300">Address</label>
                  <input
                    type="text"
                    name="address"
                    value={formData.address}
                    onChange={handleChange}
                    disabled={!isEditing}
                    className="input-field disabled:opacity-75 disabled:bg-stone-100 dark:disabled:bg-stone-800"
                    placeholder="Enter your office or business address"
                  />
                </div>

                {isEditing && (
                  <div className="rounded-[1.5rem] border-2 border-dashed border-stone-300 dark:border-stone-700 bg-stone-50/50 dark:bg-stone-800/30 px-6 py-5 text-center sm:text-left">
                    <p className="text-sm font-bold text-stone-700 dark:text-stone-300">Profile Photo</p>
                    <p className="mt-1 text-sm font-medium text-stone-500 dark:text-stone-400">
                      Click the camera icon on your avatar to upload JPG, PNG, or WEBP up to 5MB.
                    </p>
                  </div>
                )}

                {isEditing && (
                  <div className="flex flex-col gap-4 sm:flex-row pt-4">
                    <button
                      type="submit"
                      disabled={loading}
                      className="btn-primary flex-1 !py-3.5 !rounded-2xl"
                    >
                      {loading ? 'Saving profile...' : 'Save Changes'}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setIsEditing(false);
                        setFormData({
                          name: user?.name || '',
                          phone: user?.phone || '',
                          address: user?.location?.address || ''
                        });
                        setAvatarPreview(user?.avatar || '');
                        setAvatarFile(null);
                      }}
                      className="flex-1 rounded-2xl border-2 border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-800 px-5 py-3 font-bold text-stone-700 dark:text-stone-300 transition hover:bg-stone-50 dark:hover:bg-stone-700"
                    >
                      Cancel
                    </button>
                  </div>
                )}
              </form>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}

export default Profile;
