/**
 * Chain overflow handler for grid cells
 * Handles text overflow in chained grid cells by moving content to the next cell
 */

/**
 * Check if a cell has overflow
 * @param {HTMLElement} cell - The cell to check
 * @returns {boolean} - True if cell has overflow
 */
export function checkCellOverflow(cell) {
  const cellHeight = cell.clientHeight;
  const cellScrollHeight = cell.scrollHeight;
  // Use a small tolerance (2px) to account for rounding and sub-pixel rendering
  return cellScrollHeight > cellHeight + 2;
}

/**
 * Safely get bounding client rect, handling cases where element might not be in DOM
 * @param {Element|Range} element - Element or Range to measure
 * @returns {DOMRect|null} - Bounding rect or null if not available
 */
export function safeGetBoundingClientRect(element) {
  if (!element) {
    return null;
  }

  // Range objects can always try getBoundingClientRect
  if (element instanceof Range) {
    try {
      return element.getBoundingClientRect();
    } catch (e) {
      return null;
    }
  }

  // For Node objects, check if they're in the DOM and visible
  if (element.nodeType !== undefined) {
    // Check if element is in the DOM
    if (element.isConnected === false) {
      return null;
    }

    // For elements, check visibility
    if (element.nodeType === Node.ELEMENT_NODE) {
      try {
        const style = window.getComputedStyle(element);
        if (style.display === "none" || style.visibility === "hidden") {
          return null;
        }
      } catch (e) {
        // Can't get computed style, might not be in DOM
        return null;
      }
    }
  }

  try {
    const rect = element.getBoundingClientRect();
    // Check if rect is valid (not all zeros, which might indicate element is not visible)
    if (
      rect.width === 0 &&
      rect.height === 0 &&
      rect.top === 0 &&
      rect.left === 0
    ) {
      // This might be a hidden element, but we'll still return it
      // as it could be a legitimate zero-size element
    }
    return rect;
  } catch (e) {
    // Element might not have offsetParent (not in layout)
    return null;
  }
}

/**
 * Find the cut-off point in a cell where content overflows
 * @param {HTMLElement} cell - The cell to check
 * @returns {{node: Text|null, offset: number}} - Cut-off point with text node and offset
 */
export function findCutOffPoint(cell) {
  const cellHeight = cell.clientHeight;
  const cellRect = safeGetBoundingClientRect(cell);
  if (!cellRect) {
    return { node: null, offset: 0 };
  }
  const tolerance = 2;

  // Use TreeWalker to get all text nodes in document order
  const walker = document.createTreeWalker(cell, NodeFilter.SHOW_TEXT, {
    acceptNode: (node) => {
      // Skip text nodes inside script and style elements
      const parent = node.parentElement;
      if (parent) {
        const tagName = parent.tagName?.toLowerCase();
        if (tagName === "script" || tagName === "style") {
          return NodeFilter.FILTER_REJECT;
        }
      }
      return NodeFilter.FILTER_ACCEPT;
    },
  });

  // Walk through all text nodes word by word
  let textNode;
  while ((textNode = walker.nextNode())) {
    const text = textNode.textContent;
    if (!text || text.trim().length === 0) {
      continue;
    }

    // Split text into words (keeping whitespace)
    // Match words and whitespace separately
    const words = [];
    let pos = 0;
    const wordRegex = /\S+/g;
    let match;

    while ((match = wordRegex.exec(text)) !== null) {
      // Add whitespace before word if any
      if (match.index > pos) {
        words.push({
          text: text.substring(pos, match.index),
          start: pos,
          end: match.index,
          isWord: false,
        });
      }
      // Add the word
      words.push({
        text: match[0],
        start: match.index,
        end: match.index + match[0].length,
        isWord: true,
      });
      pos = match.index + match[0].length;
    }
    // Add trailing whitespace if any
    if (pos < text.length) {
      words.push({
        text: text.substring(pos),
        start: pos,
        end: text.length,
        isWord: false,
      });
    }

    // Check each word to see if it's visible
    for (const word of words) {
      if (!word.isWord && word.text.trim().length === 0) {
        // Skip pure whitespace, but track position
        continue;
      }

      const testRange = document.createRange();
      try {
        testRange.setStart(textNode, word.start);
        testRange.setEnd(textNode, word.end);

        const rect = safeGetBoundingClientRect(testRange);

        if (!rect) {
          // Can't measure, assume it's cut off
          testRange.detach();
          return { node: textNode, offset: word.start };
        }

        const relativeBottom = rect.bottom - cellRect.top;

        if (relativeBottom > cellHeight + tolerance) {
          // This word is cut off - found our split point
          testRange.detach();
          return { node: textNode, offset: word.start };
        }
      } catch (e) {
        // Range error, assume cut off at this point
        testRange.detach();
        return { node: textNode, offset: word.start };
      } finally {
        if (testRange) {
          testRange.detach();
        }
      }
    }
  }

  // No cut-off point found (all content is visible)
  return { node: null, offset: 0 };
}

