import React, { useRef, Suspense } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, PerspectiveCamera, Environment, ContactShadows, useGLTF } from '@react-three/drei';
import { Maximize2 } from 'lucide-react';
import { Button } from './ui/button';

// Base URL for viewing content
const BASE_URL = process.env.REACT_APP_BASE_URL || 'http://localhost:8000';

// 3D Model Component
function Model3D({ modelUrl }) {
  const meshRef = useRef();

  // If modelUrl is provided, try to load GLB/GLTF
  if (modelUrl) {
    try {
      // Construct absolute URL if it's a relative path
      const url = modelUrl.startsWith('/') ? `${BASE_URL}${modelUrl}` : modelUrl;
      const { scene } = useGLTF(url);
      
      useFrame((state) => {
        if (meshRef.current) {
          meshRef.current.rotation.y += 0.005;
        }
      });
      
      return <primitive ref={meshRef} object={scene} scale={2} />;
    } catch (error) {
      console.error('Error loading 3D model:', error);
    }
  }
  
  // Fallback: Simple t-shirt representation
  useFrame((state) => {
    if (meshRef.current) {
      meshRef.current.position.y = Math.sin(state.clock.getElapsedTime() * 0.5) * 0.1;
    }
  });

  return (
    <group ref={meshRef}>
      <mesh position={[0, 0, 0]}>
        <boxGeometry args={[2, 2.5, 0.3]} />
        <meshStandardMaterial color="#1a202c" roughness={0.4} metalness={0.1} />
      </mesh>
      <mesh position={[-1.2, 0.5, 0]} rotation={[0, 0, 0.3]}>
        <boxGeometry args={[0.8, 0.6, 0.3]} />
        <meshStandardMaterial color="#1a202c" roughness={0.4} metalness={0.1} />
      </mesh>
      <mesh position={[1.2, 0.5, 0]} rotation={[0, 0, -0.3]}>
        <boxGeometry args={[0.8, 0.6, 0.3]} />
        <meshStandardMaterial color="#1a202c" roughness={0.4} metalness={0.1} />
      </mesh>
      <mesh position={[0, 1.3, 0.15]}>
        <cylinderGeometry args={[0.3, 0.35, 0.2, 32]} />
        <meshStandardMaterial color="#1a202c" roughness={0.4} metalness={0.1} />
      </mesh>
    </group>
  );
}

// Main Viewer Component
export default function Product3DViewer({ product }) {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const modelUrl = product?.model3DUrl; // Get URL from product prop

  return (
    <div className={`relative ${isFullscreen ? 'fixed inset-0 z-50 bg-background' : 'w-full h-full'}`}>
      <div className="relative w-full h-full min-h-[500px] bg-muted rounded-2xl overflow-hidden">
        <Canvas shadows dpr={[1, 2]}>
          <PerspectiveCamera makeDefault position={[0, 0, 8]} fov={50} />
          <OrbitControls
            enablePan={false}
            enableZoom={true}
            minDistance={4}
            maxDistance={12}
            autoRotate={false}
          />
          
          <ambientLight intensity={0.5} />
          <spotLight
            position={[10, 10, 10]}
            angle={0.15}
            penumbra={1}
            intensity={1}
            castShadow
          />
          <pointLight position={[-10, -10, -10]} intensity={0.3} />
          
          <Suspense fallback={null}>
            <Model3D modelUrl={modelUrl} />
          </Suspense>
          
          <ContactShadows
            position={[0, -2, 0]}
            opacity={0.4}
            scale={10}
            blur={2}
            far={4}
          />
          
          <Environment preset="city" />
        </Canvas>
        
        <div className="absolute bottom-4 right-4">
          <Button
            variant="ghost"
            size="icon"
            className="bg-background/80 backdrop-blur-sm hover:bg-background"
            onClick={() => setIsFullscreen(!isFullscreen)}
          >
            <Maximize2 className="w-5 h-5" />
          </Button>
        </div>
      </div>
    </div>
  );
}