class EventEmitter2 {
  emit() {
    return true;
  }

  async emitAsync() {
    return [];
  }
}

class EventEmitterRoot {}

class EventEmitterModule {
  static forRoot() {
    return {
      module: EventEmitterRoot,
      global: true,
      providers: [
        {
          provide: EventEmitter2,
          useFactory: () => new EventEmitter2(),
        },
      ],
      exports: [EventEmitter2],
    };
  }
}

function OnEvent() {
  return () => undefined;
}

module.exports = { EventEmitter2, EventEmitterModule, OnEvent };
