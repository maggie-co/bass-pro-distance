import { useState, useEffect } from 'react'
import './App.css'
import Globe from './Globe'

// Bass Pro Pyramid coordinates (Memphis, TN)
const PYRAMID_LAT = 35.1395
const PYRAMID_LNG = -90.1848

// Haversine formula to calculate distance between two points
function haversine(lat1, lon1, lat2, lon2) {
  const R = 3959 // Earth's radius in miles
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLon = (lon2 - lon1) * Math.PI / 180
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) ** 2
  const c = 2 * Math.asin(Math.sqrt(a))
  return R * c
}

// Free geocoding via OpenStreetMap Nominatim (no API key required)
async function geocodeCity(cityName) {
  const url = `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(cityName)}`
  const res = await fetch(url)
  if (!res.ok) throw new Error('Could not reach the location service')
  const data = await res.json()
  if (!data.length) throw new Error(`Couldn't find "${cityName}". Try a nearby larger city.`)
  return {
    latitude: parseFloat(data[0].lat),
    longitude: parseFloat(data[0].lon),
    label: data[0].display_name.split(',').slice(0, 2).join(','),
  }
}

export default function App() {
  const [distance, setDistance] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [userLocation, setUserLocation] = useState(null)
  const [animatedDistance, setAnimatedDistance] = useState(0)
  const [manualMode, setManualMode] = useState(false)
  const [cityInput, setCityInput] = useState('')
  const [geocoding, setGeocoding] = useState(false)
  const [geocodeError, setGeocodeError] = useState(null)

  useEffect(() => {
    if (!navigator.geolocation) {
      setError('Geolocation is not supported by your browser')
      setLoading(false)
      return
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords
        setUserLocation({ latitude, longitude })
        const dist = haversine(latitude, longitude, PYRAMID_LAT, PYRAMID_LNG)
        setDistance(dist)
        setLoading(false)
      },
      (err) => {
        setError(`Unable to get location: ${err.message}`)
        setLoading(false)
      }
    )
  }, [])

  useEffect(() => {
    if (distance === null) return

    let frame = 0
    const frames = 60
    const interval = setInterval(() => {
      frame++
      setAnimatedDistance((frame / frames) * distance)
      if (frame >= frames) clearInterval(interval)
    }, 16) // ~60fps

    return () => clearInterval(interval)
  }, [distance])

  const handleCitySubmit = async (e) => {
    e.preventDefault()

    if (!cityInput.trim()) {
      setGeocodeError('Please enter a city name')
      return
    }

    setGeocoding(true)
    setGeocodeError(null)

    try {
      const loc = await geocodeCity(cityInput.trim())
      setUserLocation(loc)
      setAnimatedDistance(0)
      setDistance(haversine(loc.latitude, loc.longitude, PYRAMID_LAT, PYRAMID_LNG))
      setError(null)
      setLoading(false)
    } catch (err) {
      setGeocodeError(err.message)
    } finally {
      setGeocoding(false)
    }
  }

  const showCityForm = (manualMode || error) && distance === null

  return (
    <div className="app">
      <div className="container">
        <h1 className="title">How Far Away are You From the Bass Pro Shop Pyramid?</h1>
        
        <div className="content">
          {loading && (
            <div className="loading">
              <div className="spinner"></div>
              <p>Getting your location...</p>
              <button
                className="link-btn"
                onClick={() => {
                  setLoading(false)
                  setManualMode(true)
                }}
              >
                Enter your city instead
              </button>
            </div>
          )}

          {!loading && showCityForm && (
            <div className="manual-form">
              {error && <p className="error-text">{error}</p>}
              <p className="manual-prompt">What city are you in?</p>
              <form onSubmit={handleCitySubmit}>
                <div className="city-field">
                  <input
                    type="text"
                    placeholder="e.g. Florence, Italy"
                    value={cityInput}
                    onChange={(e) => setCityInput(e.target.value)}
                  />
                  <button type="submit" className="refresh-btn" disabled={geocoding}>
                    {geocoding ? 'Searching...' : 'Calculate'}
                  </button>
                </div>
                {geocodeError && <p className="error-text">{geocodeError}</p>}
              </form>
            </div>
          )}

          {distance !== null && (
            <div className="result">
              <div className="distance-display">
                <div className="number">
                  {animatedDistance.toFixed(1)}
                </div>
                <div className="unit">miles</div>
              </div>

              <div className="location-info">
                {userLocation && (
                  <p>
                    From: {userLocation.label || `${userLocation.latitude.toFixed(2)}, ${userLocation.longitude.toFixed(2)}`}
                  </p>
                )}
                <p>To: Bass Pro Pyramid, Memphis, TN</p>
              </div>

              <Globe
                origin={userLocation}
                destination={{ latitude: PYRAMID_LAT, longitude: PYRAMID_LNG }}
              />

              <div className="button-row">
                <button
                  className="refresh-btn"
                  onClick={() => window.location.reload()}
                >
                  Use My Location
                </button>
                <button
                  className="link-btn"
                  onClick={() => {
                    setDistance(null)
                    setAnimatedDistance(0)
                    setManualMode(true)
                    setError(null)
                    setCityInput('')
                  }}
                >
                  Enter a different city
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