/**
 * Move overflow content from current cell to next cell
 * @param {HTMLElement} currentCell - Cell with overflow
 * @param {HTMLElement} nextCell - Next cell in chain to receive overflow
 * @returns {boolean} - True if content was moved successfully
 */
export function moveOverflowToNextCell(currentCell, nextCell) {
  const cutOffPoint = findCutOffPoint(currentCell);

  if (!cutOffPoint.node || cutOffPoint.offset === 0) {
    return false; // No cut-off point found
  }

  const textNode = cutOffPoint.node;
  const text = textNode.textContent;

  // First, collect all nodes that come after the cut-off text node
  // Do this BEFORE modifying the DOM
  const nodesToMove = [];

  // Use TreeWalker to get all nodes (text and elements) after our split point
  const walker = document.createTreeWalker(
    currentCell,
    NodeFilter.SHOW_TEXT | NodeFilter.SHOW_ELEMENT,
    {
      acceptNode: (node) => {
        // Skip script and style elements
        if (node.nodeType === Node.ELEMENT_NODE) {
          const tagName = node.tagName?.toLowerCase();
          if (tagName === "script" || tagName === "style") {
            return NodeFilter.FILTER_REJECT;
          }
        }
        return NodeFilter.FILTER_ACCEPT;
      },
    }
  );

  let collecting = false;
  let node;
  while ((node = walker.nextNode())) {
    // Start collecting after we pass the split text node
    if (node === textNode) {
      collecting = true;
      // For the text node itself, we'll handle the split separately
      continue;
    }

    if (collecting) {
      // Check if this node is a descendant of a node we're already moving
      const isDescendant = nodesToMove.some(
        (movedNode) =>
          movedNode !== node &&
          movedNode.nodeType === Node.ELEMENT_NODE &&
          movedNode.contains &&
          movedNode.contains(node)
      );

      if (!isDescendant) {
        nodesToMove.push(node);
      }
    }
  }

  // Helper function to get element hierarchy from text node up to block element
  function getElementHierarchy(node) {
    const inlineElements = [
      "b",
      "strong",
      "i",
      "em",
      "u",
      "s",
      "strike",
      "del",
      "ins",
      "mark",
      "small",
      "sub",
      "sup",
      "code",
      "kbd",
      "samp",
      "var",
      "span",
      "a",
      "abbr",
      "cite",
      "dfn",
      "time",
      "q",
    ];
    const blockElements = [
      "p",
      "h1",
      "h2",
      "h3",
      "h4",
      "h5",
      "h6",
      "div",
      "section",
      "article",
      "aside",
      "blockquote",
      "li",
      "dt",
      "dd",
      "pre",
      "address",
      "figure",
      "figcaption",
      "header",
      "footer",
      "main",
      "nav",
      "form",
      "fieldset",
    ];

    const hierarchy = [];
    let current = node.parentElement;

    while (current && current !== currentCell) {
      const tagName = current.tagName.toLowerCase();
      if (blockElements.includes(tagName)) {
        hierarchy.unshift({ element: current, type: "block" });
        break;
      } else if (inlineElements.includes(tagName)) {
        hierarchy.unshift({ element: current, type: "inline" });
      }
      current = current.parentElement;
    }

    return hierarchy;
  }

  // Now split the text node at the cut-off point
  const beforeText = text.substring(0, cutOffPoint.offset);
  const afterText = text.substring(cutOffPoint.offset);

  // Update current node to only contain text before cut-off
  textNode.textContent = beforeText;

  // Create new node for overflow text
  if (afterText.trim().length > 0) {
    const hierarchy = getElementHierarchy(textNode);
    let overflowNode;

    if (hierarchy.length > 0) {
      // Recreate the element hierarchy
      const overflowTextNode = document.createTextNode(afterText);
      let currentContainer = overflowTextNode;

      // Build from innermost (text) to outermost (block)
      for (let i = hierarchy.length - 1; i >= 0; i--) {
        const { element, type } = hierarchy[i];
        const newElement = document.createElement(element.tagName);

        // Copy relevant attributes
        Array.from(element.attributes).forEach((attr) => {
          // Skip data attributes that might be specific to the original element
          if (
            !attr.name.startsWith("data-") ||
            attr.name === "data-chapter-meta-filename"
          ) {
            try {
              newElement.setAttribute(attr.name, attr.value);
            } catch (e) {
              // Some attributes might not be settable, skip them
            }
          }
        });

        newElement.appendChild(currentContainer);
        currentContainer = newElement;
      }

      overflowNode = currentContainer;

      // Find the block element in the hierarchy to determine insertion point
      const blockElement = hierarchy.find((h) => h.type === "block")?.element;
      const insertParent = blockElement
        ? blockElement.parentNode
        : textNode.parentNode;
      const insertBefore = blockElement
        ? blockElement.nextSibling
        : textNode.nextSibling;

      if (insertParent) {
        insertParent.insertBefore(overflowNode, insertBefore);
      }
    } else {
      // No hierarchy to preserve, just create a plain text node
      overflowNode = document.createTextNode(afterText);
      // Insert after the split node
      if (textNode.parentNode) {
        textNode.parentNode.insertBefore(overflowNode, textNode.nextSibling);
      }
    }

    // Add the overflow node to the beginning of nodes to move
    if (overflowNode) {
      nodesToMove.unshift(overflowNode);
    }
  }

  // Move nodes to next cell
  if (nodesToMove.length > 0) {
    // Clear any existing overflow warning from next cell
    const existingWarning = nextCell.querySelector("._textOverflowWarning");
    if (existingWarning) {
      existingWarning.remove();
    }
    nextCell.classList.remove("has--textOverflow");

    // Create fragment and move nodes
    const fragment = document.createDocumentFragment();
    nodesToMove.forEach((node) => {
      // Only move if node is still in the DOM and part of currentCell
      if (node.parentNode && currentCell.contains(node)) {
        fragment.appendChild(node);
      }
    });

    // If fragment has children, add them to next cell
    if (fragment.hasChildNodes()) {
      // If next cell is empty or only has whitespace, replace content
      const nextCellText = nextCell.textContent?.trim() || "";
      if (nextCellText.length === 0) {
        nextCell.innerHTML = "";
        nextCell.appendChild(fragment);
      } else {
        // Prepend to existing content
        const firstChild = nextCell.firstChild;
        if (firstChild) {
          nextCell.insertBefore(fragment, firstChild);
        } else {
          nextCell.appendChild(fragment);
        }
      }

      return true;
    }
  }

  return false;
}

