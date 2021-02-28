import { atom } from 'recoil';

const gameState = atom({
  key: 'gameState',
  default: {
    state: 'STARTED',
  },
});