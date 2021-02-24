import React from 'react';
import { MouseEvent } from 'react-three-fiber';

import { useBox } from '../Physics';

export type CubeProps = {
  position?: [number, number, number];
  onClick: (event: MouseEvent) => void;
};

const Cube: React.FC<CubeProps> = ({ onClick, ...props }: CubeProps) => {
  const [ref] = useBox(() => ({
    mass: 1,
    args: [0.5, 0.5, 0.5],
    material: {
      restitution: 0.5,
      friction: 0.8,
    },
    ...props,
  }));

  return (
    <mesh ref={ref} receiveShadow castShadow onClick={onClick}>
      <boxBufferGeometry attach="geometry" args={[1, 1, 1]} />
      <meshStandardMaterial attach="material" metalness={0.1} color="hotpink" />
    </mesh>
  );
};

export default Cube;
