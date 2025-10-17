import React, { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { ChevronLeft, Upload, CheckCircle, ArrowRight } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { createOrganization, getOrganizationById, updateOrganization } from "@/api/organizations";
import { uploadFile } from "@/api/uploadFile";
import { saveHolidayCalendar, getHolidayCalendar } from "@/api/holidayCalendar";
import { toast } from "@/components/ui/use-toast";
import { useAuth } from "@/contexts/AuthContext";

const CreateOrganization = () => {
  const navigate = useNavigate();
  const { orgId } = useParams();
  const { organizationId } = useAuth();
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [formError, setFormError] = useState(null);
  const [formData, setFormData] = useState({
    name: "",
    addressLine1: "",
    addressLine2: "",
    country: "",
    state: "",
    city: "",
    zipCode: "",
    contactPersonName: "",
    organizationEmail: "",
    contactPhone: "",
    registrationNumber: "",
    taxId: "",
    industryType: "",
    website: "",
    domain: "",
    logoUrl: "",
    timezone: "",
    workingDays: "",
    defaultShiftId: "",
    status: "",
    dayStartTime: "",
    dayEndTime: "",
    holidayCalendarFileName: "",
    latitude: "",
    longitude: "",
    admin: {
      firstName: "",
      lastName: "",
      email: "",
      password: "",
      phone: ""
    }
  });
  const [isEditMode, setIsEditMode] = useState(false);

  // Fetch organization data if editing
  useEffect(() => {
    const fetchOrg = async () => {
      if (orgId) {
        setLoading(true);
        setIsEditMode(true);
        try {
          const org = await getOrganizationById(orgId);
          setFormData({
            ...org,
            organizationEmail: org.contactEmail || org.organizationEmail || "",
            admin: {
              firstName: org.admin?.firstName || "",
              lastName: org.admin?.lastName || "",
              email: org.admin?.email || "",
              password: "", // Don't prefill password
              phone: org.admin?.phone || ""
            }
          });
          
          // Fetch holiday calendar if organization exists
          try {
            // Use the global organizationId from AuthContext
            const currentOrgId = organizationId || orgId;
            
            const holidayCalendar = await getHolidayCalendar(currentOrgId);
            if (holidayCalendar && holidayCalendar.calendarFileName) {
              setFormData(prev => ({
                ...prev,
                holidayCalendarFileName: holidayCalendar.calendarFileName
              }));
            }
          } catch (err) {
            console.error("Failed to fetch holiday calendar", err);
          }
        } catch (err) {
          toast({ title: "Error", description: "Failed to load organization.", variant: "destructive" });
        } finally {
          setLoading(false);
        }
      }
    };
    fetchOrg();
    // eslint-disable-next-line
  }, [orgId, organizationId]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    
    if (name.includes('.')) {
      const [parent, child] = name.split('.');
      setFormData({
        ...formData,
        [parent]: {
          ...formData[parent],
          [child]: value
        }
      });
    } else {
      setFormData({
        ...formData,
        [name]: value
      });
    }
  };

  const handleSelectChange = (name, value) => {
    setFormData({
      ...formData,
      [name]: value
    });
  };

  const validateEmail = (email) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  };

  const handleUseCurrentLocation = () => {
    if (!navigator.geolocation) {
      toast({ title: "Geolocation not supported", description: "Your browser does not support geolocation.", variant: "destructive" });
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        setFormData((prev) => ({
          ...prev,
          latitude: String(latitude),
          longitude: String(longitude),
        }));
        toast({ title: "Location added", description: `Lat: ${latitude.toFixed(5)}, Lng: ${longitude.toFixed(5)}` });
      },
      (err) => {
        toast({ title: "Location error", description: err.message || "Unable to fetch location.", variant: "destructive" });
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const handleSubmit = async () => {
    setFormError(null);
    // Only required fields from schema (timezone, workingDays, dayStartTime, dayEndTime are NOT required)
    const requiredFields = [
      { key: 'name', label: 'Organization Name' },
      { key: 'addressLine1', label: 'Address Line 1' },
      { key: 'country', label: 'Country' },
      { key: 'state', label: 'State' },
      { key: 'city', label: 'City' },
      { key: 'zipCode', label: 'Zip Code' },
      { key: 'contactPersonName', label: 'Contact Person Name' },
      { key: 'organizationEmail', label: 'Organization Email' },
      { key: 'contactPhone', label: 'Contact Phone' },
    ];

    for (const field of requiredFields) {
      let value;
      if (field.key.startsWith('admin.')) {
        const adminKey = field.key.split('.')[1];
        value = formData.admin[adminKey];
      } else {
        value = formData[field.key];
      }
      if (!value || (typeof value === 'string' && value.trim() === '')) {
        setFormError(`${field.label} is required.`);
        return;
      }
    }
    // Email validation
    if (!validateEmail(formData.organizationEmail)) {
      setFormError('A valid organization email is required.');
      return;
    }
    if (!validateEmail(formData.admin.email)) {
      setFormError('A valid admin email is required.');
      return;
    }
    try {
      setLoading(true);
      const payload = {
        ...formData,
        contactEmail: formData.organizationEmail,
        latitude: formData.latitude ? parseFloat(String(formData.latitude)) : undefined,
        longitude: formData.longitude ? parseFloat(String(formData.longitude)) : undefined,
      };
      if (isEditMode && orgId) {
        await updateOrganization(orgId, payload);
        toast({ title: "Success", description: "Organization updated successfully" });
      } else {
        await createOrganization(payload);
        toast({ title: "Success", description: "Organization created successfully" });
      }
      navigate('/dashboard');
    } catch (error) {
      console.error("Error submitting organization:", error);
      toast({
        title: "Error",
        description: isEditMode ? "Failed to update organization. Please try again." : "Failed to create organization. Please try again.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const nextStep = () => {
    setCurrentStep(currentStep + 1);
  };

  const prevStep = () => {
    setCurrentStep(currentStep - 1);
  };

  const renderStepIndicator = () => {
    const steps = [
      "Organization",
      "Address",
      "Contact",
      "Admin",
      "Review"
    ];

    return (
      <div className="flex justify-between mb-8">
        {steps.map((step, index) => (
          <div key={index} className="flex flex-col items-center">
            <div 
              className={`w-8 h-8 rounded-full flex items-center justify-center ${
                currentStep > index + 1 
                  ? "bg-green-500 text-white" 
                  : currentStep === index + 1 
                  ? "bg-primary text-white" 
                  : "bg-gray-200 text-gray-500"
              }`}
            >
              {currentStep > index + 1 ? <CheckCircle className="h-5 w-5" /> : index + 1}
            </div>
            <span className="text-xs mt-1">{step}</span>
          </div>
        ))}
      </div>
    );
  };

  const renderStep = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className="space-y-4">
            <h2 className="text-xl font-semibold">Organization Details</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Organization Name *</Label>
                <Input
                  id="name"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  placeholder="Acme Corporation"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="industryType">Industry Type *</Label>
                <Input
                  id="industryType"
                  name="industryType"
                  value={formData.industryType}
                  onChange={handleChange}
                  placeholder="Technology"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="registrationNumber">Registration Number *</Label>
                <Input
                  id="registrationNumber"
                  name="registrationNumber"
                  value={formData.registrationNumber}
                  onChange={handleChange}
                  placeholder="REG123456"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="taxId">Tax ID *</Label>
                <Input
                  id="taxId"
                  name="taxId"
                  value={formData.taxId}
                  onChange={handleChange}
                  placeholder="TAX123456"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="website">Website *</Label>
                <Input
                  id="website"
                  name="website"
                  value={formData.website}
                  onChange={handleChange}
                  placeholder="https://acme.com"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="domain">Domain *</Label>
                <Input
                  id="domain"
                  name="domain"
                  value={formData.domain}
                  onChange={handleChange}
                  placeholder="acme.com"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="logoUrl">Organization Logo</Label>
                <Input
                  id="logoUrl"
                  name="logoUrl"
                  type="file"
                  accept="image/*"
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      setLoading(true);
                      try {
                        const url = await uploadFile(file);
                        setFormData((prev) => ({ ...prev, logoUrl: url }));
                        toast({ title: "Logo uploaded", description: "Image uploaded successfully." });
                      } catch (err) {
                        toast({ title: "Upload failed", description: "Could not upload image.", variant: "destructive" });
                      } finally {
                        setLoading(false);
                      }
                    }
                  }}
                />
                {formData.logoUrl && (
                  <img src={formData.logoUrl} alt="Logo Preview" className="mt-2 h-16" />
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="status">Status</Label>
                <select
                  id="status"
                  name="status"
                  value={formData.status}
                  onChange={handleChange}
                  className="w-full border rounded px-3 py-2"
                >
                  <option value="">Select status</option>
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>
            </div>
          </div>
        );
      case 2:
        return (
          <div className="space-y-4">
            <h2 className="text-xl font-semibold">Address Information</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="addressLine1">Address Line 1 *</Label>
                <Input 
                  id="addressLine1" 
                  name="addressLine1" 
                  value={formData.addressLine1} 
                  onChange={handleChange} 
                  placeholder="123 Main St" 
                  required 
                />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="addressLine2">Address Line 2</Label>
                <Input 
                  id="addressLine2" 
                  name="addressLine2" 
                  value={formData.addressLine2} 
                  onChange={handleChange} 
                  placeholder="Suite 100" 
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="city">City *</Label>
                <Input 
                  id="city" 
                  name="city" 
                  value={formData.city} 
                  onChange={handleChange} 
                  placeholder="San Francisco" 
                  required 
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="state">State/Province *</Label>
                <Input 
                  id="state" 
                  name="state" 
                  value={formData.state} 
                  onChange={handleChange} 
                  placeholder="California" 
                  required 
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="zipCode">Zip/Postal Code *</Label>
                <Input 
                  id="zipCode" 
                  name="zipCode" 
                  value={formData.zipCode} 
                  onChange={handleChange} 
                  placeholder="94105" 
                  required 
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="country">Country *</Label>
                <Input 
                  id="country" 
                  name="country" 
                  value={formData.country} 
                  onChange={handleChange} 
                  placeholder="United States" 
                  required 
                />
              </div>
              {/* Latitude/Longitude + Autofill */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-2">
                <div className="space-y-2">
                  <Label htmlFor="latitude">Latitude</Label>
                  <Input id="latitude" name="latitude" value={formData.latitude} onChange={handleChange} placeholder="e.g., 12.9716" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="longitude">Longitude</Label>
                  <Input id="longitude" name="longitude" value={formData.longitude} onChange={handleChange} placeholder="e.g., 77.5946" />
                </div>
                <div className="flex items-end">
                  <Button type="button" className="w-full md:w-auto" variant="outline" onClick={handleUseCurrentLocation} aria-label="Use current location">Use current location</Button>
                </div>
              </div>
            </div>
          </div>
        );
      case 3:
        return (
          <div className="space-y-4">
            <h2 className="text-xl font-semibold">Contact Information</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="contactPersonName">Contact Person Name *</Label>
                <Input 
                  id="contactPersonName" 
                  name="contactPersonName" 
                  value={formData.contactPersonName} 
                  onChange={handleChange} 
                  placeholder="John Doe" 
                  required 
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="organizationEmail">Organization Email *</Label>
                <Input 
                  id="organizationEmail" 
                  name="organizationEmail" 
                  type="email"
                  value={formData.organizationEmail} 
                  onChange={handleChange} 
                  placeholder="john@acme.com" 
                  required 
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="contactPhone">Contact Phone *</Label>
                <Input 
                  id="contactPhone" 
                  name="contactPhone" 
                  value={formData.contactPhone} 
                  onChange={handleChange} 
                  placeholder="1234567890" 
                  required 
                />
              </div>
            </div>
            
            <div className="mt-8">
              <h2 className="text-xl font-semibold">Working Hours</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                <div className="space-y-2">
                  <Label htmlFor="workingDays">Working Days</Label>
                  <Select 
                    value={formData.workingDays} 
                    onValueChange={(value) => handleSelectChange("workingDays", value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select working days" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Monday-Friday">Monday-Friday</SelectItem>
                      <SelectItem value="Monday-Saturday">Monday-Saturday</SelectItem>
                      <SelectItem value="Sunday-Thursday">Sunday-Thursday</SelectItem>
                      <SelectItem value="All Days">All Days</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="timezone">Timezone</Label>
                  <Select 
                    value={formData.timezone} 
                    onValueChange={(value) => handleSelectChange("timezone", value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select timezone" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="UTC">UTC</SelectItem>
                      <SelectItem value="America/New_York">Eastern Time (ET)</SelectItem>
                      <SelectItem value="America/Chicago">Central Time (CT)</SelectItem>
                      <SelectItem value="America/Denver">Mountain Time (MT)</SelectItem>
                      <SelectItem value="America/Los_Angeles">Pacific Time (PT)</SelectItem>
                      <SelectItem value="Asia/Kolkata">India Standard Time (IST)</SelectItem>
                      <SelectItem value="Europe/London">Greenwich Mean Time (GMT)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="dayStartTime">Day Start Time</Label>
                  <Input 
                    id="dayStartTime" 
                    name="dayStartTime" 
                    type="time"
                    value={formData.dayStartTime} 
                    onChange={handleChange} 
                    required 
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="dayEndTime">Day End Time</Label>
                  <Input 
                    id="dayEndTime" 
                    name="dayEndTime" 
                    type="time"
                    value={formData.dayEndTime} 
                    onChange={handleChange} 
                    required 
                  />
                </div>
                
              </div>
            </div>
          </div>
        );
      case 4:
        return (
          <div className="space-y-4">
            <h2 className="text-xl font-semibold">Admin Account</h2>
            <p className="text-muted-foreground">Create an admin account for this organization</p>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="admin.firstName">First Name *</Label>
                <Input 
                  id="admin.firstName" 
                  name="admin.firstName" 
                  value={formData.admin.firstName} 
                  onChange={handleChange} 
                  placeholder="Admin" 
                  required 
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="admin.lastName">Last Name *</Label>
                <Input 
                  id="admin.lastName" 
                  name="admin.lastName" 
                  value={formData.admin.lastName} 
                  onChange={handleChange} 
                  placeholder="User" 
                  required 
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="admin.email">Email *</Label>
                <Input 
                  id="admin.email" 
                  name="admin.email" 
                  type="email"
                  value={formData.admin.email} 
                  onChange={handleChange} 
                  placeholder="admin@example.com" 
                  required 
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="admin.phone">Phone *</Label>
                <Input 
                  id="admin.phone" 
                  name="admin.phone" 
                  value={formData.admin.phone} 
                  onChange={handleChange} 
                  placeholder="9876543210" 
                  required 
                />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="admin.password">Password *</Label>
                <Input 
                  id="admin.password" 
                  name="admin.password" 
                  type="password"
                  value={formData.admin.password} 
                  onChange={handleChange} 
                  placeholder="••••••••" 
                  required 
                />
              </div>
            </div>
          </div>
        );
      case 5:
        return (
          <div className="space-y-4">
            <h2 className="text-xl font-semibold">Review Information</h2>
            <div className="space-y-6">
              <div className="space-y-2">
                <h3 className="font-medium">Organization Details</h3>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div className="text-muted-foreground">Name:</div>
                  <div>{formData.name}</div>
                  <div className="text-muted-foreground">Industry:</div>
                  <div>{formData.industryType}</div>
                  <div className="text-muted-foreground">Registration Number:</div>
                  <div>{formData.registrationNumber}</div>
                  <div className="text-muted-foreground">Tax ID:</div>
                  <div>{formData.taxId}</div>
                </div>
              </div>
              
              <div className="space-y-2">
                <h3 className="font-medium">Address</h3>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div className="text-muted-foreground">Address:</div>
                  <div>{formData.addressLine1} {formData.addressLine2}</div>
                  <div className="text-muted-foreground">City:</div>
                  <div>{formData.city}</div>
                  <div className="text-muted-foreground">State:</div>
                  <div>{formData.state}</div>
                  <div className="text-muted-foreground">Country:</div>
                  <div>{formData.country}</div>
                  <div className="text-muted-foreground">Zip Code:</div>
                  <div>{formData.zipCode}</div>
                  <div className="text-muted-foreground">Latitude:</div>
                  <div>{formData.latitude || ""}</div>
                  <div className="text-muted-foreground">Longitude:</div>
                  <div>{formData.longitude || ""}</div>
                </div>
              </div>
              
              <div className="space-y-2">
                <h3 className="font-medium">Contact Information</h3>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div className="text-muted-foreground">Contact Person:</div>
                  <div>{formData.contactPersonName}</div>
                  <div className="text-muted-foreground">Email:</div>
                  <div>{formData.organizationEmail}</div>
                  <div className="text-muted-foreground">Phone:</div>
                  <div>{formData.contactPhone}</div>
                </div>
              </div>
              
              <div className="space-y-2">
                <h3 className="font-medium">Working Hours</h3>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div className="text-muted-foreground">Working Days:</div>
                  <div>{formData.workingDays}</div>
                  <div className="text-muted-foreground">Hours:</div>
                  <div>{formData.dayStartTime} - {formData.dayEndTime}</div>
                  <div className="text-muted-foreground">Timezone:</div>
                  <div>{formData.timezone}</div>
                </div>
              </div>
              
              <div className="space-y-2">
                <h3 className="font-medium">Admin Account</h3>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div className="text-muted-foreground">Name:</div>
                  <div>{formData.admin.firstName} {formData.admin.lastName}</div>
                  <div className="text-muted-foreground">Email:</div>
                  <div>{formData.admin.email}</div>
                  <div className="text-muted-foreground">Phone:</div>
                  <div>{formData.admin.phone}</div>
                </div>
              </div>
            </div>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="container mx-auto py-8 px-4 create-org-page" style={{ color: '#2C373B' }}>
      <style>{`
        .create-org-page input,
        .create-org-page select,
        .create-org-page textarea {
          background-color: rgb(209 250 229) !important;
        }
        .create-org-page button {
          background-color: #4CDC9C !important;
          color: #2C373B !important;
        }
      `}</style>
      <Button 
        variant="ghost" 
        className="mb-4" 
        onClick={() => navigate('/dashboard')}
        style={{ background: '#4CDC9C', color: '#2C373B' }}
      >
        <ChevronLeft className="mr-2 h-4 w-4" /> Back to Dashboard
      </Button>
      
      <Card className="max-w-4xl mx-auto">
        <CardHeader>
          <CardTitle style={{ color: '#2C373B' }}>{isEditMode ? "Edit Organization" : "Create Organization"}</CardTitle>
          <Progress 
            value={(currentStep / 5) * 100} 
            className="h-2" 
          />
        </CardHeader>
        <CardContent>
          {renderStepIndicator()}
          {formError && (
            <div className="mb-4 text-red-600 bg-red-50 border border-red-200 rounded p-2 text-center">
              {formError}
            </div>
          )}
          {renderStep()}
          
          <div className="flex justify-between mt-8">
            <Button
              variant="outline"
              onClick={prevStep}
              disabled={currentStep === 1 || loading}
              style={{ background: '#4CDC9C', color: '#2C373B', borderColor: '#4CDC9C' }}
            >
              Previous
            </Button>
            
            {currentStep < 5 ? (
              <Button onClick={nextStep} disabled={loading} style={{ background: '#4CDC9C', color: '#2C373B' }}>
                Next <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            ) : (
              <Button onClick={handleSubmit} disabled={loading} style={{ background: '#4CDC9C', color: '#2C373B' }}>
                {loading ? (isEditMode ? "Updating..." : "Creating...") : (isEditMode ? "Update Details" : "Create Organization")}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default CreateOrganization;