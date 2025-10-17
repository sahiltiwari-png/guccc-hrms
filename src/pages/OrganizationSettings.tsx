import React, { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Upload } from "lucide-react";
import { getOrganizationById, updateOrganization, type Organization } from "@/api/organizations";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/components/ui/use-toast";

const OrganizationSettings: React.FC = () => {
  const { organizationId } = useAuth();
  const [originalOrg, setOriginalOrg] = useState<Organization | null>(null);
  const [formData, setFormData] = useState({
    companyName: "",
    registrationNumber: "",
    taxId: "",
    industryType: "",
    website: "",
    domain: "",
    logoFile: undefined as File | undefined,
    addressLine1: "",
    addressLine2: "",
    country: "",
    state: "",
    city: "",
    zipCode: "",
    contactPersonName: "",
    contactEmail: "",
    contactPhone: "",
    timezone: "",
    workingDays: "",
    dayStartTime: "",
    dayEndTime: "",
    latitude: "",
    longitude: "",
    active: true,
  });

  // Fetch organization details on mount and populate the form
  useEffect(() => {
    const fetchOrganization = async () => {
      try {
        if (!organizationId) {
          // No organization id available; skip fetch
          return;
        }
        const org = await getOrganizationById(organizationId);
        setOriginalOrg(org || null);
        setFormData((prev) => ({
          ...prev,
          companyName: org?.name || "",
          registrationNumber: org?.registrationNumber || "",
          taxId: org?.taxId || "",
          industryType: org?.industryType || "",
          website: org?.website || "",
          domain: org?.domain || "",
          // logoFile will remain undefined; logoUrl may exist but input expects file
          addressLine1: org?.addressLine1 || "",
          addressLine2: org?.addressLine2 || "",
          country: org?.country || "",
          state: org?.state || "",
          city: org?.city || "",
          zipCode: org?.zipCode || "",
          contactPersonName: org?.contactPersonName || "",
          contactEmail: org?.contactEmail || org?.organizationEmail || "",
          contactPhone: org?.contactPhone || "",
          timezone: org?.timezone || "",
          workingDays: org?.workingDays || "",
          dayStartTime: org?.dayStartTime || "",
          dayEndTime: org?.dayEndTime || "",
          latitude: org?.latitude !== undefined ? String(org.latitude) : prev.latitude || "",
          longitude: org?.longitude !== undefined ? String(org.longitude) : prev.longitude || "",
          active: org?.status ? org.status === "active" : prev.active,
        }));
      } catch (err) {
        console.error("Failed to fetch organization:", err);
      }
    };
    fetchOrganization();
  }, [organizationId]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    setFormData((prev) => ({ ...prev, logoFile: file }));
  };



  const handleDiscard = async () => {
    try {
      if (!organizationId) {
        toast({ title: "Error", description: "Organization ID not found.", variant: "destructive" });
        return;
      }
      const org = await getOrganizationById(organizationId);
      setOriginalOrg(org || null);
      setFormData((prev) => ({
        ...prev,
        companyName: org?.name || "",
        registrationNumber: org?.registrationNumber || "",
        taxId: org?.taxId || "",
        industryType: org?.industryType || "",
        website: org?.website || "",
        domain: org?.domain || "",
        // logoFile remains undefined; UI expects a file input for changes
        logoFile: undefined,
        addressLine1: org?.addressLine1 || "",
        addressLine2: org?.addressLine2 || "",
        country: org?.country || "",
        state: org?.state || "",
        city: org?.city || "",
        zipCode: org?.zipCode || "",
        contactPersonName: org?.contactPersonName || "",
        contactEmail: org?.contactEmail || org?.organizationEmail || "",
        contactPhone: org?.contactPhone || "",
        timezone: org?.timezone || "",
        workingDays: org?.workingDays || "",
        dayStartTime: org?.dayStartTime || "",
        dayEndTime: org?.dayEndTime || "",
        latitude: org?.latitude !== undefined ? String(org.latitude) : prev.latitude || "",
        longitude: org?.longitude !== undefined ? String(org.longitude) : prev.longitude || "",
        active: org?.status ? org.status === "active" : prev.active,
      }));
      toast({ title: "Discarded", description: "Form reset to latest server data." });
    } catch (err) {
      console.error("Failed to discard and reload organization:", err);
      const message = (err as any)?.response?.data?.message || "Could not reload organization. Please try again.";
      toast({ title: "Error", description: message, variant: "destructive" });
    }
  };

  const handleSave = () => {
    // Send a complete payload for PUT, keeping immutable fields unchanged
    if (!organizationId) {
      toast({ title: "Error", description: "Organization ID not found.", variant: "destructive" });
      return;
    }
    const status = formData.active ? "active" : "inactive";
    // Merge original organization fully with edited fields
    let base: any = {};
    if (originalOrg) {
      base = { ...originalOrg };
      // Drop identifiers that backend may not accept in body
      delete base._id;
      delete base.id;
    } else {
      // Fallback base if original not loaded (still include required keys)
      base = {
        name: formData.companyName,
        registrationNumber: formData.registrationNumber,
        taxId: formData.taxId,
        domain: formData.domain,
        admin: undefined,
        logoUrl: undefined,
        defaultShiftId: undefined,
      } as Partial<Organization>;
    }

    const updates: Partial<Organization> = {
      // Preserve non-editable from original/base
      name: base.name,
      registrationNumber: base.registrationNumber,
      taxId: base.taxId,
      domain: base.domain,
      logoUrl: base.logoUrl,
      defaultShiftId: base.defaultShiftId,
      admin: base.admin,
      contactEmail: base.contactEmail ?? formData.contactEmail,
      // Editable fields
      industryType: formData.industryType || base.industryType,
      website: formData.website || base.website,
      addressLine1: formData.addressLine1 || base.addressLine1,
      addressLine2: formData.addressLine2 || base.addressLine2,
      country: formData.country || base.country,
      state: formData.state || base.state,
      city: formData.city || base.city,
      zipCode: formData.zipCode || base.zipCode,
      contactPersonName: formData.contactPersonName || base.contactPersonName,
      contactPhone: formData.contactPhone || base.contactPhone,
      timezone: formData.timezone || base.timezone,
      workingDays: formData.workingDays || base.workingDays,
      dayStartTime: formData.dayStartTime || base.dayStartTime,
      dayEndTime: formData.dayEndTime || base.dayEndTime,
      latitude: formData.latitude ? parseFloat(formData.latitude) : base.latitude,
      longitude: formData.longitude ? parseFloat(formData.longitude) : base.longitude,
      status,
    };

    // Compose final payload (original + updates)
    const payload = { ...base, ...updates } as Partial<Organization>;
    // Remove any empty-string values (backend may treat as invalid)
    Object.keys(payload).forEach((k) => {
      const v: any = (payload as any)[k];
      if (typeof v === 'string' && v.trim() === '') {
        (payload as any)[k] = base[k] ?? undefined;
      }
    });
    // Strip undefined
    const sanitized = Object.fromEntries(Object.entries(payload).filter(([, v]) => v !== undefined));

    updateOrganization(organizationId, sanitized as Partial<Organization>)
      .then(() => {
        toast({ title: "Saved", description: "Organization updated successfully." });
      })
      .catch((err: any) => {
        console.error("Failed to update organization:", err);
        const message = err?.response?.data?.message || "Update failed. Please try again.";
        toast({ title: "Error", description: message, variant: "destructive" });
      });
  };

  return (
    <div
      className="min-h-screen w-full overflow-x-hidden"
      style={{
        background:
          "linear-gradient(151.95deg, rgba(76, 220, 156, 0.81) 17.38%, rgba(255, 255, 255, 0.81) 107.36%)",
      }}
    >

      <div className="px-3 md:px-6 py-6 max-w-[1200px] mx-auto">
        <h1 className="text-xl font-semibold mb-4">Settings</h1>
        <Card className="border rounded-lg">
          <CardHeader className="flex flex-row items-center justify-between gap-4">
            <CardTitle className="text-base">Edit company Information</CardTitle>
            <div className="flex items-center gap-2">
              <Button variant="outline" onClick={handleDiscard}>Discard</Button>
              <Button className="bg-[#4CDC9C] text-[#2C373B] hover:brightness-95" onClick={handleSave}>Save all Changes</Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-8">
            {/* Company Information */}
            <div>
              <h2 className="text-lg font-semibold mb-4">Company Information</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="companyName">Company name</Label>
                  <Input id="companyName" name="companyName" value={formData.companyName} onChange={handleChange} placeholder="Company name" disabled aria-readonly />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="registrationNumber">Registration Number</Label>
                  <Input id="registrationNumber" name="registrationNumber" value={formData.registrationNumber} onChange={handleChange} placeholder="0123456789" disabled aria-readonly />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="taxId">Tax ID</Label>
                  <Input id="taxId" name="taxId" value={formData.taxId} onChange={handleChange} placeholder="Company name" disabled aria-readonly />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="industryType">Industry type</Label>
                  <Input id="industryType" name="industryType" value={formData.industryType} onChange={handleChange} placeholder="Company name" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="website">Website</Label>
                  <Input id="website" name="website" value={formData.website} onChange={handleChange} placeholder="Company name" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="domain">Domain</Label>
                  <Input id="domain" name="domain" value={formData.domain} onChange={handleChange} placeholder="Company name" disabled aria-readonly />
                </div>
              </div>

              {/* Logo Upload */}
              <div className="mt-4">
                <Label>Logo Upload</Label>
                <div className="mt-2 border rounded-md p-4 bg-gray-50">
                  <div className="flex items-center gap-4">
                    <div className="h-16 w-16 rounded-md bg-gray-200 flex items-center justify-center">
                      <Upload className="h-6 w-6 text-gray-500" />
                    </div>
                    <div className="flex-1 flex items-center gap-3">
                      <Input type="file" onChange={handleFileChange} className="max-w-xs" />
                      <span className="text-sm text-muted-foreground">No File Chosen</span>
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground mt-3">Please upload square image, size less than 100KB</p>
                </div>
              </div>
            </div>

            {/* Address Information */}
            <div>
              <h2 className="text-lg font-semibold mb-4">Address Information</h2>
              <div className="grid grid-cols-1 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="addressLine1">Address Line 1</Label>
                  <Input id="addressLine1" name="addressLine1" value={formData.addressLine1} onChange={handleChange} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="addressLine2">Address Line 2 (optional)</Label>
                  <Input id="addressLine2" name="addressLine2" value={formData.addressLine2} onChange={handleChange} />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="country">Country</Label>
                    <Input id="country" name="country" value={formData.country} onChange={handleChange} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="state">State</Label>
                    <Input id="state" name="state" value={formData.state} onChange={handleChange} />
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="city">City</Label>
                    <Input id="city" name="city" value={formData.city} onChange={handleChange} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="zipCode">Zip Code</Label>
                    <Input id="zipCode" name="zipCode" value={formData.zipCode} onChange={handleChange} />
                  </div>
                </div>
                {/* Latitude/Longitude */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="latitude">Latitude</Label>
                    <Input id="latitude" name="latitude" value={formData.latitude} onChange={handleChange} placeholder="e.g., 12.9716" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="longitude">Longitude</Label>
                    <Input id="longitude" name="longitude" value={formData.longitude} onChange={handleChange} placeholder="e.g., 77.5946" />
                  </div>
                </div>
              </div>
            </div>

            {/* Contact */}
            <div>
              <h2 className="text-lg font-semibold mb-4">Contact</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="contactPersonName">Contact Person Name</Label>
                  <Input id="contactPersonName" name="contactPersonName" value={formData.contactPersonName} onChange={handleChange} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="contactEmail">Contact Email</Label>
                  <Input id="contactEmail" name="contactEmail" value={formData.contactEmail} onChange={handleChange} disabled aria-readonly />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="contactPhone">Contact Phone</Label>
                  <Input id="contactPhone" name="contactPhone" value={formData.contactPhone} onChange={handleChange} />
                </div>
              </div>
            </div>

            {/* Settings */}
            <div>
              <h2 className="text-lg font-semibold mb-4">Settings</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="timezone">Timezone</Label>
                  <Input id="timezone" name="timezone" value={formData.timezone} onChange={handleChange} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="workingDays">Working Days</Label>
                  <Input id="workingDays" name="workingDays" value={formData.workingDays} onChange={handleChange} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="dayStartTime">Day Start Time</Label>
                  <Input id="dayStartTime" name="dayStartTime" value={formData.dayStartTime} onChange={handleChange} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="dayEndTime">Day End Time</Label>
                  <Input id="dayEndTime" name="dayEndTime" value={formData.dayEndTime} onChange={handleChange} />
                </div>
              </div>
           <div className="mt-4 flex items-center gap-2 cursor-default opacity-80">
  <Switch checked={formData.active} disabled />
  <span className="text-sm">Active Organization</span>
</div>

            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default OrganizationSettings;