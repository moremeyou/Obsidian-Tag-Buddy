import { outerHTMLToElement } from './utils';

export class TagFileManager {
  private fileData: Object = {}

  constructor() {
    //this.fileData = {};
  }

  // Set tags for a specific file
  setFileTags(filePath, tags) {
//console.log(tags)
    if (!this.fileData.hasOwnProperty(filePath)) {
      this.fileData[filePath] = {};
      this.fileData[filePath].tags = [];
    }
    
    let tagsArray;

    // Check if 'tags' is an array
    if (Array.isArray(tags)) {
      tagsArray = tags;
    }
    // Check if 'tags' is a NodeList
    else if (tags instanceof NodeList) {
      tagsArray = Array.from(tags);
    }
    // Assume 'tags' is a single HTMLElement or Node
    else {
      tagsArray = [tags];
    }

    
    // Filter out tags that already exist
    const uniqueTags = tagsArray.filter(tag => !this.fileData[filePath].tags.includes(tag));
    
    // Add unique tags to the existing tags
    this.fileData[filePath].tags = [...this.fileData[filePath].tags, ...uniqueTags];

  }

  removeTagsFromFile(filePath, tags) {
    if (!this.fileData.hasOwnProperty(filePath) || !this.fileData[filePath].tags) {
      return; // No tags for this file, so nothing to remove
    }

    let tagsArray;

    // Check if 'tags' is an array
    if (Array.isArray(tags)) {
      tagsArray = tags;
    }
    // Check if 'tags' is a NodeList
    else if (tags instanceof NodeList) {
      tagsArray = Array.from(tags);
    }
    // Assume 'tags' is a single HTMLElement or Node
    else {
      tagsArray = [tags];
    }

    // Remove tags that are in the tagsArray
    this.fileData[filePath].tags = this.fileData[filePath].tags.filter(tag => !tagsArray.includes(tag));
  }

  //splice(start: number, deleteCount: number, ...itemsToAdd: any[]): any[] {

   // return this.elements.splice(start, deleteCount, ...itemsToAdd);
  //}

    static newAbstractTag (tagText) {
        const outerHTMLTag = `<a href="#${tagText}" class="tag" target="_blank" rel="noopener">#${tagText}</a>`
        return outerHTMLToElement(outerHTMLTag);
    }

    getTag(filePath, tag): HTMLElement {
        // Check if the file exists in fileData and if it has tags
        if (!this.fileData.hasOwnProperty(filePath) || !this.fileData[filePath].tags) {
          return null; // File not found or no tags for this file
        }

        // Find the tag in the file's tag array
        const tagIndex = this.fileData[filePath].tags.indexOf(tag);

        // Return the tag if found, otherwise return null
        return tagIndex !== -1 ? this.fileData[filePath].tags[tagIndex] : null;
  }

    flagTag(filePath, tag) {
      // Check if the file exists in fileData and if it has tags
      if (!this.fileData.hasOwnProperty(filePath) || !this.fileData[filePath].tags) {
        return; // File not found or no tags for this file
      }

      // Find the index of the tag in the file's tag array
      const tagIndex = this.fileData[filePath].tags.indexOf(tag);

      // If the tag is found, set it to undefined
      if (tagIndex !== -1) {
        const tagEl = this.fileData[filePath].tags[tagIndex]
        this.fileData[filePath].tags[tagIndex].innerText = tagEl.innerText + '-REM';
        //this.fileData[filePath].tags[tagIndex] = undefined;
      }
    }

  // Set additional data for a specific file
  setAdditionalDataForFile(filePath, key, value) {
    if (!this.fileData.hasOwnProperty(filePath)) {
      this.fileData[filePath] = {};
    }
    this.fileData[filePath][key] = value;
  }

  // Get tags for a specific file
  getTags(filePath) {
    return this.fileData[filePath]?.tags || [];
  }

  getFiles() {
    return Object.keys(this.fileData);
  }

  // Get additional data for a specific file
  getAdditionalDataForFile(filePath, key) {
    return this.fileData[filePath]?.[key];
  }

  // Remove data for a specific file
  removeDataForFile(filePath) {
    delete this.fileData[filePath];
  }

  reset() {
    delete this.fileData;
    this.fileData = {};
  }

}