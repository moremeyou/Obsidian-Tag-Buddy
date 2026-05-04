import TagBuddy from "main";

export class DoubleTapHandler {
	private plugin: TagBuddy;
	private element: HTMLElement | Document;
	private callback: (event: Event) => void;
	private lastTap: number;
	private timeout: ReturnType<typeof setTimeout> | undefined;

	constructor(plugin: TagBuddy, element: HTMLElement | Document, callback: (event: Event) => void){
	    this.plugin = plugin; // Store the plugin instance
	    this.element = element;
	    this.callback = callback;
	    this.lastTap = 0;

	    this.plugin.registerDomEvent(
		this.element as HTMLElement,
		'touchend',
		this.handleTouchEnd.bind(this),
		true
	);
	  }

	  handleTouchEnd(event: Event) {
	    const currentTime = new Date().getTime();
	    const tapLength = currentTime - this.lastTap;
	    clearTimeout(this.timeout);
	    if (tapLength < 500 && tapLength > 0) {
	      this.callback(event);
	    } else {
	      this.timeout = setTimeout(() => {
	        clearTimeout(this.timeout);
	      }, 500);
	    }
	    this.lastTap = currentTime;
	  }
}

export class TripleTapHandler {

  private plugin: TagBuddy;
  private element: HTMLElement | Document;
  private callback: (event: Event) => void;
  private lastTap: number;
  private timeout: ReturnType<typeof setTimeout> | undefined;
  private tapCount: number;

  constructor(plugin: TagBuddy, element: HTMLElement | Document, callback: (event: Event) => void){
    this.plugin = plugin; // Store the plugin instance
    this.element = element;
    this.callback = callback;
    this.lastTap = 0;
    this.tapCount = 0; // Initialize tap count

    this.plugin.registerDomEvent(
      this.element as HTMLElement,
      'touchend',
      this.handleTouchEnd.bind(this),
      true
    );
  }

  handleTouchEnd(event: Event) {
    const currentTime = new Date().getTime();
    const tapLength = currentTime - this.lastTap;
    clearTimeout(this.timeout);

    if (tapLength < 500 && tapLength > 0) {
      this.tapCount++; // Increment tap count

      // If triple tap is detected, trigger the callback and reset tapCount
      if (this.tapCount === 2) {
        this.callback(event);
        this.tapCount = 0;
      }
    } else {
      this.tapCount = 0; // Reset tap count if time between taps is too long
    }

    this.timeout = setTimeout(() => {
      clearTimeout(this.timeout);
      this.tapCount = 0; // Reset tap count when timeout is reached
    }, 500);

    this.lastTap = currentTime;
  }
}


export class PressAndHoldHandler {
	private plugin: TagBuddy;
	private element: HTMLElement | Document;
	private callback: (event: Event) => void;
	private duration: number;
	private timeout: ReturnType<typeof setTimeout> | null;

	constructor(
		plugin: TagBuddy,
		element: HTMLElement | Document,
		callback: (event: Event) => void,
		duration: number = 600
	){
		this.plugin = plugin;
		this.element = element;
		this.callback = callback;
		this.duration = duration;
		this.timeout = null;

		this.plugin.registerDomEvent(
			this.element as HTMLElement,
			'touchstart',
			this.handleTouchStart.bind(this),
			true
		);
		this.plugin.registerDomEvent(
			this.element as HTMLElement,
			'touchend',
			this.handleTouchEnd.bind(this),
			true
		);
	}

	handleTouchStart(event: Event) {
		//event.preventDefault();
		//event.stopPropagation();
		this.timeout = setTimeout(() => {
			this.callback(event);
			this.timeout = null;
		}, this.duration);
	}

	handleTouchEnd(event: Event) {
		if (this.timeout) {
			clearTimeout(this.timeout);
			this.timeout = null;
		}
	}
}
