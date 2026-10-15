'use client'

// ─── Dusk sky dome, sun glow, stars and scene lighting ──────────────────────
import { useMemo, useRef, useEffect } from 'react'
import * as THREE from 'three'
import { useFrame, useThree } from '@react-three/fiber'
import { Stars } from '@react-three/drei'
import { lightingAt, type WeatherKind } from './dayCycle'
import { getState } from '@/store/gameStore'

const skyVert = /* glsl */ `
  varying vec3 vDir;
  void main() {
    vDir = normalize(position);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`

const skyFrag = /* glsl */ `
  varying vec3 vDir;
  uniform vec3 uHorizon;
  uniform vec3 uMid;
  uniform vec3 uTop;
  uniform vec3 uHaze;
  uniform vec3 uSunDir;
  uniform float uSunBand;
  void main() {
    float h = clamp(vDir.y * 0.5 + 0.5, 0.0, 1.0);
    vec3 col = mix(uHorizon, uMid, smoothstep(0.42, 0.62, h));
    col = mix(col, uTop, smoothstep(0.60, 0.95, h));
    float sunAmt = pow(max(dot(normalize(vDir), normalize(uSunDir)), 0.0), 6.0);
    col += vec3(1.0, 0.72, 0.35) * sunAmt * uSunBand;
    col = mix(col, uHaze, smoothstep(0.5, 0.4, h));
    gl_FragColor = vec4(col, 1.0);
  }
`

const waterVert = /* glsl */ `
  uniform float uTime;
  varying vec2 vUv;
  varying vec3 vWorld;
  void main() {
    vUv = uv;
    vec3 p = position;
    p.z += sin(p.x * 0.9 + uTime * 1.3) * 0.055 + sin(p.y * 1.3 - uTime * 1.05) * 0.045;
    vec4 world = modelMatrix * vec4(p, 1.0);
    vWorld = world.xyz;
    gl_Position = projectionMatrix * viewMatrix * world;
  }
`

const waterFrag = /* glsl */ `
  uniform float uTime;
  varying vec2 vUv;
  varying vec3 vWorld;
  float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
  float noise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    vec2 u = f * f * (3.0 - 2.0 * f);
    return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x),
               mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x), u.y);
  }
  void main() {
    // domain-warped ripples — organic, never tiling
    vec2 q = vWorld.xz * 0.22;
    float n1 = noise(q + uTime * 0.22) - 0.5;
    float n2 = noise(q.yx - uTime * 0.17) - 0.5;
    float r1 = sin(vWorld.x * 1.9 + uTime * 1.5 + n1 * 5.2);
    float r2 = sin(vWorld.z * 2.3 - uTime * 1.15 + vWorld.x * 0.7 + n2 * 4.6);
    float r3 = sin((vWorld.x + vWorld.z) * 3.1 + uTime * 2.0 + (n1 + n2) * 3.4);
    float rip = r1 * 0.45 + r2 * 0.30 + r3 * 0.25;
    vec3 deep = vec3(0.030, 0.150, 0.235);
    vec3 shallow = vec3(0.070, 0.330, 0.420);
    vec3 col = mix(deep, shallow, rip * 0.38 + 0.5);
    // warm sun glitter, clipped to small peaks
    float glitter = smoothstep(0.86, 1.0, rip) * smoothstep(0.3, 0.8, r2 * 0.5 + 0.5);
    col += vec3(1.0, 0.62, 0.28) * glitter * 0.22;
    // gentle shore lightening near the beach edge
    col = mix(col, vec3(0.16, 0.42, 0.50), smoothstep(0.12, 0.0, abs(vUv.y - 0.92)) * 0.35);
    gl_FragColor = vec4(col, 0.97);
  }
`

function hexToVec3(hex: string): THREE.Vector3 {
  const c = new THREE.Color(hex)
  return new THREE.Vector3(c.r, c.g, c.b)
}