/**
 * Show overflow warning on a cell
 * @param {HTMLElement} cell - Cell to show warning on
 * @param {string} warningText - Translated warning text to display
 */
export function showOverflowWarning(cell, warningText) {
  // Remove existing warning if any
  const existingWarning = cell.querySelector("._textOverflowWarning");
  if (existingWarning) {
    return; // Warning already exists
  }

  cell.classList.add("has--textOverflow");

  const warning = document.createElement("div");
  warning.className = "_textOverflowWarning";
  const warning_text = document.createElement("span");
  warning_text.className = "u-warning";
  warning_text.textContent = warningText;
  warning.appendChild(warning_text);
  cell.appendChild(warning);
}

/**
 * Handle overflow in a chain of cells
 * @param {HTMLElement} cell - Starting cell in the chain
 * @param {HTMLElement} page - Page element to search for chain cells within (only cells on this page)
 * @param {string} warningText - Translated warning text to display
 */
export function handleChainOverflow(cell, page, warningText) {
  const cell_id = cell.getAttribute("data-grid-area-id");
  // Only search for chain cells within the same page
  const chain_cells = page.querySelectorAll(
    `.grid-cell[data-grid-area-id="${cell_id}"]`
  );
  const chain_cells_array = Array.from(chain_cells);

  // sort chain cells by data-grid-area-is-chain-index ascending
  chain_cells_array.sort((a, b) => {
    const a_index = a.getAttribute("data-grid-area-is-chain-index");
    const b_index = b.getAttribute("data-grid-area-is-chain-index");
    return a_index - b_index;
  });

  // Process each cell in the chain
  // Use a safety counter to prevent infinite loops
  let maxIterations = chain_cells_array.length * 10; // Allow multiple passes
  let iterationCount = 0;

  for (
    let i = 0;
    i < chain_cells_array.length && iterationCount < maxIterations;
    i++
  ) {
    iterationCount++;
    const currentCell = chain_cells_array[i];

    // Check if current cell has overflow
    const hasOverflow = checkCellOverflow(currentCell);

    if (!hasOverflow) {
      continue; // No overflow, move to next cell
    }

    // Find the next cell in the chain
    const nextCell = chain_cells_array[i + 1];

    if (!nextCell) {
      // No next cell available, show overflow warning
      showOverflowWarning(currentCell, warningText);
      break;
    }

    // Find the cut-off point and move overflow content to next cell
    const moved = moveOverflowToNextCell(currentCell, nextCell);

    if (!moved) {
      // Couldn't move content (might be empty or unbreakable)
      showOverflowWarning(currentCell, warningText);
      break;
    }

    // Restart from the beginning to check all cells again
    // This handles cascading overflow
    i = -1; // Will be incremented to 0 in next iteration
  }
}
