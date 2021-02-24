import React from 'react';
import { Canvas } from 'react-three-fiber';

import Marble from '../components/Marble';
import Platform from '../components/Platform';
import Physics from '../components/Physics';

import MapGenerator from '../helpers/MapGenerator';

const MarbleGame: React.FC = () => (
  <Canvas
    shadowMap
    style={{ width: '100%', height: '100vh' }}
    camera={{
      position: [0, 0, 0], fov: 65, near: 2, far: 60,
    }}
  >
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
          {
            MapGenerator().map((tile: any) => (
              <Platform position={tile.position} />
            ))
          }
        </>
      )}
    </Physics>
  </Canvas>
);

export default MarbleGame;