export function SkyDome({ hour = 12, weather = 'clear' as WeatherKind }: { hour?: number; weather?: WeatherKind }) {
  const material = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader: skyVert,
        fragmentShader: skyFrag,
        side: THREE.BackSide,
        depthWrite: false,
        fog: false,
        uniforms: {
          uHorizon: { value: hexToVec3('#d8e6ee') },
          uMid: { value: hexToVec3('#9ec0e0') },
          uTop: { value: hexToVec3('#4a7ab8') },
          uHaze: { value: hexToVec3('#d8e6ee') },
          uSunDir: { value: new THREE.Vector3(-0.35, 0.55, 0.2) },
          uSunBand: { value: 0.55 },
        },
      }),
    []
  )
  const lastH = useRef(-99)
  const lastW = useRef<string>('')
  useFrame(() => {
    if (Math.abs(lastH.current - hour) < 0.05 && lastW.current === weather) return
    lastH.current = hour
    lastW.current = weather
    const L = lightingAt(hour, weather)
    const u = material.uniforms
    const hz = hexToVec3(L.horizon)
    u.uHorizon.value.copy(hz)
    u.uMid.value.copy(hexToVec3(L.mid))
    u.uTop.value.copy(hexToVec3(L.top))
    u.uHaze.value.copy(hexToVec3(L.haze))
    u.uSunDir.value.set(L.sunDir[0], L.sunDir[1], L.sunDir[2])
    u.uSunBand.value = L.sunBand
  })
  return (
    <mesh material={material} renderOrder={-10}>
      <sphereGeometry args={[820, 32, 20]} />
    </mesh>
  )
}

export function Water({ geometry, position, rotation, noCollide }: { geometry: THREE.BufferGeometry; position: [number, number, number]; rotation?: [number, number, number]; noCollide?: boolean }) {
  // single shared material: both water surfaces tick the same uTime uniform
  const material = useMemo(() => getWaterMaterial(), [])
  useFrame((state) => {
    getWaterMaterial().uniforms.uTime.value = state.clock.elapsedTime
  })
  return (
    <mesh
      geometry={geometry}
      material={material}
      position={position}
      rotation={rotation}
      renderOrder={2}
      userData={noCollide ? { noCollide: true } : undefined}
    />
  )
}

let waterMaterialSingleton: THREE.ShaderMaterial | null = null
function getWaterMaterial(): THREE.ShaderMaterial {
  if (!waterMaterialSingleton) {
    waterMaterialSingleton = new THREE.ShaderMaterial({
      vertexShader: waterVert,
      fragmentShader: waterFrag,
      transparent: true,
      uniforms: { uTime: { value: 0 } },
    })
  }
  return waterMaterialSingleton
}

const SUN_DIST = 220
const SHADOW_HALF = 35 // ~70 m orthographic box

