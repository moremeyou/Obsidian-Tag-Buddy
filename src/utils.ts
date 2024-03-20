import { TFile, Platform } from 'obsidian';

export function getTagElement(
    paragraphEl: HTMLElement, 
    tagText: string
): HTMLElement {
    const els = paragraphEl.querySelectorAll('.tag'); 
    let tagElText = '';
    let tagElHasSub:boolean;
    for (let el of els) {
        tagElText = el.innerText.trim();
        if (tagElText === tagText) {
            return el
        }
    }    
    //console.warn(`Element with text "${tagText}" not found`);
    return null;
}

export function platformSettingCheck (app: App, value) {
    return (value == 'always' || (value == 'desktop' && !app.isMobile) || (value == 'mobile' && app.isMobile))
}

export function platformSettingCheckMultiple (app: App, values: Array []) {
    for (let value of values) {
        if (platformSettingCheck(app, value)) {
            return true; 
        }
    }
    return false;
}

export function isWordNearEnd(
    str: string, 
    word: string, 
    charDistance: number = 0
): boolean {
    // Find the last occurrence of the word
    const lastIndex = str.lastIndexOf(word);

    // If the word isn't found, return false
    if (lastIndex === -1) return false;

    // Calculate the position where the word ends
    const wordEndIndex = lastIndex + word.length;

    // Check the distance from the word's end to the string's end
    const distanceToEnd = str.length - wordEndIndex;

    // Return true if the word is the last word or if the distance is less than or equal to charDistance
    return distanceToEnd === 0 || distanceToEnd <= charDistance;
}

export function getWordObjFromString(
    sourceText: string, 
    offset: number
):Object {
    
    let wordRegex = /[^\s]+(?=[.,:!?]?(\s|$))/g;
    let match;
    let index;
    let word = null;
    while ((match = wordRegex.exec(sourceText)) !== null) {
        if (match.index <= offset && offset <= match.index + match[0].length) {
             word = match[0];
            index = match.index;
            break;
        }
    }
    return {
        text: word, 
        index: index
    };
}

export function getClickedTextObjFromDoc(
    x, 
    y, 
    minNodeLength: string=10
):string {
    
    // Get the word under the click position
    let range, nodeText, offset;

    if (document.caretRangeFromPoint) {
        range = document.caretRangeFromPoint(x, y);
//console.log(x, y, range)
        if (range.startContainer.nodeType === Node.TEXT_NODE) {
            nodeText = range.startContainer.nodeValue.trim();
        } else {
            return null;
        }
        offset = range.startOffset;
    }

    if (nodeText.length < minNodeLength) {
        return null;
    }
//console.log(nodeText, offset, range.startContainer.parentNode)
    return {
        text: nodeText, 
        index: offset, 
        el: range.startContainer.parentNode
    };
}

