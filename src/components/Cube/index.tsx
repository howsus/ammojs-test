import React from 'react';

import { useBox } from '../Physics';

export type CubeProps = {
  position?: [number, number, number];
};

const Cube: React.FC<CubeProps> = ({ position = [0, 5, 0] }: CubeProps) => {
  const [ref] = useBox(() => ({
    mass: 1,
    position,
    rotation: [0.4, 0.2, 0.5],
    args: [1 * 0.5, 1 * 0.5, 1 * 0.5],
    material: {
      restitution: 0.5,
    },
  }));

  return (
    <mesh ref={ref} receiveShadow castShadow>
      <boxBufferGeometry attach="geometry" />
      <meshStandardMaterial attach="material" metalness={0.1} color="hotpink" />
    </mesh>
  );
};

export default Cube;
