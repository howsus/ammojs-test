/* eslint-disable new-cap */
import { Vector3 } from 'three';
import AmmoLoader from './ammo';

import type * as Types from './types';
import { PhysicsEvent, AddBodiesEvent } from './events';

class Engine {
  ammo: typeof AmmoLoader | undefined;

  lastCallTime: number | undefined;

  tempTransform: AmmoLoader.btTransform | undefined;

  world: AmmoLoader.btDiscreteDynamicsWorld | undefined;

  bodies: Record<string, AmmoLoader.btRigidBody> = {}

  subscriptions: Record<number, [string, string]> = {};

  bodiesNeedSyncing = false;

  step(
    positions: Float32Array,
    quaternions: Float32Array,
  ): [unknown, [ArrayBufferLike, ArrayBufferLike]] {
    if (!this.world) {
      throw new Error('World has not been initialized');
    }
    const now = performance.now() / 1000;

    if (!this.lastCallTime) {
      this.world.stepSimulation(1, 10);
    } else {
      const timeSinceLastCall = now - this.lastCallTime;
      this.world.stepSimulation(timeSinceLastCall, 2);
    }
    this.lastCallTime = now;

    const nextPositions = new Float32Array(positions);
    const nextQuaternions = new Float32Array(quaternions);

    Object.values(this.bodies).forEach((body, i) => {
      if (this.tempTransform) {
        body.getMotionState().getWorldTransform(this.tempTransform);
        const origin = this.tempTransform.getOrigin();
        const rotation = this.tempTransform.getRotation();
        nextPositions[3 * i + 0] = origin.x();
        nextPositions[3 * i + 1] = origin.y();
        nextPositions[3 * i + 2] = origin.z();
        nextQuaternions[4 * i + 0] = rotation.x();
        nextQuaternions[4 * i + 1] = rotation.y();
        nextQuaternions[4 * i + 2] = rotation.z();
        nextQuaternions[4 * i + 3] = rotation.w();
      }
    });

    const observations = Object.entries(this.subscriptions).map(([id, [uuid, type]]) => {
      if (!this.tempTransform) {
        throw new Error('Temp transform is not initialized');
      }
      let value: AmmoLoader.btVector3 | AmmoLoader.btQuaternion;
      if (type === 'position' || type === 'quaternion') {
        this.bodies[uuid].getMotionState().getWorldTransform(this.tempTransform);
        value = type === 'position' ? this.tempTransform.getOrigin() : this.tempTransform.getRotation();
      } else {
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        value = this.bodies[uuid][`get${type.charAt(0).toUpperCase() + type.slice(1)}`]();
      }

      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      if (typeof value.w !== 'undefined') {
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        return [id, [value.x(), value.y(), value.z(), value.w()]];
      // eslint-disable-next-line no-else-return
      } else if (value.z !== undefined) {
        return [id, [value.x(), value.y(), value.z()]];
      }

      return [id, value];
    });

    const message = {
      operation: 'frame',
      positions: nextPositions,
      quaternions: nextQuaternions,
      observations,
      active: Boolean(Object.keys(this.bodies).length),
      bodies: this.bodiesNeedSyncing && Object.keys(this.bodies),
    };

    if (this.bodiesNeedSyncing) {
      this.bodiesNeedSyncing = false;
    }

    return [message, [nextPositions.buffer, nextQuaternions.buffer]];
  }

  createBodies(
    type: AddBodiesEvent['type'],
    uuids: string[],
    props: AddBodiesEvent['props'],
  ) {
    uuids.forEach((uuid, index) => {
      if (this.ammo && this.world) {
        const {
          type: bodyType,
          args,
          mass = 1,
          position = [0, 0, 0],
          rotation = [0, 0, 0],
          material,
          damping,
          margin = 0,
        } = props[index];
        const transform = new this.ammo.btTransform();
        transform.setIdentity();
        this.setTransform(transform, position);
        this.setRotation(transform, rotation);
        const motionState = new this.ammo.btDefaultMotionState(transform);
        const shape = this.createShape(type, args);
        const localInertia = new this.ammo.btVector3(0, 0, 0);
        shape.calculateLocalInertia(mass, localInertia);
        const body = new this.ammo.btRigidBody(
          new this.ammo.btRigidBodyConstructionInfo(
            bodyType === 'Static' ? 0 : mass,
            motionState,
            shape,
            localInertia,
          ),
        );

        if (bodyType === 'Dynamic' || bodyType === 'Kinematic') {
          body.setActivationState(4);
        }

        if (bodyType === 'Kinematic') {
          body.setCollisionFlags(2);
        }
        if (material?.friction) {
          body.setFriction(material.friction);
        }
        if (material?.restitution) {
          body.setRestitution(material.restitution);
        }
        if (damping) {
          body.setDamping(damping.linearDamping, damping.angularDamping);
        }

        shape.setMargin(margin);

        this.world.addRigidBody(body);
        this.bodies[uuid] = body;
      }
    });
    this.bodiesNeedSyncing = true;
  }

