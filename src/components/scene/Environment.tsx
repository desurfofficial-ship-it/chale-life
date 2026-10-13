'use client'

// ─── Dusk sky dome, sun glow, stars and scene lighting ──────────────────────
import { useMemo } from 'react'
import * as THREE from 'three'
import { useFrame } from '@react-three/fiber'
import { Stars } from '@react-three/drei'

const skyVert = /* glsl */ `
  varying vec3 vDir;
  void main() {
    vDir = normalize(position);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`

const skyFrag = /* glsl */ `
  varying vec3 vDir;
  void main() {
    float h = clamp(vDir.y * 0.5 + 0.5, 0.0, 1.0);
    vec3 horizon = vec3(1.0, 0.58, 0.32);
    vec3 mid = vec3(0.55, 0.26, 0.46);
    vec3 top = vec3(0.10, 0.07, 0.24);
    vec3 col = mix(horizon, mid, smoothstep(0.42, 0.62, h));
    col = mix(col, top, smoothstep(0.60, 0.95, h));
    // warm band around the sun azimuth (south-west)
    vec3 sunDir = normalize(vec3(-0.45, 0.06, 0.89));
    float sunAmt = pow(max(dot(normalize(vDir), sunDir), 0.0), 6.0);
    col += vec3(1.0, 0.55, 0.25) * sunAmt * 0.55;
    // below the horizon the dome must match the scene fog (#41305e) so the
    // sea/land skirts melt into haze — never an orange void at full zoom-out
    vec3 haze = vec3(0.255, 0.188, 0.369);
    col = mix(col, haze, smoothstep(0.5, 0.4, h));
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

export function SkyDome() {
  const material = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader: skyVert,
        fragmentShader: skyFrag,
        side: THREE.BackSide,
        depthWrite: false,
        fog: false,
      }),
    []
  )
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

export function SceneLights() {
  return (
    <group>
      <hemisphereLight args={['#6a4a8f', '#3a2e28', 1.0]} />
      <ambientLight intensity={0.42} color="#5a4a78" />
      <directionalLight
        color="#ffb46b"
        intensity={1.55}
        position={[-120, 130, 170]}
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
        shadow-camera-left={-240}
        shadow-camera-right={240}
        shadow-camera-top={190}
        shadow-camera-bottom={-190}
        shadow-camera-near={10}
        shadow-camera-far={620}
        shadow-bias={-0.0006}
      />
      {/* fill light from the opposite side keeps night sides readable */}
      <directionalLight color="#4a5fae" intensity={0.45} position={[130, 80, -140]} />
      {/* NOTE: the old sun-glow sprite was removed — it swept across the HUD
          (the "stray orb top-right"). The sky shader keeps its own warm band. */}
      <Stars radius={600} depth={60} count={1400} factor={5} saturation={0} fade speed={0.6} />
    </group>
  )
}
