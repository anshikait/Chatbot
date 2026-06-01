import { X } from 'lucide-react';

/**
 * Modal Component - Display content in fullscreen
 * 
 * Usage:
 * <Modal isOpen={open} onClose={handleClose}>
 *   <img src="..." alt="..." />
 * </Modal>
 */

export default function Modal({ isOpen, onClose, children }) {
  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
      onClick={onClose}  // Close on background click
    >
      <div 
        className="relative bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-auto"
        onClick={(e) => e.stopPropagation()}  // Don't close when clicking content
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 hover:bg-gray-100 rounded-full z-10"
          aria-label="Close modal"
        >
          <X size={24} className="text-gray-600" />
        </button>

        {/* Content */}
        <div className="p-6">
          {children}
        </div>
      </div>
    </div>
  );
}
