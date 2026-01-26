/**
 * File Explorer Components Index
 *
 * Re-exports all file explorer sub-components for easy importing.
 */

export {
  FileTreeNode,
  type FileTreeNodeProps,
  type FileItem,
  type DirectoryItem,
} from "./FileTreeNode"

export {
  FileTreeDirectory,
  type FileTreeDirectoryProps,
} from "./FileTreeDirectory"

export {
  DraggableFileItem,
  type DraggableFileItemProps,
} from "./DraggableFileItem"

export {
  // FilePreviewModal and its props are not exported because the module is absent.
}
