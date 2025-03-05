// Setup file for Jest

// Mock the Chart.js library
global.Chart = class Chart {
    constructor() {
        this.destroy = jest.fn();
    }
    static register() {}
};

// Mock other global functions and objects that might be needed
global.window = Object.assign(global.window || {}, {
    fs: {
        readFile: jest.fn()
    }
});

// Create mock for HTML canvas
HTMLCanvasElement.prototype.getContext = jest.fn(() => ({
    fillStyle: '',
    fillRect: jest.fn(),
    font: '',
    fillText: jest.fn()
}));