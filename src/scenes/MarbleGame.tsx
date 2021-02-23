import React from 'react';
import { Canvas } from 'react-three-fiber';

import Marble from '../components/Marble';
import Platform from '../components/Platform';
import CameraController from '../components/CameraController';
import Physics from '../components/Physics';

const MarbleGame: React.FC = () => (
  <Canvas
    shadowMap
    style={{ width: '100%', height: '100vh' }}
    camera={{
      position: [3, 10, 15], fov: 65, near: 2, far: 60,
    }}
  >
    <CameraController />
    <ambientLight />
    <spotLight position={[10, 10, 10]} angle={1} penumbra={1} />
    <pointLight
      position={[10, 10, 10]}
      castShadow
      shadow-mapSize-width={1024}
      shadow-mapSize-height={1024}
    />
    <Physics>
      {() => (
        <>
          <Marble position={[2, 5, 0]} />
          <Platform position={[0, 0, 0]} />
          <Platform position={[4, 0, 0]} />
        </>
      )}
    </Physics>
  </Canvas>
);

export default MarbleGame;
