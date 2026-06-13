// Orthographic-projection globe with an animated great-circle path
const toRad = (deg) => (deg * Math.PI) / 180

function latLonToVec(lat, lon) {
  const latR = toRad(lat)
  const lonR = toRad(lon)
  return [
    Math.cos(latR) * Math.cos(lonR),
    Math.sin(latR),
    Math.cos(latR) * Math.sin(lonR),
  ]
}

function dot(a, b) {
  return a[0] * b[0] + a[1] * b[1] + a[2] * b[2]
}
function cross(a, b) {
  return [
    a[1] * b[2] - a[2] * b[1],
    a[2] * b[0] - a[0] * b[2],
    a[0] * b[1] - a[1] * b[0],
  ]
}
function length(v) {
  return Math.sqrt(dot(v, v))
}
function normalize(v) {
  const l = length(v) || 1
  return [v[0] / l, v[1] / l, v[2] / l]
}

function slerp(a, b, t) {
  let cosOmega = dot(a, b)
  cosOmega = Math.min(1, Math.max(-1, cosOmega))
  const omega = Math.acos(cosOmega)
  const sinOmega = Math.sin(omega)
  if (sinOmega < 1e-6) {
    return normalize([
      a[0] + (b[0] - a[0]) * t,
      a[1] + (b[1] - a[1]) * t,
      a[2] + (b[2] - a[2]) * t,
    ])
  }
  const wa = Math.sin((1 - t) * omega) / sinOmega
  const wb = Math.sin(t * omega) / sinOmega
  return [a[0] * wa + b[0] * wb, a[1] * wa + b[1] * wb, a[2] * wa + b[2] * wb]
}

const SIZE = 280
const R = 120
const CENTER = SIZE / 2

export default function Globe({ origin, destination }) {
  if (!origin || !destination) return null

  const v0 = latLonToVec(origin.latitude, origin.longitude)
  const v1 = latLonToVec(destination.latitude, destination.longitude)

  const center = normalize(slerp(v0, v1, 0.5))

  let right = cross(center, [0, 1, 0])
  if (length(right) < 1e-6) right = [1, 0, 0]
  right = normalize(right)
  const up = normalize(cross(right, center))

  const project = (v) => ({
    x: CENTER + R * dot(v, right),
    y: CENTER - R * dot(v, up),
    depth: dot(v, center),
  })

  const gridPaths = []
  for (let lat = -60; lat <= 60; lat += 30) {
    let d = ''
    let started = false
    for (let lon = -180; lon <= 180; lon += 4) {
      const p = project(latLonToVec(lat, lon))
      if (p.depth > 0.02) {
        d += (started ? ' L ' : 'M ') + p.x.toFixed(2) + ' ' + p.y.toFixed(2)
        started = true
      } else {
        started = false
      }
    }
    if (d) gridPaths.push(d)
  }
  for (let lon = -180; lon < 180; lon += 30) {
    let d = ''
    let started = false
    for (let lat = -90; lat <= 90; lat += 4) {
      const p = project(latLonToVec(lat, lon))
      if (p.depth > 0.02) {
        d += (started ? ' L ' : 'M ') + p.x.toFixed(2) + ' ' + p.y.toFixed(2)
        started = true
      } else {
        started = false
      }
    }
    if (d) gridPaths.push(d)
  }

  const steps = 60
  let pathD = ''
  for (let i = 0; i <= steps; i++) {
    const t = i / steps
    const p = project(slerp(v0, v1, t))
    pathD += (i === 0 ? 'M ' : ' L ') + p.x.toFixed(2) + ' ' + p.y.toFixed(2)
  }

  const originPoint = project(v0)
  const destPoint = project(v1)

  return (
    <svg className="globe" viewBox={`0 0 ${SIZE} ${SIZE}`} xmlns="http://www.w3.org/2000/svg">
      <defs>
        <radialGradient id="globeGradient" cx="35%" cy="30%" r="75%">
          <stop offset="0%" stopColor="#eaf4f6" />
          <stop offset="55%" stopColor="#bfe0e8" />
          <stop offset="100%" stopColor="#7fadbe" />
        </radialGradient>
      </defs>

      <circle cx={CENTER} cy={CENTER} r={R} fill="url(#globeGradient)" stroke="#5d8fa3" strokeWidth="1.5" />

      {gridPaths.map((d, i) => (
        <path key={i} d={d} fill="none" stroke="#9fc6d2" strokeWidth="0.75" opacity="0.7" />
      ))}

      <path
        className="travel-path"
        d={pathD}
        fill="none"
        stroke="#d9362f"
        strokeWidth="2.5"
        strokeLinecap="round"
        pathLength="100"
      />

      <circle cx={originPoint.x} cy={originPoint.y} r="5" fill="#d9362f" stroke="#fff" strokeWidth="1.5" />
      <circle cx={destPoint.x} cy={destPoint.y} r="5" fill="#8b6914" stroke="#fff" strokeWidth="1.5" />

      <circle r="4" fill="#d9362f">
        <animateMotion dur="2.5s" repeatCount="indefinite" path={pathD} rotate="auto" />
      </circle>
    </svg>
  )
}
