import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import { useAuth } from '@/contexts/AuthContext';
import { useState, useEffect } from 'react';
import API from '@/api/auth';
import { getEmployeeById } from '@/api/employees';
import { uploadFile } from '@/api/uploadFile';

const Settings = () => {
  const { user, setUser } = useAuth();
  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    name: '',
    email: '',
    phone: '',
    password: '',
    profileImage: '',
    reportingManagerId: '',
  });
  useEffect(() => {
    const fetchUser = async () => {
      try {
        const id = user?._id || user?.id;
        if (!id) return;
        const data = await getEmployeeById(id);
        // Normalize reportingManagerId: accept valid ObjectId string or object with _id; else clear
        const rawRm: any = (data as any)?.reportingManagerId;
        let normalizedRmId: string = '';
        if (typeof rawRm === 'string') {
          normalizedRmId = /^[0-9a-fA-F]{24}$/.test(rawRm) ? rawRm : '';
        } else if (rawRm && typeof rawRm === 'object') {
          normalizedRmId = rawRm?._id || '';
        }
        setForm({
          firstName: data.firstName || '',
          lastName: data.lastName || '',
          name: (data.name || `${data.firstName || ''} ${data.lastName || ''}`).trim(),
          email: data.email || '',
          phone: data.phone || '',
          password: '',
          profileImage: data.profilePhotoUrl || '',
          reportingManagerId: normalizedRmId,
        });
      } catch (err) {
        setError('Failed to fetch user details');
      }
    };
    fetchUser();
  }, [user]);
  const [isEditing, setIsEditing] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });

  };

  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      try {
        const url = await uploadFile(file);
        setForm((prev) => ({ ...prev, profileImage: url }));
      } catch (err) {
        setError('Failed to upload image');
      }
    }
  };

  const handleSave = async () => {
    setError('');
    setSuccess('');
    try {
      // Assume /auth/employees/:id for all roles (superadmin, admin, etc.)
      // Sanitize reportingManagerId: send valid ObjectId or null to clear invalid value
      const isValidObjectId = (id: string) => /^[0-9a-fA-F]{24}$/.test(id);
      const safeReportingManagerId = form.reportingManagerId && isValidObjectId(form.reportingManagerId)
        ? form.reportingManagerId
        : null;
      const res = await API.put(`/auth/employees/${user._id || user.id}`, {
        firstName: form.firstName,
        lastName: form.lastName,
        name: `${form.firstName} ${form.lastName}`.trim(),
        email: form.email,
        phone: form.phone,
        profilePhotoUrl: form.profileImage,
        reportingManagerId: safeReportingManagerId,
        ...(form.password ? { password: form.password } : {}),
      });
      setSuccess('Profile updated successfully!');
      setIsEditing(false);
      // Update user in localStorage and AuthContext
      const updatedUser = { ...user, firstName: form.firstName, lastName: form.lastName, name: `${form.firstName} ${form.lastName}`.trim(), email: form.email, phone: form.phone, profileImage: form.profileImage };
      localStorage.setItem('user', JSON.stringify(updatedUser));
  if (setUser) setUser(updatedUser);
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to update profile');
    }
  };

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <h1 className="text-3xl font-bold mb-2 text-black">Settings</h1>
      <p className="text-muted-foreground mb-6">View and update your credentials</p>
      <Card className="hrms-card">
        <CardHeader>
          <CardTitle>Your Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {success && <div className="text-green-600 bg-green-50 border border-green-200 rounded p-2 text-center">{success}</div>}
          {error && <div className="text-red-600 bg-red-50 border border-red-200 rounded p-2 text-center">{error}</div>}
          <div className="space-y-2">
            <Label htmlFor="profileImage">Profile Image</Label>
            <Input id="profileImage" name="profileImage" type="file" accept="image/*" onChange={handleImageChange} disabled={!isEditing} />
            {form.profileImage && (
              <img src={form.profileImage} alt="Profile" className="h-16 w-16 rounded-full mt-2 object-cover border" />
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="firstName">First Name</Label>
            <Input id="firstName" name="firstName" value={form.firstName} onChange={handleChange} disabled={!isEditing} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="lastName">Last Name</Label>
            <Input id="lastName" name="lastName" value={form.lastName} onChange={handleChange} disabled={!isEditing} />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" name="email" value={form.email} onChange={handleChange} disabled={!isEditing} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="phone">Phone</Label>
            <Input id="phone" name="phone" value={form.phone} onChange={handleChange} disabled={!isEditing} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input id="password" name="password" type="password" value={form.password} onChange={handleChange} disabled={!isEditing} placeholder="Leave blank to keep unchanged" />
          </div>
          <div className="flex gap-4 mt-4">
            {isEditing ? (
              <>
                <Button className="bg-green-600 text-white" onClick={handleSave}>Save</Button>
                <Button variant="outline" onClick={() => setIsEditing(false)}>Cancel</Button>
              </>
            ) : (
              <Button className="bg-green-600 text-white" onClick={() => setIsEditing(true)}>Edit</Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Settings;