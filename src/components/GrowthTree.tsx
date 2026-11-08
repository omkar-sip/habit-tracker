import { useEffect, useRef, useState } from 'react'
import * as THREE from 'three'

type GrowthTreeProps = { progress: number; stage: number }

const colors = {
  trunk: 0x5b301d,
  trunkLight: 0x965a31,
  leaf: 0x5fa94d,
  leafLight: 0xa6d765,
  leafDark: 0x28663f,
  ground: 0x2a5932,
}

const makeBranch = (from: THREE.Vector3, to: THREE.Vector3, radius: number, material: THREE.Material) => {
  const direction = new THREE.Vector3().subVectors(to, from)
  const mesh = new THREE.Mesh(new THREE.CylinderGeometry(radius * .72, radius, direction.length(), 8), material)
  mesh.position.copy(from).add(to).multiplyScalar(.5)
  mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction.normalize())
  mesh.castShadow = true
  return mesh
}

const addFoliageCluster = (group: THREE.Group, position: THREE.Vector3, scale: number, materials: THREE.Material[]) => {
  const cluster = new THREE.Group()
  cluster.position.copy(position)
  cluster.scale.setScalar(scale)
  const shapes = [
    [-.35, 0, 0, .9], [.35, .05, .02, .82], [0, .28, -.05, .96], [0, -.24, .12, .78], [.1, .04, .28, .68]
  ]
  shapes.forEach(([x, y, z, size], index) => {
    const leaf = new THREE.Mesh(new THREE.IcosahedronGeometry(size, 2), materials[index % materials.length])
    leaf.position.set(x, y, z)
    leaf.scale.set(1.12, .86, .98)
    leaf.rotation.set(index * .31, index * .7, index * .19)
    leaf.castShadow = true
    cluster.add(leaf)
  })
  group.add(cluster)
}

const buildTree = (scene: THREE.Scene, progress: number, stage: number) => {
  const tree = new THREE.Group()
  const growth = Math.max(.18, Math.min(1, progress / 100))
  const trunkMaterial = new THREE.MeshStandardMaterial({ color: colors.trunk, roughness: .84, metalness: 0, emissive: 0x150a05, emissiveIntensity: .08 })
  const trunkLightMaterial = new THREE.MeshStandardMaterial({ color: colors.trunkLight, roughness: .85, emissive: 0x241006, emissiveIntensity: .07 })
  const leafMaterials = [
    new THREE.MeshStandardMaterial({ color: colors.leaf, roughness: .82, emissive: 0x16451b, emissiveIntensity: .16 }),
    new THREE.MeshStandardMaterial({ color: colors.leafLight, roughness: .8, emissive: 0x466d1b, emissiveIntensity: .16 }),
    new THREE.MeshStandardMaterial({ color: colors.leafDark, roughness: .84, emissive: 0x0c301e, emissiveIntensity: .14 }),
  ]

  const trunkTop = 2.35 * growth
  tree.add(makeBranch(new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, trunkTop, 0), .25 * Math.max(.7, growth), trunkMaterial))
  tree.add(makeBranch(new THREE.Vector3(0, 1.15 * growth, 0), new THREE.Vector3(-.85 * growth, 2.05 * growth, .04), .11 * growth, trunkLightMaterial))
  tree.add(makeBranch(new THREE.Vector3(0, 1.42 * growth, 0), new THREE.Vector3(.9 * growth, 2.28 * growth, -.05), .12 * growth, trunkMaterial))
  tree.add(makeBranch(new THREE.Vector3(0, 1.82 * growth, 0), new THREE.Vector3(-.55 * growth, 2.85 * growth, -.1), .09 * growth, trunkMaterial))
  tree.add(makeBranch(new THREE.Vector3(0, 2.02 * growth, 0), new THREE.Vector3(.48 * growth, 3.02 * growth, .14), .09 * growth, trunkLightMaterial))
  tree.add(makeBranch(new THREE.Vector3(0, 2.22 * growth, 0), new THREE.Vector3(0, 3.25 * growth, -.08), .08 * growth, trunkMaterial))

  const clusters = [
    [-1.02, 2.08, .02, .64], [.98, 2.3, -.04, .7], [-.58, 2.72, -.16, .7], [.56, 2.88, .15, .72], [0, 3.35, -.04, .82],
    [-.2, 2.62, .38, .58], [.2, 2.42, -.36, .62], [0, 2.92, .36, .68]
  ]
  clusters.forEach(([x, y, z, size], index) => addFoliageCluster(tree, new THREE.Vector3(x * growth, y * growth, z * growth), size * (.72 + growth * .34), leafMaterials))

  const ground = new THREE.Mesh(new THREE.CircleGeometry(2.7, 64), new THREE.MeshStandardMaterial({ color: colors.ground, roughness: .96, emissive: 0x0b2111, emissiveIntensity: .1 }))
  ground.rotation.x = -Math.PI / 2
  ground.position.y = -.03
  ground.receiveShadow = true
  scene.add(ground)
  scene.add(tree)
  return { tree, ground }
}

