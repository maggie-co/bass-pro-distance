import * as d3 from 'd3-geo'
import { feature } from 'topojson-client'
import landTopo from 'world-atlas/land-110m.json'

const land = feature(landTopo, landTopo.objects.land)
const graticule = d3.geoGraticule().step([20, 20])()

const SIZE = 360
const R = 168
const CENTER = SIZE / 2

const toRad = (d) => (d * Math.PI) / 180
const toDeg = (r) => (r * 180) / Math.PI

function lonLatToVec(lon, lat) {
  const lr = toRad(lat)
  const gr = toRad(lon)
  return [Math.cos(lr) * Math.cos(gr), Math.cos(lr) * Math.sin(gr), Math.sin(lr)]
}

function vecToLonLat([x, y, z]) {
  return [toDeg(Math.atan2(y, x)), toDeg(Math.asin(z))]
}

function slerp(a, b, t) {
  const dot = a[0] * b[0] + a[1] * b[1] + a[2] * b[2]
  const omega = Math.acos(Math.min(1, Math.max(-1, dot)))
  const s = Math.sin(omega)
  if (s < 1e-6) return a
  const wa = Math.sin((1 - t) * omega) / s
  const wb = Math.sin(t * omega) / s
  return [a[0] * wa + b[0] * wb, a[1] * wa + b[1] * wb, a[2] * wa + b[2] * wb]
}

export default function Globe({ origin, destination }) {
  if (!origin || !destination) return null

  const originCoord = [origin.longitude, origin.latitude]
  const destCoord = [destination.longitude, destination.latitude]

  const v0 = lonLatToVec(originCoord[0], originCoord[1])
  const v1 = lonLatToVec(destCoord[0], destCoord[1])
  const [centerLon, centerLat] = vecToLonLat(slerp(v0, v1, 0.5))

  const projection = d3
    .geoOrthographic()
    .scale(R)
    .translate([CENTER, CENTER])
    .clipAngle(90)
    .rotate([-centerLon, -centerLat, 0])

  const path = d3.geoPath(projection)

  const spherePath = path({ type: 'Sphere' })
  const landPath = path(land)
  const graticulePath = path(graticule)
  const routePath = path({
    type: 'LineString',
    coordinates: [originCoord, destCoord],
  })

  const originXY = projection(originCoord)
  const destXY = projection(destCoord)

  return (
    <svg className="globe" viewBox={`0 0 ${SIZE} ${SIZE}`} xmlns="http://www.w3.org/2000/svg">
      <defs>
        <radialGradient id="oceanGradient" cx="35%" cy="30%" r="75%">
          <stop offset="0%" stopColor="#eaf4f6" />
          <stop offset="55%" stopColor="#bfe0e8" />
          <stop offset="100%" stopColor="#7fadbe" />
        </radialGradient>
        <clipPath id="globeClip">
          <path d={spherePath} />
        </clipPath>
      </defs>

      <path d={spherePath} fill="url(#oceanGradient)" />

      <g clipPath="url(#globeClip)">
        <path d={graticulePath} fill="none" stroke="#9fc6d2" strokeWidth="0.5" opacity="0.6" />
        <path d={landPath} fill="#cdb892" stroke="#a8946b" strokeWidth="0.5" />

        {routePath && (
          <path
            className="travel-path"
            d={routePath}
            fill="none"
            stroke="#d9362f"
            strokeWidth="2.5"
            strokeLinecap="round"
            pathLength="100"
          />
        )}
      </g>

      <path d={spherePath} fill="none" stroke="#5d8fa3" strokeWidth="1.5" />

      <circle cx={originXY[0]} cy={originXY[1]} r="5" fill="#d9362f" stroke="#fff" strokeWidth="1.5" />
      <circle cx={destXY[0]} cy={destXY[1]} r="5" fill="#8b6914" stroke="#fff" strokeWidth="1.5" />

      {routePath && (
        <circle r="4" fill="#d9362f">
          <animateMotion dur="2.5s" repeatCount="indefinite" path={routePath} rotate="auto" />
        </circle>
      )}
    </svg>
  )
}
