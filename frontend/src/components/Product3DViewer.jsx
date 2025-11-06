import React, { useRef, useState, useEffect, Suspense } from 'react';
import { Canvas, useFrame, useLoader } from '@react-three/fiber';
import { OrbitControls, PerspectiveCamera, Environment, ContactShadows, useGLTF } from '@react-three/drei';
import { motion } from 'framer-motion';
import { RotateCw, Maximize2 } from 'lucide-react';
import { Button } from './ui/button';

// 3D Model Component
function Model3D({ modelUrl }) {
  const meshRef = useRef();
  
  // If modelUrl is provided, try to load GLB/GLTF
  if (modelUrl && (modelUrl.endsWith('.glb') || modelUrl.endsWith('.gltf'))) {
    try {
      const { scene } = useGLTF(modelUrl);
      
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
      {/* T-Shirt Body */}
      <mesh position={[0, 0, 0]}>
        <boxGeometry args={[2, 2.5, 0.3]} />
        <meshStandardMaterial color="#1a202c" roughness={0.4} metalness={0.1} />
      </mesh>
      
      {/* Left Sleeve */}
      <mesh position={[-1.2, 0.5, 0]} rotation={[0, 0, 0.3]}>
        <boxGeometry args={[0.8, 0.6, 0.3]} />
        <meshStandardMaterial color="#1a202c" roughness={0.4} metalness={0.1} />
      </mesh>
      
      {/* Right Sleeve */}
      <mesh position={[1.2, 0.5, 0]} rotation={[0, 0, -0.3]}>
        <boxGeometry args={[0.8, 0.6, 0.3]} />
        <meshStandardMaterial color="#1a202c" roughness={0.4} metalness={0.1} />
      </mesh>
      
      {/* Neck */}
      <mesh position={[0, 1.3, 0.15]}>
        <cylinderGeometry args={[0.3, 0.35, 0.2, 32]} />
        <meshStandardMaterial color="#1a202c" roughness={0.4} metalness={0.1} />
      </mesh>
    </group>
  );
}

export default function Product3DViewer({ productId }) {
  const [model3D, setModel3D] = useState(null);
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    // Load 3D model from localStorage (admin uploaded)
    const savedModels = localStorage.getItem('product3DModels');
    if (savedModels) {
      const models = JSON.parse(savedModels);
      const productModel = models.find(m => m.productId === productId);
      if (productModel) {
        setModel3D(productModel.modelUrl);
      }
    }
  }, [productId]);

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
            <Model3D modelUrl={model3D} />
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
        
        {/* Controls Overlay */}
        <div className="absolute bottom-4 left-4 right-4 flex justify-between items-center">
          <div className="bg-background/80 backdrop-blur-sm px-4 py-2 rounded-full text-sm flex items-center space-x-2">
            <RotateCw className="w-4 h-4" />
            <span>Drag to rotate</span>
          </div>
          
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
