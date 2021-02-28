import React from 'react';
import { useCylinder, CylinderProps } from '../Physics';

export type CircleProps = Pick<CylinderProps, 'position' | 'onCollide'>;

const Circle: React.FC<CircleProps> = (props: CircleProps) => {
  const [ref] = useCylinder(() => ({
    type: 'Static',
    mass: 1,
    args: [1, 0, 1],
    ...props,
  }));

  return (
    <mesh ref={ref} receiveShadow castShadow {...props}>
      <cylinderBufferGeometry args={[1, 1, 0, 32]} />
      <meshBasicMaterial color="lightblue" />
    </mesh>
  );
};

export default Circle;
