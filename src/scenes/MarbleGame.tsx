import { Vector3, BackSide } from 'three';
import React, { useRef } from 'react';
import { Canvas, extend } from 'react-three-fiber';

import Physics, { WorkerApi } from '../components/Physics';
import Marble from '../components/Marble';
import Platform from '../components/Platform';
import Plane from '../components/Plane';
import Circle from '../components/Circle';
import SunShaderMaterial from '../shaders/Sun';

extend({ SunShaderMaterial });

const MarbleGame: React.FC = () => {
  const ref = useRef<{ position: WorkerApi['position'] }>(null);

  return (
    <Canvas
      shadowMap
      style={{ width: '100%', height: '100vh' }}
    >
      <mesh scale={[3000, 3000, 3000]}>
        <boxGeometry args={[1, 1, 1]} />
        <sunShaderMaterial
          side={BackSide}
          depthWrite={false}
          sunPosition={new Vector3(10, 0, 10)}
          up={new Vector3(0, 0, 0)}
        />
      </mesh>
      <ambientLight />
      <hemisphereLight
        args={['#ffd394', '#ffd394', 0.6]}
      />
      <spotLight
        position={[10, 10, 10]}
        angle={1}
        penumbra={1}
      />
      <pointLight
        position={[30, 30, 30]}
        castShadow
        shadow-mapSize-width={1024}
        shadow-mapSize-height={1024}
      />
      <Physics wasmPath="/ammo.wasm" dynamics="Discrete" gravity={[0, -9.81, 0]} broadphase={{ type: 'Naive' }}>
        <Marble position={[2, 5, 0]} />
        <Plane
          onCollide={() => {
            // ref.current?.position.set([2, 5, 0]);
          }}
        />
        <Platform position={[0, 0, 0]} />
        <Circle position={[4, 0.26, 0]} />
        <Platform position={[4, 0, 0]} />
        <Platform position={[8, 0, 0]} />
        <Platform position={[12, 0, 0]} />
        <Platform position={[16, 0, 0]} />
        <Platform position={[24, 0, 0]} />
        <Platform position={[28, 0, 0]} />
        <Platform position={[32, 0, 0]} />
        <Platform position={[32, 0, 4]} />
      </Physics>
    </Canvas>
  );
};
export default MarbleGame;