export default function GrowthTree({ progress, stage }: GrowthTreeProps) {
  const mountRef = useRef<HTMLDivElement>(null)
  const [fallback, setFallback] = useState(false)

  useEffect(() => {
    const mount = mountRef.current
    if (!mount) return
    const probe = document.createElement('canvas')
    const webgl = probe.getContext('webgl2') || probe.getContext('webgl') || probe.getContext('experimental-webgl')
    if (!webgl) {
      setFallback(true)
      return
    }
    const scene = new THREE.Scene()
    scene.fog = new THREE.Fog(0x10261a, 9, 18)
    const camera = new THREE.PerspectiveCamera(30, 1, .1, 40)
    camera.position.set(0, 2.15, 11.4)
    camera.lookAt(0, 1.55, 0)
    let renderer: THREE.WebGLRenderer
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
    } catch {
      setFallback(true)
      return
    }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    renderer.shadowMap.enabled = true
    renderer.shadowMap.type = THREE.PCFSoftShadowMap
    renderer.toneMapping = THREE.ACESFilmicToneMapping
    renderer.toneMappingExposure = 1.42
    mount.appendChild(renderer.domElement)

    scene.add(new THREE.HemisphereLight(0xe1f7cb, 0x1e3a26, 2.6))
    const key = new THREE.DirectionalLight(0xffffe6, 4)
    key.position.set(-4, 7, 5)
    key.castShadow = true
    key.shadow.mapSize.set(1024, 1024)
    scene.add(key)
    const rim = new THREE.PointLight(0xc9f276, 3, 9)
    rim.position.set(3, 3.5, -2)
    scene.add(rim)

    const treeParts = buildTree(scene, progress, stage)
    const resize = () => {
      const width = mount.clientWidth || 320
      const height = mount.clientHeight || 300
      camera.aspect = width / height
      camera.updateProjectionMatrix()
      renderer.setSize(width, height, false)
    }
    resize()
    const resizeObserver = new ResizeObserver(resize)
    resizeObserver.observe(mount)
    const clock = new THREE.Clock()
    let frame = 0
    const animate = () => {
      frame = requestAnimationFrame(animate)
      const elapsed = clock.getElapsedTime()
      treeParts.tree.rotation.y = Math.sin(elapsed * .22) * .035
      treeParts.tree.position.y = Math.sin(elapsed * 1.3) * .018
      renderer.render(scene, camera)
    }
    animate()

    return () => {
      cancelAnimationFrame(frame)
      resizeObserver.disconnect()
      treeParts.tree.traverse((object) => { if (object instanceof THREE.Mesh) { object.geometry.dispose(); if (Array.isArray(object.material)) object.material.forEach((material) => material.dispose()); else object.material.dispose() } })
      treeParts.ground.geometry.dispose()
      treeParts.ground.material.dispose()
      renderer.dispose()
      mount.removeChild(renderer.domElement)
    }
  }, [progress, stage])

  if (fallback) return <div className="growth-tree-fallback" role="img" aria-label={`Tree growth progress at ${progress}%`}><div className="growth-tree-fallback-canopy"><span /><span /><span /></div><div className="growth-tree-fallback-trunk" /><p>3D preview unavailable on this device</p></div>
  return <div ref={mountRef} className="growth-tree-canvas" data-growth-stage={stage} aria-label={`Three dimensional growth tree at ${progress}% progress`} />
}
