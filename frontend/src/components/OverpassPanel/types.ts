export interface OverpassTemplate {
  name: string;
  description: string;
  category: string;
  query: string;
}

export interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

export interface OverpassPanelProps {
  isOpen: boolean;
  onToggle: (isOpen: boolean) => void;
  drawnBounds?: [number, number, number, number] | null;
  isDrawingBounds: boolean;
  onStartDrawingBounds: () => void;
  onFinishDrawingBounds: () => void;
  onCancelDrawingBounds: () => void;
  embedded?: boolean;
}
