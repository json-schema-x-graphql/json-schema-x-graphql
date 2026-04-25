// Jest setup file for DOM testing
import "@testing-library/jest-dom";

jest.mock("react-split-pane", () => {
  const React = require("react");

  const SplitPane = ({ children, className = "", style = {}, split = "vertical" }) =>
    React.createElement(
      "div",
      {
        className: `split-pane ${split} ${className}`.trim(),
        style: {
          display: "flex",
          flexDirection: split === "vertical" ? "row" : "column",
          height: "100%",
          width: "100%",
          overflow: "hidden",
          position: "relative",
          flex: "1 1 0%",
          ...style,
        },
      },
      children,
    );

  return {
    __esModule: true,
    SplitPane,
    default: SplitPane,
  };
});

// Mock localStorage
const localStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
};

global.localStorage = localStorageMock;

// Polyfill ResizeObserver for components that depend on layout observation
global.ResizeObserver = class ResizeObserver {
  observe() {}

  unobserve() {}

  disconnect() {}
};

// Mock URL.createObjectURL
global.URL.createObjectURL = jest.fn(() => "mock-url");
global.URL.revokeObjectURL = jest.fn();

// Reset mocks before each test
beforeEach(() => {
  jest.clearAllMocks();
});
