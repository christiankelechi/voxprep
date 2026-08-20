# WebAssembly and Pyodide Execution

## Introduction
Running Python code securely on a website is historically incredibly difficult. Traditional platforms (like LeetCode) send the user's code to a backend Docker container, run it, and send the results back. This is slow, expensive, and requires massive server infrastructure.

OmniAssess bypassed this entirely using **WebAssembly (WASM)** and **Pyodide**.

## 1. What is WebAssembly?
WebAssembly is a binary instruction format for modern web browsers. It allows code written in languages like C, C++, and Rust to run directly inside the browser at near-native speeds. 

## 2. What is Pyodide?
Pyodide is a port of the entire CPython interpreter compiled into WebAssembly. 
- When the user opens the Coding Simulator, we call `window.loadPyodide()`. 
- This command downloads the WebAssembly Python interpreter and boots up a literal virtual machine inside the user's browser tab.

## 3. The Execution Flow
When a user clicks "Run Tests" in OmniAssess:
1. **Safety First:** Because the code runs entirely on the user's machine, it is impossible for them to hack or crash your server. If they write an infinite loop (`while True:`), it will only freeze their own browser tab, not your infrastructure.
2. **Environment Setup:** We call `await pyodide.runPythonAsync(code)`. This executes the user's function and registers it in the Pyodide VM's memory.
3. **Running the Tests:** We loop through the hidden `testCases` array. For each case, we inject the test code into the VM (`db = InMemoryDB(); db.set_at("X", "Y")`) and await the result.
4. **Data Conversion:** Python objects (like lists or dictionaries) don't naturally map to JavaScript objects. Pyodide provides a `toJs()` method to convert the Python output back into a format React can understand and render.

## 4. Why this is revolutionary for SaaS
By pushing the computation to the client side, OmniAssess requires zero server costs for code execution. You could have 10,000 users running complex algorithms simultaneously, and your AWS/Server bill would remain absolutely $0.00. This is the definition of infinite scalability.
