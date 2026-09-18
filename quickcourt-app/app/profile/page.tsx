"use client"

import { useState, useEffect, useRef } from "react"
import { useAuth } from "@/contexts/AuthContext"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { useToast } from "@/hooks/use-toast"
import { User, Phone, MapPin, Camera, ArrowLeft, Upload, X, Edit3, Save, Loader2 } from "lucide-react"
import Link from "next/link"

export default function ProfilePage() {
  const { user, logout, updateUser, isLoading: authLoading } = useAuth()
  const router = useRouter()
  const { toast } = useToast()
  const fileInputRef = useRef<HTMLInputElement>(null)
  
  const [isEditing, setIsEditing] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [profileData, setProfileData] = useState({
    name: "",
    email: "",
    phone: "",
    location: "",
    avatar: "",
    bio: "",
    preferences: {
      emailNotifications: true,
      smsNotifications: false,
      privacyLevel: 'public'
    }
  })

  useEffect(() => {
    if (authLoading) return
    if (!user) {
      router.push("/auth/login")
      return
    }

    setProfileData({
      name: user.name || "",
      email: user.email || "",
      phone: user.phone || "",
      location: user.location || "",
      avatar: user.avatar || "",
      bio: user.bio || "",
      preferences: {
        emailNotifications: user.preferences?.emailNotifications ?? true,
        smsNotifications: user.preferences?.smsNotifications ?? false,
        privacyLevel: user.preferences?.privacyLevel ?? "public",
      },
    })
  }, [user, router, authLoading])

  const handleSave = async () => {
    if (!user?.id) return

    setIsLoading(true)
    try {
      const response = await fetch('/api/profile/update', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          profileData: {
            name: profileData.name,
            phone: profileData.phone,
            location: profileData.location,
            bio: profileData.bio,
            preferences: profileData.preferences,
          },
        }),
      })

      const data = await response.json()

      if (response.ok) {
        // Update local user context
        if (updateUser) {
          updateUser(data.user)
        }
        
        toast({
          title: "Profile updated",
          description: "Your profile has been updated successfully.",
        })
        setIsEditing(false)
      } else {
        toast({
          title: "Update failed",
          description: data.error || "Failed to update profile. Please try again.",
          variant: "destructive",
        })
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Something went wrong. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleAvatarUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file || !user?.id) return

    setIsUploading(true)
    try {
      const formData = new FormData()
      formData.append("avatar", file)

      const response = await fetch('/api/profile/upload-avatar', {
        method: 'POST',
        body: formData,
      })

      const data = await response.json()

      if (response.ok) {
        setProfileData(prev => ({ ...prev, avatar: data.avatar }))
        if (updateUser) {
          updateUser({ ...user, avatar: data.avatar })
        }
        toast({
          title: "Avatar updated",
          description: "Your profile photo has been updated successfully.",
        })
      } else {
        toast({
          title: "Upload failed",
          description: data.error || "Failed to upload avatar. Please try again.",
          variant: "destructive",
        })
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to upload avatar. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsUploading(false)
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }
  }

  const handleLogout = async () => {
    await logout()
  }

  if (authLoading || !user) {
    return null
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div className="flex items-center space-x-4">
              <Button variant="ghost" onClick={() => router.back()}>
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back
              </Button>
              <Link href="/">
                <h1 className="text-2xl font-bold text-indigo-600 cursor-pointer">CourtX</h1>
              </Link>
            </div>
            <div className="flex items-center space-x-4">
              <Badge variant={user.role === "admin" ? "destructive" : user.role === "owner" ? "secondary" : "default"}>
                {user.role.charAt(0).toUpperCase() + user.role.slice(1)}
              </Badge>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-gray-900 mb-2">Profile Settings</h2>
          <p className="text-gray-600">Manage your account information and preferences</p>
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Profile Card */}
          <div className="lg:col-span-1">
            <Card>
              <CardHeader className="text-center">
                <div className="relative mx-auto w-24 h-24 mb-4">
                  <img
                    src={profileData.avatar || "/placeholder-user.jpg"}
                    alt="Profile"
                    className="w-full h-full rounded-full object-cover border-4 border-white shadow-lg"
                  />
                  <button 
                    className="absolute bottom-0 right-0 bg-indigo-600 text-white p-2 rounded-full hover:bg-indigo-700 transition-colors"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isUploading}
                  >
                    {isUploading ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Camera className="h-4 w-4" />
                    )}
                  </button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleAvatarUpload}
                    className="hidden"
                  />
                </div>
                <CardTitle>{profileData.name}</CardTitle>
                <CardDescription>{profileData.email}</CardDescription>
                {profileData.bio && (
                  <p className="text-sm text-gray-600 mt-2">{profileData.bio}</p>
                )}
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center space-x-3">
                  <Phone className="h-4 w-4 text-gray-500" />
                  <span className="text-sm">{profileData.phone || "Not provided"}</span>
                </div>
                <div className="flex items-center space-x-3">
                  <MapPin className="h-4 w-4 text-gray-500" />
                  <span className="text-sm">{profileData.location || "Not provided"}</span>
                </div>
                <div className="flex items-center space-x-3">
                  <User className="h-4 w-4 text-gray-500" />
                  <Badge
                    variant={user.role === "admin" ? "destructive" : user.role === "owner" ? "secondary" : "default"}
                  >
                    {user.role.charAt(0).toUpperCase() + user.role.slice(1)}
                  </Badge>
                </div>
              </CardContent>
            </Card>

            {/* Quick Actions */}
            <Card className="mt-6">
              <CardHeader>
                <CardTitle>Quick Actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {user.role === "user" && (
                  <>
                    <Link href="/bookings">
                      <Button variant="outline" className="w-full justify-start bg-transparent">
                        My Bookings
                      </Button>
                    </Link>
                    <Link href="/venues">
                      <Button variant="outline" className="w-full justify-start bg-transparent">
                        Browse Venues
                      </Button>
                    </Link>
                  </>
                )}
                {user.role === "owner" && (
                  <>
                    <Link href="/owner/dashboard">
                      <Button variant="outline" className="w-full justify-start bg-transparent">
                        Owner Dashboard
                      </Button>
                    </Link>
                    <Link href="/owner/facilities">
                      <Button variant="outline" className="w-full justify-start bg-transparent">
                        Manage Facilities
                      </Button>
                    </Link>
                  </>
                )}
                {user.role === "admin" && (
                  <>
                    <Link href="/admin/dashboard">
                      <Button variant="outline" className="w-full justify-start bg-transparent">
                        Admin Dashboard
                      </Button>
                    </Link>
                    <Link href="/admin/facilities">
                      <Button variant="outline" className="w-full justify-start bg-transparent">
                        Facility Approvals
                      </Button>
                    </Link>
                  </>
                )}
                <Button variant="destructive" className="w-full justify-start" onClick={handleLogout}>
                  Sign Out
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* Profile Form */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <div className="flex justify-between items-center">
                  <div>
                    <CardTitle>Personal Information</CardTitle>
                    <CardDescription>Update your personal details</CardDescription>
                  </div>
                  {!isEditing ? (
                    <Button onClick={() => setIsEditing(true)}>
                      <Edit3 className="h-4 w-4 mr-2" />
                      Edit Profile
                    </Button>
                  ) : (
                    <div className="space-x-2">
                      <Button variant="outline" onClick={() => setIsEditing(false)} disabled={isLoading}>
                        Cancel
                      </Button>
                      <Button onClick={handleSave} disabled={isLoading}>
                        {isLoading ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Saving...
                          </>
                        ) : (
                          <>
                            <Save className="mr-2 h-4 w-4" />
                            Save Changes
                          </>
                        )}
                      </Button>
                    </div>
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="name">Full Name</Label>
                    <Input
                      id="name"
                      value={profileData.name}
                      onChange={(e) => setProfileData({ ...profileData, name: e.target.value })}
                      disabled={!isEditing}
                    />
                  </div>
                  <div>
                    <Label htmlFor="email">Email Address</Label>
                    <Input
                      id="email"
                      type="email"
                      value={profileData.email}
                      disabled
                    />
                  </div>
                </div>
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="phone">Phone Number</Label>
                    <Input
                      id="phone"
                      value={profileData.phone}
                      onChange={(e) => setProfileData({ ...profileData, phone: e.target.value })}
                      disabled={!isEditing}
                      placeholder="+1 (555) 123-4567"
                    />
                  </div>
                  <div>
                    <Label htmlFor="location">Location</Label>
                    <Input
                      id="location"
                      value={profileData.location}
                      onChange={(e) => setProfileData({ ...profileData, location: e.target.value })}
                      disabled={!isEditing}
                      placeholder="City, State/Country"
                    />
                  </div>
                </div>
                <div>
                  <Label htmlFor="bio">Bio</Label>
                  <Textarea
                    id="bio"
                    value={profileData.bio}
                    onChange={(e) => setProfileData({ ...profileData, bio: e.target.value })}
                    disabled={!isEditing}
                    placeholder="Tell us about yourself..."
                    rows={3}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Preferences */}
            <Card className="mt-6">
              <CardHeader>
                <CardTitle>Preferences</CardTitle>
                <CardDescription>Manage your account preferences</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div>
                    <h4 className="font-semibold">Email Notifications</h4>
                    <p className="text-sm text-gray-600">Receive booking confirmations and updates</p>
                  </div>
                  <Switch
                    checked={profileData.preferences.emailNotifications}
                    onCheckedChange={(checked) => 
                      setProfileData(prev => ({
                        ...prev,
                        preferences: { ...prev.preferences, emailNotifications: checked }
                      }))
                    }
                    disabled={!isEditing}
                  />
                </div>
                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div>
                    <h4 className="font-semibold">SMS Notifications</h4>
                    <p className="text-sm text-gray-600">Receive text message updates</p>
                  </div>
                  <Switch
                    checked={profileData.preferences.smsNotifications}
                    onCheckedChange={(checked) => 
                      setProfileData(prev => ({
                        ...prev,
                        preferences: { ...prev.preferences, smsNotifications: checked }
                      }))
                    }
                    disabled={!isEditing}
                  />
                </div>
                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div>
                    <h4 className="font-semibold">Privacy Level</h4>
                    <p className="text-sm text-gray-600">Control your profile visibility</p>
                  </div>
                  <Select
                    value={profileData.preferences.privacyLevel}
                    onValueChange={(value) => 
                      setProfileData(prev => ({
                        ...prev,
                        preferences: { ...prev.preferences, privacyLevel: value as 'public' | 'friends' | 'private' }
                      }))
                    }
                    disabled={!isEditing}
                  >
                    <SelectTrigger className="w-32">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="public">Public</SelectItem>
                      <SelectItem value="friends">Friends</SelectItem>
                      <SelectItem value="private">Private</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>

            {/* Account Settings */}
            <Card className="mt-6">
              <CardHeader>
                <CardTitle>Account Settings</CardTitle>
                <CardDescription>Manage your account preferences</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div>
                    <h4 className="font-semibold">Change Password</h4>
                    <p className="text-sm text-gray-600">Update your account password</p>
                  </div>
                  <Button variant="outline" size="sm">
                    Change
                  </Button>
                </div>
                <div className="flex items-center justify-between p-4 border rounded-lg border-red-200 bg-red-50">
                  <div>
                    <h4 className="font-semibold text-red-800">Delete Account</h4>
                    <p className="text-sm text-red-600">Permanently delete your account and data</p>
                  </div>
                  <Button variant="destructive" size="sm">
                    Delete
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  )
}