export function getMarkdownHeadings(
    bodyLines: string[],
    headingFilter: string = ''
): Heading[] {
    
    const headers: Heading[] = [];
    let accumulatedIndex = 0;

    bodyLines.forEach((line, index) => {
        const match = line.match(/^(#+)[\s]?(.*)$/);

        if (match && 
            (headingFilter == '' || match[2] == headingFilter)) {
            headers.push({
                fullText: match[0],
                level: match[1].length,
                text: match[2],
                line: index,
                startIndex: accumulatedIndex,
                endIndex: (accumulatedIndex + match[0].length - 1)
            });
        }
        accumulatedIndex += line.length + 1;
    });

    return headers;
}

export function fileContainsHeading(
    fileContent: string,
    heading: string
): boolean {
    const fileContentLines: string[] = getLinesInString(fileContent);
    const mdHeadings = getMarkdownHeadings(fileContentLines, heading);
    return (mdHeadings.length > 0)
}

export function findFirstLineAfterFrontMatter(markdown: String): Number {
    // Split the markdown string into lines.
    const lines = getLinesInString(markdown); //markdown.split('\n');

    let inFrontMatter = false;
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();

        // Check if the current line is a front matter delimiter.
        if (line === '---') {
            // If we encounter the start of the front matter, set the flag.
            // If we're already in the front matter, this marks its end.
            inFrontMatter = !inFrontMatter;

            // If we just ended the front matter, return the next line's number.
            if (!inFrontMatter) {
                return i //+ 2; // +2 to adjust for zero-based indexing and to get the line after the closing delimiter.
            }
        }
    }

    // If there's no front matter or we didn't find a closing delimiter, return 1 (the first line).
    return 0;
}


export function getLinesInString(
    input: string
): Array {
    /*const lines: string[] = [];
    let tempString = input;

    while (tempString.includes("\n")) {
        const lineEndIndex = tempString.indexOf("\n");
        lines.push(tempString.slice(0, lineEndIndex));
        tempString = tempString.slice(lineEndIndex + 1);
    }
    lines.push(tempString);

    return lines;*/

    const lines = input.split('\n');

    // Check if the last line is empty and remove it if necessary.
    if (lines.length > 0 && lines[lines.length - 1] === '') {
        lines.pop();
    }

    return lines;
}

export function getLineChrIndex(content, lineNumber) {
  const lines = content.split('\n');
  if (lineNumber >= lines.length) {
    return -1;
  }

  let characterIndex = 0;
  for (let i = 0; i < lineNumber; i++) {
    // Add the length of each line plus 1 for the '\n' character that was removed by split
    characterIndex += lines[i].length + 1;
  }

  return characterIndex;
}

export function insertTextAfterLine(
    text: string, 
    body: string, 
    line: number, 
    filePath
): string {
    
    const splitContent = body.split("\n");
    const pre = splitContent.slice(0, line + 1).join("\n");
    const post = splitContent.slice(line + 1).join("\n");

    return `${pre}\n${text}\n${post}`;
}

export function getListTypeFromLineNumber(fullText: string, lineNumber: number): string {
    const lines = fullText.split("\n");
    if (lineNumber >= 0 && lineNumber < lines.length) {
        const line = lines[lineNumber];

        const leadingWhitespace = line.match(/^\s*/)[0];

        // Check for unchecked checkbox list items first
        if (/^\s*-\s\[\s\]\s/.test(line)) {
            //console.log("Detected an unchecked checkbox");
            return leadingWhitespace + "- [ ] ";
        } 
        // Check for a "checked" checkbox
        else if (/^\s*-\s\[x\]\s/.test(line)) {
            //console.log("Detected a checked checkbox, converting to unchecked");
            return leadingWhitespace + "- [ ] ";
        } 
        // Then check for normal dash list items
        else if (/^\s*-\s/.test(line)) {
            //console.log("Detected a normal bullet");
            return leadingWhitespace + "- ";
        } 
        // Check for numbered list items
        else if (/^\s*\d+\.\s/.test(line)) {
            const num = parseInt(line.match(/^\s*(\d+)\./)[1], 10);
            return leadingWhitespace + `${num}. `;
            //return leadingWhitespace + `${num + 1}. `;
        } 
        // Check for arrow items
        else if (/^\s*>\s/.test(line)) {
            return leadingWhitespace + "> ";
        }
    } else {
    }
    return ""; 
}



export function removeTagFromString(
    inputText, 
    hashtagToRemove, 
    all:boolean=true
): string {  
    
    //const regex = new RegExp("\\s?" + hashtagToRemove + "\\b", all?"gi":"i");
    const regex = new RegExp(
        "\\s?" + 
        hashtagToRemove.replace(/#/g, '\\#') + 
        "(?!\\w|\\/)", 
        all?"gi":"i"
    );

    return inputText.replace(regex, '').trim();
}

export function insertTextInString (
    newText: string, 
    sourceText: string, 
    charPos: number
):string { // pass 0 for the start or sourceText.length-1 for the end
    //console.log(JSON.stringify(newText));
    return (sourceText.substring(0, charPos) + newText + ' ' + sourceText.substring(charPos));
}

export function removeTextFromString (
    removeText: string, 
    sourceText: string, 
    all:boolean=false
):string {
    const regex = new RegExp(this.escapeRegExp(removeText), all ? "gi" : "i");
    return sourceText.replace(regex, '').trim();
}

export function replaceTextInString (
    replaceText: string, 
    sourceText: string, 
    newText: string, 
    all: boolean = false
):string {
/*console.log('REPLACE TEXT');
console.log('>>'+escapeRegExp(replaceText.trim())+'<<');
console.log('------------------------------');
console.log('SOURCE TEXT');
console.log('>>'+sourceText+'<<')
console.log('------------------------------');
console.log('NEW TEXT');
console.log('>>'+newText+'<<')*/
//console.log(escapeRegExp(replaceText.trim()))
        const escapedReplaceText = escapeRegExp(replaceText.trim()).replace(/\n/g, '\\s*\\n\\s*');
        //const escapedReplaceText = escapeRegExp(replaceText).replace(/\n/g, '\\s*\\n\\s*');

        //const regex = new RegExp(escapeRegExp(replaceText.trim()), all ? "gi" : "i");
        const regex = new RegExp(escapedReplaceText, all ? "gsi" : "si");

        return sourceText.trim().replace(regex, newText.trim()).trim();
        //return sourceText.replace(regex, newText);
}

export function truncateStringAtWord(
    str: string, 
    maxChars:number=16
):string {

    if (str.length <= maxChars) return str;
    let truncated = str.substr(0, maxChars);  
    const lastSpace = truncated.lastIndexOf(' '); 
    if (lastSpace > 0) truncated = truncated.substr(0, lastSpace);

    return truncated
}

export function contentChangedTooMuch(
    original: string, 
    modified: string, 
    tag: string, 
    buffer = 5
): boolean {
  const expectedChange = tag.length; // including the '#' symbol
  const threshold = expectedChange + buffer; // allow for some minor unintended modifications
  const actualChange = Math.abs(original.length - modified.length);

  return actualChange > threshold;
}

export function fileObjFromTags(
    tags: Array
): Object {

    // Remove hashes and split tags into an array
    let tagsArray = tags.map(tag => tag.replace(/#/g, '').toLowerCase());

    // Filter out duplicates
    tagsArray = tagsArray.filter((tag, index, self) => self.indexOf(tag) === index);

    // Construct the file name
    const tagsPart = tagsArray.join('+');
    const currentDate = new Date();
    const datePart = currentDate.getDate().toString().padStart(2, '0') + '-' +
                     (currentDate.getMonth() + 1).toString().padStart(2, '0') + '-' +
                     currentDate.getFullYear().toString().slice(-2);
    //const fileName = `Tag Summary (${tagsPart}) (${datePart}).md`;
    const fileName = `Tag Summary (${datePart}).md`;

    // Construct the title
    const titleTagsPart = tagsArray.map(tag => tag.charAt(0).toUpperCase() + tag.slice(1)).join(' + ');
    const title = `${titleTagsPart} Tag Summary`;

    // Return the object with fileName and title properties
    return {
        fileName: fileName,
        title: title
    };
}

export function getActiveFileFolder(
    activeFile: TFile
): string {
    
    //const activeFile = app.workspace.activeLeaf.view.file;
    //const activeFile = this.app.workspace.getActiveViewOfType(MarkdownView);
    if (!activeFile) return null;
    let folderPath
    if (activeFile.path.includes('\\') || activeFile.path.includes('/')) {

        // Determine the correct path separator
        const pathSeparator = activeFile.path.includes('\\') ? '\\' : '/';

        const pathParts = activeFile.path.split(pathSeparator);
        pathParts.pop();  // Remove the file name part
        folderPath = pathParts.join(pathSeparator);

        // Ensure the folder path ends with the correct path separator
        if (!folderPath.endsWith(pathSeparator)) {
            folderPath += pathSeparator;
        }
    } else {
        folderPath = ''
    }

    return folderPath;
}

export function getTagsFromApp(
    app: App,
    recentTags: Array
): string[] {
    const tagsObject = app.metadataCache.getTags();

    // Convert tagsObject to an array of [tag, count] tuples
    const tagsArray = Object.entries(tagsObject);

    // Sort by use count
    tagsArray.sort((a, b) => b[1] - a[1]);

    //const recentTags = this.getRecentTags();
    //const recentTags = plugin.getRecentTags();
    //console.log('recent tag length: ' + recentTags.length)

    if (recentTags.length>0) {
        //console.log(recentTags)
        // convert them to [tag, count] tuples for consistency
        const recentTagsAsTuples = recentTags.map(tag => [tag, 0]);
        // Concatenate the two arrays
        const recentAndAllTags = recentTagsAsTuples.concat(tagsArray);
        // Extract tag names after removing the #
        return recentAndAllTags.map(([tag, _]) => tag.replace(/^#/, ""));
    } else {
        return tagsArray.map(([tag, _]) => tag.replace(/^#/, ""));
    }
}

export async function validateFilePath (
    filePath: string
): string {
    const matchingFiles = await app.vault.getFiles().filter(file => file.name === filePath);
    if (matchingFiles.length === 1) {
        const filePath = matchingFiles[0].path;
        const file = await this.app.vault.getAbstractFileByPath(filePath);
        //console.log('Validate file: ' + embedFile.name);
        return file;
    } else if (matchingFiles.length > 1) {
        new Notice('Tag Buddy: Multiple files found with the same name. Can\'t safely edit tag.');
        return null;
    } else {
        new Notice('Tag Buddy: No file found. Try again, or this tag might be in an unsupported embed type.');
        return null;
    }
}

export function ctrlCmdKey (
    event: Event
): boolean {
    const isMac = Platform.isMacOS // (navigator.platform.toUpperCase().indexOf('MAC') >= 0);

    if (isMac) return event.metaKey;
    else return event.ctrlKey;
}

export function tagsInString(
    string: string, 
    tag?: string
): string[] {
    let regex;
    if (tag) {
        regex = new RegExp(tag.replace(/\//g, '\\/') + "(?![\\w\\/\\#])", "g");
    } else {
        // Match any tag-like pattern starting with '#'
        regex = /#(\w+)(?![\w\/#])/g;
    }
    const matches = string.match(regex);

    return matches || [];
}

export function countOccurrences(
    summaryTags: Array, 
    contentTags
): number {
    let count = 0;
    for (let tag of summaryTags) {
        count += contentTags.filter(item => item === tag).length;
    }

    return count;
}

export function outerHTMLToElement(outerHTML: string): HTMLElement | null {
  const tempDiv = document.createElement('div');
  tempDiv.innerHTML = outerHTML;
  return tempDiv.firstChild as HTMLElement;
}

export function escapeRegExp(
    string: string
):string {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); // $& means the whole matched string
}

export async function getEmbedFile (
    el: HTMLElement
):TFile {
    let filePath = el.getAttribute('src');
    const linkArray = filePath.split('#');
    filePath = linkArray[0].trim() + '.md';
    const file = await validateFilePath(filePath);
    return file;
}

export function isTagValid (
    tag: String,
    fullTag: Boolean = false
):boolean { 
    let tagPattern 
    if (fullTag) tagPattern = /^#[a-zA-Z0-9_\-\/]*[a-zA-Z_\-\/][a-zA-Z0-9_\-\/]*$/;
    //else tagPattern = /(?=[^\d\s]+)[a-zA-Z0-9_\-\/]+/g
    else tagPattern = /^[a-zA-Z0-9_\-\/]*[a-zA-Z_\-\/][a-zA-Z0-9_\-\/]*$/;
    return tagPattern.test(tag);
}

export function extractValidTags(tagsString: string): string[] {
    // Split the string by commas to get individual tags
    const potentialTags = tagsString.split(',');

    // Filter out valid tags
    const validTags = potentialTags
        .map(tag => tag.trim()) // Trim each tag
        .filter(tag => isTagValid(tag, true)); // Use the isTagValid function to check validity

    return validTags;
}

export function ctrlCmdStr (): string {
    const isMac = Platform.isMacOS //(navigator.platform.toUpperCase().indexOf('MAC') >= 0);
    if (isMac) return 'CMD';
    else return 'CTRL';
}