export function SceneLights({
  hour = 12,
  weather = 'clear' as WeatherKind,
}: {
  hour?: number
  weather?: WeatherKind
}) {
  const hemiRef = useRef<THREE.HemisphereLight>(null)
  const ambRef = useRef<THREE.AmbientLight>(null)
  const sunRef = useRef<THREE.DirectionalLight>(null)
  const moonRef = useRef<THREE.DirectionalLight>(null)
  const starsGroup = useRef<THREE.Group>(null)
  const { gl } = useThree()
  const isMobile = typeof window !== 'undefined' && window.innerWidth < 600
  const mapSize = isMobile ? 1024 : 2048

  // Reused colours — no per-frame allocations
  const hemiSkyC = useMemo(() => new THREE.Color(), [])
  const hemiGndC = useMemo(() => new THREE.Color(), [])
  const ambC = useMemo(() => new THREE.Color(), [])
  const sunC = useMemo(() => new THREE.Color(), [])
  const moonC = useMemo(() => new THREE.Color(), [])

  useEffect(() => {
    gl.toneMapping = THREE.ACESFilmicToneMapping
    gl.outputColorSpace = THREE.SRGBColorSpace
  }, [gl])

  useFrame(() => {
    const L = lightingAt(hour, weather)
    hemiSkyC.set(L.hemiSky)
    hemiGndC.set(L.hemiGround)
    ambC.set(L.ambientColor)
    sunC.set(L.sunColor)
    moonC.set(L.moonColor)

    if (hemiRef.current) {
      hemiRef.current.color.copy(hemiSkyC)
      hemiRef.current.groundColor.copy(hemiGndC)
      hemiRef.current.intensity = L.hemiIntensity
    }
    if (ambRef.current) {
      ambRef.current.color.copy(ambC)
      ambRef.current.intensity = L.ambientIntensity
    }
    if (sunRef.current) {
      const s = sunRef.current
      s.color.copy(sunC)
      s.intensity = L.sunIntensity
      const d = L.sunDirPos
      // Follow player so the tight shadow box stays useful
      const p = getState().player.position
      s.position.set(p.x + d[0] * SUN_DIST, d[1] * SUN_DIST, p.z + d[2] * SUN_DIST)
      s.target.position.set(p.x, 0, p.z)
      s.target.updateMatrixWorld()
      s.castShadow = L.shadowStrength > 0.15
      if (s.shadow) {
        const cam = s.shadow.camera as THREE.OrthographicCamera
        cam.left = -SHADOW_HALF
        cam.right = SHADOW_HALF
        cam.top = SHADOW_HALF
        cam.bottom = -SHADOW_HALF
        cam.near = 10
        cam.far = SUN_DIST * 2.2
        cam.updateProjectionMatrix()
      }
    }
    if (moonRef.current) {
      const m = moonRef.current
      m.color.copy(moonC)
      m.intensity = L.moonIntensity
      const d = L.moonDirPos
      const p = getState().player.position
      m.position.set(p.x + d[0] * SUN_DIST, d[1] * SUN_DIST, p.z + d[2] * SUN_DIST)
    }
    gl.toneMappingExposure = L.exposure
    if (starsGroup.current) {
      starsGroup.current.visible = L.starsOpacity > 0.08
    }
  })

  return (
    <group>
      <hemisphereLight ref={hemiRef} args={['#e6eef7', '#cdb98f', 1.0]} />
      <ambientLight ref={ambRef} intensity={0.3} color="#f0ece4" />
      <directionalLight
        ref={sunRef}
        color="#fff4e0"
        intensity={2.4}
        position={[-80, 160, 40]}
        castShadow
        shadow-mapSize-width={mapSize}
        shadow-mapSize-height={mapSize}
        shadow-camera-left={-SHADOW_HALF}
        shadow-camera-right={SHADOW_HALF}
        shadow-camera-top={SHADOW_HALF}
        shadow-camera-bottom={-SHADOW_HALF}
        shadow-camera-near={10}
        shadow-camera-far={480}
        shadow-bias={-0.0004}
      />
      <directionalLight ref={moonRef} color="#a9bde0" intensity={0} position={[100, 180, -80]} />
      <group ref={starsGroup} visible={false}>
        <Stars radius={600} depth={60} count={1400} factor={5} saturation={0} fade speed={0.4} />
      </group>
    </group>
  )
}

/** Fog + sky driven by the same lightingAt snapshot. */
export function DayCycleFog({ hour = 12, weather = 'clear' as WeatherKind }: { hour?: number; weather?: WeatherKind }) {
  const fogRef = useRef<THREE.FogExp2>(null)
  const col = useMemo(() => new THREE.Color('#d8e6ee'), [])
  useFrame(() => {
    const L = lightingAt(hour, weather)
    col.set(L.fogColor)
    if (fogRef.current) {
      fogRef.current.color.copy(col)
      fogRef.current.density = L.fogDensity
    }
  })
  return <fogExp2 ref={fogRef} attach="fog" args={['#d8e6ee', 0.00055]} />
}

