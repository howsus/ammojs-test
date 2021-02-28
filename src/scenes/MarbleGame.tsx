import { Vector3, BackSide } from 'three';
import React from 'react';
import { Canvas, extend } from 'react-three-fiber';

import Physics from '../components/Physics';
import Marble from '../components/Marble';
import Platform from '../components/Platform';
import Plane from '../components/Plane';
import Circle from '../components/Circle';
import SunShaderMaterial from '../shaders/Sun';
import MapGenerator from '../helpers/MapGenerator';

extend({ SunShaderMaterial });

const MarbleGame: React.FC = () => (
  <Canvas
    shadowMap
    style={{ width: '100%', height: '100vh' }}
    camera={{
      position: [0, 0, 0], fov: 65, near: 2, far: 60,
    }}
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
          alert('Loooserrrr!!!');
        }}
      />
      {
        MapGenerator().map((tile: any, index: any, arr: any) => (
          <>
            <Platform position={tile.position} />
            {index === (arr.length - 1) && (
              <Circle
                position={[tile.position[0], 0.26, tile.position[2]]}
                onCollide={() => {
                  alert('You won!');
                }}
              />
            )}
          </>
        ))
      }
    </Physics>
  </Canvas>
);

export default MarbleGame;
