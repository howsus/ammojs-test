import React, { useEffect } from 'react';
import { useThree } from 'react-three-fiber';

import { useSphere } from '../Physics';

export type MarbleProps = {
  position: [number, number, number];
};

const Marble: React.FC<MarbleProps> = ({ ...props }: MarbleProps) => {
  const { camera } = useThree();
  const [ref, { position }] = useSphere(() => ({
    mass: 1,
    args: 1,
    material: {
      restitution: 0.5,
    },
    ...props,
  }));

  useEffect(() => position.subscribe((value) => {
    camera.lookAt(value[0], value[1], value[2]);
    // console.log(value);
  }), []);

  return (
    <mesh
      {...props}
      ref={ref}
      receiveShadow
      castShadow
      onClick={() => {
        // setLinearVelocity([1, 0, 0], 1);
      }}
    >
      <sphereBufferGeometry attach="geometry" args={[1, 32, 32]} />
      <meshStandardMaterial attach="material" metalness={0.1} color="orange" />
    </mesh>
  );
};

export default Marble;
