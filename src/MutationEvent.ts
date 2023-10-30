export class MutationEvent {
  private observer: MutationObserver;
  private callback: Function;
  private delay: number;
  private timer: any;
  private targetEls: string[];
  private excludeEls: string[];
  private type: string[];
  private batchNotifications: boolean;
  private accumulatedMutations: MutationRecord[] = [];
  private listenNode: HTMLElement;
  private defaultParams: Object = { attributes: true, childList: true, subtree: true }
  private paused: boolean = false;
  private groupType: string = 'none'; // when batched, 'mutation' = separates callbacks for each mutation type

  constructor(
    listenNode: HTMLElement,
    targetEls: string | string[],
    type: string | string[] = ['added', 'removed', 'changed'],
    callback: Function,
    delay: number = 100,
    batchNotifications: boolean = true,
    params: MutationObserverInit = this.defaultParams
  ) {
    this.targetEls = Array.isArray(targetEls) ? targetEls : [targetEls];
    this.excludeEls = []; //Array.isArray(excludeEls) ? excludeEls : [excludeEls];
    this.type = Array.isArray(type) ? type : [type];
    this.delay = delay;
    this.callback = callback;
    this.batchNotifications = batchNotifications;
    this.listenNode = listenNode

    this.observer = new MutationObserver(mutations => {
      this.accumulatedMutations = this.accumulatedMutations.concat(mutations);
      clearTimeout(this.timer);
      this.timer = setTimeout(() => {
        this.handleMutations(this.accumulatedMutations);
        this.accumulatedMutations = [];
      }, this.delay);
    });
//console.log('mutation event setup')
    this.changeListenNode(listenNode, params);
  }

private handleMutations(mutations: MutationRecord[]) {
  const filteredNodes: Node[] = [];
  const filteredNodeObjs: Object[] = [];

  const findDescendants = (node: Node, mutationType: string) => {
    //console.log(node)
    if (node instanceof HTMLElement && this.shouldNotify(node)) {
      filteredNodes.push(node);
      filteredNodeObjs.push({node: node, type: mutationType});
    }
    //node.childNodes.forEach(findDescendants);
    node.childNodes.forEach((childNode) => findDescendants(childNode, mutationType));
  };

  for (const mutation of mutations) {
    const target = mutation.target as HTMLElement;

    if (mutation.type === 'childList') {
      if (mutation.type === 'childList') {
        if (mutation.addedNodes.length > 0 && this.type.includes('added')) {
          //mutation.addedNodes.forEach(findDescendants);
          mutation.addedNodes.forEach((node) => findDescendants(node, 'added'));
        }

        if (mutation.removedNodes.length > 0 && this.type.includes('removed')) {
          //mutation.removedNodes.forEach(findDescendants);
          mutation.removedNodes.forEach((node) => findDescendants(node, 'removed'));
        }
      }
    }

    if (mutation.type === 'attributes' && this.type.includes('changed')) {
      if (this.shouldNotify(target)) {
        filteredNodes.push(target);
        filteredNodeObjs.push({node: target, type: 'changed'});
      }
    }
  }

  if (this.batchNotifications) {
    if (this.callback && filteredNodes.length > 0) {
      //this.callback(filteredNodes);
      //this.callback(filteredNodeObjs);

      if (this.groupType == 'mutation') {
        const groupedByType: Record<string, any[]> = {};

        for (const nodeObj of filteredNodeObjs) {
          if (!groupedByType[nodeObj.type]) {
            groupedByType[nodeObj.type] = [];
          }
          groupedByType[nodeObj.type].push(nodeObj);
        }

        for (const [type, nodes] of Object.entries(groupedByType)) {
          this.callback(nodes, type);
        }
      } else if (this.groupType == 'none') {
        this.callback(filteredNodeObjs);
      }
    


    }
  } else {
    //for (const node of filteredNodes) {
    for (const nodeObj of filteredNodeObjs) {
      if (this.callback) {
        //this.callback(node);
         this.callback(nodeObj);
      }
    }
  }
}

  private shouldNotify(target: HTMLElement): boolean {
  // First, check if the target should be excluded
  for (const el of this.excludeEls) {
    if (target.matches(el) || target.querySelector(el)) {
      return false;
    }
  }

  // Then, check if the target matches the elements to be included
  for (const el of this.targetEls) {
    if (target.matches(el)) {
      return true;
    }
  }

  return false;
}


  public changeListenNode(
    newListenNode: HTMLElement,
    params: MutationObserverInit = this.defaultParams
  ) {
console.log('change listen node')
//console.log(params)
    // Disconnect the old observer if it's already observing
    if (this.listenNode) {
      this.observer.disconnect();
    }

    // Update the listenNode
    this.listenNode = newListenNode;

    // Reconnect the observer with the new listenNode and new params
    if (!this.paused) this.observer.observe(this.listenNode, params);
  }

  public unregisterCallback() {
    this.callback = null;
    this.reset();
  }

  public pause() {
    if (this.listenNode && !this.paused) {
console.log('mutation event paused')
      this.observer.disconnect();
      this.paused = true;
    }
  }

  public resume() {
    if (this.listenNode && this.paused) {
console.log('mutation event resume')
      this.observer.observe(this.listenNode, this.defaultParams);
      this.paused = false;
    }
  }

  get pauseState(): boolean {
    return this.paused;
  }

  public reset () {
    this.accumulatedMutations = [];
    clearTimeout(this.timer);
    if (this.listenNode) {
      this.observer.disconnect();
    }
  }
}
