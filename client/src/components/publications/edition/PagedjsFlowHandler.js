import { Handler } from "pagedjs";
import {
  checkCellOverflow,
  moveOverflowToNextCell,
  showOverflowWarning,
} from "./chainOverflowHandler.js";

export class PagedjsFlowHandler extends Handler {
  constructor(chunker, polisher, caller) {
    super(chunker, polisher, caller);
  }

  afterPreview(pages) {
    console.log("PagedjsFlowHandler: afterPreview");
    this.handleAllChains(pages);
  }

  handleAllChains(pages) {
    // 1. Collect all grid cells from all pages
    const allCells = [];
    pages.forEach((page) => {
      const pageElement = page.element; // Access the DOM element of the page
      const cells = pageElement.querySelectorAll(".grid-cell");
      cells.forEach((cell) => allCells.push(cell));
    });

    // 2. Group cells by their Chain ID (data-grid-area-id)
    const chains = {};

    allCells.forEach((cell) => {
      const chainId = cell.getAttribute("data-grid-area-id");
      if (!chainId) return;

      if (!chains[chainId]) {
        chains[chainId] = [];
      }
      chains[chainId].push(cell);
    });

    console.log(
      `PagedjsFlowHandler: Found ${Object.keys(chains).length} chains`,
      Object.keys(chains)
    );

    // 3. Process each chain
    Object.keys(chains).forEach((chainId) => {
      this.processChain(chains[chainId], chainId);
    });
  }

  processChain(cells, chainId) {
    console.groupCollapsed(`PagedjsFlowHandler: Processing chain ${chainId}`);
    // Sort cells by chain index
    cells.sort((a, b) => {
      const aIndex = parseInt(
        a.getAttribute("data-grid-area-is-chain-index") || "0"
      );
      const bIndex = parseInt(
        b.getAttribute("data-grid-area-is-chain-index") || "0"
      );
      return aIndex - bIndex;
    });

    console.log(
      `Processing chain ${chainId} with ${cells.length} cells across pages.`
    );

    // Flow content through the chain
    let maxIterations = cells.length * 10;
    let iterationCount = 0;

    // We iterate through the chain. If we move content, we might need to re-check previous cells?
    // Usually flow goes A -> B -> C.
    // If A overflows, move to B.
    // Then check B. If B overflows, move to C.
    // So a single pass forward should be enough, unless moving content to B *causes* B to overflow differently?
    // Yes, a single pass forward 0->1, 1->2, 2->3 should propagate the overflow.

    for (let i = 0; i < cells.length - 1; i++) {
      const currentCell = cells[i];
      const nextCell = cells[i + 1];

      // Loop to handle massive overflow that might require multiple chunks moved?
      // moveOverflowToNextCell moves *all* overflow at once.

      // Check overflow
      if (checkCellOverflow(currentCell)) {
        console.log(
          `Cell ${i} of chain ${chainId} has overflow. Moving to next.`
        );
        const moved = moveOverflowToNextCell(currentCell, nextCell);

        if (!moved) {
          showOverflowWarning(currentCell, "Text Overflow (Blocker)");
        }
      }
    }

    // Check the last cell for overflow
    const lastCell = cells[cells.length - 1];
    if (checkCellOverflow(lastCell)) {
      console.warn(`Chain ${chainId} last cell has overflow.`);
      showOverflowWarning(lastCell, "Text Overflow");
    } else {
      console.log(
        `Chain ${chainId} processing complete. No overflow in last cell.`
      );
    }
    console.groupEnd();
  }
}
