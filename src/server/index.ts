import gt from 'ramda/src/gt';
import all from 'ramda/src/all';
import pipe from 'ramda/src/pipe';
import prop from 'ramda/src/prop';

import socketioInit from 'socket.io';

import MapGenerator from '../helpers/MapGenerator';

type Status = 'started' | 'ended' | 'waiting';

interface User {
  nickname: string;
  color: string;
  attempts: number;
  finishTime: number;
}

interface Room {
  users: Record<string, User>;
  status: Status;
  map: any;
}

interface Database {
  rooms: Record<string, Room>;
  users: Record<string, User>;
}

const db: Database = {
  rooms: {

  },
  users: {

  },
};

const socketio = socketioInit(80);

const fakeHashFunc = (i) => i;
const generateRoomId = () => 'DJRUG';

socketio.on('connection', (socket: any) => {
  let roomId: string;
  let nicknameHash: string;

  socket.on('register', (data: any) => {
    const {
      color,
      nickname,
    } = data;

    nicknameHash = fakeHashFunc(nickname);
    db.users[nicknameHash] = {
      color,
      nickname,
      attempts: 0,
      finishTime: 0,
    };
  });

  socket.on('create-room', () => {
    if (!db.users[nicknameHash]) {
      return;
    }

    if (db.rooms[roomId]) {
      socket.emit('create-room-fail', { message: 'Already in a room' });
      return;
    }

    roomId = generateRoomId();
    db.rooms[roomId] = {
      users: {
        [nicknameHash]: db.users[nicknameHash],
      },
      status: 'waiting',
      map: MapGenerator(),
    };

    socket.join(roomId);

    socket.to(roomId).emit('created-room', {
      id: roomId,
      room: db.rooms[roomId],
    });
  });

  socket.on('join-room', (data: any) => {
    roomId = prop('roomId', data);

    if (!db.users[nicknameHash]) {
      return;
    }

    if (!db.rooms[roomId]) {
      socket.emit('join-room-fail', { message: 'Room not found' });
      return;
    }

    socket.join(roomId);
    socket.emit('joined-room-data', db.rooms[roomId]);
    socket.to(roomId).emit('joined-room', db.users[nicknameHash]);
  });

  socket.on('start-game', () => {
    if (!db.users[nicknameHash]) {
      return;
    }

    if (!db.rooms[roomId]) {
      socket.emit('join-room-fail', { message: 'Room not found' });
      return;
    }

    const delay = 3000;
    socket.to(roomId).emit('start-game-timer', { delay });
    setTimeout(() => {
      db.rooms[roomId].status = 'started';
      socket.to(roomId).emit('started-game');
    }, delay);
  });

  socket.on('cross-finish-line', (data: any) => {
    const {
      finishTime,
    } = data;

    if (!db.users[nicknameHash]) {
      return;
    }

    if (!db.rooms[roomId]) {
      socket.emit('join-room-fail', { message: 'Room not found' });
      return;
    }

    db.users[nicknameHash].attempts += 1;
    db.users[nicknameHash].finishTime = finishTime;

    socket.to(roomId).emit('crossed-finish-line', {
      nickname: db.users[nicknameHash].nickname,
      finishTime,
    });

    const allDone = all(
      pipe(
        prop('finishTime'),
        gt(0),
      ),
      Object.values(db.users),
    );

    if (allDone) {
      db.rooms[roomId].status = 'ended';
      socket.to(roomId).emit('game-ended', db.rooms[roomId]);
    }
  });

  socket.on('lose-game-attempt', () => {
    if (!db.users[nicknameHash]) {
      return;
    }

    if (!db.rooms[roomId]) {
      socket.emit('join-room-fail', { message: 'Room not found' });
      return;
    }

    db.users[nicknameHash].attempts += 1;

    if (db.users[nicknameHash].attempts >= 3) {
      socket.to(roomId).emit('attempt-exceeded', {
        nickname: db.users[nicknameHash].nickname,
      });
    }
  });

  socket.on('move', (data: any) => {
    const {
      position,
      rotation,
    } = data;

    if (!db.users[nicknameHash]) {
      return;
    }

    if (!db.rooms[roomId]) {
      socket.emit('join-room-fail', { message: 'Room not found' });
      return;
    }

    socket.to(roomId).emit('moved', {
      nickname: db.users[nicknameHash].nickname,
      position,
      rotation,
    });
  });

  socket.on('disconnect', () => {
    if (!db.users[nicknameHash]) {
      return;
    }

    delete db.rooms[roomId].users[nicknameHash];
    delete db.users[nicknameHash];

    socket.to(roomId).emit('disconnected', {
      nickname: db.users[nicknameHash].nickname,
    });
  });
});
