import TagBuddy from "main";
import { App, Plugin } from 'obsidian';


export class DoubleTapHandler {
	
	constructor(plugin: TagBuddy, element: HTMLElement, callback: Function){
	    this.plugin = plugin; // Store the plugin instance
	    this.element = element;
	    this.callback = callback;
	    this.lastTap = 0;
	    
	    this.plugin.registerDomEvent(
	    	this.element,
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

export class PressAndHoldHandler {
	
	constructor(
		plugin: TagBuddy, 
		element: HTMLElement, 
		callback: Function, 
		duration: number = 600
	){
		this.plugin = plugin;
		this.element = element;
		this.callback = callback;
		this.duration = duration; 
		this.timeout = null;

		this.plugin.registerDomEvent(
			this.element, 
			'touchstart', 
			this.handleTouchStart.bind(this), 
			true
		);
		this.plugin.registerDomEvent(
			this.element, 
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
