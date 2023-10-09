import { htmlToMarkdown } from './utils';

export function showTagSelector(x: number, y: number) {
	// Adjustments for the scrollbar and dynamic height
	const maxTagContainerHeight = 180; // This is a chosen max height, adjust as desired
	const tagItemHeight = 20; // Approximate height of one tag item, adjust based on your styles

    // Remove any existing context menu
	const existingMenu = document.getElementById('addtag-menu');
	if (existingMenu) existingMenu.remove();

    const menuEl = document.createElement('div');
    //menuEl.setAttribute('id', 'addtag-menu');
    menuEl.classList.add('addtag-menu');
    menuEl.style.left = `${x}px`;
	menuEl.style.top = `${y}px`;
	//menuEl.style.maxHeight = `${maxTagContainerHeight}px;`;

    // Create and style the search input field
    const searchEl = createEl('input');
    searchEl.setAttribute('type', 'text');
    searchEl.setAttribute('id', 'tag-search');
    searchEl.setAttribute('placeholder', 'Search tags...');
    
    menuEl.appendChild(searchEl);
    // Container for the tags
    const tagContainer = createEl('div');
    //tagContainer.setAttribute('id', 'tag-list');
    tagContainer.classList.add('tag-list');
    //tagContainer.style.maxHeight = `${maxTagContainerHeight}px;`;
    tagContainer.style.setProperty('max-height', `${maxTagContainerHeight}px`, 'important');

    menuEl.appendChild(tagContainer);

	const renderTags = (searchQuery: string) => {
    	tagContainer.innerHTML = '';  // Clear existing tags
    	//const filteredTags = this.fetchAllTags().filter(tag => tag.includes(searchQuery));
    	const filteredTags = getTagsFromApp().filter(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()));
    	// Set the dynamic height based on the number of results
    	const dynamicHeight = Math.min(filteredTags.length * tagItemHeight, maxTagContainerHeight);
    
	    filteredTags.forEach((tag, index) => {
	        const itemEl = createEl('div');
	        itemEl.innerText = `${tag}`;
	        itemEl.classList.add('tag-item');
	        itemEl.title = `#${tag}`;
            if (index === 0) {
                itemEl.classList.add('active');  // Add active class to the first tag
            }
            itemEl.style.setProperty('max-height', `${dynamicHeight}px`, 'important');

	        this.registerDomEvent(itemEl, 'click', () => {
	        //itemEl.addEventListener('click', () => {
			    console.log(`Selected tag: #${tag}`);
			    // Add your logic here to insert the tag into the note

			    // Close the menu after selection
			    menuEl.remove();
			}, true);

			// Handle Enter key press
			this.registerDomEvent(searchEl, 'keyup', (e: KeyboardEvent) => {
			//searchEl.addEventListener('keydown', (e: KeyboardEvent) => {
			    if (e.key === 'Enter') {
			        const activeTag = tagContainer.querySelector('.active');
			        if (activeTag) {
			            activeTag.click();  // Simulate a click on the active tag
			        }
			    }
			});

        tagContainer.appendChild(itemEl);
	});

	    if (filteredTags.length * tagItemHeight > maxTagContainerHeight) {
		        tagContainer.style.overflowY = 'auto !important';
		    } else {
		        tagContainer.style.overflowY = 'hidden !important';
		    }
		};

    // Initial render
    renderTags('');

    // Event listener for search input
    searchEl.addEventListener('input', (e) => {
        renderTags((e.target as HTMLInputElement).value);
    });

	// const debouncedProcessTags = this.debounce(this.processTags.bind(this), 500);

    // Add the menu to the document
    document.body.appendChild(menuEl);

    // Auto-focus on the search input
	searchEl.focus();

	const closeMenu = (e: MouseEvent | KeyboardEvent) => {
	    if (e instanceof MouseEvent && (e.button === 0 || e.button === 2)) {
	        if (!menuEl.contains(e.target as Node)) {  // Check if the click was outside the menu
	            menuEl.remove();
	            //document.body.removeEventListener('click', closeMenu);
	            //document.body.removeEventListener('contextmenu', closeMenu);
	            //document.body.removeEventListener('keydown', closeMenu);
	        }
	    } else if (e instanceof KeyboardEvent && e.key === 'Escape') {
	        menuEl.remove();
	        document.body.removeEventListener('click', closeMenu);
	        document.body.removeEventListener('contextmenu', closeMenu);
	        document.body.removeEventListener('keyup', closeMenu);
	    }
	};

	setTimeout(() => {
	    //document.body.addEventListener('click', closeMenu);
	    //document.body.addEventListener('contextmenu', closeMenu);  // Listen for right clicks too
	    //document.body.addEventListener('keydown', closeMenu);
	    this.registerDomEvent(document.body, 'click', closeMenu);
        this.registerDomEvent(document.body, 'contextmenu', closeMenu);
        this.registerDomEvent(document.body, 'keyup', closeMenu);
	}, 0);

	//tagContainer.addEventListener('mousemove', () => {
	this.registerDomEvent(tagContainer, 'mousemove', () => {
	    // Reactivate the hover effect
	    tagContainer.classList.remove('disable-hover');
	    
	    // Find any tag with the 'active' class and remove that class
	    const activeTag = tagContainer.querySelector('.tag-item.active');
	    if (activeTag) {
	        activeTag.classList.remove('active');
	    }
	});

	// Handle Enter key press
	//searchEl.addEventListener('blur', () => {
	this.registerDomEvent(searchEl, 'blur', () => {
	    tagContainer.classList.remove('disable-hover');
	});
    //searchEl.addEventListener('keydown', (e: KeyboardEvent) => {
	this.registerDomEvent(searchEl, 'keydown', (e: KeyboardEvent) => {
	    const activeTag = tagContainer.querySelector('.active');
	    let nextActiveTag;
	    if (['ArrowUp', 'ArrowDown'].includes(e.key) || e.key.length === 1) { // Check for arrow keys or any single character key press
	        tagContainer.classList.add('disable-hover');
	    }
	    if (e.key === 'ArrowDown') {
	        if (activeTag && activeTag.nextElementSibling) {
	            nextActiveTag = activeTag.nextElementSibling;
	        } else {
	            nextActiveTag = tagContainer.firstChild; // loop back to the first item
	        }
	    } else if (e.key === 'ArrowUp') {
	        if (activeTag && activeTag.previousElementSibling) {
	            nextActiveTag = activeTag.previousElementSibling;
	        } else {
	            nextActiveTag = tagContainer.lastChild; // loop back to the last item
	        }
	    } else if (e.key === 'Enter') {
	        if (activeTag) {
	            activeTag.click();
	            return;
	        }
	    }

	    if (nextActiveTag) {
	        if (activeTag) {
	            activeTag.classList.remove('active');
	        }
	        nextActiveTag.classList.add('active');
	        // Ensure the newly active tag is visible
	        nextActiveTag.scrollIntoView({ block: 'nearest' });
	    }
	});
}