import React from "react";

interface ErrorBannerProps {
  errors: string[];
  onClear: () => void;
}

export const ErrorBanner: React.FC<ErrorBannerProps> = ({ errors, onClear }) => {
  if (errors.length === 0) return null;

  return (
    <div className="p-3 bg-red-900 border-b border-red-700 text-red-100">
      <div className="flex items-center justify-between gap-2">
        <div className="flex-1">
          <p className="font-semibold">⚠️ Conversion Error</p>
          <p className="text-sm">{errors[0]}</p>
        </div>
        <button
          onClick={onClear}
          className="px-3 py-1 bg-red-700 rounded hover:bg-red-600 text-sm whitespace-nowrap"
        >
          Dismiss
        </button>
      </div>
    </div>
  );
};

interface EmptyStateProps {
  title: string;
  message: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({ title, message }) => {
  return (
    <div className="flex flex-col items-center justify-center h-full gap-4 text-gray-400">
      <div className="text-6xl opacity-20">📄</div>
      <h3 className="text-lg font-semibold text-gray-300">{title}</h3>
      <p className="text-sm text-gray-500 max-w-xs text-center">{message}</p>
    </div>
  );
};

interface StatusBadgeProps {
  label: string;
  variant?: "success" | "error" | "warning" | "info";
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({
  label,
  variant = "info",
}) => {
  const colors = {
    success: "bg-green-700 text-green-100",
    error: "bg-red-700 text-red-100",
    warning: "bg-yellow-700 text-yellow-100",
    info: "bg-blue-700 text-blue-100",
  };

  return (
    <span className={`px-2 py-1 rounded text-xs font-medium ${colors[variant]}`}>
      {label}
    </span>
  );
};

interface KeyboardHintProps {
  text: string;
  shortcut: string;
}

export const KeyboardHint: React.FC<KeyboardHintProps> = ({
  text,
  shortcut,
}) => {
  return (
    <div className="text-xs text-gray-500">
      {text}{" "}
      <kbd className="px-1.5 py-0.5 bg-gray-700 rounded text-gray-300 font-mono">
        {shortcut}
      </kbd>
    </div>
  );
};
