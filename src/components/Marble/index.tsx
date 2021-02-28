import React, { useEffect, useCallback } from 'react';
import { useThree } from 'react-three-fiber';

import { useSphere } from '../Physics';

export type MarbleProps = {
  position: [number, number, number];
};

const Marble: React.FC<MarbleProps> = ({ ...props }: MarbleProps) => {
  const { camera } = useThree();
  const [ref, { position, applyImpulse }] = useSphere(() => ({
    type: 'Dynamic',
    mass: 1,
    args: 1,
    restitution: 0.5,
    friction: 0.5,
    rollingFriction: 10,
    ...props,
  }));

  const moveDirection = {
    forward: 0,
    backward: 0,
    left: 0,
    right: 0,
    upward: 0,
  };

  const handleKey = (event: KeyboardEvent, action = 0) => {
    const { keyCode } = event;

    // console.log('keyCode', keyCode, action);

    switch (keyCode) {
      case 87: // W: FORWARD
        moveDirection.forward = action;
        break;
      case 83: // S: BACKWARD
        moveDirection.backward = action;
        break;
      case 65: // A: LEFT
        moveDirection.left = action;
        break;
      case 68: // D: RIGHT
        moveDirection.right = action;
        break;
      case 32: // SPACE: UPWARD
        moveDirection.upward = action;
        break;
      default:
        break;
    }

    // console.log('Object.values(moveDirection)', Object.values(moveDirection));

    if (Math.max(...Object.values(moveDirection)) === 1) {
      moveBall();
    }
  };

  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => handleKey(event, 1),
    [],
  );

  const handleKeyUp = useCallback(
    (event: KeyboardEvent) => handleKey(event, 0),
    [],
  );

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [handleKeyDown, handleKeyUp]);

  useEffect(() => position.subscribe((value) => {
    camera.lookAt(value[0], value[1], value[2]);
    camera.position.set(value[0] - 10, value[1] + 10, value[2] - 10);
    // camera.position.set(value[0] + 5, value[1] + 10, value[2] + 5);
  }), []);

  const moveBall = () => {
    let cameraDirectionVector = [
      0,
      0,
    ];

    if (ref && ref.current) {
      // console.log('ref', ref.current.position);

      cameraDirectionVector = [
        ref.current.position.x - camera.position.x,
        ref.current.position.z - camera.position.z,
      ];

      const normFactor = Math.max(
        Math.abs(cameraDirectionVector[0]),
        Math.abs(cameraDirectionVector[1]),
      );

      cameraDirectionVector = [
        cameraDirectionVector[0] / normFactor,
        cameraDirectionVector[1] / normFactor,
      ];

      // console.log('cameraDirectionVector', cameraDirectionVector);
    }

    const scalingFactor = 1;
    const moveX = moveDirection.right - moveDirection.left;
    const moveZ = moveDirection.backward - moveDirection.forward;
    const moveY = moveDirection.upward;

    if (moveX === 0 && moveY === 0 && moveZ === 0) {
      return;
    }

    let movementDirectionVector = [0, 0];

    let mtx = [
      [0, 0],
      [0, 0],
    ];

    if (moveX > 0) { // D
      const D = [
        [-1, 0],
        [0, 1],
      ];

      mtx = [
        [mtx[0][0] + D[0][0], mtx[1][0] + D[1][0]],
        [mtx[1][0] + D[1][0], mtx[1][1] + D[1][1]],
      ];
    }

    if (moveX < 0) { // A
      const W = [
        [1, 0],
        [0, -1],
      ];

      mtx = [
        [mtx[0][0] + W[0][0], mtx[1][0] + W[1][0]],
        [mtx[1][0] + W[1][0], mtx[1][1] + W[1][1]],
      ];
    }

    if (moveZ > 0) { // S
      const W = [
        [-1, 0],
        [0, -1],
      ];

      mtx = [
        [mtx[0][0] + W[0][0], mtx[1][0] + W[1][0]],
        [mtx[1][0] + W[1][0], mtx[1][1] + W[1][1]],
      ];
    }

    if (moveZ < 0) { // W
      const W = [
        [1, 0],
        [0, 1],
      ];

      mtx = [
        [mtx[0][0] + W[0][0], mtx[1][0] + W[1][0]],
        [mtx[1][0] + W[1][0], mtx[1][1] + W[1][1]],
      ];
    }

    if (mtx !== null) {
      // Normalize mtx
      const normFactor = Math.max(
        ...[
          Math.abs(mtx[0][0]),
          Math.abs(mtx[0][1]),
          Math.abs(mtx[1][1]),
          Math.abs(mtx[1][0]),
        ],
      );
      if (normFactor !== 0) {
        mtx = [
          [mtx[0][0] / normFactor, mtx[0][1] / normFactor],
          [mtx[1][0] / normFactor, mtx[1][1] / normFactor],
        ];

        // console.log('mtx', JSON.stringify(mtx), JSON.stringify(cameraDirectionVector));
        movementDirectionVector = [
          mtx[0][0] * cameraDirectionVector[0] + mtx[0][1] * cameraDirectionVector[1],
          mtx[1][0] * cameraDirectionVector[0] + mtx[1][1] * cameraDirectionVector[1],
        ];
      }
    }

    const movementDirectionVectorDistance = Math.sqrt(
      movementDirectionVector[0] ** 2 + movementDirectionVector[1] ** 2,
    );

    movementDirectionVector = [
      (movementDirectionVector[0] / movementDirectionVectorDistance) || 0,
      (movementDirectionVector[1] / movementDirectionVectorDistance) || 0,
    ];

    // console.log('movementDirectionVector', movementDirectionVector);

    // console.log('velocity: ', Math.sqrt(
    //   (movementDirectionVector[0] * 1.4) ** 2
    //   + (movementDirectionVector[1] * 1.4) ** 2,
    // ));

    applyImpulse([
      movementDirectionVector[0],
      moveY * 3,
      movementDirectionVector[1],
    ], [0, 0, 0]);
  };

  return (
    <mesh
      {...props}
      ref={ref}
      receiveShadow
      castShadow
    >
      <sphereBufferGeometry attach="geometry" args={[1, 32, 32]} />
      <meshStandardMaterial attach="material" metalness={0.1} color="orange" />
    </mesh>
  );
};

export default Marble;
