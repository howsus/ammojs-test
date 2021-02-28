export interface Action {
  type: string;
  payload: unknown;
}

type Listeners<Actions extends Action> = Record<
  Actions['type'],
  ((event: Actions['payload']) => void)[]
>;

class Emmiter<Actions extends Action> {
  private listeners: Listeners<Actions> = {} as Listeners<Actions>;

  public on<ActionType extends Actions['type']>(
    type: ActionType,
    listener: (event: Actions extends { type: ActionType } ? Actions['payload'] : never) => void,
  ): () => void {
    if (!this.listeners[type]) {
      this.listeners[type] = [];
    }
    this.listeners[type].push(listener as ((event: Actions['payload']) => void));

    return (): void => this.off(type, listener);
  }

  public off<ActionType extends Actions['type']>(
    type: ActionType,
    listener: (event: Actions extends { type: ActionType } ? Actions['payload'] : never) => void,
  ): void {
    const index = this.listeners[type].indexOf(listener as ((event: Actions['payload']) => void));
    if (index > -1) {
      this.listeners[type].splice(index, 1);
    }
  }

  public emit<ActionType extends Actions['type']>(
    type: ActionType,
    payload: Actions extends { type: ActionType } ? Actions['payload'] : never,
  ): void {
    if (this.listeners[type]) {
      this.listeners[type].forEach((listener) => {
        listener(payload);
      });
    }
  }
}

export default Emmiter;
