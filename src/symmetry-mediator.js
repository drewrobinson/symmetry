const TASK_MAP_KEY = "-request";


let componentBus;
let serviceBus;

class Mediator {

  static getComponentBus(){
    return componentBus;
  }
  
  static getServiceBus(){
    return serviceBus;
  }

  constructor(PubSub) {
    this.taskQueue = [];
    this.taskMap = {};
    this.queueConcurrency = 6;
    this.tasksProcessing = 0;
    this.serviceMap = {};

    componentBus = new PubSub();
    serviceBus = new PubSub();
  }

  register(service){
    let self = this;
    let _aux = new service();

    //add service methods to map object
    Object.getOwnPropertyNames(service.prototype).forEach((prop)=>{
      if(prop !== 'constructor'){
        self.serviceMap[prop] = {
          name: service.name,
          message: _aux.model.MODEL_UPDATED,
          service: _aux,
          fn: _aux[prop]
        };

        componentBus.messages[_aux.model.MODEL_UPDATED] = _aux.model.MODEL_UPDATED; // Update ComponentBus Messages
        serviceBus.messages[_aux.model.MODEL_UPDATED] = _aux.model.MODEL_UPDATED;// Update ServiceBus Messages
      }
    });
  }

  queueTask(fn, params){
    let self = this;
    let _aux = self.serviceMap[fn];
    let _params = params || {};

    if(typeof _aux.fn === 'function'){

      let cb = function (msg) {
        componentBus.publish(componentBus.messages[_aux.message], msg.data);
        serviceBus.unsubscribe(serviceBus.messages[_aux.message], cb, self);
      };

      serviceBus.subscribe(serviceBus.messages[_aux.message], cb, self);
      self.enqueueTask({ name: _aux.name, fn: _aux.fn, ctx: _aux.service, params: _params });
    }
  }
  
  
  processTaskQueue() {
    let self = this;
    for (let i = 0; i < self.taskQueue.length; i++) {
      if (self.tasksProcessing < self.queueConcurrency) {
        let currentTask = self.taskQueue.shift();
        currentTask.fn.call(currentTask.ctx, self.dequeueTask.bind(self, currentTask.name), currentTask.params);
        self.tasksProcessing += 1;
      }
    }
  }


  enqueueTask(task) {
    let self = this;

    if (!!self.taskMap[task.name + TASK_MAP_KEY]) {
      return;
    }

    self.taskMap[task.name + TASK_MAP_KEY] = 1;

    self.taskQueue.push(task);

    if (self.taskQueue.length > 0) {
      self.processTaskQueue();
    }
  }

  dequeueTask(name) {
    let self = this;

    self.taskMap[name + TASK_MAP_KEY] = 0;
    self.tasksProcessing -= 1;

    if (self.taskQueue.length > 0) {
      self.processTaskQueue();
    }
  }
 
  
}
  
  
export { Mediator };