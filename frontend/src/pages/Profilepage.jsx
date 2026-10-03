import React, {
  memo,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'

import { Link, useNavigate } from 'react-router-dom'

import {
  AlertCircle,
  Award,
  BellRing,
  Camera,
  CalendarDays,
  Check,
  ChevronDown,
  ChevronUp,
  GraduationCap,
  Info,
  Loader2,
  Lock,
  LogOut,
  Mail,
  MapPin,
  Pencil,
  Phone,
  Save,
  Search,
  School,
  Settings,
  Trash2,
  User,
  X,
} from 'lucide-react'

import { apiRequest, assetUrl } from '../api'
import { getStoredAuth, updateStoredUser } from '../authStorage'
import { useAuth } from '../context/AuthContext'
import { getWebPushSubscription, registerWebPush, unregisterWebPush } from '../lib/webPush'
import AcademicPerformanceDashboard from '../components/AcademicPerformanceDashboard'

/* =========================================================
   CONSTANTS
========================================================= */

const EMPTY_PROFILE_DETAILS = {
  dateOfBirth: '',
  gender: '',
  bloodGroup: '',
  state: 'Maharashtra',
  city: 'Mumbai',
  area: 'Bhandup',
  schoolName: '',
  finalExamPercentage: '',
}

const TABS = [
  {
    id: 'Info',
    label: 'Info',
  },
  {
    id: 'Performance',
    label: 'Performance',
  },
]

const STATE_CITY_OPTIONS = {
  Maharashtra: [
    'Mumbai',
    'Pune',
    'Nashik',
    'Nagpur',
    'Thane',
    'Navi Mumbai',
    'Chhatrapati Sambhajinagar',
    'Solapur',
    'Kolhapur',
    'Amravati',
    'Nanded',
    'Sangli',
    'Jalgaon',
    'Akola',
    'Latur',
    'Dhule',
    'Ahmednagar',
    'Ahilyanagar',
    'Chandrapur',
    'Parbhani',
    'Jalna',
    'Bhiwandi',
    'Vasai-Virar',
    'Mira-Bhayandar',
    'Kalyan-Dombivli',
    'Ulhasnagar',
    'Panvel',
    'Malegaon',
    'Satara',
    'Ratnagiri',
    'Yavatmal',
    'Wardha',
    'Buldhana',
    'Beed',
    'Gondia',
    'Washim',
    'Hingoli',
    'Gadchiroli',
    'Sindhudurg',
    'Baramati',
    'Ichalkaranji',
    'Karad',
    'Sangamner',
    'Manmad',
    'Shirdi',
    'Nandurbar',
    'Osmanabad',
    'Dharashiv',
    'Wai',
    'Dombivli',
    'Malkapur',
    'Talegaon Dabhade',
  ],

  'Madhya Pradesh': [
    'Bhopal',
    'Indore',
    'Gwalior',
    'Jabalpur',
  ],

  Manipur: [
    'Imphal',
  ],

  Meghalaya: [
    'Shillong',
  ],

  Mizoram: [
    'Aizawl',
  ],

  Gujarat: [
    'Ahmedabad',
    'Surat',
    'Vadodara',
    'Rajkot',
  ],

  Delhi: [
    'New Delhi',
  ],

  Karnataka: [
    'Bengaluru',
    'Mysuru',
    'Mangaluru',
  ],
  Rajasthan: ['Jaipur', 'Jodhpur', 'Udaipur', 'Kota', 'Ajmer'],
  'Uttar Pradesh': ['Lucknow', 'Kanpur', 'Agra', 'Varanasi', 'Prayagraj', 'Noida', 'Ghaziabad'],
  Bihar: ['Patna', 'Gaya', 'Muzaffarpur', 'Bhagalpur'],
  'West Bengal': ['Kolkata', 'Howrah', 'Durgapur', 'Siliguri'],
  'Tamil Nadu': ['Chennai', 'Coimbatore', 'Madurai', 'Salem', 'Tiruchirappalli'],
  Telangana: ['Hyderabad', 'Warangal', 'Nizamabad', 'Karimnagar'],
  'Andhra Pradesh': ['Visakhapatnam', 'Vijayawada', 'Guntur', 'Tirupati', 'Nellore'],
  Kerala: ['Thiruvananthapuram', 'Kochi', 'Kozhikode', 'Thrissur'],
  Odisha: ['Bhubaneswar', 'Cuttack', 'Rourkela', 'Puri'],
  Punjab: ['Chandigarh', 'Ludhiana', 'Amritsar', 'Jalandhar', 'Patiala'],
  Haryana: ['Gurugram', 'Faridabad', 'Panipat', 'Hisar', 'Ambala'],
  Chhattisgarh: ['Raipur', 'Bhilai', 'Bilaspur', 'Durg'],
  Jharkhand: ['Ranchi', 'Jamshedpur', 'Dhanbad', 'Bokaro'],
  Uttarakhand: ['Dehradun', 'Haridwar', 'Nainital', 'Haldwani'],
  'Himachal Pradesh': ['Shimla', 'Dharamshala', 'Manali', 'Solan'],
  Goa: ['Panaji', 'Margao', 'Vasco da Gama'],
  Assam: ['Guwahati', 'Dibrugarh', 'Silchar', 'Jorhat'],
  Tripura: ['Agartala'],
  Nagaland: ['Kohima', 'Dimapur'],
  'Arunachal Pradesh': ['Itanagar', 'Tawang', 'Naharlagun'],
  Sikkim: ['Gangtok', 'Namchi'],
  'Andaman and Nicobar Islands': ['Port Blair'],
  Chandigarh: ['Chandigarh'],
  'Dadra and Nagar Haveli and Daman and Diu': ['Daman', 'Silvassa', 'Diu'],
  Lakshadweep: ['Kavaratti'],
  Puducherry: ['Puducherry'],
  'Jammu and Kashmir': ['Srinagar', 'Jammu', 'Anantnag'],
  Ladakh: ['Leh', 'Kargil'],
}

const CITY_API_URL = 'https://countriesnow.space/api/v0.1/countries/state/cities'

const AREA_OPTIONS = {
  Mumbai: ['Bhandup', 'Bhandup East', 'Bhandup West', 'Mulund', 'Kanjurmarg', 'Vikhroli', 'Powai', 'Ghatkopar'],
}

const GENDER_OPTIONS = ['Male', 'Female', 'Prefer not to say']
const BLOOD_GROUP_OPTIONS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-', 'Not known']

const STATE_OPTIONS = Object.keys(STATE_CITY_OPTIONS)

/* =========================================================
   HELPERS
========================================================= */

const formatDate = (date, options = {}) => {
  if (!date) return 'Not provided'

  try {
    return new Intl.DateTimeFormat('en-IN', {
      dateStyle: 'medium',
      ...options,
    }).format(new Date(date))
  } catch {
    return 'Not provided'
  }
}

const formatDateLong = (date) => {
  if (!date) return 'Not available'

  try {
    return new Intl.DateTimeFormat('en-IN', {
      dateStyle: 'long',
    }).format(new Date(date))
  } catch {
    return 'Not available'
  }
}

const getInitials = (name = '') => {
  const parts = name
    .trim()
    .split(/\s+/)
    .filter(Boolean)

  if (!parts.length) return 'ST'

  return parts
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase()
}

const normalizeProfileDetails = (user = {}) => ({
  ...EMPTY_PROFILE_DETAILS,

  dateOfBirth: user.dateOfBirth || '',

  gender: user.gender || '',

  bloodGroup: user.bloodGroup || '',

  state: user.state || 'Maharashtra',

  city: user.city || 'Mumbai',
  area: user.area || 'Bhandup',

  schoolName: user.schoolName || '',

  finalExamPercentage:
    user.finalExamPercentage ?? '',
})

/* =========================================================
   PROFILE IMAGE
========================================================= */

const createCroppedWebp = ({
  imageSrc,
  cropPosition,
  viewport,
  cropSize,
}) => {
  return new Promise((resolve, reject) => {
    const image = new Image()

    image.onload = () => {
      const size = 512

      const canvas = document.createElement('canvas')

      const context = canvas.getContext('2d')

      if (!context) {
        reject(new Error('Could not prepare image.'))
        return
      }

      canvas.width = size
      canvas.height = size

      const scale = Math.max(viewport.width / image.width, viewport.height / image.height)
      const displayedWidth = image.width * scale
      const displayedHeight = image.height * scale
      const imageLeft = (viewport.width - displayedWidth) / 2
      const imageTop = (viewport.height - displayedHeight) / 2
      const cropLeft = viewport.width / 2 + cropPosition.x - cropSize / 2
      const cropTop = viewport.height / 2 + cropPosition.y - cropSize / 2
      const sourceX = Math.max(0, (cropLeft - imageLeft) / scale)
      const sourceY = Math.max(0, (cropTop - imageTop) / scale)
      const sourceSize = Math.min(cropSize / scale, image.width - sourceX, image.height - sourceY)

      context.drawImage(image, sourceX, sourceY, sourceSize, sourceSize, 0, 0, size, size)

      canvas.toBlob(
        (blob) => {
          if (!blob) {
            reject(
              new Error(
                'Could not prepare image.',
              ),
            )

            return
          }

          resolve(blob)
        },
        'image/webp',
        0.9,
      )
    }

    image.onerror = () => {
      reject(
        new Error(
          'Could not load image.',
        ),
      )
    }

    image.src = imageSrc
  })
}

export const PushNotificationSetting = () => {
  const [permission, setPermission] = useState('unsupported')
  const [subscribed, setSubscribed] = useState(false)
  const [busy, setBusy] = useState(false)
  const [notice, setNotice] = useState('')

  const refreshStatus = useCallback(async () => {
    try {
      const result = await getWebPushSubscription()
      setPermission(result.permission)
      setSubscribed(result.subscribed)
    } catch {
      setPermission('unsupported')
      setSubscribed(false)
    }
  }, [])

  useEffect(() => {
    refreshStatus()
  }, [refreshStatus])

  const handleSubscribe = async () => {
    setBusy(true)
    setNotice('')
    try {
      const result = await registerWebPush()
      setPermission(result.permission || permission)
      setSubscribed(result.permission === 'granted')
      window.dispatchEvent(new Event('innovative-science-push-updated'))
      if (result.permission === 'denied') setNotice('Allow notifications from your browser site settings, then try again.')
    } catch (error) {
      setNotice(error.message || 'Could not enable notifications.')
    } finally {
      setBusy(false)
    }
  }

  const handleUnsubscribe = async () => {
    setBusy(true)
    setNotice('')
    try {
      await unregisterWebPush()
      setSubscribed(false)
      window.dispatchEvent(new Event('innovative-science-push-updated'))
    } catch (error) {
      setNotice(error.message || 'Could not unsubscribe from notifications.')
    } finally {
      setBusy(false)
    }
  }

  if (permission === 'unsupported') return null

  return (
    <section className="mt-4 flex flex-col gap-4 border-b border-slate-200 bg-white px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
      <div className="flex items-start gap-3">
        <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-cyan-50 text-cyan-600"><BellRing className="h-5 w-5" /></div>
        <div>
          <h2 className="text-sm font-black text-slate-800">Browser notifications</h2>
          <p className="mt-1 text-xs font-medium text-slate-500">Hourly study reminders and important science updates.</p>
          {notice && <p className="mt-1 text-xs font-bold text-rose-600">{notice}</p>}
        </div>
      </div>
      <button type="button" onClick={subscribed ? handleUnsubscribe : handleSubscribe} disabled={busy || permission === 'denied'} className="rounded-xl border border-cyan-200 px-4 py-2 text-xs font-black text-cyan-700 transition hover:bg-cyan-50 disabled:cursor-not-allowed disabled:opacity-60">
        {busy ? 'Updating...' : permission === 'denied' ? 'Allow in browser settings' : subscribed ? 'Unsubscribe' : 'Allow'}
      </button>
    </section>
  )
}

/* =========================================================
   MAIN COMPONENT
========================================================= */

const Profilepage = () => {
  const navigate = useNavigate()

  const { logout } = useAuth()

  const fileInputRef = useRef(null)

  const dragRef = useRef(null)

  const cropViewportRef = useRef(null)

  const cropFrameRef = useRef(null)

  /* -------------------------------------------------------
     AUTH
  ------------------------------------------------------- */

  const [auth, setAuth] = useState(() =>
    getStoredAuth(),
  )

  /* -------------------------------------------------------
     PAGE STATE
  ------------------------------------------------------- */

  const [activeTab, setActiveTab] =
    useState('Info')

  const [openSections, setOpenSections] =
    useState({
      basic: true,
      personal: true,
      education: true,
    })

  const [editingSection, setEditingSection] =
    useState('')

  /* -------------------------------------------------------
     PROFILE DATA
  ------------------------------------------------------- */

  const [name, setName] = useState(
    auth?.user?.name || '',
  )

  const [phoneNumber, setPhoneNumber] =
    useState(
      auth?.user?.phoneNumber || '',
    )

  const [email, setEmail] = useState(
    auth?.user?.email || '',
  )

  const [profileDetails, setProfileDetails] =
    useState(
      normalizeProfileDetails(
        auth?.user,
      ),
    )

  const [maharashtraCities, setMaharashtraCities] = useState(
    STATE_CITY_OPTIONS.Maharashtra,
  )
  const [isLoadingCities, setIsLoadingCities] = useState(false)

  /* -------------------------------------------------------
     UI STATE
  ------------------------------------------------------- */

  const [isLoading, setIsLoading] =
    useState(true)

  const [isSaving, setIsSaving] =
    useState(false)

  const [locatingField, setLocatingField] =
    useState('')

  const [locationError, setLocationError] =
    useState('')

  const [message, setMessage] =
    useState('')

  const [error, setError] =
    useState('')

  /* -------------------------------------------------------
     SECURITY MODALS
  ------------------------------------------------------- */

  const [activeModal, setActiveModal] =
    useState('')

  const [passwordForm, setPasswordForm] =
    useState({
      currentPassword: '',
      newPassword: '',
      confirmPassword: '',
    })

  /* -------------------------------------------------------
     PROFILE PHOTO
  ------------------------------------------------------- */

  const [selectedImage, setSelectedImage] =
    useState('')

  const [photoChooserOpen, setPhotoChooserOpen] =
    useState(false)

  const [photoError, setPhotoError] =
    useState('')

  const [offset, setOffset] =
    useState({
      x: 0,
      y: 0,
    })

  /* =========================================================
     FETCH USER
  ========================================================= */

  const loadProfile = useCallback(
    async () => {
      if (!auth?.token) {
        setIsLoading(false)
        return
      }

      try {
        const data =
          await apiRequest(
            '/api/auth/me',
          )

        const updatedAuth =
          updateStoredUser(
            data.user,
          )

        setAuth(updatedAuth)

        setName(
          data.user.name || '',
        )

        setPhoneNumber(
          data.user.phoneNumber || '',
        )

        setEmail(
          data.user.email || '',
        )

        setProfileDetails(
          normalizeProfileDetails(
            data.user,
          ),
        )
      } catch (err) {
        console.error(
          'Profile loading error:',
          err,
        )

        setAuth(null)
      } finally {
        setIsLoading(false)
      }
    },
    [auth?.token],
  )

  useEffect(() => {
    loadProfile()
  }, [loadProfile])

  useEffect(() => {
    const controller = new AbortController()
    setIsLoadingCities(true)

    fetch(CITY_API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ country: 'India', state: 'Maharashtra' }),
      signal: controller.signal,
    })
      .then((response) => {
        if (!response.ok) throw new Error('Could not load Maharashtra cities.')
        return response.json()
      })
      .then((result) => {
        const cities = Array.isArray(result?.data)
          ? result.data.map((city) => String(city).trim()).filter(Boolean).sort((a, b) => a.localeCompare(b))
          : []

        if (cities.length) setMaharashtraCities([...new Set(cities)])
      })
      .catch((error) => {
        if (error.name !== 'AbortError') console.warn('Using fallback Maharashtra cities:', error.message)
      })
      .finally(() => setIsLoadingCities(false))

    return () => controller.abort()
  }, [])

  /* =========================================================
     CLEAR NOTIFICATIONS
  ========================================================= */

  useEffect(() => {
    if (!message && !error) {
      return undefined
    }

    const timer =
      window.setTimeout(() => {
        setMessage('')
        setError('')
      }, 4500)

    return () =>
      window.clearTimeout(timer)
  }, [message, error])

  /* =========================================================
     DERIVED VALUES
  ========================================================= */

  const user = auth?.user

  const initials = useMemo(
    () =>
      getInitials(
        user?.name || name,
      ),
    [user?.name, name],
  )

  const lastLogin = useMemo(
    () =>
      user?.lastLoginAt
        ? formatDate(
            user.lastLoginAt,
          )
        : 'Not available',
    [user?.lastLoginAt],
  )

  const dateOfJoining = useMemo(
    () =>
      user?.createdAt
        ? formatDateLong(
            user.createdAt,
          )
        : 'Not available',
    [user?.createdAt],
  )

  /* =========================================================
     SECTION CONTROLS
  ========================================================= */

  const toggleSection =
    useCallback(
      (section) => {
        setOpenSections(
          (current) => ({
            ...current,

            [section]:
              !current[section],
          }),
        )
      },
      [],
    )

  const startSectionEdit =
    useCallback(
      (section) => {
        setEditingSection(section)

        setOpenSections(
          (current) => ({
            ...current,
            [section]: true,
          }),
        )

        setError('')

        setMessage('')
      },
      [],
    )

  const cancelSectionEdit =
    useCallback(() => {
      setEditingSection('')

      setError('')

      if (user) {
        setName(user.name || '')

        setPhoneNumber(
          user.phoneNumber || '',
        )

        setProfileDetails(
          normalizeProfileDetails(
            user,
          ),
        )
      }
    }, [user])

  /* =========================================================
     UPDATE PROFILE DETAILS
  ========================================================= */

  const updateProfileDetail =
    useCallback(
      (key, value) => {
        if (key === 'city') setLocationError('')
        setProfileDetails(
          (current) => ({
            ...current,

            [key]: value,

            ...(key === 'state'
              ? {
                  city: '',
                  area: '',
                }
              : key === 'city'
                ? {
                    area: '',
                  }
                : {}),
          }),
        )
      },
      [],
    )

  const useCurrentLocation =
    useCallback((targetField = 'city') => {
      if (!navigator.geolocation) {
        setLocationError('Location is not supported by this browser.')
        return
      }

      setLocatingField(targetField)
      setLocationError('')

      navigator.geolocation.getCurrentPosition(
        async ({ coords }) => {
          try {
            const response = await fetch(
              `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${encodeURIComponent(coords.latitude)}&longitude=${encodeURIComponent(coords.longitude)}&localityLanguage=en`,
            )

            if (!response.ok) throw new Error('Could not identify this location.')

            const location = await response.json()
            const detectedState = String(location.principalSubdivision || '').trim()
            const detectedCountry = String(location.countryName || '').trim()

            if (detectedCountry && detectedCountry !== 'India') {
              throw new Error('This location is outside India.')
            }

            if (!detectedState.toLowerCase().includes('maharashtra')) {
              throw new Error('Please allow a location inside Maharashtra.')
            }

            const detectedCity = String(
              location.city || location.localityInfo?.administrative?.find((item) => item?.name)?.name || location.locality || '',
            ).trim()
            const blockedAreaNames = new Set([
              detectedCity.toLowerCase(),
              detectedState.toLowerCase(),
              detectedCountry.toLowerCase(),
              String(location.continent || '').trim().toLowerCase(),
              'asia',
              'india',
              'maharashtra',
            ].filter(Boolean))
            const areaCandidates = [
              location.locality,
              location.suburb,
              location.neighbourhood,
              location.quarter,
              ...(location.localityInfo?.informative || []).map((item) => item?.name),
            ]
              .map((name) => String(name || '').trim())
              .filter(Boolean)
            const detectedArea = areaCandidates.find((name) => {
              const normalizedName = name.toLowerCase()
              return !blockedAreaNames.has(normalizedName)
            }) || ''

            setMaharashtraCities((current) => (
              detectedCity && !current.some((city) => city.toLowerCase() === detectedCity.toLowerCase())
                ? [...current, detectedCity].sort((a, b) => a.localeCompare(b))
                : current
            ))
            setProfileDetails((current) => ({
              ...current,
              state: 'Maharashtra',
              ...(targetField === 'area'
                ? { area: detectedArea || current.area }
                : { city: detectedCity || current.city }),
            }))
            setLocationError('')
            setMessage('Location detected. Review the address and save your profile.')
          } catch (error) {
            setLocationError(error.message || 'Could not identify this location.')
          } finally {
            setLocatingField('')
          }
        },
        (geolocationError) => {
          const message = geolocationError.code === geolocationError.PERMISSION_DENIED
            ? 'Location permission was denied. Please allow location access and try again.'
            : 'Could not read your current location. Please try again.'
          setLocationError(message)
          setLocatingField('')
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 300000 },
      )
    }, [])

  /* =========================================================
     VALIDATION
  ========================================================= */

  const validateProfile =
    useCallback(() => {
      const percentage =
        profileDetails.finalExamPercentage

      if (phoneNumber && !/^\d{10}$/.test(phoneNumber)) {
        return 'Mobile number must contain exactly 10 digits.'
      }

      if (
        percentage !== '' &&
        (
          Number.isNaN(
            Number(percentage),
          ) ||
          Number(percentage) < 0 ||
          Number(percentage) > 100
        )
      ) {
        return 'Std 9 percentage must be between 0 and 100.'
      }

      if (
        profileDetails.state &&
        !Object.prototype.hasOwnProperty.call(
          STATE_CITY_OPTIONS,
          profileDetails.state,
        )
      ) {
        return 'Please choose a state from the suggestions.'
      }

      if (
        profileDetails.city &&
        !maharashtraCities.includes(profileDetails.city)
      ) {
        return 'Please choose a city from the suggestions for the selected state.'
      }

      return ''
    }, [maharashtraCities, phoneNumber, profileDetails])

  /* =========================================================
     SAVE PROFILE
  ========================================================= */

  const saveProfile =
    useCallback(
      async (event) => {
        event?.preventDefault()

        setError('')

        const validationError =
          validateProfile()

        if (validationError) {
          setError(
            validationError,
          )

          return
        }

        setIsSaving(true)

        try {
          const data =
            await apiRequest(
              '/api/auth/profile',
              {
                method: 'PATCH',

                body: JSON.stringify({
                  name,
                  phoneNumber,
                  ...profileDetails,
                }),
              },
            )

          const updatedAuth =
            updateStoredUser(
              data.user,
            )

          setAuth(updatedAuth)

          setName(
            data.user.name || '',
          )

          setPhoneNumber(
            data.user.phoneNumber ||
              '',
          )

          setEmail(
            data.user.email || '',
          )

          setProfileDetails(
            normalizeProfileDetails(
              data.user,
            ),
          )

          setEditingSection('')

          setMessage(
            'Profile updated successfully.',
          )
        } catch (err) {
          setError(
            err.message ||
              'Could not update profile.',
          )
        } finally {
          setIsSaving(false)
        }
      },
      [
        name,
        phoneNumber,
        profileDetails,
        validateProfile,
      ],
    )

  /* =========================================================
     LOGOUT
  ========================================================= */

  const handleLogout =
    useCallback(async () => {
      try {
        await logout()
      } finally {
        setAuth(null)

        navigate('/signin', {
          replace: true,
        })
      }
    }, [logout, navigate])

  /* =========================================================
     PASSWORD
  ========================================================= */

  const savePassword =
    useCallback(
      async (event) => {
        event.preventDefault()

        setError('')

        if (
          passwordForm.newPassword !==
          passwordForm.confirmPassword
        ) {
          setError(
            'New passwords do not match.',
          )

          return
        }

        if (
          passwordForm.newPassword.length <
          6
        ) {
          setError(
            'New password must contain at least 6 characters.',
          )

          return
        }

        setIsSaving(true)

        try {
          await apiRequest(
            '/api/auth/update-password',
            {
              method: 'PATCH',

              body: JSON.stringify({
                currentPassword:
                  passwordForm.currentPassword,

                newPassword:
                  passwordForm.newPassword,
              }),
            },
          )

          setPasswordForm({
            currentPassword: '',
            newPassword: '',
            confirmPassword: '',
          })

          setActiveModal('')

          setMessage(
            'Password changed successfully.',
          )
        } catch (err) {
          setError(
            err.message ||
              'Could not change password.',
          )
        } finally {
          setIsSaving(false)
        }
      },
      [passwordForm],
    )

  /* =========================================================
     PROFILE IMAGE
  ========================================================= */

  const handleFileChange =
    useCallback((event) => {
      const file =
        event.target.files?.[0]

      if (!file) return

      if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
        setPhotoError('Please select a JPG, PNG, or WEBP image.')

        return
      }

      if (file.size > 5 * 1024 * 1024) {
        setPhotoError('Image size must be less than 5 MB.')

        return
      }

      const reader =
        new FileReader()

      reader.onload = () => {
        setSelectedImage(
          reader.result,
        )

        setOffset({
          x: 0,
          y: 0,
        })

        setPhotoError('')
        setPhotoChooserOpen(false)
      }

      reader.readAsDataURL(file)

      event.target.value = ''
    }, [])

  const removeProfileImage = useCallback(async () => {
    setPhotoError('')
    setIsSaving(true)
    try {
      const data = await apiRequest('/api/auth/profile-image', { method: 'DELETE' })
      setAuth(updateStoredUser(data.user))
      setPhotoChooserOpen(false)
      setMessage('Profile photo removed successfully.')
    } catch {
      setPhotoError("Couldn't remove your profile photo. Please try again.")
    } finally {
      setIsSaving(false)
    }
  }, [])

  const startDrag =
    useCallback(
      (event) => {
        const point =
          event.touches?.[0] ||
          event

        dragRef.current = {
          startX: point.clientX,

          startY: point.clientY,

          current: offset,
        }
      },
      [offset],
    )

  const moveDrag =
    useCallback((event) => {
      if (!dragRef.current) {
        return
      }

      const point =
        event.touches?.[0] ||
        event

      const viewport = cropViewportRef.current?.getBoundingClientRect()
      const frame = cropFrameRef.current?.getBoundingClientRect()
      const maxX = viewport && frame ? Math.max(0, (viewport.width - frame.width) / 2) : Infinity
      const maxY = viewport && frame ? Math.max(0, (viewport.height - frame.height) / 2) : Infinity
      const nextX = dragRef.current.current.x + point.clientX - dragRef.current.startX
      const nextY = dragRef.current.current.y + point.clientY - dragRef.current.startY

      setOffset({
        x: Math.max(-maxX, Math.min(maxX, nextX)),
        y: Math.max(-maxY, Math.min(maxY, nextY)),
      })
    }, [])

  const stopDrag =
    useCallback(() => {
      dragRef.current = null
    }, [])

  const uploadProfileImage =
    useCallback(async () => {
      if (!selectedImage) {
        return
      }

      setPhotoError('')

      setIsSaving(true)

      try {
        const blob =
          await createCroppedWebp({
            imageSrc:
              selectedImage,
            cropPosition: offset,
            viewport: cropViewportRef.current?.getBoundingClientRect() || { width: 1, height: 1 },
            cropSize: cropFrameRef.current?.getBoundingClientRect().width || 1,
          })

        const formData =
          new FormData()

        formData.append(
          'profileImage',
          blob,
          'profile-image.webp',
        )

        const data =
          await apiRequest(
            '/api/auth/profile-image',
            {
              method: 'POST',

              body: formData,
            },
          )

        const updatedAuth =
          updateStoredUser(
            data.user,
          )

        setAuth(updatedAuth)

        setSelectedImage('')

        setMessage(
          'Profile photo updated successfully.',
        )
      } catch {
        setPhotoError("Couldn't update your profile photo. Please try again.")
      } finally {
        setIsSaving(false)
      }
    }, [
      selectedImage,
      offset,
    ])

  /* =========================================================
     AUTH GUARD
  ========================================================= */

  if (isLoading) {
    return (
      <LoadingScreen />
    )
  }

  if (!auth) {
    return (
      <section className="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-10">
        <div className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-xl">
          <div className="mx-auto mb-5 grid h-20 w-20 place-items-center rounded-full bg-sky-50 text-sky-600">
            <User className="h-10 w-10" />
          </div>

          <h1 className="text-2xl font-black tracking-tight text-slate-900">
            Profile Access
          </h1>

          <p className="mt-3 text-sm leading-6 text-slate-500">
            Sign in to view your profile
            and manage your information.
          </p>

          <div className="mt-7 grid gap-3 sm:grid-cols-2">
            <Link
              to="/signin"
              className="flex items-center justify-center rounded-2xl border border-slate-200 px-5 py-3 text-sm font-bold text-slate-700 transition hover:bg-slate-50"
            >
              Sign in
            </Link>

            <Link
              to="/signup"
              className="flex items-center justify-center rounded-2xl bg-sky-500 px-5 py-3 text-sm font-bold text-white shadow-lg shadow-sky-100 transition hover:bg-sky-600"
            >
              Sign up
            </Link>
          </div>
        </div>
      </section>
    )
  }

  /* =========================================================
     PAGE
  ========================================================= */

  return (
    <main className="min-h-screen bg-[#f5f7fa] text-slate-800">
      <div className="mx-auto w-full max-w-[1400px] px-2 py-3 sm:px-4 sm:py-5 lg:px-6 lg:py-7">
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm sm:rounded-3xl">

          {/* =================================================
              HEADER
          ================================================= */}

          <ProfileHeader
            user={user}
            initials={initials}
            lastLogin={lastLogin}
            onLogout={handleLogout}
            onSettings={() => navigate('/settings')}
            onChangePhoto={() => {
              setPhotoError('')
              setPhotoChooserOpen(true)
            }}
          />

          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            aria-label="Upload profile photo"
            onChange={handleFileChange}
            className="hidden"
          />

          {/* =================================================
              TABS
          ================================================= */}

          <ProfileTabs
            activeTab={activeTab}
            onChange={(tab) => {
              const scrollPosition = window.scrollY
              setActiveTab(tab)

              window.requestAnimationFrame(() => {
                window.scrollTo(0, scrollPosition)
              })
            }}
          />

          {/* =================================================
              NOTIFICATIONS
          ================================================= */}

          <div className="px-3 pt-3 sm:px-5 lg:px-8">
            {message && (
              <Notification
                type="success"
                message={message}
                onClose={() =>
                  setMessage('')
                }
              />
            )}

            {error && (
              <Notification
                type="error"
                message={error}
                onClose={() =>
                  setError('')
                }
              />
            )}
          </div>

          {/* =================================================
              CONTENT
          ================================================= */}

          {activeTab === 'Info' && (
            <div className="divide-y divide-slate-200">

              {/* BASIC INFORMATION */}

              <ProfileSection
                number="1"
                title="Basic Information"
                description="Your main account information"
                open={
                  openSections.basic
                }
                editing={
                  editingSection ===
                  'basic'
                }
                onToggle={() =>
                  toggleSection(
                    'basic',
                  )
                }
                onEdit={() =>
                  startSectionEdit(
                    'basic',
                  )
                }
                onCancel={
                  cancelSectionEdit
                }
                onSave={saveProfile}
                saving={isSaving}
              >
                {editingSection ===
                'basic' ? (
                  <div className="grid gap-4 md:grid-cols-2">

                    <FormInput
                      label="Name"
                      value={name}
                      onChange={
                        setName
                      }
                      icon={User}
                      required
                    />

                    <FormInput
                      label="Mobile Number"
                      type="tel"
                      value={
                        phoneNumber
                      }
                      onChange={(value) => setPhoneNumber(value.replace(/\D/g, '').slice(0, 10))}
                      icon={Phone}
                      inputMode="numeric"
                      maxLength={10}
                      placeholder="Enter 10-digit mobile number"
                    />

                    <InfoField
                      icon={Mail}
                      label="Email"
                      value={
                        email ||
                        'Not provided'
                      }
                    />

                    <InfoField
                      icon={
                        CalendarDays
                      }
                      label="Date of Joining"
                      value={
                        dateOfJoining
                      }
                    />
                  </div>
                ) : (
                  <div className="grid gap-6 md:grid-cols-2">
                    <InfoField
                      icon={User}
                      label="Name"
                      value={
                        user?.name ||
                        'Not provided'
                      }
                    />

                    <InfoField
                      icon={Phone}
                      label="Mobile Number"
                      value={
                        user?.phoneNumber ||
                        'Not provided'
                      }
                    />

                    <InfoField
                      icon={Mail}
                      label="Email"
                      value={
                        user?.email ||
                        'Not provided'
                      }
                    />

                    <InfoField
                      icon={
                        CalendarDays
                      }
                      label="Date of Joining"
                      value={
                        dateOfJoining
                      }
                    />
                  </div>
                )}
              </ProfileSection>

              {/* PERSONAL DETAILS */}

              <ProfileSection
                number="2"
                title="Personal Details"
                description="Your personal and address information"
                open={
                  openSections.personal
                }
                editing={
                  editingSection ===
                  'personal'
                }
                onToggle={() =>
                  toggleSection(
                    'personal',
                  )
                }
                onEdit={() =>
                  startSectionEdit(
                    'personal',
                  )
                }
                onCancel={
                  cancelSectionEdit
                }
                onSave={saveProfile}
                saving={isSaving}
              >
                {editingSection ===
                'personal' ? (
                  <div className="grid gap-4 md:grid-cols-2">

                    <FormInput
                      label="Date of Birth"
                      type="date"
                      value={
                        profileDetails.dateOfBirth
                      }
                      onChange={(
                        value,
                      ) =>
                        updateProfileDetail(
                          'dateOfBirth',
                          value,
                        )
                      }
                      icon={
                        CalendarDays
                      }
                    />

                    <ChoiceInput
                      label="Gender"
                      value={profileDetails.gender}
                      onChange={(value) => updateProfileDetail('gender', value)}
                      icon={User}
                      options={GENDER_OPTIONS}
                    />

                    <ChoiceInput
                      label="Blood Group"
                      value={profileDetails.bloodGroup}
                      onChange={(value) => updateProfileDetail('bloodGroup', value)}
                      icon={Info}
                      options={BLOOD_GROUP_OPTIONS}
                    />

                    <FormInput
                      label="State"
                      value="Maharashtra"
                      onChange={() => updateProfileDetail('state', 'Maharashtra')}
                      icon={MapPin}
                      disabled
                    />

                    <div className="grid content-start gap-1.5">
                      <SearchableInput
                        label="City"
                        value={
                          profileDetails.city
                        }
                        options={
                          maharashtraCities
                        }
                        onChange={(
                          value,
                        ) =>
                          updateProfileDetail(
                            'city',
                            value,
                          )
                        }
                        icon={MapPin}
                        disabled={
                          !profileDetails.state
                        }
                        placeholder={
                          isLoadingCities ? 'Loading Maharashtra cities...' : 'Search city'
                        }
                        actionLabel="Get my city"
                        onAction={() => useCurrentLocation('city')}
                        actionLoading={locatingField === 'city'}
                      />
                      {locationError && (
                        <p className="text-xs font-semibold leading-5 text-rose-600">
                          {locationError}
                        </p>
                      )}
                    </div>

                    <FormInput
                      label="Area"
                      value={profileDetails.area}
                      onChange={(value) => updateProfileDetail('area', value)}
                      icon={MapPin}
                      placeholder="Enter your local area"
                    />

                  </div>
                ) : (
                  <div className="grid gap-6 md:grid-cols-2">

                    <InfoField
                      icon={
                        CalendarDays
                      }
                      label="Date of Birth"
                      value={
                        profileDetails.dateOfBirth
                          ? formatDate(
                              profileDetails.dateOfBirth,
                            )
                          : 'Not provided'
                      }
                    />

                    <InfoField
                      icon={User}
                      label="Gender"
                      value={
                        profileDetails.gender ||
                        'Not provided'
                      }
                    />

                    <InfoField
                      icon={Info}
                      label="Blood Group"
                      value={
                        profileDetails.bloodGroup ||
                        'Not provided'
                      }
                    />

                    <InfoField
                      icon={MapPin}
                      label="State"
                      value={
                        profileDetails.state ||
                        'Not provided'
                      }
                    />

                    <InfoField
                      icon={MapPin}
                      label="City"
                      value={
                        profileDetails.city ||
                        'Not provided'
                      }
                    />

                    <InfoField
                      icon={MapPin}
                      label="Area"
                      value={profileDetails.area || 'Not provided'}
                    />
                  </div>
                )}
              </ProfileSection>

              {/* EDUCATION */}

              <ProfileSection
                number="3"
                title="Educational Details"
                description="Your academic information"
                open={
                  openSections.education
                }
                editing={
                  editingSection ===
                  'education'
                }
                onToggle={() =>
                  toggleSection(
                    'education',
                  )
                }
                onEdit={() =>
                  startSectionEdit(
                    'education',
                  )
                }
                onCancel={
                  cancelSectionEdit
                }
                onSave={saveProfile}
                saving={isSaving}
              >
                {editingSection ===
                'education' ? (
                  <div className="grid max-w-2xl gap-4 md:grid-cols-2">
                    <FormInput
                      label="School Name"
                      value={profileDetails.schoolName}
                      onChange={(value) => updateProfileDetail('schoolName', value)}
                      icon={School}
                      placeholder="Enter your school name"
                    />

                    <FormInput
                      label="Std 9 Final Exam Semester Percentage"
                      type="number"
                      value={
                        profileDetails.finalExamPercentage
                      }
                      onChange={(
                        value,
                      ) =>
                        updateProfileDetail(
                          'finalExamPercentage',
                          value,
                        )
                      }
                      icon={
                        GraduationCap
                      }
                      min="0"
                      max="100"
                      step="0.01"
                      placeholder="Example: 85.50"
                    />

                    <p className="mt-2 text-xs text-slate-400">
                      Enter a value between
                      0 and 100.
                    </p>
                  </div>
                ) : (
                  <div className="grid max-w-2xl gap-6 md:grid-cols-2">
                    <InfoField
                      icon={School}
                      label="School Name"
                      value={profileDetails.schoolName || 'Not provided'}
                    />

                    <InfoField
                      icon={
                        GraduationCap
                      }
                      label="Std 9 Final Exam Semester Percentage"
                      value={
                        profileDetails.finalExamPercentage ===
                        ''
                          ? 'Not provided'
                          : `${profileDetails.finalExamPercentage}%`
                      }
                    />
                  </div>
                )}
              </ProfileSection>
            </div>
          )}

          {activeTab === 'Performance' && (
            <section className="border-t border-slate-200">
              <AcademicPerformanceDashboard />
            </section>
          )}

        </div>
      </div>

      {/* =====================================================
          PASSWORD MODAL
      ===================================================== */}

      {activeModal ===
        'password' && (
        <Modal
          title="Change Password"
          description="Choose a strong password for your account."
          onClose={() =>
            setActiveModal('')
          }
        >
          <form
            onSubmit={savePassword}
            className="grid gap-4"
          >
            <FormInput
              label="Current Password"
              type="password"
              value={
                passwordForm.currentPassword
              }
              onChange={(value) =>
                setPasswordForm(
                  (current) => ({
                    ...current,
                    currentPassword:
                      value,
                  }),
                )
              }
              icon={Lock}
              required
            />

            <FormInput
              label="New Password"
              type="password"
              value={
                passwordForm.newPassword
              }
              onChange={(value) =>
                setPasswordForm(
                  (current) => ({
                    ...current,
                    newPassword:
                      value,
                  }),
                )
              }
              icon={Lock}
              required
            />

            <FormInput
              label="Confirm New Password"
              type="password"
              value={
                passwordForm.confirmPassword
              }
              onChange={(value) =>
                setPasswordForm(
                  (current) => ({
                    ...current,
                    confirmPassword:
                      value,
                  }),
                )
              }
              icon={Lock}
              required
            />

            <ModalActions
              loading={isSaving}
              onCancel={() =>
                setActiveModal('')
              }
              saveLabel="Change Password"
            />
          </form>
        </Modal>
      )}

      {/* =====================================================
          PROFILE IMAGE MODAL
      ===================================================== */}

      {photoChooserOpen && (
        <Modal
          title="Update Profile Photo"
          description="Choose a clear photo for your profile."
          onClose={() => {
            setPhotoChooserOpen(false)
            setPhotoError('')
          }}
        >
          <div className="flex flex-col items-center gap-5">
            <div className="h-32 w-32 overflow-hidden rounded-full bg-sky-100 ring-4 ring-sky-50">
              {user?.profileImageUrl ? (
                <img
                  src={assetUrl(user.profileImageUrl)}
                  alt={`${user.name || 'User'} profile`}
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="grid h-full w-full place-items-center text-3xl font-black text-sky-600">
                  {(user?.name || user?.email || 'U').charAt(0).toUpperCase()}
                </div>
              )}
            </div>

            <div className="flex w-full gap-3">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="inline-flex h-12 min-w-0 flex-1 items-center justify-center gap-2 rounded-2xl bg-sky-500 px-3 text-sm font-bold text-white shadow-lg shadow-sky-100 transition hover:bg-sky-600"
              >
                <Camera className="h-5 w-5 shrink-0" />
                Upload Photo
              </button>

              {user?.profileImageUrl && (
                <button
                  type="button"
                  onClick={removeProfileImage}
                  disabled={isSaving}
                  className="inline-flex h-12 min-w-0 flex-1 items-center justify-center gap-2 rounded-2xl border border-rose-200 px-3 text-sm font-bold text-rose-600 transition hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <Trash2 className="h-4 w-4 shrink-0" />
                  Remove Photo
                </button>
              )}
            </div>

            {photoError && <p className="text-center text-xs font-bold text-rose-600">{photoError}</p>}
            <p className="text-center text-xs font-medium text-slate-400">JPG, PNG, or WEBP · Maximum 5 MB</p>
          </div>
        </Modal>
      )}

      {selectedImage && (
        <Modal
          title="Add Profile Photo"
          onClose={() => {
            setSelectedImage('')
            setPhotoError('')
          }}
          wide
        >
          <div className="flex flex-col items-center">
            <div
              ref={cropViewportRef}
              role="presentation"
              aria-label="Photo crop area. Drag the square crop box to select part of the image."
              onMouseMove={moveDrag}
              onMouseUp={stopDrag}
              onMouseLeave={stopDrag}
              onTouchMove={moveDrag}
              onTouchEnd={stopDrag}
              className="relative h-[min(66vh,520px)] w-full max-w-2xl touch-none select-none overscroll-contain overflow-hidden rounded-2xl bg-slate-950 shadow-inner"
            >
              <img
                src={selectedImage}
                alt="Profile photo preview"
                draggable="false"
                className="pointer-events-none absolute inset-0 h-full w-full select-none object-cover"
              />
              <div
                ref={cropFrameRef}
                role="button"
                tabIndex={0}
                aria-label="Move 1 to 1 crop box"
                onMouseDown={startDrag}
                onTouchStart={startDrag}
                className="absolute left-1/2 top-1/2 h-[min(72vw,320px)] w-[min(72vw,320px)] cursor-move border-2 border-white bg-transparent shadow-[0_0_0_9999px_rgba(2,6,23,0.72)]"
                style={{
                  transform: `translate(calc(-50% + ${offset.x}px), calc(-50% + ${offset.y}px))`,
                }}
              />
            </div>

            {photoError && <p className="mt-3 w-full max-w-sm text-center text-xs font-bold text-rose-600">{photoError}</p>}

            <div className="sticky bottom-0 mt-7 flex w-full max-w-sm gap-3 bg-white pt-1">
              <button
                type="button"
                onClick={() => {
                  setSelectedImage('')
                  setPhotoError('')
                }}
                disabled={isSaving}
                className="inline-flex h-12 flex-1 items-center justify-center rounded-2xl border border-slate-200 px-4 text-sm font-bold text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
              >
                Cancel
              </button>
              <button type="button" onClick={uploadProfileImage} disabled={!selectedImage || isSaving} className="inline-flex h-12 flex-[1.35] items-center justify-center gap-2 rounded-2xl bg-sky-500 px-5 text-sm font-bold text-white shadow-lg shadow-sky-100 transition hover:bg-sky-600 disabled:cursor-not-allowed disabled:opacity-60">
                {isSaving && <Loader2 className="h-5 w-5 animate-spin" />}
                {isSaving ? 'Uploading...' : 'Save Photo'}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </main>
  )
}

/* =========================================================
   PROFILE HEADER
========================================================= */

const ProfileHeader = memo(
  ({
    user,
    initials,
    lastLogin,
    onLogout,
    onSettings,
    onChangePhoto,
  }) => {
    return (
      <header className="relative border-b border-slate-200 bg-white">
        <button
          type="button"
          onClick={onSettings}
          className="group fixed bottom-[max(1.25rem,env(safe-area-inset-bottom))] right-5 z-40 grid h-12 w-12 place-items-center rounded-full border border-slate-200 bg-white text-slate-500 shadow-xl shadow-slate-300/50 transition hover:border-sky-300 hover:bg-sky-50 hover:text-sky-600 active:scale-95"
          aria-label="Open settings"
          title="Settings"
        >
          <Settings className="h-5 w-5 transition-transform duration-300 group-hover:rotate-45" />
        </button>
        <div className="flex flex-col gap-5 px-4 py-6 sm:px-6 sm:py-7 lg:flex-row lg:items-center lg:justify-between lg:px-10">

          <div className="flex min-w-0 items-center gap-4">

            <div className="relative shrink-0">
              <div className="grid h-20 w-20 overflow-hidden rounded-full bg-gradient-to-br from-rose-300 to-rose-400 text-2xl font-bold text-slate-700 shadow-sm sm:h-24 sm:w-24">
                {user?.profileImageUrl ? (
                  <img
                    src={assetUrl(
                      user.profileImageUrl,
                    )}
                    alt={
                      user.name ||
                      'Profile'
                    }
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <span className="grid h-full w-full place-items-center">
                    {initials}
                  </span>
                )}
              </div>

              <button
                type="button"
                onClick={
                  onChangePhoto
                }
                className="group absolute bottom-0 right-0 grid h-8 w-8 place-items-center rounded-full border-2 border-white bg-sky-500 text-white shadow-md transition hover:bg-sky-600 active:scale-95"
                aria-label="Change profile photo"
                title="Change photo"
              >
                <Camera className="h-3.5 w-3.5" />
                <span className="pointer-events-none absolute bottom-full right-0 mb-2 hidden whitespace-nowrap rounded-lg bg-slate-900 px-2.5 py-1.5 text-[11px] font-bold text-white shadow-lg group-hover:block group-focus-visible:block">Change photo</span>
              </button>
            </div>

            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="truncate text-xl font-bold tracking-tight text-slate-800 sm:text-2xl">
                  {user?.name ||
                    'Student'}
                </h1>

                <button
                  type="button"
                  onClick={onLogout}
                  className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-red-100 bg-red-50 px-2.5 py-1.5 text-xs font-bold text-red-600 transition hover:bg-red-100 sm:px-3 sm:text-sm"
                >
                  <LogOut className="h-3.5 w-3.5" />
                  Logout
                </button>
              </div>

              <p className="mt-1 text-sm text-slate-500">
                Student Profile
              </p>

              <p className="mt-1 hidden text-xs font-medium text-slate-400 lg:block">
                Last login: <span className="font-semibold text-slate-600">{lastLogin}</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="rounded-xl border border-emerald-100 bg-emerald-50 px-4 py-3 text-left sm:px-5">
              <div className="flex items-center gap-2 text-emerald-700">
                <Award className="h-4 w-4" />
                <p className="text-xs font-bold">Brain cells</p>
              </div>
              <p className="mt-1 text-lg font-black text-emerald-900">{user?.totalBrainCells || 0}</p>
            </div>
            <div className="rounded-xl bg-slate-50 px-4 py-3 text-left sm:px-5 lg:hidden">
              <p className="text-xs font-medium text-slate-400">Last login</p>
              <p className="mt-1 text-sm font-semibold text-slate-700">{lastLogin}</p>
            </div>

          </div>
        </div>
      </header>
    )
  },
)

/* =========================================================
   TABS
========================================================= */

const ProfileTabs = memo(
  ({
    activeTab,
    onChange,
  }) => {
    return (
      <nav
        className="border-b border-slate-200 bg-white"
        aria-label="Profile navigation"
      >
        <div className="flex overflow-x-auto px-2 scrollbar-none sm:px-5 lg:px-8">
          {TABS.map((tab) => {
            const active =
              activeTab === tab.id

            return (
              <button
                key={tab.id}
                type="button"
                onClick={() =>
                  onChange(tab.id)
                }
                className={`relative shrink-0 px-5 py-4 text-sm font-semibold transition sm:px-6 ${
                  active
                    ? 'text-sky-600'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                {tab.label}

                {active && (
                  <span className="absolute inset-x-4 bottom-0 h-0.5 rounded-full bg-sky-500" />
                )}
              </button>
            )
          })}
        </div>
      </nav>
    )
  },
)

/* =========================================================
   SECTION
========================================================= */

const ProfileSection = memo(
  ({
    number,
    title,
    description,
    open,
    editing,
    onToggle,
    onEdit,
    onCancel,
    onSave,
    saving,
    children,
  }) => {
    return (
      <section>
        <div onClick={onToggle} className="flex cursor-pointer items-center justify-between gap-3 px-4 py-4 sm:px-7 lg:px-9">

          <button
            type="button"
            onClick={(event) => { event.stopPropagation(); onToggle() }}
            className="flex min-w-0 flex-1 items-center gap-3 text-left"
          >
            <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-sky-500 text-xs font-bold text-white shadow-sm">
              {number}
            </span>

            <span className="min-w-0">
              <span className="block truncate text-sm font-semibold text-slate-700">
                {title}
              </span>

              {description && (
                <span className="mt-0.5 hidden text-xs text-slate-400 sm:block">
                  {description}
                </span>
              )}
            </span>
          </button>

          <div className="flex shrink-0 items-center gap-2" onClick={(event) => event.stopPropagation()}>

            {open &&
              !editing && (
                <button
                  type="button"
                  onClick={(event) => {
                    event.preventDefault()
                    event.stopPropagation()
                    onEdit()
                  }}
                  className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-2 text-xs font-bold text-sky-600 transition hover:bg-sky-50"
                >
                  <Pencil className="h-3.5 w-3.5" />

                  <span className="hidden sm:inline">
                    Edit
                  </span>
                </button>
              )}

            {editing && (
              <>
                <button
                  type="button"
                  onClick={onCancel}
                  disabled={saving}
                  className="rounded-lg px-2.5 py-2 text-xs font-bold text-slate-500 transition hover:bg-slate-100 disabled:opacity-50"
                >
                  Cancel
                </button>

                <button
                  type="button"
                  onClick={onSave}
                  disabled={saving}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-sky-500 px-3 py-2 text-xs font-bold text-white shadow-sm transition hover:bg-sky-600 disabled:opacity-60"
                >
                  {saving && (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  )}

                  {saving
                    ? 'Saving'
                    : 'Save'}
                </button>
              </>
            )}

            <button
              type="button"
              onClick={onToggle}
              className="grid h-8 w-8 place-items-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
              aria-label={
                open
                  ? `Collapse ${title}`
                  : `Expand ${title}`
              }
            >
              {open ? (
                <ChevronUp className="h-4 w-4" />
              ) : (
                <ChevronDown className="h-4 w-4" />
              )}
            </button>
          </div>
        </div>

        {open && (
          <div className="border-t border-slate-100 px-4 py-6 sm:px-7 sm:py-7 lg:px-9">
            {children}
          </div>
        )}
      </section>
    )
  },
)

/* =========================================================
   INFO FIELD
========================================================= */

const InfoField = memo(
  ({
    label,
    value,
    icon: Icon,
    actionLabel,
    onAction,
  }) => {
    return (
      <div className="flex min-w-0 items-start gap-3 rounded-xl p-1">
        <div className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-slate-50 text-slate-400">
          <Icon className="h-4 w-4" />
        </div>

        <div className="min-w-0 flex-1">
          <p className="text-xs font-medium text-slate-500">
            {label}
          </p>

          <p className="mt-1 break-words text-sm font-semibold text-slate-800">
            {value}
          </p>

          {actionLabel &&
            onAction && (
              <button
                type="button"
                onClick={onAction}
                className="mt-1.5 text-xs font-bold text-sky-600 hover:text-sky-700"
              >
                {actionLabel}
              </button>
            )}
        </div>
      </div>
    )
  },
)

/* =========================================================
   FORM INPUT
========================================================= */

const FormInput = memo(
  ({
    label,
    value,
    onChange,
    icon: Icon,
    type = 'text',
    placeholder,
    required = false,
    disabled = false,
    min,
    max,
    step,
    inputMode,
    maxLength,
  }) => {
    return (
      <label className="grid gap-1.5 text-xs font-bold text-slate-600">
        <span>
          {label}

          {required && (
            <span className="ml-1 text-red-500">
              *
            </span>
          )}
        </span>

        <div className="relative">
          <Icon className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />

          <input
            type={type}
            value={value}
            onChange={(event) =>
              onChange(
                event.target.value,
              )
            }
            required={required}
            disabled={disabled}
            min={min}
            max={max}
            step={step}
            inputMode={inputMode}
            maxLength={maxLength}
            placeholder={
              placeholder
            }
            className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50/70 pl-10 pr-3 text-sm font-medium text-slate-800 outline-none transition placeholder:text-slate-400 hover:border-slate-300 focus:border-sky-400 focus:bg-white focus:ring-4 focus:ring-sky-50 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400"
          />
        </div>
      </label>
    )
  },
)

const ChoiceInput = memo(
  ({ label, value, onChange, icon: Icon, options }) => (
    <label className="grid gap-1.5 text-xs font-bold text-slate-600">
      <span>{label}</span>
      <div className="relative">
        <Icon className="pointer-events-none absolute left-3.5 top-1/2 z-10 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <select
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className="h-11 w-full appearance-none rounded-xl border border-slate-200 bg-slate-50/70 pl-10 pr-9 text-sm font-medium text-slate-800 outline-none transition hover:border-slate-300 focus:border-sky-400 focus:bg-white focus:ring-4 focus:ring-sky-50"
        >
          <option value="">Select {label.toLowerCase()}</option>
          {options.map((option) => <option key={option} value={option}>{option}</option>)}
        </select>
        <ChevronDown className="pointer-events-none absolute right-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
      </div>
    </label>
  ),
)

/* =========================================================
   SEARCHABLE INPUT
========================================================= */

const SearchableInput = memo(
  ({
    label,
    value,
    options,
    onChange,
    icon: Icon,
    disabled = false,
    placeholder = 'Search...',
    actionLabel,
    onAction,
    actionLoading = false,
  }) => {
    const wrapperRef =
      useRef(null)

    const inputRef =
      useRef(null)

    const [open, setOpen] =
      useState(false)

    const [query, setQuery] =
      useState(value || '')

    const [
      highlightedIndex,
      setHighlightedIndex,
    ] = useState(-1)

    useEffect(() => {
      setQuery(value || '')
    }, [value])

    useEffect(() => {
      const handleOutside =
        (event) => {
          if (
            !wrapperRef.current?.contains(
              event.target,
            )
          ) {
            setOpen(false)
          }
        }

      document.addEventListener(
        'mousedown',
        handleOutside,
      )

      return () =>
        document.removeEventListener(
          'mousedown',
          handleOutside,
        )
    }, [])

    const filteredOptions =
      useMemo(() => {
        const search =
          query.trim().toLowerCase()

        if (!search) {
          return options
        }

        return options.filter(
          (option) =>
            option
              .toLowerCase()
              .includes(search),
        )
      }, [options, query])

    const selectOption =
      useCallback(
        (option) => {
          setQuery(option)

          onChange(option)

          setOpen(false)

          setHighlightedIndex(-1)
        },
        [onChange],
      )

    const handleKeyDown =
      useCallback(
        (event) => {
          if (disabled) return

          if (
            event.key ===
            'ArrowDown'
          ) {
            event.preventDefault()

            setOpen(true)

            setHighlightedIndex(
              (current) =>
                current <
                filteredOptions.length -
                  1
                  ? current + 1
                  : 0,
            )

            return
          }

          if (
            event.key === 'ArrowUp'
          ) {
            event.preventDefault()

            setHighlightedIndex(
              (current) =>
                current > 0
                  ? current - 1
                  : filteredOptions.length -
                    1,
            )

            return
          }

          if (
            event.key === 'Enter'
          ) {
            if (
              open &&
              highlightedIndex >= 0 &&
              filteredOptions[
                highlightedIndex
              ]
            ) {
              event.preventDefault()

              selectOption(
                filteredOptions[
                  highlightedIndex
                ],
              )
            }

            return
          }

          if (
            event.key === 'Escape'
          ) {
            setOpen(false)

            setHighlightedIndex(-1)
          }
        },
        [
          disabled,
          filteredOptions,
          highlightedIndex,
          open,
          selectOption,
        ],
      )

    return (
      <div
        ref={wrapperRef}
        className="relative grid gap-1.5 text-xs font-bold text-slate-600"
      >
        <div className="flex items-center justify-between gap-2">
          <span>{label}</span>

          {onAction && (
            <button
              type="button"
              disabled={disabled || actionLoading}
              onClick={(event) => {
                event.preventDefault()
                event.stopPropagation()
                onAction()
              }}
              className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-[11px] font-bold text-sky-600 transition hover:bg-sky-50 hover:text-sky-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <MapPin className="h-3 w-3" />
              {actionLoading ? 'Locating…' : actionLabel}
            </button>
          )}
        </div>

        <div className="relative">
          <Icon className="pointer-events-none absolute left-3.5 top-1/2 z-10 h-4 w-4 -translate-y-1/2 text-slate-400" />

          <input
            ref={inputRef}
            value={query}
            disabled={disabled}
            placeholder={
              placeholder
            }
            autoComplete="off"
            onFocus={() => {
              if (!disabled) {
                inputRef.current?.select()
                setOpen(true)
              }
            }}
            onChange={(event) => {
              setQuery(
                event.target.value,
              )

              setOpen(true)

              setHighlightedIndex(
                -1,
              )

              onChange(
                event.target.value,
              )
            }}
            onKeyDown={
              handleKeyDown
            }
            className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50/70 pl-10 pr-16 text-sm font-medium text-slate-800 outline-none transition placeholder:text-slate-400 hover:border-slate-300 focus:border-sky-400 focus:bg-white focus:ring-4 focus:ring-sky-50 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400"
          />

          {query && (
            <button
              type="button"
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => {
                setQuery('')
                onChange('')
                setOpen(true)
                setHighlightedIndex(-1)
                inputRef.current?.focus()
              }}
              className="absolute right-8 top-1/2 grid h-7 w-7 -translate-y-1/2 place-items-center rounded-full text-slate-400 hover:bg-slate-200 hover:text-slate-700"
              aria-label={`Clear ${label}`}
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
          <Search className="pointer-events-none absolute right-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-300" />
        </div>

        {open &&
          !disabled && (
            <div className="absolute left-0 right-0 top-[4.65rem] z-50 overflow-hidden rounded-xl border border-slate-200 bg-white p-1 shadow-xl">

              <div className="max-h-52 overflow-y-auto overscroll-contain">
                {filteredOptions.length >
                0 ? (
                  filteredOptions.map(
                    (
                      option,
                      index,
                    ) => (
                      <button
                        key={option}
                        type="button"
                        onClick={() =>
                          selectOption(
                            option,
                          )
                        }
                        className={`flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-left text-sm font-medium transition ${
                          highlightedIndex ===
                          index
                            ? 'bg-sky-50 text-sky-700'
                            : 'text-slate-700 hover:bg-slate-50'
                        }`}
                      >
                        <span>
                          {option}
                        </span>

                        {value ===
                          option && (
                          <Check className="h-4 w-4 text-sky-500" />
                        )}
                      </button>
                    ),
                  )
                ) : (
                  <div className="px-3 py-5 text-center">
                    <Search className="mx-auto h-5 w-5 text-slate-300" />

                    <p className="mt-2 text-xs font-medium text-slate-400">
                      No results found
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}
      </div>
    )
  },
)

/* =========================================================
   NOTIFICATION
========================================================= */

const Notification = memo(
  ({
    type,
    message,
    onClose,
  }) => {
    const success =
      type === 'success'

    return (
      <div
        className={`mb-3 flex items-start gap-3 rounded-xl border px-4 py-3 ${
          success
            ? 'border-emerald-100 bg-emerald-50 text-emerald-700'
            : 'border-red-100 bg-red-50 text-red-600'
        }`}
      >
        {success ? (
          <Check className="mt-0.5 h-4 w-4 shrink-0" />
        ) : (
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
        )}

        <p className="flex-1 text-xs font-semibold leading-5">
          {message}
        </p>

        <button
          type="button"
          onClick={onClose}
          className="shrink-0 rounded-md p-1 opacity-60 transition hover:bg-black/5 hover:opacity-100"
          aria-label="Close notification"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
    )
  },
)

/* =========================================================
   EMPTY TAB
========================================================= */

const EmptyTab = memo(
  ({ tab }) => {
    return (
      <div className="flex min-h-[320px] items-center justify-center px-5 py-16">
        <div className="max-w-sm text-center">
          <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-sky-50 text-sky-500">
            <Info className="h-6 w-6" />
          </div>

          <h2 className="mt-5 text-lg font-bold text-slate-800">
            {tab}
          </h2>

          <p className="mt-2 text-sm leading-6 text-slate-500">
            This section will be available
            here soon.
          </p>
        </div>
      </div>
    )
  },
)

/* =========================================================
   MODAL
========================================================= */

const Modal = ({
  title,
  description,
  children,
  onClose,
  wide = false,
}) => {
  useEffect(() => {
    const handleEscape =
      (event) => {
        if (
          event.key ===
          'Escape'
        ) {
          onClose()
        }
      }

    document.addEventListener(
      'keydown',
      handleEscape,
    )

    document.body.style.overflow =
      'hidden'

    return () => {
      document.removeEventListener(
        'keydown',
        handleEscape,
      )

      document.body.style.overflow =
        ''
    }
  }, [onClose])

  return (
    <div
      className="fixed inset-0 z-[100] flex items-end justify-center bg-slate-900/50 p-0 backdrop-blur-sm sm:items-center sm:p-4"
      onMouseDown={(event) => {
        if (
          event.target ===
          event.currentTarget
        ) {
          onClose()
        }
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        className={`max-h-[92vh] w-full overflow-y-auto rounded-t-3xl bg-white p-5 shadow-2xl sm:rounded-3xl sm:p-6 ${
          wide
            ? 'max-w-2xl'
            : 'max-w-md'
        }`}
      >
        <div className="mb-6 flex items-start justify-between gap-4">
          <div>
            <h2 className="text-xl font-black tracking-tight text-slate-900">
              {title}
            </h2>

            {description && (
              <p className="mt-1.5 text-sm leading-5 text-slate-500">
                {description}
              </p>
            )}
          </div>

          <button
            type="button"
            onClick={onClose}
            className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-slate-100 text-slate-500 transition hover:bg-slate-200"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {children}
      </div>
    </div>
  )
}

/* =========================================================
   MODAL ACTIONS
========================================================= */

const ModalActions = ({
  loading,
  onCancel,
  saveLabel,
}) => {
  return (
    <div className="mt-2 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
      <button
        type="button"
        onClick={onCancel}
        disabled={loading}
        className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-bold text-slate-600 transition hover:bg-slate-50 disabled:opacity-50"
      >
        Cancel
      </button>

      <button
        type="submit"
        disabled={loading}
        className="inline-flex items-center justify-center gap-2 rounded-xl bg-sky-500 px-5 py-2.5 text-sm font-bold text-white shadow-md shadow-sky-100 transition hover:bg-sky-600 disabled:opacity-60"
      >
        {loading && (
          <Loader2 className="h-4 w-4 animate-spin" />
        )}

        {loading
          ? 'Saving...'
          : saveLabel}
      </button>
    </div>
  )
}

/* =========================================================
   LOADING SCREEN
========================================================= */

const LoadingScreen = () => {
  return (
    <section className="flex min-h-screen items-center justify-center bg-[#f5f7fa] px-5">
      <div className="text-center">
        <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-white shadow-sm ring-1 ring-slate-200">
          <Loader2 className="h-6 w-6 animate-spin text-sky-500" />
        </div>

        <p className="mt-4 text-sm font-semibold text-slate-500">
          Loading your profile...
        </p>
      </div>
    </section>
  )
}

export default Profilepage
