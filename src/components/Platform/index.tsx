import React from 'react';

import { useBox } from '../Physics';

export type PlatformProps = {
  position: [number, number, number];
};

const Platform: React.FC<PlatformProps> = ({ ...props }: PlatformProps) => {
  const [ref] = useBox(() => ({
    type: 'Static',
    args: [4, 0.5, 4],
    margin: 0.05,
    restitution: 1,
    friction: 0.5,
    rollingFriction: 10,
    ...props,
  }));

  return (
    <mesh ref={ref} {...props} receiveShadow castShadow>
      <boxBufferGeometry attach="geometry" args={[4, 0.5, 4]} />
      <meshStandardMaterial attach="material" metalness={0.4} color="hotpink" />
    </mesh>
  );
};

export default Platform;