  removeBodies(uuids: string[]) {
    uuids.forEach((uuid) => {
      if (this.world) {
        this.world.removeRigidBody(this.bodies[uuid]);
        delete this.bodies[uuid];
      }
    });
    this.bodiesNeedSyncing = true;
  }

  makePhysicsWorld(
    dynamics: 'SoftRigid' | 'Discrete' = 'Discrete',
    gravity: [number, number, number] = [0, -9.81, 0],
  ) {
    if (this.ammo) {
      const collisionConfiguration = dynamics === 'Discrete'
        ? new this.ammo.btDefaultCollisionConfiguration()
        : new this.ammo.btSoftBodyRigidBodyCollisionConfiguration();
      const dispatcher = new this.ammo.btCollisionDispatcher(collisionConfiguration);
      const overlappingPairCache = new this.ammo.btDbvtBroadphase();
      const solver = new this.ammo.btSequentialImpulseConstraintSolver();

      this.world = dynamics === 'Discrete'
        ? new this.ammo.btDiscreteDynamicsWorld(
          dispatcher,
          overlappingPairCache,
          solver,
          collisionConfiguration,
        )
        : new this.ammo.btSoftRigidDynamicsWorld(
          dispatcher,
          overlappingPairCache,
          solver,
          collisionConfiguration,
          new this.ammo.btDefaultSoftBodySolver(),
        );

      this.world.setGravity(new this.ammo.btVector3(gravity[0], gravity[1], gravity[2]));
    }
  }

  createShape(type: AddBodiesEvent['type'], args: unknown) {
    if (this.ammo) {
      switch (type) {
        case 'Box':
          return new this.ammo.btBoxShape(new this.ammo.btVector3(...(args as Types.BoxProps['args'] || [0, 0, 0])));
        case 'Sphere':
          return new this.ammo.btSphereShape(args as Types.SphereProps['args'] || 1);
        default:
          throw new Error('Unknown Shape Type');
      }
    }
    throw new Error('Ammo is not initialized');
  }

  setTransform(transform: AmmoLoader.btTransform, position: Types.BodyProps['position']) {
    if (this.ammo) {
      if (Array.isArray(position)) {
        transform.setOrigin(new this.ammo.btVector3(position[0], position[1], position[2]));
      } else {
        transform.setOrigin(
          new this.ammo.btVector3(position?.x || 0, position?.y || 0, position?.z || 0),
        );
      }
    }
  }

  setRotation(transform: AmmoLoader.btTransform, rotation: Types.BodyProps['rotation']) {
    if (!this.ammo) {
      throw new Error('Ammo is not initialized');
    }
    if (Array.isArray(rotation)) {
      transform.setRotation(
        new this.ammo.btQuaternion(rotation[0], rotation[1], rotation[2], rotation[3] || 1),
      );
    } else {
      transform.setRotation(
        new this.ammo.btQuaternion(
          rotation?.x || 0,
          rotation?.y || 0,
          rotation?.z || 0,
          rotation?.order as unknown as number || 0,
        ),
      );
    }
  }

  subscribe(id: number, uuid: string, type: string) {
    this.subscriptions[id] = [uuid, type];
  }

  unsubscribe(id: number) {
    delete this.subscriptions[id];
  }

  createVector3(vector: [number, number, number]) {
    if (!this.ammo) {
      throw new Error('Ammo is not initialized');
    }

    return new this.ammo.btVector3(...vector);
  }

  async load() {
    return AmmoLoader({ locateFile: () => '/ammo.wasm' })
      .then((ammo) => {
        this.ammo = ammo;
        this.tempTransform = new this.ammo.btTransform();
        return this.ammo;
      });
  }
}

const engine = new Engine();

engine.load()
  .then(() => {
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    postMessage({ operation: 'loaded' });
  });

onmessage = (message: MessageEvent<PhysicsEvent>) => {
  const event = message.data;

  switch (event.operation) {
    case 'init':
      engine.makePhysicsWorld(event.props.dynamics, event.props.gravity);
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      postMessage({ operation: 'ready' });
      break;
    case 'step': {
      const [msg, buffer] = engine.step(event.positions, event.quaternions);
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      postMessage(msg, buffer);
      break;
    }
    case 'addBodies':
      engine.createBodies(event.type, event.uuid, event.props);
      break;
    case 'removeBodies':
      engine.removeBodies(event.uuid);
      break;
    case 'subscribe': {
      const { id, type } = event.props;
      engine.subscribe(id, event.uuid, type);
      break;
    }
    case 'unsubscribe':
      engine.unsubscribe(event.props);
      break;
    case 'setLinearVelocity': {
      const vector = engine.createVector3(event.props);
      vector.op_mul(1);
      engine.bodies[event.uuid].setLinearVelocity(vector);
      break;
    }
    default:
      break;
  }
};
